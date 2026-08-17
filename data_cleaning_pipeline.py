"""
MIMIC-IV Cohort Build + Cleaning Pipeline
Project: P000464SE - Modern Transformer Models for Depression & Anxiety Detection

WHAT THIS SCRIPT DOES, IN ORDER:
  Step 1: Load the raw MIMIC-IV tables
  Step 2: Work out each patient's age and keep only those 60+
  Step 3: Find depression/anxiety diagnoses using ICD codes
  Step 4: Attach the discharge summary notes to our cohort
  Step 5: Clean the note text
  Step 6: Look at the data (note length, class balance) before splitting
  Step 7: Split into train/validation/test BY PATIENT (not by note)
  Step 8: Save the final cleaned dataset

HOW TO USE:
  1. Fill in the file paths in the CONFIG section below.
  2. Run one step at a time by executing this file in a Jupyter notebook cell-by-cell,
     OR run the whole thing with: python data_cleaning_pipeline.py
  3. Read the print statements after each step. They tell you how many rows you have
     and whether something looks wrong (e.g. an empty result).
"""

import pandas as pd
import re

# ======================================================================
# CONFIG - EDIT THESE PATHS TO MATCH WHERE YOUR MIMIC-IV FILES ACTUALLY ARE
# ======================================================================
PATIENTS_PATH = "/Users/srimanram/Downloads/MIMIC-IV/hosp/patients.csv.gz"
ADMISSIONS_PATH = "/Users/srimanram/Downloads/MIMIC-IV/hosp/admissions.csv.gz"
DIAGNOSES_PATH = "/Users/srimanram/Downloads/MIMIC-IV/hosp/diagnoses_icd.csv.gz"
D_ICD_DIAGNOSES_PATH = "/Users/srimanram/Downloads/MIMIC-IV/hosp/d_icd_diagnoses.csv.gz"
DISCHARGE_NOTES_PATH = "/Users/srimanram/Downloads/MIMIC-IV/note/discharge.csv.gz"

MIN_AGE = 60
OUTPUT_PATH = "/Users/srimanram/Downloads/MIMIC-IV/cleaned_cohort.parquet"


# ======================================================================
# STEP 1: Load the raw tables
# ======================================================================
def step1_load_tables():
    print("STEP 1: Loading raw tables...")
    patients = pd.read_csv(PATIENTS_PATH)
    admissions = pd.read_csv(ADMISSIONS_PATH)
    diagnoses = pd.read_csv(DIAGNOSES_PATH)
    d_icd = pd.read_csv(D_ICD_DIAGNOSES_PATH)
    print(f"  patients: {len(patients)} rows")
    print(f"  admissions: {len(admissions)} rows")
    print(f"  diagnoses_icd: {len(diagnoses)} rows")
    print(f"  d_icd_diagnoses: {len(d_icd)} rows")
    return patients, admissions, diagnoses, d_icd


# ======================================================================
# STEP 2: Build the cohort - keep only patients aged 60+
# ======================================================================
def step2_build_cohort(patients, admissions):
    print("\nSTEP 2: Filtering to patients aged 60+...")
    # MIMIC-IV gives 'anchor_age' (patient's age at their anchor_year) in the patients table.
    # We treat this as their approximate age for cohort filtering.
    cohort = admissions.merge(
        patients[["subject_id", "anchor_age", "gender"]],
        on="subject_id",
        how="left",
    )
    cohort = cohort.rename(columns={"anchor_age": "age"})
    before = cohort["subject_id"].nunique()
    cohort = cohort[cohort["age"] >= MIN_AGE]
    after = cohort["subject_id"].nunique()
    print(f"  patients before age filter: {before}")
    print(f"  patients after age >= {MIN_AGE} filter: {after}")
    return cohort


# ======================================================================
# STEP 3: Create depression/anxiety labels from ICD codes
# ======================================================================
# These code prefixes are a starting point. Confirm the exact list with your
# supervisor/client before finalizing, since precise code sets affect your labels.
DEPRESSION_ICD9_PREFIXES = ["2962", "2963", "3004", "311"]
DEPRESSION_ICD10_PREFIXES = ["F32", "F33", "F341"]
ANXIETY_ICD9_PREFIXES = ["3000"]
ANXIETY_ICD10_PREFIXES = ["F41"]


def _code_matches(code, prefixes):
    code = str(code)
    return any(code.startswith(p) for p in prefixes)


def step3_create_labels(cohort, diagnoses):
    print("\nSTEP 3: Building depression/anxiety labels from ICD codes...")
    diagnoses = diagnoses.copy()
    diagnoses["is_depression"] = diagnoses.apply(
        lambda r: _code_matches(r["icd_code"], DEPRESSION_ICD9_PREFIXES if r["icd_version"] == 9 else DEPRESSION_ICD10_PREFIXES),
        axis=1,
    )
    diagnoses["is_anxiety"] = diagnoses.apply(
        lambda r: _code_matches(r["icd_code"], ANXIETY_ICD9_PREFIXES if r["icd_version"] == 9 else ANXIETY_ICD10_PREFIXES),
        axis=1,
    )

    labels = diagnoses.groupby(["subject_id", "hadm_id"]).agg(
        depression_label=("is_depression", "max"),
        anxiety_label=("is_anxiety", "max"),
    ).reset_index()

    cohort = cohort.merge(labels, on=["subject_id", "hadm_id"], how="left")
    cohort["depression_label"] = cohort["depression_label"].fillna(False)
    cohort["anxiety_label"] = cohort["anxiety_label"].fillna(False)

    print(f"  depression positive: {cohort['depression_label'].sum()}")
    print(f"  anxiety positive: {cohort['anxiety_label'].sum()}")
    print(f"  neither: {((~cohort['depression_label']) & (~cohort['anxiety_label'])).sum()}")
    return cohort


# ======================================================================
# STEP 4: Attach discharge summary notes to the cohort
# ======================================================================
def step4_attach_notes(cohort, notes_path=DISCHARGE_NOTES_PATH):
    print("\nSTEP 4: Attaching discharge notes...")
    notes = pd.read_csv(notes_path)
    # discharge.csv.gz has one row per note, keyed by subject_id + hadm_id
    merged = cohort.merge(
        notes[["subject_id", "hadm_id", "text"]],
        on=["subject_id", "hadm_id"],
        how="inner",  # only keep admissions that actually have a discharge note
    )
    print(f"  admissions with a matched discharge note: {len(merged)}")
    return merged


# ======================================================================
# STEP 5: Clean the note text
# ======================================================================
def clean_note_text(text):
    if not isinstance(text, str):
        return ""
    # Collapse repeated de-identification placeholders like "___" into a single token
    text = re.sub(r"_{2,}", "[DEID]", text)
    # Normalize whitespace: multiple spaces/newlines -> single space
    text = re.sub(r"\s+", " ", text)
    # Strip leading/trailing whitespace
    text = text.strip()
    return text


def step5_clean_text(df):
    print("\nSTEP 5: Cleaning note text...")
    df = df.copy()
    df["clean_text"] = df["text"].apply(clean_note_text)
    empty_after_clean = (df["clean_text"].str.len() == 0).sum()
    print(f"  notes that became empty after cleaning (check these): {empty_after_clean}")
    return df


# ======================================================================
# STEP 6: Explore before splitting - note length + class balance
# ======================================================================
def step6_explore(df):
    print("\nSTEP 6: Exploring note length and class balance...")
    df = df.copy()
    df["word_count"] = df["clean_text"].str.split().str.len()
    print(df["word_count"].describe())
    print("\n  Class balance:")
    print(f"  depression_label:\n{df['depression_label'].value_counts()}")
    print(f"  anxiety_label:\n{df['anxiety_label'].value_counts()}")
    return df


# ======================================================================
# STEP 7: Split by PATIENT (not by note) to avoid data leakage
# ======================================================================
def step7_patient_split(df, train_frac=0.7, val_frac=0.15, seed=42):
    print("\nSTEP 7: Splitting by patient (train/val/test)...")
    patient_ids = df["subject_id"].drop_duplicates().sample(frac=1, random_state=seed)
    n = len(patient_ids)
    n_train = int(n * train_frac)
    n_val = int(n * val_frac)

    train_ids = set(patient_ids.iloc[:n_train])
    val_ids = set(patient_ids.iloc[n_train:n_train + n_val])
    test_ids = set(patient_ids.iloc[n_train + n_val:])

    def assign_split(pid):
        if pid in train_ids:
            return "train"
        elif pid in val_ids:
            return "val"
        else:
            return "test"

    df = df.copy()
    df["split"] = df["subject_id"].apply(assign_split)
    print(df["split"].value_counts())
    return df


# ======================================================================
# STEP 8: Save the final cleaned dataset
# ======================================================================
def step8_save(df, path=OUTPUT_PATH):
    print(f"\nSTEP 8: Saving cleaned dataset to {path}...")
    keep_cols = ["subject_id", "hadm_id", "age", "gender", "clean_text",
                 "depression_label", "anxiety_label", "split"]
    df[keep_cols].to_parquet(path, index=False)
    print("  Done.")


# ======================================================================
# RUN EVERYTHING (comment out steps if running interactively one at a time)
# ======================================================================
if __name__ == "__main__":
    patients, admissions, diagnoses, d_icd = step1_load_tables()
    cohort = step2_build_cohort(patients, admissions)
    cohort = step3_create_labels(cohort, diagnoses)
    cohort = step4_attach_notes(cohort)
    cohort = step5_clean_text(cohort)
    cohort = step6_explore(cohort)
    cohort = step7_patient_split(cohort)
    step8_save(cohort)
