from __future__ import annotations

import json
import os
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from .catalog import COMPETENCY_ORDER, build_career_ladder_entries, build_career_profiles
from .training_dataset import load_or_build_training_dataset
from .training_models import (
    train_ensemble_models,
)

MODEL_SCHEMA_VERSION = 3
MODEL_ARTIFACT_VERSION = 1


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def resolve_model_path(model_path: Optional[str] = None) -> Path:
    default_path = Path(__file__).resolve().parents[2] / "backend" / "data" / "recommendation-model.v3.json"
    return Path(model_path or os.environ.get("ML_MODEL_PATH") or default_path).resolve()


def resolve_evaluation_path(model_path: Optional[str] = None) -> Path:
    resolved_model_path = resolve_model_path(model_path)
    return resolved_model_path.with_name(resolved_model_path.stem + ".evaluation.json")


def resolve_model_sidecar_paths(model_path: Optional[str] = None) -> Dict[str, Path]:
    resolved_model_path = resolve_model_path(model_path)
    return {
        "logistic": resolved_model_path.with_name(resolved_model_path.stem + ".logistic.joblib"),
        "randomForest": resolved_model_path.with_name(resolved_model_path.stem + ".random_forest.joblib"),
        "gradientBoosting": resolved_model_path.with_name(
            resolved_model_path.stem + ".gradient_boosting.joblib"
        ),
    }


def _dump_joblib(target: Path, value: Any) -> None:
    try:
        import joblib
    except ImportError as error:  # pragma: no cover - depends on environment
        raise RuntimeError(
            "joblib is required to persist sklearn-backed recommendation models. "
            "Install Python/requirements.txt before retraining."
        ) from error

    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="wb",
        dir=target.parent,
        prefix=target.stem + ".",
        suffix=".tmp",
        delete=False,
    ) as temp_file:
        temp_path = Path(temp_file.name)
    try:
        joblib.dump(value, temp_path)
        temp_path.replace(target)
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)


def _serializable_model_reference(
    model: Dict[str, Any],
    artifact_path: Path,
) -> Dict[str, Any]:
    return {
        "backend": "sklearn",
        "estimatorClass": model.get("estimatorClass"),
        "classes": [int(value) for value in (model.get("classes") or [])],
        "artifactPath": artifact_path.name,
    }


def _emit_progress(progress: Optional[Callable[[str], None]], message: str) -> None:
    if progress is not None:
        progress(message)


def train_and_persist_recommendation_model(
    dataset_path: Optional[str] = None,
    model_path: Optional[str] = None,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    overall_start = time.perf_counter()
    resolved_model_path = resolve_model_path(model_path)
    resolved_evaluation_path = resolve_evaluation_path(str(resolved_model_path))
    resolved_sidecar_paths = resolve_model_sidecar_paths(str(resolved_model_path))
    _emit_progress(progress, f"[1/6] Resolving model output path: {resolved_model_path}")

    _emit_progress(progress, "[2/6] Building career profiles from Python catalog")
    profiles = build_career_profiles()
    ladder_entries = build_career_ladder_entries()

    _emit_progress(progress, "[3/6] Loading or building training dataset")
    dataset = load_or_build_training_dataset(
        profiles=profiles,
        competency_order=COMPETENCY_ORDER,
        dataset_path=dataset_path,
    )
    _emit_progress(
        progress,
        (
            f"      dataset ready: source={dataset.data_source}, samples={len(dataset.samples)}, "
            f"trainable_profiles={len(profiles)}, ladder_entries={len(ladder_entries)}"
        ),
    )

    _emit_progress(progress, "[4/6] Training logistic, random forest, and gradient boosting models")
    trained_models = train_ensemble_models(
        samples=dataset.samples,
        num_classes=len(profiles),
        num_features=len(COMPETENCY_ORDER),
        class_names=[str(profile["careerName"]) for profile in profiles],
        progress=progress,
    )
    _emit_progress(progress, "[5/6] Assembling model metadata and persisted payload")

    model_artifacts = {
        key: path.name for key, path in resolved_sidecar_paths.items()
    }
    model_info = {
        "trainedAt": _utc_now_iso(),
        "sampleCount": len(dataset.samples),
        "featureCount": len(COMPETENCY_ORDER),
        "classCount": len(profiles),
        "ladderEntryCount": len(ladder_entries),
        "dataSource": dataset.data_source,
        "modelVersion": MODEL_SCHEMA_VERSION,
        "loadedFromCache": False,
        "persistedModelPath": str(resolved_model_path),
        "split": trained_models["diagnostics"]["split"],
        "ensembleWeights": trained_models["ensembleWeights"],
        "evaluation": trained_models["diagnostics"]["metrics"]["test"],
        "validationEvaluation": {
            "baseline": trained_models["diagnostics"]["metrics"]["baselineValidation"],
            "hard": trained_models["diagnostics"]["metrics"]["hardValidation"],
        },
        "tuningValidationMode": trained_models["diagnostics"]["tuningValidationMode"],
        "hardValidation": trained_models["diagnostics"]["hardValidation"],
        "confidenceCalibration": {
            "binCount": trained_models["confidenceCalibration"]["binCount"],
            "fallbackAccuracy": trained_models["confidenceCalibration"]["fallbackAccuracy"],
            "bins": trained_models["confidenceCalibration"]["bins"],
        },
        "trainingBackend": "sklearn",
        "artifactFormat": "json+joblib",
        "artifactVersion": MODEL_ARTIFACT_VERSION,
        "modelArtifacts": model_artifacts,
    }
    payload = {
        "version": MODEL_SCHEMA_VERSION,
        "savedAt": _utc_now_iso(),
        "modelInfo": model_info,
        "models": {
            "logistic": _serializable_model_reference(
                trained_models["logistic"], resolved_sidecar_paths["logistic"]
            ),
            "randomForest": _serializable_model_reference(
                trained_models["randomForest"], resolved_sidecar_paths["randomForest"]
            ),
            "gradientBoosting": _serializable_model_reference(
                trained_models["gradientBoosting"], resolved_sidecar_paths["gradientBoosting"]
            ),
            "featureStats": trained_models["featureStats"],
            "ensembleWeights": trained_models["ensembleWeights"],
            "confidenceCalibration": trained_models["confidenceCalibration"],
            "featureImportance": trained_models["featureImportance"],
        },
    }
    evaluation_payload = {
        "version": MODEL_SCHEMA_VERSION,
        "savedAt": payload["savedAt"],
        "modelPath": str(resolved_model_path),
        "evaluationPath": str(resolved_evaluation_path),
        "modelInfo": {
            "trainedAt": model_info["trainedAt"],
            "sampleCount": model_info["sampleCount"],
            "featureCount": model_info["featureCount"],
            "classCount": model_info["classCount"],
            "dataSource": model_info["dataSource"],
            "modelVersion": model_info["modelVersion"],
        },
        "classes": [
            {
                "classIndex": index,
                "profileKey": profile["profileKey"],
                "careerName": profile["careerName"],
                "ladderEntries": profile.get("ladderEntries") or [],
            }
            for index, profile in enumerate(profiles)
        ],
        "ladderEntries": ladder_entries,
        "evaluation": {
            "baselineValidation": trained_models["diagnostics"]["detailedEvaluation"]["baselineValidation"],
            "hardValidation": trained_models["diagnostics"]["detailedEvaluation"]["hardValidation"],
            "test": trained_models["diagnostics"]["detailedEvaluation"]["test"],
        },
        "tuningValidationMode": trained_models["diagnostics"]["tuningValidationMode"],
        "hardValidation": trained_models["diagnostics"]["hardValidation"],
    }

    resolved_model_path.parent.mkdir(parents=True, exist_ok=True)
    _emit_progress(progress, f"[6/6] Writing active model artifact to {resolved_model_path}")
    _dump_joblib(resolved_sidecar_paths["logistic"], trained_models["logistic"]["_estimator"])
    _dump_joblib(
        resolved_sidecar_paths["randomForest"], trained_models["randomForest"]["_estimator"]
    )
    _dump_joblib(
        resolved_sidecar_paths["gradientBoosting"],
        trained_models["gradientBoosting"]["_estimator"],
    )
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=resolved_model_path.parent,
        prefix=resolved_model_path.stem + ".",
        suffix=".tmp",
        delete=False,
    ) as temp_file:
        temp_file.write(json.dumps(payload))
        temp_path = Path(temp_file.name)
    temp_path.replace(resolved_model_path)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=resolved_evaluation_path.parent,
        prefix=resolved_evaluation_path.stem + ".",
        suffix=".tmp",
        delete=False,
    ) as temp_file:
        temp_file.write(json.dumps(evaluation_payload))
        evaluation_temp_path = Path(temp_file.name)
    evaluation_temp_path.replace(resolved_evaluation_path)
    overall_elapsed = time.perf_counter() - overall_start
    _emit_progress(progress, f"      training complete in {overall_elapsed:.2f}s")
    return payload
