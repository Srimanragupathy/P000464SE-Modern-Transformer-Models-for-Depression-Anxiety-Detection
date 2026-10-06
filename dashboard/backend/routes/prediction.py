from flask import Blueprint, jsonify, request

from ..config import MAX_NOTE_CHARACTERS
from ..services.clinical_longformer_service import (
    get_model_status,
    predict_both_tasks,
)
from ..services.preprocessing import preprocess_note


prediction_blueprint = Blueprint(
    "prediction",
    __name__,
    url_prefix="/api/prediction",
)


@prediction_blueprint.get("/status")
def prediction_status():
    return jsonify(
        {
            "status": "available",
            "models": get_model_status(),
        }
    )


@prediction_blueprint.post("/predict")
def predict():
    request_body = request.get_json(silent=True)

    if not request_body:
        return jsonify(
            {
                "error": "The request body must contain JSON."
            }
        ), 400

    note = request_body.get("note", "")

    if not isinstance(note, str):
        return jsonify(
            {
                "error": "The note must be provided as text."
            }
        ), 400

    note = note.strip()

    if not note:
        return jsonify(
            {
                "error": "Please enter a clinical note."
            }
        ), 400

    if len(note) > MAX_NOTE_CHARACTERS:
        return jsonify(
            {
                "error": (
                    "The note exceeds the maximum permitted "
                    f"length of {MAX_NOTE_CHARACTERS:,} "
                    "characters."
                )
            }
        ), 413

    try:
        preprocessing_result = preprocess_note(note)
        model_text = preprocessing_result["masked_text"]

        if not model_text:
            return jsonify(
                {
                    "error": (
                        "No usable clinical text remained "
                        "after preprocessing."
                    )
                }
            ), 400

        predictions = predict_both_tasks(model_text)

        return jsonify(
            {
                "predictions": predictions,
                "preprocessing": {
                    "matched_section_count": (
                        preprocessing_result[
                            "matched_section_count"
                        ]
                    ),
                    "matched_sections": (
                        preprocessing_result[
                            "matched_sections"
                        ]
                    ),
                    "used_full_text_fallback": (
                        preprocessing_result[
                            "used_full_text_fallback"
                        ]
                    ),
                    "original_character_count": (
                        preprocessing_result[
                            "original_character_count"
                        ]
                    ),
                    "selected_character_count": (
                        preprocessing_result[
                            "selected_character_count"
                        ]
                    ),
                    "selected_text_preview": (
                        preprocessing_result[
                            "selected_text"
                        ][:500]
                    ),
                },
                "disclaimer": (
                    "These model outputs are research "
                    "estimates and are not clinical "
                    "diagnoses."
                ),
            }
        )

    except FileNotFoundError as error:
        return jsonify(
            {
                "error": str(error),
                "error_type": "model_files_missing",
            }
        ), 503

    except RuntimeError as error:
        return jsonify(
            {
                "error": str(error),
                "error_type": "model_inference_error",
            }
        ), 500

    except Exception as error:
        return jsonify(
            {
                "error": str(error),
                "error_type": "unexpected_error",
            }
        ), 500