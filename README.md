# P000464SE — Modern Transformer Models for Depression and Anxiety Detection

This project investigates transformer-based detection of depression and anxiety in older adults aged 60 years and above using de-identified clinical discharge summaries from MIMIC-IV. It compares frozen-encoder baseline models with fully fine-tuned transformer models and provides comparative evaluation, subgroup analysis, interpretability analysis, and a React–Flask research dashboard.

> **Research use only:** The models and dashboard produce experimental risk estimates. They are not clinical diagnoses and must not replace assessment by a qualified healthcare professional.

## Project objectives

- Prepare reproducible depression and anxiety cohorts for patients aged 60+.
- Compare baseline and fine-tuned transformer models.
- Evaluate ClinicalBERT, RoBERTa, DeBERTa, and Clinical Longformer.
- Examine the effect of context length and note truncation.
- Compare models using PR-AUC, ROC-AUC, F1, balanced accuracy, recall, precision, specificity, and accuracy.
- Perform statistical and demographic subgroup analyses.
- Use SHAP and attention-based methods to examine influential clinical language.
- Present the research outputs through an interactive dashboard.

## Core models

| Model | Main characteristic | Maximum context used |
|---|---|---:|
| ClinicalBERT | Pretrained on clinical language | 512 tokens |
| RoBERTa | Robust general-language transformer | 512 tokens |
| DeBERTa | Disentangled attention representations | 512 tokens |
| Clinical Longformer | Long-context clinical transformer | 2,048 tokens |

The repository also contains a separate `task 5 - prompt based GPT model` directory. This is an additional experimental component and is not required before running the core baseline-versus-fine-tuned transformer comparison.

## Repository structure

```text
P000464SE-Modern-Transformer-Models-for-Depression-Anxiety-Detection/
├── 01_dataset_exploration.ipynb
├── 02_build_cohort.ipynb
├── 03_text_preprocessing_and_task_preparation.ipynb
├── task 1 - baseline BERT models for depression/
├── task 2 - finetuned BERT models for depression/
├── task 3 - baseline BERT models for anxiety/
├── task 4 - finetuned BERT models for anxiety/
├── task 5 - prompt based GPT model/
├── 04_comparative_evaluation_and_statistical_analysis.ipynb
├── 05_interpretability_analysis.ipynb
├── dashboard/
├── model_outputs/
├── .gitignore
└── README.md
```

Folder names should be kept unchanged because some notebooks and dashboard configuration files may refer to them.

## Recommended notebook execution order

Run the notebooks in the following order when exploring or reproducing the work.

| Order | Notebook or folder | Purpose |
|---:|---|---|
| 1 | `01_dataset_exploration.ipynb` | Explore the dataset, patient ages, class distributions, note lengths, clinical sections, and demographic characteristics. |
| 2 | `02_build_cohort.ipynb` | Construct the eligible 60+ cohort, create depression and anxiety labels, and establish patient-level dataset splits. |
| 3 | `03_text_preprocessing_and_task_preparation.ipynb` | Clean the notes, select clinical sections, mask explicit target terms, and prepare the final datasets used by the models. |
| 4 | `task 1 - baseline BERT models for depression` | Train and evaluate frozen-encoder baselines for depression. |
| 5 | `task 2 - finetuned BERT models for depression` | Fine-tune and evaluate the same transformer architectures for depression. |
| 6 | `task 3 - baseline BERT models for anxiety` | Train and evaluate frozen-encoder baselines for anxiety. |
| 7 | `task 4 - finetuned BERT models for anxiety` | Fine-tune and evaluate the same transformer architectures for anxiety. |
| 8 | `04_comparative_evaluation_and_statistical_analysis.ipynb` | Compare the final fine-tuned models, perform statistical testing, and assess demographic subgroups. |
| 9 | `05_interpretability_analysis.ipynb` | Generate SHAP, attention, and clinical-language-marker analyses for the selected models. |
| 10 | `dashboard/` | Run the web dashboard after the required outputs and model checkpoints are available. |

## Step 1 — Dataset exploration

Run:

```text
01_dataset_exploration.ipynb
```

This notebook provides the initial understanding of the data, including:

- Age distribution and the selection of patients aged 60+.
- Depression and anxiety class distributions.
- Sex and demographic summaries.
- Comorbidity patterns.
- Clinical-note section availability.
- Note-length and token-length distributions.
- Figures used in the dashboard's Dataset Exploration page.

Run this notebook before cohort construction so that the inclusion criteria and later modelling decisions can be understood in context.

## Step 2 — Cohort construction

Run:

```text
02_build_cohort.ipynb
```

This notebook:

- Applies the age and admission eligibility criteria.
- Derives depression and anxiety labels using the defined diagnostic-code rules.
- Maintains subject and admission identifiers required for later evaluation.
- Creates patient-level training, validation, and test splits.
- Helps prevent the same patient from being shared across different data splits.

The generated cohort and split assignments should be preserved and reused across models wherever the comparison design requires a common cohort.

## Step 3 — Text preprocessing and task preparation

Run:

```text
03_text_preprocessing_and_task_preparation.ipynb
```

The main text profile uses the following clinically relevant sections:

```text
past medical history
chief complaint
history of present illness
medications on admission
discharge medications
brief hospital course
```

This notebook performs the shared preparation required before training, including:

- Text cleaning and whitespace normalisation.
- Clinical-section extraction.
- Removal or masking of explicit depression and anxiety terms to reduce label leakage.
- Preparation of depression and anxiety task datasets.
- Preservation of patient-level train, validation, and test assignments.
- Generation of the processed files consumed by the model notebooks.

The preprocessing outputs should be completed before opening the model-training folders.

## Steps 4–7 — Model experiments

The four task folders implement the baseline-versus-fine-tuned comparison for depression and anxiety.

### Task 1 — Depression baseline models

```text
task 1 - baseline BERT models for depression/
```

These notebooks keep the pretrained transformer encoder frozen and train only the task-specific classification head. They provide the non-fine-tuned comparison condition for depression.

### Task 2 — Depression fine-tuned models

```text
task 2 - finetuned BERT models for depression/
```

These notebooks unfreeze the transformer and update the model parameters using the depression training data.

### Task 3 — Anxiety baseline models

```text
task 3 - baseline BERT models for anxiety/
```

These notebooks provide the frozen-encoder comparison condition for anxiety.

### Task 4 — Anxiety fine-tuned models

```text
task 4 - finetuned BERT models for anxiety/
```

These notebooks fine-tune the transformer architectures using the anxiety training data.

### Model order inside each task folder

Where available, follow the same architecture order in every task folder:

1. ClinicalBERT
2. RoBERTa
3. DeBERTa
4. Clinical Longformer

This order is not a technical dependency between models, but it makes the experimental process and output review consistent. Models should normally be run one at a time when GPU memory is limited.

### Important baseline-versus-fine-tuned distinction

| Experiment | Pretrained encoder | Classification head |
|---|---|---|
| Baseline | Frozen | Trained |
| Fine-tuned | Unfrozen and updated | Trained |

For a fair comparison, the same task dataset, data splits, text profile, evaluation approach, and relevant preprocessing settings should be maintained between the baseline and fine-tuned versions. Learning rates may differ because classifier-only training and full-model fine-tuning have different optimisation requirements.

### Expected model outputs

Depending on the notebook, each completed run may produce:

```text
best_model/
early_stop_signal_model/
final_epoch_model/
deployment_bundle/
predictions/test_predictions.csv
run_manifest.json
metrics.json
training_history.csv
token_length_summary.csv
figures/
```

Use the `best_model` checkpoint selected using validation performance for final testing, comparative evaluation, interpretability analysis, and dashboard inference. Do not select a checkpoint using test-set performance.

For fair paired statistical comparisons, `test_predictions.csv` should retain at least:

```text
subject_id
hadm_id
label
predicted_label
positive_probability
```

## Step 8 — Comparative evaluation and statistical analysis

After the required model runs have completed, run:

```text
04_comparative_evaluation_and_statistical_analysis.ipynb
```

This notebook covers:

- Separate depression and anxiety performance summaries.
- Identification of the best-performing model for each task.
- Confidence intervals and paired statistical comparisons.
- Multiple-comparison adjustment.
- Demographic subgroup analysis by age, sex, and comorbidity load.
- Common-cohort checks where paired model comparisons are required.
- Benchmark tables and dashboard-ready figures.

The notebook expects prediction files and supporting run artifacts to be present in the configured `model_outputs` paths. Update only the path configuration when the output folders are moved; the evaluation logic should remain unchanged.

## Step 9 — Interpretability analysis

Run:

```text
05_interpretability_analysis.ipynb
```

This notebook performs the final interpretability work, including:

- SHAP analysis on selected best-performing models.
- Attention visualisation for representative notes.
- Ranking of clinical language markers associated with model predictions.
- Separate depression and anxiety outputs.
- Clinical sanity checks of important markers.
- Dashboard-ready figures and tables.

The interpretability outputs describe model behaviour and associations. They do not establish that a highlighted term causes depression or anxiety.

## Step 10 — Dashboard

The `dashboard` directory contains the React frontend and Flask backend used to present the research results and run the live prediction demonstration.

```text
dashboard/
├── backend/
├── frontend/
└── README.md
```

The dashboard includes:

- Overview
- Dataset Exploration
- Depression Models
- Anxiety Models
- Live Prediction
- Subgroup Analysis
- Interpretability
- Methodology

Follow the setup and run instructions in:

```text
dashboard/README.md
```

The dashboard does not require a database. It reads prepared figures, CSV/JSON outputs, and local fine-tuned model checkpoints. Live prediction requires both the React frontend and Flask backend to be running.

<img width="1512" height="982" alt="Screenshot 2026-10-16 at 16 54 34" src="https://github.com/user-attachments/assets/0960ba5a-e363-4490-ab1c-1af341eb53a2" />

## Team

- Purna Peramune
- Elio Cy
- Kartik Sharma
- Sriman Ragupathy

**Supervisor:** Dr. Prabha Rajagopal  
**Client / Product Owner:** Dr. Priya Rani and Ms. Kayathiri Mahendrakumaran

## Technology stack

- Python
- PyTorch
- Hugging Face Transformers
- pandas, NumPy, SciPy, and scikit-learn
- SHAP and transformer attention analysis
- JupyterLab
- CUDA-enabled GPU training where available
- RMIT RACE/AWS research computing environment
- React and Vite frontend
- Flask backend

## Project management

Project tasks, sprint planning, and backlog management are maintained through the team Jira board:

<https://rmit-sepm-m3-9.atlassian.net/jira/software/projects/RMIT/boards/36/backlog>
