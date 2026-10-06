import streamlit as st
import pandas as pd
import numpy as np

st.set_page_config(page_title="Depression & Anxiety Detection Dashboard", layout="wide")

st.title("Depression & Anxiety Detection Dashboard")
st.caption(
    "Data Overview now shows real MIMIC-IV cohort statistics (aggregate counts only, "
    "no patient-level data). Models, Performance, Live Demo and Summary still show "
    "placeholder data until real model outputs are wired in."
)

MODELS = {
    "ClinicalBERT": {"Type": "Fine-tuned", "Learning rate": "2e-5", "Batch size": 16, "Epochs": 4},
    "RoBERTa": {"Type": "Fine-tuned", "Learning rate": "1e-5", "Batch size": 16, "Epochs": 5},
    "DeBERTa": {"Type": "Fine-tuned", "Learning rate": "1e-5", "Batch size": 8, "Epochs": 5},
    "Clinical Longformer": {"Type": "Fine-tuned", "Learning rate": "3e-5", "Batch size": 4, "Epochs": 3},
    "GPT (prompt-based)": {"Type": "Base (prompted)", "Learning rate": "n/a", "Batch size": "n/a", "Epochs": "n/a"},
}

METRICS = {
    "ClinicalBERT": {"AUC": 0.82, "F1": 0.76, "Precision-Recall": 0.73},
    "RoBERTa": {"AUC": 0.85, "F1": 0.79, "Precision-Recall": 0.77},
    "DeBERTa": {"AUC": 0.86, "F1": 0.80, "Precision-Recall": 0.78},
    "Clinical Longformer": {"AUC": 0.89, "F1": 0.84, "Precision-Recall": 0.82},
    "GPT (prompt-based)": {"AUC": 0.74, "F1": 0.68, "Precision-Recall": 0.65},
}

tab1, tab2, tab3, tab4, tab5 = st.tabs(
    ["Data Overview", "Models", "Performance Comparison", "Live Prediction Demo", "Summary"]
)

# ---------- 1. Data Overview ----------
with tab1:
    st.subheader("Patient age bands")
    st.image("assets/age_bands.png", use_column_width=True)
    st.markdown(
        "**Why we focus on age 60+:** older adults are more vulnerable to "
        "depression and anxiety, and these conditions more easily go undetected "
        "in this group — mental health symptoms are often masked by, or "
        "attributed to, co-occurring physical illnesses. In this cohort, patients "
        "60 and over make up roughly a third of the population (33.6% — "
        "122,566 of 364,627 patients), so we track this band separately to check "
        "the model performs consistently for this higher-risk group, not just on "
        "average across all ages."
    )

    st.divider()

    st.subheader("Gender distribution")
    st.image("assets/gender_distribution.png", use_column_width=True)
    st.markdown(
        "**Why we report this:** depression and anxiety prevalence and presentation "
        "differ by gender in the clinical literature, so we track this split to "
        "check the dataset isn't skewed in a way that would bias the model toward "
        "one group. The cohort is close to balanced — 52.7% female (191,984) and "
        "47.3% male (172,643)."
    )

    st.divider()

    st.subheader("Which note sections we used, and why")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Fields included**")
        st.markdown(
            "- Past medical history\n"
            "- History of present illness\n"
            "- Medications on admission\n"
            "- Brief hospital course\n"
            "- Discharge diagnosis"
        )
        st.caption(
            "These sections carry most of the information relevant to a "
            "diagnosis. We also tested a wider 'clinical' profile that added "
            "chief complaint and discharge medications, but it pushed notes "
            "well past BERT's 512-token limit — the extra length meant more "
            "truncation, which actually lost more information than it added. "
            "Chunking the note instead wasn't practical given how long these "
            "models already take to train. So we went with this minimal set, "
            "which keeps more of each note intact."
        )
    with col2:
        st.markdown("**Excluded (and why)**")
        st.markdown("- Social history")
        st.caption("Dropped at the client's request.")

# ---------- 2. Models ----------
with tab2:
    st.subheader("Select a model to see its setup")
    model_choice_2 = st.selectbox("Model", list(MODELS.keys()), key="models_tab_select")
    st.table(pd.DataFrame([MODELS[model_choice_2]]))

# ---------- 3. Performance Comparison ----------
with tab3:
    st.subheader("Training / loss curve")
    model_choice_3 = st.selectbox("Model", list(MODELS.keys()), key="perf_tab_select")

    epochs = np.arange(1, 6)
    rng = np.random.default_rng(seed=hash(model_choice_3) % (2**32))
    train_loss = np.sort(rng.uniform(0.2, 0.7, size=5))[::-1]
    val_loss = train_loss + rng.uniform(0.02, 0.1, size=5)
    loss_df = pd.DataFrame({"Train loss": train_loss, "Val loss": val_loss}, index=epochs)
    st.line_chart(loss_df)

    st.subheader("Final metrics")
    m = METRICS[model_choice_3]
    c1, c2, c3 = st.columns(3)
    c1.metric("AUC", m["AUC"])
    c2.metric("F1", m["F1"])
    c3.metric("Precision-Recall", m["Precision-Recall"])

    st.subheader("All models — side by side")
    st.dataframe(pd.DataFrame(METRICS).T)

# ---------- 4. Live Prediction Demo ----------
with tab4:
    st.subheader("Paste a discharge summary")
    note_text = st.text_area(
        "Note text",
        height=150,
        placeholder="Patient reports feeling low for the past two weeks, with loss of interest in daily activities...",
        label_visibility="collapsed",
    )

    if st.button("Predict"):
        if not note_text.strip():
            st.warning("Paste a note first.")
        else:
            # Dummy keyword match — placeholder only, not a real model.
            keywords = ["low", "sad", "hopeless", "loss of interest", "anxious", "worry", "worried"]
            found = [kw for kw in keywords if kw in note_text.lower()]

            if found:
                st.error("Prediction: Depression / Anxiety — likely")
                highlighted = note_text
                for kw in found:
                    highlighted = highlighted.replace(kw, f":orange[**{kw}**]")
                st.markdown("**Highlighted spans**")
                st.markdown(highlighted)
            else:
                st.success("Prediction: Not likely")
                st.caption("No flagged terms found in this dummy demo logic.")

# ---------- 5. Summary ----------
with tab5:
    st.subheader("Final results recap")
    c1, c2 = st.columns(2)
    c1.metric("Best model — Depression", "Clinical Longformer")
    c2.metric("Best model — Anxiety", "DeBERTa")
    st.markdown(
        "Recap: five models compared across depression and anxiety detection, "
        "with final AUC, F1 and precision-recall for each, plus a short note on "
        "interpretability findings."
    )
