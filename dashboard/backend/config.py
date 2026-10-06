from pathlib import Path


BACKEND_DIRECTORY = Path(__file__).resolve().parent
DASHBOARD_DIRECTORY = BACKEND_DIRECTORY.parent
PROJECT_ROOT = DASHBOARD_DIRECTORY.parent

MODEL_OUTPUT_ROOT = (
    PROJECT_ROOT / "model_outputs"
)

RUN_DIRECTORIES = {
    "depression": (
        MODEL_OUTPUT_ROOT
        / "clinical_longformer_finetuned"
        / "depression"
    ),
    "anxiety": (
        MODEL_OUTPUT_ROOT
        / "clinical_longformer_finetuned"
        / "anxiety"
    ),
}

DEPLOYMENT_BUNDLES = {
    task: (
        run_directory / "deployment_bundle"
    )
    for task, run_directory
    in RUN_DIRECTORIES.items()
}

ALLOWED_TASKS = (
    "depression",
    "anxiety",
)

MAX_NOTE_CHARACTERS = 200_000