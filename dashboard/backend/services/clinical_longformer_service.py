import json
import threading
from functools import lru_cache
from pathlib import Path

import torch
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
)

from ..config import ALLOWED_TASKS, DEPLOYMENT_BUNDLES


GPU_INFERENCE_LOCK = threading.Lock()


def choose_device():
    if torch.cuda.is_available():
        return torch.device("cuda")

    return torch.device("cpu")


class ClinicalLongformerPredictor:
    def __init__(self, task, bundle_directory):
        self.task = task
        self.bundle_directory = Path(
            bundle_directory
        )

        self.configuration_path = (
            self.bundle_directory
            / "inference_config.json"
        )

        self._validate_bundle()

        with self.configuration_path.open(
            "r",
            encoding="utf-8",
        ) as file:
            self.inference_configuration = json.load(file)

        model_subdirectory = (
            self.inference_configuration.get(
                "model_subdirectory",
                "model",
            )
        )

        self.model_directory = (
            self.bundle_directory
            / model_subdirectory
        )

        self.maximum_length = int(
            self.inference_configuration.get(
                "maximum_length",
                2048,
            )
        )

        self.threshold = float(
            self.inference_configuration.get(
                "classification_threshold",
                0.5,
            )
        )

        self.positive_label_id = int(
            self.inference_configuration.get(
                "positive_label_id",
                1,
            )
        )

        self.negative_label_id = int(
            self.inference_configuration.get(
                "negative_label_id",
                0,
            )
        )

        self.positive_label = (
            self.inference_configuration.get(
                "positive_label",
                task,
            )
        )

        self.negative_label = (
            self.inference_configuration.get(
                "negative_label",
                f"no {task}",
            )
        )

        self.device = choose_device()

        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_directory,
            local_files_only=True,
        )

        self.model = (
            AutoModelForSequenceClassification.from_pretrained(
                self.model_directory,
                local_files_only=True,
            )
        )

        self.model.to(self.device)
        self.model.eval()

    def _validate_bundle(self):
        if not self.bundle_directory.exists():
            raise FileNotFoundError(
                "Deployment bundle not found: "
                f"{self.bundle_directory}"
            )

        if not self.configuration_path.exists():
            raise FileNotFoundError(
                "Inference configuration not found: "
                f"{self.configuration_path}"
            )

        model_directory = (
            self.bundle_directory / "model"
        )

        if not model_directory.exists():
            raise FileNotFoundError(
                "Model directory not found: "
                f"{model_directory}"
            )

        config_path = (
            model_directory / "config.json"
        )

        if not config_path.exists():
            raise FileNotFoundError(
                "Model config.json is missing from "
                f"{model_directory}"
            )

    def predict(self, text):
        raw_encoding = self.tokenizer(
            text,
            add_special_tokens=True,
            truncation=False,
        )

        raw_token_count = len(
            raw_encoding["input_ids"]
        )

        encoded = self.tokenizer(
            text,
            add_special_tokens=True,
            max_length=self.maximum_length,
            padding=False,
            truncation=True,
            return_attention_mask=True,
            return_tensors="pt",
        )

        used_token_count = int(
            encoded["attention_mask"].sum().item()
        )

        global_attention_mask = torch.zeros_like(
            encoded["attention_mask"]
        )

        global_attention_mask[:, 0] = 1

        model_inputs = {
            key: value.to(self.device)
            for key, value in encoded.items()
        }

        model_inputs["global_attention_mask"] = (
            global_attention_mask.to(self.device)
        )

        with GPU_INFERENCE_LOCK:
            with torch.inference_mode():
                outputs = self.model(**model_inputs)

                probabilities = torch.softmax(
                    outputs.logits,
                    dim=-1,
                )[0]

        positive_probability = float(
            probabilities[
                self.positive_label_id
            ]
            .detach()
            .cpu()
            .item()
        )

        negative_probability = float(
            probabilities[
                self.negative_label_id
            ]
            .detach()
            .cpu()
            .item()
        )

        predicted_positive = (
            positive_probability >= self.threshold
        )

        if predicted_positive:
            predicted_label_id = (
                self.positive_label_id
            )
            predicted_label = self.positive_label
            risk_category = (
                "Elevated model-estimated risk"
            )
        else:
            predicted_label_id = (
                self.negative_label_id
            )
            predicted_label = self.negative_label
            risk_category = (
                "Lower model-estimated risk"
            )

        return {
            "task": self.task,
            "positive_probability": (
                positive_probability
            ),
            "negative_probability": (
                negative_probability
            ),
            "positive_probability_percent": round(
                positive_probability * 100,
                2,
            ),
            "predicted_label_id": predicted_label_id,
            "predicted_label": predicted_label,
            "risk_category": risk_category,
            "classification_threshold": (
                self.threshold
            ),
            "classification_threshold_percent": round(
                self.threshold * 100,
                2,
            ),
            "maximum_length": self.maximum_length,
            "original_token_count": (
                raw_token_count
            ),
            "used_token_count": used_token_count,
            "truncated": (
                raw_token_count
                > self.maximum_length
            ),
            "device": str(self.device),
        }


@lru_cache(maxsize=2)
def get_predictor(task):
    if task not in ALLOWED_TASKS:
        raise ValueError(
            f"Unsupported task: {task}"
        )

    return ClinicalLongformerPredictor(
        task=task,
        bundle_directory=(
            DEPLOYMENT_BUNDLES[task]
        ),
    )


def predict_both_tasks(text):
    predictions = {}

    for task in ALLOWED_TASKS:
        predictor = get_predictor(task)

        predictions[task] = (
            predictor.predict(text)
        )

    return predictions


def get_model_status():
    status = {}

    for task in ALLOWED_TASKS:
        bundle_directory = (
            DEPLOYMENT_BUNDLES[task]
        )

        status[task] = {
            "bundle_directory": str(
                bundle_directory
            ),
            "bundle_exists": (
                bundle_directory.exists()
            ),
            "configuration_exists": (
                bundle_directory
                / "inference_config.json"
            ).exists(),
            "model_exists": (
                bundle_directory / "model"
            ).exists(),
        }

    return status