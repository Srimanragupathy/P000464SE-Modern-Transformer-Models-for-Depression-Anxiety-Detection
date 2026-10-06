# Mental Health Analytics Dashboard

This dashboard presents the project results and provides live depression and anxiety risk predictions from the fine-tuned Clinical Longformer models.

## Technology

- Frontend: React and Vite
- Backend: Flask
- Models: Fine-tuned Clinical Longformer for depression and anxiety
- Database: No

## 1. Required software

Install the following before starting:

- Python 3.11 or 3.12
- Node.js 18 or newer
- npm

Check the installations:

```bash
python3 --version
node --version
npm --version
```

## 2. Expected project structure

```text
project-root/
├── dashboard/
│   ├── README.md
│   ├── backend/
│   └── frontend/
└── model_outputs/
    └── clinical_longformer_finetuned/
        ├── depression/
        │   └── deployment_bundle/
        │       ├── inference_config.json
        │       └── model/
        └── anxiety/
            └── deployment_bundle/
                ├── inference_config.json
                └── model/
```

Each `model` directory must contain the saved model and tokenizer files, including `config.json` and `model.safetensors`.

## 3. Set up the Flask backend

Open a terminal in the `dashboard` folder:

```bash
cd dashboard
```

Create a Python environment inside the backend folder:

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

Install the backend packages:

```bash
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

If `requirements.txt` has not been created, install the packages directly:

```bash
python -m pip install flask flask-cors torch transformers safetensors
```

## 4. Check the model paths

The default `backend/config.py` expects `dashboard` and `model_outputs` to be inside the same project root:

```text
project-root/dashboard
project-root/model_outputs
```

The required model folders are:

```text
model_outputs/clinical_longformer_finetuned/depression/deployment_bundle
model_outputs/clinical_longformer_finetuned/anxiety/deployment_bundle
```

If your folders are elsewhere, update `MODEL_OUTPUT_ROOT` in `backend/config.py`.

## 5. Start the Flask backend

Run this command from the `dashboard` folder:

```bash
python -m flask --app backend.app run --debug
```

The backend will run at:

```text
http://127.0.0.1:5000
```

Do not close this terminal while using the dashboard.

## 6. Test the backend

Open another terminal and run the health check:

```bash
curl -s http://127.0.0.1:5000/api/health | python -m json.tool
```

Check the model files:

```bash
curl -s http://127.0.0.1:5000/api/prediction/status | python -m json.tool
```

For both tasks, these values should be `true`:

```json
"bundle_exists": true,
"configuration_exists": true,
"model_exists": true
```

## 7. Set up the React frontend

Open a separate terminal:

```bash
cd dashboard/frontend
npm install
```

Start the frontend:

```bash
npm run dev
```

Open the URL displayed by Vite, normally:

```text
http://localhost:5173
```

The Live Prediction page is normally available at:

```text
http://localhost:5173/prediction
```

Keep both the Flask and React terminals running.

## 8. Normal startup after the first setup

Backend terminal:

```bash
cd dashboard
source backend/.venv/bin/activate
python -m flask --app backend.app run --debug
```

Frontend terminal:

```bash
cd dashboard/frontend
npm run dev
```