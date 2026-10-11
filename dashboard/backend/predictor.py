import os
import threading
from collections import OrderedDict

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from .model_registry import resolve_checkpoint
from .preprocessing import preprocess_note


def choose_device() -> torch.device:
    configured = os.getenv("INFERENCE_DEVICE", "auto").lower()
    if configured != "auto":
        return torch.device(configured)
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


DEVICE = choose_device()
MAX_CACHED_MODELS = max(1, int(os.getenv("MAX_CACHED_MODELS", "2")))


class LoadedCheckpoint:
    def __init__(self, checkpoint, device):
        self.checkpoint = checkpoint
        self.device = device
        self.tokenizer = AutoTokenizer.from_pretrained(checkpoint)
        self.model = AutoModelForSequenceClassification.from_pretrained(checkpoint)
        self.model.to(device)
        self.model.eval()

    def release(self):
        self.model.to("cpu")
        del self.model
        del self.tokenizer


class ModelCache:
    def __init__(self, maximum_size: int):
        self.maximum_size = maximum_size
        self.items = OrderedDict()
        self.lock = threading.RLock()

    def get(self, checkpoint):
        key = str(checkpoint.resolve())
        with self.lock:
            if key in self.items:
                loaded = self.items.pop(key)
                self.items[key] = loaded
                return loaded

            loaded = LoadedCheckpoint(checkpoint, DEVICE)
            self.items[key] = loaded
            while len(self.items) > self.maximum_size:
                _, evicted = self.items.popitem(last=False)
                evicted.release()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            return loaded


MODEL_CACHE = ModelCache(MAX_CACHED_MODELS)
INFERENCE_LOCK = threading.RLock()


def _positive_probability(logits: torch.Tensor) -> float:
    if logits.shape[-1] == 1:
        return float(torch.sigmoid(logits[0, 0]).detach().cpu())
    probabilities = torch.softmax(logits, dim=-1)
    return float(probabilities[0, 1].detach().cpu())


def predict_task(model_key: str, task: str, note: str) -> dict:
    resolved = resolve_checkpoint(model_key, task)
    if not resolved["available"]:
        raise FileNotFoundError(
            f"No best-model checkpoint was found for {model_key}/{task} in "
            f"{resolved['run_directory']}"
        )

    processed_text, preprocessing = preprocess_note(note, task)
    if not processed_text:
        raise ValueError("The note is empty after preprocessing.")

    with INFERENCE_LOCK:
        loaded = MODEL_CACHE.get(resolved["checkpoint"])
        tokenizer = loaded.tokenizer
        model = loaded.model

        untruncated = tokenizer(
            processed_text,
            add_special_tokens=True,
            truncation=False,
        )["input_ids"]
        tokens_before_truncation = len(untruncated)

        encoded = tokenizer(
            processed_text,
            add_special_tokens=True,
            truncation=True,
            max_length=resolved["maximum_length"],
            padding=False,
            return_tensors="pt",
        )
        encoded = {name: value.to(DEVICE) for name, value in encoded.items()}

        if model_key == "clinical_longformer":
            global_attention_mask = torch.zeros_like(encoded["input_ids"])
            global_attention_mask[:, 0] = 1
            encoded["global_attention_mask"] = global_attention_mask

        with torch.inference_mode():
            if DEVICE.type == "cuda":
                with torch.autocast(device_type="cuda", dtype=torch.float16):
                    logits = model(**encoded).logits
            else:
                logits = model(**encoded).logits

        probability = _positive_probability(logits)
        threshold = resolved["threshold"]
        predicted_positive = probability >= threshold
        tokens_used = int(encoded["input_ids"].shape[1])

    return {
        "task": task,
        "positive_probability": probability,
        "percentage": probability * 100.0,
        "predicted_label_id": int(predicted_positive),
        "predicted_label": (
            resolved["positive_label"]
            if predicted_positive
            else resolved["negative_label"]
        ),
        "above_threshold": predicted_positive,
        "threshold": threshold,
        "maximum_length": resolved["maximum_length"],
        "tokens_before_truncation": tokens_before_truncation,
        "tokens_used": tokens_used,
        "truncated": tokens_before_truncation > resolved["maximum_length"],
        "preprocessing": preprocessing,
    }
