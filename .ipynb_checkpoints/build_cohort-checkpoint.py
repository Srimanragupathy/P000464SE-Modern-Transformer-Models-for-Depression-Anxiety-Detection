"""
build_cohort.py
===============
Cohort construction for depression & anxiety detection in older adults (60+)
from MIMIC-IV discharge summaries.

Data access
-----------
Requires MIMIC-IV v3.1 (hosp) and MIMIC-IV-Note v2.2 (note), which are
credentialed datasets available from PhysioNet under a data use agreement.
No data is included in this repository.

Text selection
--------------
Notes are cut down to the discharge-summary sections that could plausibly
carry psychiatric signal. Median note length is ~2,150 tokens against a
512-token budget, so a head-truncated model would otherwise see about a
quarter of the note chosen by position rather than content -- and lab
tables, vitals and administrative boilerplate dominate the token mass.

Sections kept, in this order (head-truncation keeps the front, so the
densest sections go first):
    past medical history      chronic psych conditions, listed compactly
    chief complaint           presenting problem
    history of present illness
    social history            substance use, living situation, supports
    medications on admission
    discharge medications
    brief hospital course     rich but long, so it goes last

Notable exclusions:
    pertinent results         lab / micro tables; the single largest block
    physical exam             vitals and system boilerplate
    discharge diagnosis       LEAKAGE -- prose restatement of the coded
                              diagnoses, the same source the labels come from

If no whitelisted section is found the full note is kept, so a note with an
unexpected structure degrades rather than silently emptying. The report
counts how often that happens -- above a few percent, the header patterns
need adjusting.

    --sections clinical   (default)
    --sections minimal    tighter, for when clinical still overruns
    --sections none       full text

Outputs (into --out):
    cohort.parquet       hadm_id, subject_id, age, gender,
                         depression, anxiety, n_tokens, text
    splits.parquet       subject_id, split
    cohort_stats.json    aggregate report
    note_length_hist.csv

Train-time loading:
    from build_cohort import load_for_training
    tr = load_for_training("cohort", split="train", mask_leakage=True,
                           truncate="head", max_tokens=512)
    va = load_for_training("cohort", split="val", ...)      # all tuning here
    te = load_for_training("cohort", split="test", allow_test=True, ...)

Usage:
    python build_cohort.py --hosp path/to/hosp --note path/to/note --out cohort
    python build_cohort.py --hosp path/to/hosp --note path/to/note \\
        --out cohort_test --sample 5000

Requires: pandas, pyarrow. Optionally: transformers.
"""

import argparse
import gc
import json
import re
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# --------------------------------------------------------------------------
# 1. LABEL DEFINITIONS  -- core codes only, no extensions, no inference
# --------------------------------------------------------------------------

DEPRESSION = {
    "icd9":  (r"^2962", r"^2963", r"^3004", r"^311"),
    "icd10": (r"^F32", r"^F33", r"^F341"),
}

ANXIETY = {
    "icd9":  (r"^3000", r"^3002"),
    "icd10": (r"^F40", r"^F41"),
}

# Not a label. Only used if --exclude-bipolar is passed.
BIPOLAR = (r"^2960", r"^2961", r"^2964", r"^2965", r"^2966", r"^2967", r"^F31")

# Reported covariate only -- never contributes to a label.
# Restricted to agents prescribed almost exclusively for depression or anxiety.
# Deliberately excluded, with reason:
#   amitriptyline / nortriptyline / doxepin  -> neuropathic pain, migraine, sleep
#   mirtazapine                              -> appetite stimulation, sleep
#   bupropion                                -> smoking cessation
#   duloxetine                               -> neuropathic pain, fibromyalgia
#   trazodone                                -> insomnia (dominant inpatient use)
#   all benzodiazepines                      -> sedation, withdrawal, procedures
ANTIDEPRESSANT_PATTERN = re.compile(
    r"\b(?:sertraline|fluoxetine|paroxetine|citalopram|escitalopram|fluvoxamine|"
    r"venlafaxine|desvenlafaxine|vortioxetine|vilazodone|buspirone|"
    r"phenelzine|tranylcypromine|"
    r"zoloft|prozac|paxil|celexa|lexapro|luvox|effexor|pristiq|trintellix|"
    r"viibryd|buspar|nardil|parnate)\b",
    re.IGNORECASE,
)


DEP_LEAK_PATTERN = re.compile(
    r"\b(?:depress\w*|dysthymi\w*|MDD|major depressive)\b",
    re.IGNORECASE,
)

ANX_LEAK_PATTERN = re.compile(
    r"\b(?:anxi\w*|panic|phobi\w*|agoraphob\w*|GAD|generali[sz]ed anxiety)\b",
    re.IGNORECASE,
)

# Union, used for masking at training time. Both labels are masked together so
# a multi-label model cannot read either condition off the text.
LEAK_PATTERN = re.compile(
    f"(?:{DEP_LEAK_PATTERN.pattern})|(?:{ANX_LEAK_PATTERN.pattern})",
    re.IGNORECASE,
)

NOTE_COLS = ["note_id", "subject_id", "hadm_id", "note_type", "charttime", "text"]

DEID_PATTERN = re.compile(r"_{2,}|\[\*\*.*?\*\*\]")
WS_PATTERN = re.compile(r"[ \t]+")
NL_PATTERN = re.compile(r"\n{3,}")

FINAL_COLS = ["hadm_id", "subject_id", "age_at_admission", "gender",
              "depression", "anxiety", "n_tokens", "text"]

# --------------------------------------------------------------------------
# 1b. SECTIONS
# --------------------------------------------------------------------------

# A MIMIC section header: start of line, title-ish words, colon. This is why
# clean_text must not collapse \s+ to a single space -- flattening the note to
# one line destroys every header anchor.
HEADER = re.compile(r"^[ \t]*([A-Z][A-Za-z][A-Za-z /,'&\-]{1,58}):", re.MULTILINE)

SECTION_PROFILES = {
    "clinical": [
        "past medical history",
        "chief complaint",
        "history of present illness",
        "social history",
        "medications on admission",
        "discharge medications",
        "brief hospital course",
    ],
    "minimal": [
        "past medical history",
        "history of present illness",
        "social history",
        "medications on admission",
    ],
}


def split_sections(text):
    """{normalised_header: body}. Text before the first header goes to
    '(preamble)'. Repeated headers are concatenated."""
    out = defaultdict(list)
    marks = list(HEADER.finditer(text))
    if not marks:
        return {"(preamble)": text}
    if marks[0].start() > 0:
        out["(preamble)"].append(text[:marks[0].start()])
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        key = " ".join(m.group(1).split()).lower()
        out[key].append(text[m.end():end])
    return {k: "\n".join(v) for k, v in out.items()}


def extract_sections(text, profile="clinical"):
    """Whitelisted sections only, in whitelist order. Returns the original
    text if nothing matched, so an unparseable note degrades rather than
    silently emptying."""
    if not profile or profile == "none":
        return text
    if not isinstance(text, str) or not text:
        return ""
    secs = split_sections(text)
    order = SECTION_PROFILES[profile]
    parts = [f"{n}: {secs[n].strip()}" for n in order if secs.get(n, "").strip()]
    return "\n\n".join(parts) if parts else text


def compile_set(patterns):
    return re.compile("|".join(patterns))


def match_codes(df, icd9_pats, icd10_pats):
    """Apply the ICD-9 patterns to ICD-9 rows and the ICD-10 patterns to
    ICD-10 rows, using the icd_version column rather than the admission date.
    Each branch is evaluated once, over its own subset only."""
    out = np.zeros(len(df), dtype=bool)
    is9 = (df["icd_version"] == 9).to_numpy()
    if is9.any():
        out[is9] = (df.loc[is9, "code_clean"]
                      .str.match(compile_set(icd9_pats), na=False).to_numpy())
    if (~is9).any():
        out[~is9] = (df.loc[~is9, "code_clean"]
                       .str.match(compile_set(icd10_pats), na=False).to_numpy())
    return out


def clean_text(t):
    """Light touch. Section headers are preserved -- section filtering,
    Longformer and the attention analysis all rely on document structure."""
    if not isinstance(t, str):
        return ""
    t = DEID_PATTERN.sub("[DEID]", t)    
    t = WS_PATTERN.sub(" ", t)
    t = NL_PATTERN.sub("\n\n", t)
    return t.strip()


def locate(directory, name):
    for ext in (".csv.gz", ".csv"):
        p = Path(directory) / f"{name}{ext}"
        if p.exists():
            return p
    raise FileNotFoundError(f"{name}.csv[.gz] not found in {directory}")


# --------------------------------------------------------------------------
# 2. SMALL TABLES
# --------------------------------------------------------------------------

def load_admissions(hosp_dir, min_age):
    print("[1/6] patients + admissions", flush=True)
    patients = pd.read_csv(
        locate(hosp_dir, "patients"),
        usecols=["subject_id", "gender", "anchor_age", "anchor_year"],
    )
    admissions = pd.read_csv(
        locate(hosp_dir, "admissions"),
        usecols=["subject_id", "hadm_id", "admittime"],
        parse_dates=["admittime"],
    )
    adm = admissions.merge(patients, on="subject_id", how="inner")
    # Per-admission age, not patient-level anchor_age.
    adm["age_at_admission"] = (
        adm["anchor_age"] + (adm["admittime"].dt.year - adm["anchor_year"])
    )
    n0 = len(adm)
    adm = adm[adm["age_at_admission"] >= min_age].copy()
    # anchor_age is masked at 91 for anyone over 89 -- flag for the report only
    adm["age_capped"] = adm["age_at_admission"] >= 91
    print(f"      {n0:,} admissions -> {len(adm):,} at age >= {min_age}", flush=True)
    return adm[["subject_id", "hadm_id", "gender", "age_at_admission", "age_capped"]]


def load_labels(hosp_dir, keep_hadm, exclude_bipolar):
    print("[2/6] diagnoses -> binary labels", flush=True)
    dx = pd.read_csv(
        locate(hosp_dir, "diagnoses_icd"),
        usecols=["hadm_id", "icd_code", "icd_version"],
        dtype={"icd_code": str},
    )
    dx = dx[dx["hadm_id"].isin(keep_hadm)].copy()
    dx["code_clean"] = (
        dx["icd_code"].str.upper().str.replace(".", "", regex=False).str.strip()
    )

    dx["depression"] = match_codes(dx, DEPRESSION["icd9"], DEPRESSION["icd10"])
    dx["anxiety"] = match_codes(dx, ANXIETY["icd9"], ANXIETY["icd10"])

    cols = ["depression", "anxiety"]
    matched = {
        lab: dx.loc[dx[lab], "code_clean"].value_counts().head(40).to_dict()
        for lab in cols
    }

    if exclude_bipolar:
        dx["bipolar"] = dx["code_clean"].str.match(compile_set(BIPOLAR), na=False)
        cols = cols + ["bipolar"]

    labels = dx.groupby("hadm_id")[cols].any()
    del dx
    gc.collect()
    return labels.reset_index(), matched


# --------------------------------------------------------------------------
# 3. STREAMING NOTE PASS
# --------------------------------------------------------------------------

def stream_notes(note_dir, keep_hadm, tmp_path, chunksize=10_000,
                 tokenizer_name=None, sample=None, sections="clinical"):
    """Read discharge.csv in chunks. Clean each chunk, cut it down to the
    whitelisted sections, write the text straight to a temporary parquet, and
    keep only numeric metadata in RAM."""
    print("[3/6] discharge summaries (streaming)", flush=True)
    print(f"      section profile: {sections}", flush=True)
    path = locate(note_dir, "discharge")
    keep = set(keep_hadm)

    tok = None
    if tokenizer_name:
        from transformers import AutoTokenizer
        tok = AutoTokenizer.from_pretrained(tokenizer_name)
        print(f"      tokenizer: {tokenizer_name}", flush=True)

    writer = None
    meta_parts = []
    seen = kept = 0

    reader = pd.read_csv(path, usecols=NOTE_COLS, chunksize=chunksize,
                         dtype={"text": str})
    try:
        for i, chunk in enumerate(reader, 1):
            seen += len(chunk)
            sub = chunk[chunk["hadm_id"].isin(keep)].copy()
            del chunk

            if len(sub):
                full = sub["text"].map(clean_text)
                sub["text"] = full.map(lambda t: extract_sections(t, sections))
                # no whitelisted header found -- full note kept as fallback
                sub["section_fallback"] = (sub["text"] == full)
                sub["n_words_full"] = full.str.split().str.len()
                del full

                sub["n_words"] = sub["text"].str.split().str.len()
                sub["char_len"] = sub["text"].str.len()
                sub["on_antidepressant"] = sub["text"].str.contains(ANTIDEPRESSANT_PATTERN)
                # counted separately per label -- a depression-positive note
                # saying "denies anxiety" must not score as a depression leak
                sub["n_leak_depression"] = sub["text"].str.count(DEP_LEAK_PATTERN)
                sub["n_leak_anxiety"] = sub["text"].str.count(ANX_LEAK_PATTERN)

                if tok is not None:
                    enc = tok(sub["text"].tolist(), truncation=False,
                              add_special_tokens=True)
                    sub["n_tokens"] = [len(x) for x in enc["input_ids"]]
                    del enc
                else:
                    # ~1.4 wordpiece tokens per word for clinical text
                    sub["n_tokens"] = (sub["n_words"] * 1.4).round().astype(int)
                sub["n_tokens_full"] = (sub["n_words_full"] * 1.4).round().astype(int)

                table = pa.Table.from_pandas(
                    sub[["hadm_id", "note_id", "text"]], preserve_index=False
                )
                if writer is None:
                    writer = pq.ParquetWriter(tmp_path, table.schema,
                                              compression="snappy")
                writer.write_table(table)
                del table

                meta_parts.append(sub.drop(columns=["text"]))
                kept += len(sub)
                del sub
                gc.collect()

            if i % 5 == 0:
                print(f"      scanned {seen:,}, kept {kept:,} ...", flush=True)
            if sample and kept >= sample:
                print(f"      --sample {sample} reached, stopping early", flush=True)
                break
    finally:
        if writer is not None:
            writer.close()

    meta = pd.concat(meta_parts, ignore_index=True)
    del meta_parts
    gc.collect()
    print(f"      scanned {seen:,} total, kept {kept:,}", flush=True)
    print(f"      median tokens {meta['n_tokens_full'].median():,.0f} -> "
          f"{meta['n_tokens'].median():,.0f}", flush=True)
    print(f"      no whitelisted section (kept full note): "
          f"{100 * meta['section_fallback'].mean():.1f}%", flush=True)
    return meta


# --------------------------------------------------------------------------
# 4. SPLIT  -- returned as its own table, not merged into the cohort
# --------------------------------------------------------------------------

def patient_level_split(df, seed=42, val=0.15, test=0.15):
    """Split on subject_id -- a patient with several admissions must not
    straddle train and test. Discharge summaries restate a patient's history
    almost verbatim between visits, so an admission-level split lets a model
    score by recognising the patient rather than the condition.

    Stratified on the patient's label combination (neither / anxiety only /
    depression only / both), because PR-AUC is prevalence-sensitive and a
    drift in test prevalence would make a PR-AUC drop unreadable.

    Returns a (subject_id, split) frame. One row per patient.
    """
    rng = np.random.default_rng(seed)
    pat = df.groupby("subject_id")[["depression", "anxiety"]].any()
    pat["stratum"] = pat["depression"].astype(int) * 2 + pat["anxiety"].astype(int)

    assign = {}
    for _, grp in pat.groupby("stratum"):
        subs = grp.index.to_numpy().copy()
        rng.shuffle(subs)
        n_test, n_val = int(len(subs) * test), int(len(subs) * val)
        assign.update({s: "test" for s in subs[:n_test]})
        assign.update({s: "val" for s in subs[n_test:n_test + n_val]})
        assign.update({s: "train" for s in subs[n_test + n_val:]})

    return pd.DataFrame(
        {"subject_id": list(assign.keys()), "split": list(assign.values())}
    ).sort_values("subject_id", ignore_index=True)


# --------------------------------------------------------------------------
# 5. FINAL ASSEMBLY  -- stream text back in, attach labels, write one file
# --------------------------------------------------------------------------

def assemble(tmp_path, meta, out_path, batch_size=5_000):
    print("[5/6] writing cohort.parquet (text + labels)", flush=True)
    key = meta.set_index("note_id")
    pf = pq.ParquetFile(tmp_path)
    writer = None
    written = 0

    try:
        for batch in pf.iter_batches(batch_size=batch_size,
                                     columns=["note_id", "text"]):
            part = batch.to_pandas()
            # inner join drops duplicate notes not kept for an admission
            part = part.join(key, on="note_id", how="inner")
            if not len(part):
                continue
            part = part[FINAL_COLS]
            table = pa.Table.from_pandas(part, preserve_index=False)
            if writer is None:
                writer = pq.ParquetWriter(out_path, table.schema,
                                          compression="snappy")
            writer.write_table(table)
            written += len(part)
            del part, table, batch
            gc.collect()
    finally:
        if writer is not None:
            writer.close()
        pf.close()          # Windows will not unlink a file with an open handle

    print(f"      wrote {written:,} rows", flush=True)
    return written


# --------------------------------------------------------------------------
# 6. REPORT
# --------------------------------------------------------------------------

def build_report(df, splits, matched_codes, n_bipolar_dropped, sections):
    d = df.merge(splits, on="subject_id", how="left")
    rep = {
        "n_admissions": int(len(d)),
        "n_patients": int(d["subject_id"].nunique()),
        "n_bipolar_admissions_dropped": int(n_bipolar_dropped),
        "age": {
            "median": float(d["age_at_admission"].median()),
            "iqr": [float(d["age_at_admission"].quantile(.25)),
                    float(d["age_at_admission"].quantile(.75))],
            "pct_age_capped_91": round(100 * d["age_capped"].mean(), 2),
        },
        "sex_pct": d["gender"].value_counts(normalize=True).mul(100).round(2).to_dict(),
        "sections": {
            "profile": sections,
            "kept": SECTION_PROFILES.get(sections, []),
            "median_tokens_before": int(d["n_tokens_full"].median()),
            "median_tokens_after": int(d["n_tokens"].median()),
            "pct_reduction": round(
                100 * (1 - d["n_tokens"].median() / max(d["n_tokens_full"].median(), 1)), 1),
            "pct_no_section_found": round(100 * d["section_fallback"].mean(), 2),
        },
        "note_length_tokens": {
            str(q): int(d["n_tokens"].quantile(q / 100))
            for q in (5, 25, 50, 75, 90, 95, 99)
        },
        "truncation": {
            "pct_over_512": round(100 * (d["n_tokens"] > 512).mean(), 2),
            "pct_over_1024": round(100 * (d["n_tokens"] > 1024).mean(), 2),
            "pct_over_4096": round(100 * (d["n_tokens"] > 4096).mean(), 2),
        },
        "split_sizes_admissions": d["split"].value_counts().to_dict(),
        "split_sizes_patients": splits["split"].value_counts().to_dict(),
        "matched_icd_codes_top40": matched_codes,
    }
    leak_col = {"depression": "n_leak_depression", "anxiety": "n_leak_anxiety"}
    for label in ("depression", "anxiety"):
        pos = d[label].astype(bool)
        own = d[leak_col[label]] > 0
        rep[label] = {
            "n_positive": int(pos.sum()),
            "prevalence_pct": round(100 * pos.mean(), 2),
            "prevalence_by_split_pct": (
                d.groupby("split")[label].mean().mul(100).round(2).to_dict()
            ),
            # own-condition terms only, measured on the filtered text
            "pct_positives_with_explicit_mention": round(100 * own[pos].mean(), 2),
            "pct_negatives_with_explicit_mention": round(100 * own[~pos].mean(), 2),
        }
    # under-diagnosis signal, conditioned on being negative for BOTH labels so
    # a depression patient on sertraline does not inflate the anxiety figure
    neither = ~d["depression"].astype(bool) & ~d["anxiety"].astype(bool)
    rep["undiagnosed"] = {
        "n_negative_for_both": int(neither.sum()),
        "pct_on_antidepressant": round(
            100 * d.loc[neither, "on_antidepressant"].mean(), 2),
        "pct_with_any_explicit_mention": round(
            100 * ((d.loc[neither, "n_leak_depression"]
                    + d.loc[neither, "n_leak_anxiety"]) > 0).mean(), 2),
    }
    rep["comorbid_both_pct"] = round(
        100 * (d["depression"].astype(bool) & d["anxiety"].astype(bool)).mean(), 2
    )
    return rep


# --------------------------------------------------------------------------
# 7. TRAIN-TIME LOADER
# --------------------------------------------------------------------------

def _truncate(text, tok, mode, max_tokens, head_frac=0.25):
    if mode in (None, "none", "full"):
        return text
    if tok is not None:
        ids = tok.encode(text, add_special_tokens=False)
        if len(ids) <= max_tokens:
            return text
        if mode == "head":
            keep = ids[:max_tokens]
        elif mode == "tail":
            keep = ids[-max_tokens:]
        else:  # head_tail
            h = int(max_tokens * head_frac)
            keep = ids[:h] + ids[-(max_tokens - h):]
        return tok.decode(keep)
    # word-level fallback: ~1.4 tokens per word
    words = text.split()
    budget = int(max_tokens / 1.4)
    if len(words) <= budget:
        return text
    if mode == "head":
        return " ".join(words[:budget])
    if mode == "tail":
        return " ".join(words[-budget:])
    h = int(budget * head_frac)
    return " ".join(words[:h] + words[-(budget - h):])


def load_splits(out_dir):
    """The (subject_id, split) table. Small -- hand this to a collaborator so
    both of you score on the same patients."""
    return pd.read_parquet(Path(out_dir) / "splits.parquet")


def load_for_training(out_dir, split=None, mask_leakage=False,
                      truncate=None, max_tokens=512, tokenizer_name=None,
                      columns=None, allow_test=False):
    """Read the cohort and attach the split. Masking and truncation are applied
    here rather than stored, so there is only ever one copy of the notes on
    disk and the raw/masked and head/tail/full ablations stay available.

    test is withheld unless allow_test=True. Tune on val; run test once.
    """
    if split == "test" and not allow_test:
        raise RuntimeError(
            "test split withheld. Every tuning and ablation decision should be "
            "made on val -- scoring 30 configurations on test and reporting the "
            "best turns it into a selection set. Pass allow_test=True for the "
            "single final evaluation."
        )

    out = Path(out_dir)
    splits = load_splits(out)

    filters = None
    if split:
        subs = splits.loc[splits["split"] == split, "subject_id"]
        # pushed down, so the text of the other splits is never read
        filters = [("subject_id", "in", set(subs.tolist()))]

    df = pd.read_parquet(out / "cohort.parquet", filters=filters)
    df = df.merge(splits, on="subject_id", how="left")

    if mask_leakage:
        df["text"] = df["text"].str.replace(LEAK_PATTERN, "[MASK]", regex=True)

    if truncate:
        tok = None
        if tokenizer_name:
            from transformers import AutoTokenizer
            tok = AutoTokenizer.from_pretrained(tokenizer_name)
        df["text"] = df["text"].map(
            lambda t: _truncate(t, tok, truncate, max_tokens)
        )

    return df[columns] if columns else df


# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hosp", required=True)
    ap.add_argument("--note", required=True)
    ap.add_argument("--out", default="cohort")
    ap.add_argument("--min-age", type=int, default=60)
    ap.add_argument("--chunksize", type=int, default=10_000)
    ap.add_argument("--tokenizer", default=None)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--sections", default="clinical",
                    choices=["clinical", "minimal", "none"],
                    help="which discharge summary sections to keep")
    ap.add_argument("--sample", type=int, default=None,
                    help="stop after N notes -- for a fast end-to-end test")
    ap.add_argument("--exclude-bipolar", action="store_true",
                    help="drop admissions carrying a bipolar code")
    ap.add_argument("--keep-tmp", action="store_true")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    tmp_path = out / "_notes_tmp.parquet"

    adm = load_admissions(args.hosp, args.min_age)
    labels, matched_codes = load_labels(args.hosp, set(adm["hadm_id"]),
                                        args.exclude_bipolar)
    meta = stream_notes(args.note, set(adm["hadm_id"]), tmp_path,
                        args.chunksize, args.tokenizer, args.sample,
                        args.sections)

    print("[4/6] joining metadata, labelling, splitting", flush=True)
    # one note per admission -- keep the longest where duplicates exist
    meta = (meta.sort_values("char_len", ascending=False)
                .drop_duplicates("hadm_id", keep="first"))

    df = (adm.merge(labels, on="hadm_id", how="left")
             .merge(meta.drop(columns=["subject_id"]), on="hadm_id", how="inner"))

    n_bipolar = 0
    if args.exclude_bipolar:
        df["bipolar"] = df["bipolar"].fillna(False).astype(bool)
        n_bipolar = int(df["bipolar"].sum())
        df = df[~df["bipolar"]].drop(columns=["bipolar"]).copy()
        print(f"      dropped {n_bipolar:,} admissions with bipolar codes", flush=True)

    # absent from diagnoses_icd == negative
    for c in ("depression", "anxiety"):
        df[c] = df[c].fillna(False).astype(int)

    splits = patient_level_split(df, seed=args.seed)
    splits.to_parquet(out / "splits.parquet", index=False)
    print(f"      {len(splits):,} patients -> splits.parquet", flush=True)

    assemble(tmp_path, df, out / "cohort.parquet")

    print("[6/6] report", flush=True)
    report = build_report(df, splits, matched_codes, n_bipolar, args.sections)
    (out / "cohort_stats.json").write_text(json.dumps(report, indent=2, default=str))

    hist, edges = np.histogram(df["n_tokens"], bins=50)
    pd.DataFrame({"bin_left": edges[:-1], "bin_right": edges[1:],
                  "count": hist}).to_csv(out / "note_length_hist.csv", index=False)

    if not args.keep_tmp:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError as e:
            print(f"      note: could not remove {tmp_path} ({e})", flush=True)

    print(f"\nWrote {out / 'cohort.parquet'}  ({len(df):,} rows, with text)")
    print(f"Wrote {out / 'splits.parquet'}   ({len(splits):,} patients)")
    print(f"Wrote {out / 'cohort_stats.json'}  <- safe to share\n")
    slim = {k: v for k, v in report.items() if k != "matched_icd_codes_top40"}
    print(json.dumps(slim, indent=2, default=str))


if __name__ == "__main__":
    main()