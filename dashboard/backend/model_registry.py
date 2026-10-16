import json
import os
from pathlib import Path


TASKS = ("depression", "anxiety")


def find_project_root(starting_path: Path) -> Path:
    configured = os.getenv("PROJECT_ROOT")
    if configured:
        return Path(configured).expanduser().resolve()

    starting_path = starting_path.expanduser().resolve()
    for location in (starting_path, *starting_path.parents):
        if (location / "model_outputs").exists() or (location / ".git").exists():
            return location
    return starting_path


PROJECT_ROOT = find_project_root(Path(__file__).parent)
MODEL_OUTPUTS_DIR = Path(
    os.getenv("MODEL_OUTPUTS_DIR", str(PROJECT_ROOT / "model_outputs"))
).expanduser().resolve()


MODEL_REGISTRY = {
    "clinicalbert": {
        "name": "ClinicalBERT",
        "folder": "clinicalbert_finetuned",
        "context_length": 512,
        "truncation": {"depression": 89.18, "anxiety": 88.75},
        "tag": "Clinical language",
        "description": "Clinical-domain BERT with a compact 512-token context window.",
        "metrics": {
            "depression": {
                "accuracy": 0.889,
                "balanced_accuracy": 0.820,
                "f1": 0.689,
                "roc_auc": 0.893,
                "pr_auc": 0.696,
                "recall": 0.716,
            },
            "anxiety": {
                "accuracy": 0.906,
                "balanced_accuracy": 0.772,
                "f1": 0.590,
                "roc_auc": 0.881,
                "pr_auc": 0.611,
                "recall": 0.600,
            },
        },
    },
    "roberta": {
        "name": "RoBERTa",
        "folder": "roberta_finetuned",
        "context_length": 512,
        "truncation": {"depression": 91.48, "anxiety": 91.15},
        "tag": "General transformer",
        "description": "A strong general-language transformer adapted to the two clinical tasks.",
        "metrics": {
            "depression": {
                "accuracy": 0.889,
                "balanced_accuracy": 0.809,
                "f1": 0.680,
                "roc_auc": 0.887,
                "pr_auc": 0.690,
                "recall": 0.687,
            },
            "anxiety": {
                "accuracy": 0.902,
                "balanced_accuracy": 0.769,
                "f1": 0.580,
                "roc_auc": 0.861,
                "pr_auc": 0.590,
                "recall": 0.598,
            },
        },
    },
    "deberta": {
        "name": "DeBERTa",
        "folder": "deberta_finetuned",
        "context_length": 512,
        "truncation": {"depression": 82.80, "anxiety": 82.25},
        "tag": "Best 512-token option",
        "description": "The strongest short-context model in the final comparison.",
        "metrics": {
            "depression": {
                "accuracy": 0.885,
                "balanced_accuracy": 0.837,
                "f1": 0.696,
                "roc_auc": 0.913,
                "pr_auc": 0.731,
                "recall": 0.764,
            },
            "anxiety": {
                "accuracy": 0.907,
                "balanced_accuracy": 0.797,
                "f1": 0.614,
                "roc_auc": 0.884,
                "pr_auc": 0.640,
                "recall": 0.654,
            },
        },
    },
    "clinical_longformer": {
        "name": "Clinical Longformer",
        "folder": "clinical_longformer_finetuned",
        "context_length": 2048,
        "truncation": {"depression": 9.43, "anxiety": 9.04},
        "tag": "Best overall",
        "description": "Long-context clinical transformer with the strongest final test performance.",
        "metrics": {
            "depression": {
                "accuracy": 0.896,
                "balanced_accuracy": 0.865,
                "f1": 0.730,
                "roc_auc": 0.936,
                "pr_auc": 0.785,
                "recall": 0.818,
            },
            "anxiety": {
                "accuracy": 0.916,
                "balanced_accuracy": 0.827,
                "f1": 0.657,
                "roc_auc": 0.925,
                "pr_auc": 0.713,
                "recall": 0.712,
            },
        },
    },
}


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def get_run_directory(model_key: str, task: str) -> Path:
    if model_key not in MODEL_REGISTRY:
        raise KeyError(f"Unknown model: {model_key}")
    if task not in TASKS:
        raise KeyError(f"Unknown task: {task}")
    return MODEL_OUTPUTS_DIR / MODEL_REGISTRY[model_key]["folder"] / task


def resolve_checkpoint(model_key: str, task: str) -> dict:
    run_directory = get_run_directory(model_key, task)
    manifest = _read_json(run_directory / "run_manifest.json")
    bundle_directory = run_directory / "deployment_bundle"
    inference_config = _read_json(bundle_directory / "inference_config.json")

    candidates = []
    if inference_config:
        candidates.append(
            bundle_directory / inference_config.get("model_subdirectory", "model")
        )
    candidates.extend(
        [
            run_directory / "best_model",
            bundle_directory / "model",
        ]
    )

    checkpoint = next(
        (
            candidate
            for candidate in candidates
            if (candidate / "config.json").exists()
        ),
        None,
    )

    threshold = inference_config.get(
        "classification_threshold",
        manifest.get("selected_validation_threshold", 0.5),
    )
    maximum_length = inference_config.get(
        "maximum_length",
        manifest.get(
            "maximum_length", MODEL_REGISTRY[model_key]["context_length"]
        ),
    )

    return {
        "run_directory": run_directory,
        "checkpoint": checkpoint,
        "available": checkpoint is not None,
        "threshold": float(threshold),
        "maximum_length": int(maximum_length),
        "positive_label": inference_config.get(
            "positive_label", f"{task.title()} risk detected"
        ),
        "negative_label": inference_config.get(
            "negative_label", f"No {task} risk detected"
        ),
        "manifest": manifest,
        "inference_config": inference_config,
    }


def get_public_model_catalog() -> list[dict]:
    catalog = []
    for model_key, details in MODEL_REGISTRY.items():
        availability = {
            task: resolve_checkpoint(model_key, task)["available"] for task in TASKS
        }
        catalog.append(
            {
                "key": model_key,
                "name": details["name"],
                "tag": details["tag"],
                "description": details["description"],
                "context_length": details["context_length"],
                "truncation": details["truncation"],
                "metrics": details["metrics"],
                "availability": availability,
                "ready": all(availability.values()),
            }
        )
    return catalog
