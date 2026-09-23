# 08 — Prompt-based LLM baseline

Prompt-based (zero-shot) classification of discharge notes for depression and anxiety.

- Model: Qwen2.5-7B-Instruct (open-weight, run locally on RACE).
- Not fine-tuned. Each note is prompted and the model returns a 0/1 label.
- Open-weight model used instead of GPT so no clinical data is sent to an external API (client requirement).
- Evaluated on the same 27,123-note test split as the fine-tuned models.
- Run: set TASK ("depression" or "anxiety") in 08_llm_prompt_baseline.py, then `python 08_llm_prompt_baseline.py`.

## Results (full test set)

| Task | Accuracy | Precision | Recall | F1 |
|------|----------|-----------|--------|------|
| Depression | 0.874 | 0.614 | 0.533 | 0.570 |
| Anxiety | 0.890 | 0.418 | 0.561 | 0.479 |

Accuracy is inflated by class imbalance; F1 and recall are the meaningful measures.
