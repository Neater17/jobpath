from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from .catalog import COMPETENCY_ORDER, build_career_profiles
from .training_dataset import load_or_build_training_dataset
from .training_models import (
    build_detailed_evaluation,
    collect_probabilities,
    combine_probabilities,
    split_samples,
    train_ensemble_models,
)

MODEL_SCHEMA_VERSION = 3


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def resolve_model_path(model_path: Optional[str] = None) -> Path:
    default_path = Path(__file__).resolve().parents[2] / "backend" / "data" / "recommendation-model.v3.json"
    return Path(model_path or os.environ.get("ML_MODEL_PATH") or default_path).resolve()


def resolve_evaluation_path(model_path: Optional[str] = None) -> Path:
    resolved_model_path = resolve_model_path(model_path)
    return resolved_model_path.with_name(resolved_model_path.stem + ".evaluation.json")


def _emit_progress(progress: Optional[Callable[[str], None]], message: str) -> None:
    if progress is not None:
        progress(message)


def train_and_persist_recommendation_model(
    dataset_path: Optional[str] = None,
    model_path: Optional[str] = None,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    resolved_model_path = resolve_model_path(model_path)
    resolved_evaluation_path = resolve_evaluation_path(str(resolved_model_path))
    _emit_progress(progress, f"[1/6] Resolving model output path: {resolved_model_path}")

    _emit_progress(progress, "[2/6] Building career profiles from Python catalog")
    profiles = build_career_profiles()

    _emit_progress(progress, "[3/6] Loading or building training dataset")
    dataset = load_or_build_training_dataset(
        profiles=profiles,
        competency_order=COMPETENCY_ORDER,
        dataset_path=dataset_path,
    )
    _emit_progress(
        progress,
        f"      dataset ready: source={dataset.data_source}, samples={len(dataset.samples)}, classes={len(profiles)}",
    )

    _emit_progress(progress, "[4/6] Training logistic, random forest, and gradient boosting models")
    trained_models = train_ensemble_models(
        samples=dataset.samples,
        num_classes=len(profiles),
        num_features=len(COMPETENCY_ORDER),
        progress=progress,
    )
    _emit_progress(progress, "[5/6] Assembling model metadata and persisted payload")

    test_split = split_samples(dataset.samples)["test"]
    test_labels = [sample.label for sample in test_split]
    class_names = [str(profile["careerName"]) for profile in profiles]
    test_probabilities = collect_probabilities(
        trained_models["logistic"],
        trained_models["randomForest"],
        trained_models["gradientBoosting"],
        test_split,
    )
    ensemble_test_probabilities = [
        combine_probabilities(
            probs,
            test_probabilities["randomForest"][index],
            test_probabilities["gradientBoosting"][index],
            trained_models["ensembleWeights"],
        )
        for index, probs in enumerate(test_probabilities["logistic"])
    ]

    model_info = {
        "trainedAt": _utc_now_iso(),
        "sampleCount": len(dataset.samples),
        "featureCount": len(COMPETENCY_ORDER),
        "classCount": len(profiles),
        "dataSource": dataset.data_source,
        "modelVersion": MODEL_SCHEMA_VERSION,
        "loadedFromCache": False,
        "persistedModelPath": str(resolved_model_path),
        "split": trained_models["diagnostics"]["split"],
        "ensembleWeights": trained_models["ensembleWeights"],
        "evaluation": trained_models["diagnostics"]["metrics"],
        "confidenceCalibration": {
            "binCount": trained_models["confidenceCalibration"]["binCount"],
            "fallbackAccuracy": trained_models["confidenceCalibration"]["fallbackAccuracy"],
            "bins": trained_models["confidenceCalibration"]["bins"],
        },
    }
    payload = {
        "version": MODEL_SCHEMA_VERSION,
        "savedAt": _utc_now_iso(),
        "modelInfo": model_info,
        "models": {
            "logistic": trained_models["logistic"],
            "randomForest": trained_models["randomForest"],
            "gradientBoosting": trained_models["gradientBoosting"],
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
                "pathKey": profile["pathKey"],
                "careerName": profile["careerName"],
                "level": profile["level"],
            }
            for index, profile in enumerate(profiles)
        ],
        "evaluation": {
            "logistic": build_detailed_evaluation(
                test_probabilities["logistic"], test_labels, len(profiles), class_names
            ),
            "randomForest": build_detailed_evaluation(
                test_probabilities["randomForest"], test_labels, len(profiles), class_names
            ),
            "gradientBoosting": build_detailed_evaluation(
                test_probabilities["gradientBoosting"], test_labels, len(profiles), class_names
            ),
            "ensemble": build_detailed_evaluation(
                ensemble_test_probabilities, test_labels, len(profiles), class_names
            ),
        },
    }

    resolved_model_path.parent.mkdir(parents=True, exist_ok=True)
    _emit_progress(progress, f"[6/6] Writing active model artifact to {resolved_model_path}")
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
    _emit_progress(progress, "      training complete")
    return payload
