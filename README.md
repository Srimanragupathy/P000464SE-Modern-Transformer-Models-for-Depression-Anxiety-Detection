# P000464SE - Modern Transformer Models for Depression & Anxiety Detection

Benchmarking modern transformer models for detecting depression and anxiety in older adults (60+), using clinical discharge summaries from the MIMIC-IV dataset.

## About

Depression and anxiety are often underdiagnosed in older adults, a group that's especially vulnerable to mental health conditions alongside complex physical comorbidities. Most prior NLP research in this space relies on older BERT-based models and rarely focuses on the geriatric population specifically.

This project benchmarks five transformer models on MIMIC-IV discharge summaries (patients aged 60+), with depression and anxiety labels derived from ICD-9/10 diagnostic codes:

- ClinicalBERT (baseline)
- RoBERTa
- DeBERTa
- Clinical Longformer
- A prompt-based GPT model

Models are compared on AUC, F1, and precision-recall metrics. The project also includes interpretability analysis (SHAP, attention visualization) to identify the clinical language patterns most predictive of depression and anxiety in older adults, and a simple decision-support dashboard to visualize risk scores and highlight key predictive note spans.

## Team

- Kartik Sharma
- Elio Cy
- Purna Peramune (Scrum Master)
- Sriman Ragupathy

**Supervisor:** Dr. Prabha Rajagopal
**Client / Product Owner:** Dr. Priya Rani, Kayathiri Mahendrakumaran

## Tech Stack

- Python, PyTorch, Hugging Face Transformers
- CUDA for GPU-accelerated training
- RACE (RMIT's research computing environment, on AWS) — EC2 GPU instance / SageMaker notebook

## Data

- [MIMIC-IV](https://physionet.org/content/mimiciv/3.1/) — restricted clinical dataset, accessed under a data use agreement.

## Project Management

- **Jira board:** https://rmit-sepm-m3-9.atlassian.net/jira/software/projects/RMIT/boards/36/backlog
- Product backlog, sprint planning, and task tracking are managed there.

## Status

Sprint 0 — literature review, data understanding, and infrastructure setup in progress.
