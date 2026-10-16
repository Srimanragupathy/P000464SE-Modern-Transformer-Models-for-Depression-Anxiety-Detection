import os

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS

from .model_registry import (
    MODEL_OUTPUTS_DIR,
    MODEL_REGISTRY,
    get_public_model_catalog,
)
from .predictor import DEVICE, MAX_CACHED_MODELS, predict_task


app = Flask(__name__)
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

MAX_NOTE_CHARACTERS = int(os.getenv("MAX_NOTE_CHARACTERS", "50000"))


@app.get("/api/health")
def health():
    catalog = get_public_model_catalog()
    return jsonify(
        {
            "status": "ok",
            "device": str(DEVICE),
            "maximum_cached_models": MAX_CACHED_MODELS,
            "model_outputs_directory": str(MODEL_OUTPUTS_DIR),
            "ready_models": [item["key"] for item in catalog if item["ready"]],
        }
    )


@app.get("/api/models")
def models():
    return jsonify({"models": get_public_model_catalog()})


def _perform_prediction():
    payload = request.get_json(silent=True) or {}
    model_key = str(payload.get("model_key") or payload.get("model") or "").strip()
    note = str(payload.get("note") or payload.get("text") or "").strip()

    if model_key not in MODEL_REGISTRY:
        return (
            jsonify(
                {
                    "error": "Select a valid model.",
                    "valid_models": list(MODEL_REGISTRY.keys()),
                }
            ),
            400,
        )
    if not note:
        return jsonify({"error": "Enter a clinical note before predicting."}), 400
    if len(note) > MAX_NOTE_CHARACTERS:
        return (
            jsonify(
                {
                    "error": (
                        f"The note exceeds the {MAX_NOTE_CHARACTERS:,}-character limit."
                    )
                }
            ),
            413,
        )

    selected = MODEL_REGISTRY[model_key]
    try:
        depression_result = predict_task(model_key, "depression", note)
        anxiety_result = predict_task(model_key, "anxiety", note)
    except FileNotFoundError as error:
        return jsonify({"error": str(error)}), 503
    except (RuntimeError, ValueError) as error:
        return jsonify({"error": str(error)}), 500

    return jsonify(
        {
            "model": {
                "key": model_key,
                "name": selected["name"],
                "context_length": selected["context_length"],
            },
            "predictions": {
                "depression": depression_result,
                "anxiety": anxiety_result,
            },
            "disclaimer": (
                "Research demonstration only. These probabilities are model outputs, "
                "not diagnoses or clinical recommendations."
            ),
        }
    )


@app.post("/api/predict")
def predict():
    return _perform_prediction()


@app.post("/api/predict/both")
def predict_both():
    return _perform_prediction()


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "Endpoint not found."}), 404


@app.errorhandler(500)
def unexpected_error(error):
    app.logger.exception(error)
    return jsonify({"error": "Unexpected server error."}), 500


if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_HOST", "127.0.0.1"),
        port=int(os.getenv("FLASK_PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
