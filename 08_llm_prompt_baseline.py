"""
Prompt-based (zero-shot) classification of discharge notes for depression and anxiety.
Model: Qwen2.5-7B-Instruct, open-weight, run locally on RACE. Not fine-tuned.
Open-weight model used instead of GPT so notes are not sent to an external API (client requirement).
Evaluated on the same test split as the fine-tuned models. Set TASK below, then run this file.
"""

import json, os, re, math
import numpy as np
import pandas as pd
import torch
from tqdm import tqdm
from sklearn.metrics import precision_recall_fscore_support, accuracy_score, classification_report
from transformers import AutoTokenizer, AutoModelForCausalLM

# ============================ CONFIG ============================
DATA_PATH = "cleaned_cohort.parquet"

TASK = "depression"                     # "depression" or "anxiety"

TEXT_COL  = "clean_text"
SPLIT_COL = "split"
LABEL_COL = "depression_label" if TASK == "depression" else "anxiety_label"

MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"

MAX_SAMPLES    = None       # None = full test split. Set a number (e.g. 40) for a quick test.
BATCH_SIZE     = 16         # lower to 8 if you hit a CUDA out-of-memory error
MAX_TOKENS     = 3072       # max input tokens per note (notes longer than this are truncated)
MAX_NEW_TOKENS = 96
OUTPUT_DIR     = f"results_llm_{TASK}"
PRED_PATH      = os.path.join(OUTPUT_DIR, "predictions.csv")
# ===============================================================

CONDITION = "depression" if TASK == "depression" else "anxiety"

SYSTEM_PROMPT = (
    "You are a careful clinical NLP assistant. You read a hospital discharge "
    "summary and decide whether the patient shows evidence of a given condition. "
    "You base the decision only on the text provided. You always answer in the "
    "exact JSON format requested and nothing else."
)

def build_user_prompt(note_text):
    return (
        f"Task: decide whether this patient shows evidence of {CONDITION}.\n"
        f"Consider the diagnoses, history, and medications in the note "
        f"(for example, relevant conditions noted or medications commonly used for {CONDITION}).\n\n"
        f"Answer with JSON only, in exactly this format:\n"
        f'{{"label": 0 or 1, "reason": "one short sentence"}}\n'
        f"Use 1 if there is evidence of {CONDITION}, 0 if there is not.\n\n"
        f"Discharge summary:\n\"\"\"\n{note_text}\n\"\"\""
    )

def parse_label(content):
    if not content:
        return None, ""
    try:
        m = re.search(r"\{.*\}", content, re.S)
        if m:
            obj = json.loads(m.group(0))
            if "label" in obj:
                return int(obj["label"]), str(obj.get("reason", ""))[:300]
    except Exception:
        pass
    m = re.search(r"\b([01])\b", content)
    if m:
        return int(m.group(1)), content.strip()[:300]
    return None, content.strip()[:300]


def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Task: {TASK} | Label: {LABEL_COL} | Model: {MODEL_NAME} | Device: {device}", flush=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ---- data ----
    df = pd.read_parquet(DATA_PATH)
    df = df[[TEXT_COL, LABEL_COL, SPLIT_COL]].dropna(subset=[TEXT_COL, LABEL_COL]).reset_index(drop=True)
    df["label"] = df[LABEL_COL].astype(int)
    s = df[SPLIT_COL].astype(str).str.strip().str.lower()
    test_df = df[s.isin(["test"])].reset_index(drop=True)
    if len(test_df) == 0:
        print("No test rows; using all rows."); test_df = df.reset_index(drop=True)
    if MAX_SAMPLES:
        test_df = test_df.sample(n=min(MAX_SAMPLES, len(test_df)), random_state=42).reset_index(drop=True)
    test_df["row_id"] = test_df.index
    print(f"Test notes: {len(test_df)} | label balance:\n{test_df['label'].value_counts()}", flush=True)

    # ---- resume: which row_ids are already done ----
    done_ids = set()
    if os.path.exists(PRED_PATH):
        prev = pd.read_csv(PRED_PATH)
        done_ids = set(prev["row_id"].tolist())
        print(f"Resuming: {len(done_ids)} notes already done, skipping them.", flush=True)

    todo = test_df[~test_df["row_id"].isin(done_ids)].reset_index(drop=True)
    if len(todo) == 0:
        print("All notes already processed. Computing metrics.", flush=True)
    else:
        print(f"To process now: {len(todo)}", flush=True)

        # ---- model ----
        print("Loading model...", flush=True)
        tok = AutoTokenizer.from_pretrained(MODEL_NAME)
        tok.padding_side = "left"
        if tok.pad_token is None:
            tok.pad_token = tok.eos_token
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME, dtype=torch.float16, device_map="auto"
        )
        model.eval()

        write_header = not os.path.exists(PRED_PATH)
        n_batches = math.ceil(len(todo) / BATCH_SIZE)
        for b in tqdm(range(n_batches)):
            chunk = todo.iloc[b*BATCH_SIZE:(b+1)*BATCH_SIZE]
            prompts = []
            for txt in chunk[TEXT_COL].astype(str):
                messages = [{"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": build_user_prompt(txt)}]
                prompts.append(tok.apply_chat_template(messages, add_generation_prompt=True, tokenize=False))
            enc = tok(prompts, return_tensors="pt", padding=True, truncation=True,
                      max_length=MAX_TOKENS).to(model.device)
            with torch.no_grad():
                out = model.generate(**enc, max_new_tokens=MAX_NEW_TOKENS, do_sample=False,
                                     pad_token_id=tok.pad_token_id)
            gen = out[:, enc["input_ids"].shape[1]:]
            replies = tok.batch_decode(gen, skip_special_tokens=True)

            recs = []
            for (_, r), reply in zip(chunk.iterrows(), replies):
                pred, reason = parse_label(reply)
                recs.append({"row_id": int(r["row_id"]), "true": int(r["label"]),
                             "pred": pred if pred is not None else -1, "reason": reason})
            pd.DataFrame(recs).to_csv(PRED_PATH, mode="a", header=write_header, index=False)
            write_header = False

    # ---- metrics from everything saved ----
    preds = pd.read_csv(PRED_PATH)
    preds = preds[preds["pred"].isin([0, 1])]
    y_true, y_pred = preds["true"].tolist(), preds["pred"].tolist()
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)
    acc = accuracy_score(y_true, y_pred)
    print(f"\n==== LLM {TASK.upper()} RESULTS ({len(y_pred)} notes) ====", flush=True)
    print(f"accuracy:  {acc:.4f}\nprecision: {precision:.4f}\nrecall:    {recall:.4f}\nf1:        {f1:.4f}", flush=True)
    print("\n" + classification_report(y_true, y_pred, digits=4), flush=True)
    with open(os.path.join(OUTPUT_DIR, "llm_metrics.json"), "w") as f:
        json.dump({"model": MODEL_NAME, "task": TASK, "n": len(y_pred),
                   "accuracy": acc, "precision": precision, "recall": recall, "f1": f1}, f, indent=2)
    print(f"Saved metrics to {OUTPUT_DIR}/llm_metrics.json", flush=True)


if __name__ == "__main__":
    main()
