# Clinical NLP Mental Health Dashboard

This dashboard presents the results of transformer-based depression and anxiety detection from de-identified clinical notes. It combines a React frontend with a Flask inference API and supports ClinicalBERT, RoBERTa, DeBERTa, and Clinical Longformer. The dashboard is intended for research demonstration only and must not be used as a clinical diagnosis or decision-making system.

## Dashboard features

- Project and model overview
- Dataset exploration figures
- Depression model results
- Anxiety model results
- Live depression and anxiety risk prediction
- Comparative and subgroup analysis
- Interpretability results
- Methodology summary
- Selection among available fine-tuned models
- Clear warnings when part of a note exceeds a model's token limit

## Technology stack

- Frontend: React, Vite, JavaScript, and CSS
- Backend: Python and Flask
- Model inference: PyTorch and Hugging Face Transformers
- Data storage: Local CSV, JSON, image, figure, and model-output files
- Database: Not required

## Project structure

```text
dashboard/
├── backend/
│   ├── .venv/
│   ├── app.py
│   ├── model_registry.py
│   ├── predictor.py
│   ├── preprocessing.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

The trained model directories are stored outside the dashboard folder under the main project's `model_outputs` directory.

## Prerequisites

Install the following software before starting:

- Python 3.10 or 3.11
- Node.js 18 or later
- npm
- Git

The trained model checkpoints must also be available locally.

## 1. Clone and open the project

```bash
git clone <your-repository-url>
cd P000464SE-Modern-Transformer-Models-for-Depression-Anxiety-Detection/dashboard
```

Replace `<your-repository-url>` with the GitHub repository URL.

## 2. Set up the Flask backend

From the `dashboard` directory, create a virtual environment:

```bash
python3 -m venv backend/.venv
```

Activate it on macOS or Linux:

```bash
source backend/.venv/bin/activate
```

Activate it on Windows PowerShell:

```powershell
backend\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```bash
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

If a requirements file is not present, install the main packages directly:

```bash
pip install flask flask-cors python-dotenv torch transformers safetensors
```

## 3. Configure the backend

The backend searches for trained checkpoints inside `model_outputs`. The expected structure is:

```text
model_outputs/
├── clinicalbert_finetuned/
│   ├── depression/
│   │   └── best_model/
│   └── anxiety/
│       └── best_model/
├── roberta_finetuned/
│   ├── depression/
│   │   └── best_model/
│   └── anxiety/
│       └── best_model/
├── deberta_finetuned/
│   ├── depression/
│   │   └── best_model/
│   └── anxiety/
│       └── best_model/
└── clinical_longformer_finetuned/
    ├── depression/
    │   └── best_model/
    └── anxiety/
        └── best_model/
```

Each usable `best_model` directory should contain files such as:

```text
config.json
model.safetensors
tokenizer_config.json
tokenizer.json
special_tokens_map.json
```

The backend can also read the model from `deployment_bundle/model` when that structure is available.

If the dashboard cannot automatically locate `model_outputs`, create `backend/.env` and provide its absolute path:

```env
MODEL_OUTPUTS_DIR=/absolute/path/to/P000464SE-Modern-Transformer-Models-for-Depression-Anxiety-Detection/model_outputs
CORS_ORIGINS=http://localhost:5173
INFERENCE_DEVICE=auto
MAX_CACHED_MODELS=2
MAX_NOTE_CHARACTERS=50000
FLASK_DEBUG=true
```

On Windows, use an absolute path such as:

```env
MODEL_OUTPUTS_DIR=C:\Users\YourName\Documents\GitHub\P000464SE-Modern-Transformer-Models-for-Depression-Anxiety-Detection\model_outputs
```

## 4. Start the Flask backend

Run this command from the `dashboard` directory, not from inside `backend`:

```bash
python -m flask --app backend.app run --debug
```

The backend should start at:

```text
http://127.0.0.1:5000
```

Check the backend health endpoint:

```bash
curl http://127.0.0.1:5000/api/health
```

Check the available model catalogue:

```bash
curl http://127.0.0.1:5000/api/models
```

Keep this terminal open while using the dashboard.

## 5. Set up the React frontend

Open a second terminal and move into the frontend folder:

```bash
cd dashboard/frontend
```

If the current terminal is already inside `dashboard`, use:

```bash
cd frontend
```

Install the frontend dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open the displayed address, normally:

```text
http://localhost:5173
```

## 6. Test live prediction

1. Open the **Live Prediction** page.
2. Select a fine-tuned model.
3. Paste a de-identified clinical note or use the synthetic example.
4. Select **Predict**.
5. Review the depression and anxiety probability estimates.
6. Check whether the full prepared note was analysed or whether tokens were omitted.

ClinicalBERT, RoBERTa, and DeBERTa use a maximum context length of 512 tokens. Clinical Longformer uses 2,048 tokens. When a prepared note is longer than the selected limit, text at the end is omitted and cannot influence the prediction.

The first request can take longer because the backend must load the depression and anxiety checkpoints into memory.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check backend status, device, and ready models |
| `GET` | `/api/models` | Return the public model catalogue |
| `POST` | `/api/predict` | Predict depression and anxiety with one selected model |
| `POST` | `/api/predict/both` | Alternative endpoint for the same two-task prediction |

Example request:

```bash
curl -X POST http://127.0.0.1:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "model_key": "clinical_longformer",
    "note": "PAST MEDICAL HISTORY: Hypertension. CHIEF COMPLAINT: Poor sleep and reduced appetite."
  }'
```

Valid model keys are:

```text
clinicalbert
roberta
deberta
clinical_longformer
```

## Stopping the dashboard

Press `Ctrl + C` in the frontend terminal and the backend terminal.

To leave the Python virtual environment:

```bash
deactivate
```