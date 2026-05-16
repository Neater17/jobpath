#!/usr/bin/env python3
"""Export notebook-friendly visualization data from the recommendation model."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.catalog import (
    COMPETENCY_LABELS,
    COMPETENCY_ORDER,
    build_career_ladder_entries,
    build_career_profiles,
)
from app.training_dataset import load_or_build_training_dataset
from app.training_models import build_hard_validation_subset, split_samples


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export recommendation-model artifacts for visualization in a separate notebook"
    )
    parser.add_argument(
        "--model-path",
        type=str,
        default=str(Path(__file__).resolve().parents[2] / "backend" / "data" / "recommendation-model.v3.json"),
        help="Path to the persisted recommendation model JSON",
    )
    parser.add_argument(
        "--out-dir",
        type=str,
        default=str(Path(__file__).resolve().parents[2] / "artifacts" / "model-viz"),
        help="Directory where exported JSON and CSV files will be written",
    )
    parser.add_argument(
        "--dataset-path",
        type=str,
        default=None,
        help="Optional dataset JSON used to rebuild training-side summaries. If omitted, synthetic dataset generation is used unless the model dataSource points to a historical-json path.",
    )
    return parser.parse_args()


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_csv(path: Path, rows: Iterable[Dict[str, Any]], fieldnames: List[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def build_feature_importance_rows(models: Dict[str, Any]) -> List[Dict[str, Any]]:
    values = models.get("featureImportance") or {}
    rows: List[Dict[str, Any]] = []
    for index, key in enumerate(COMPETENCY_ORDER):
        rows.append(
            {
                "featureIndex": index,
                "featureKey": key,
                "featureLabel": COMPETENCY_LABELS.get(key, key),
                "logistic": float((values.get("logistic") or [0.0])[index]),
                "randomForest": float((values.get("randomForest") or [0.0])[index]),
                "gradientBoosting": float((values.get("gradientBoosting") or [0.0])[index]),
                "ensemble": float((values.get("ensemble") or [0.0])[index]),
            }
        )
    rows.sort(key=lambda item: item["ensemble"], reverse=True)
    return rows


def build_feature_stats_rows(models: Dict[str, Any]) -> List[Dict[str, Any]]:
    stats = models.get("featureStats") or {}
    means = stats.get("means") or []
    stds = stats.get("stds") or []
    rows: List[Dict[str, Any]] = []
    for index, key in enumerate(COMPETENCY_ORDER):
        rows.append(
            {
                "featureIndex": index,
                "featureKey": key,
                "featureLabel": COMPETENCY_LABELS.get(key, key),
                "mean": float(means[index]) if index < len(means) else 0.0,
                "std": float(stds[index]) if index < len(stds) else 0.0,
            }
        )
    return rows


def build_metric_rows(snapshot: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    groups = {
        "test": snapshot.get("evaluation") or {},
        "baseline_validation": (snapshot.get("validationComparison") or {}).get("baseline") or {},
        "hard_validation": (snapshot.get("validationComparison") or {}).get("hard") or {},
    }
    for split_name, payload in groups.items():
        for model_name, metrics in payload.items():
            rows.append(
                {
                    "split": split_name,
                    "model": model_name,
                    "sampleCount": int(metrics.get("sampleCount") or 0),
                    "top1": float(metrics.get("top1") or 0.0),
                    "top3": float(metrics.get("top3") or 0.0),
                    "logLoss": float(metrics.get("logLoss") or 0.0),
                    "brier": float(metrics.get("brier") or 0.0),
                    "ece": float(metrics.get("ece") or 0.0),
                }
            )
    return rows


def build_calibration_rows(snapshot: Dict[str, Any]) -> List[Dict[str, Any]]:
    bins = (snapshot.get("confidenceCalibration") or {}).get("bins") or []
    rows: List[Dict[str, Any]] = []
    for index, item in enumerate(bins):
        rows.append(
            {
                "binIndex": index,
                "min": float(item.get("min") or 0.0),
                "max": float(item.get("max") or 0.0),
                "count": int(item.get("count") or 0),
                "accuracy": float(item.get("accuracy") or 0.0),
                "avgConfidence": float(item.get("avgConfidence") or 0.0),
            }
        )
    return rows


def build_hard_validation_tag_rows(snapshot: Dict[str, Any]) -> List[Dict[str, Any]]:
    tag_counts = (snapshot.get("hardValidation") or {}).get("tagCounts") or {}
    return [
        {"tag": str(tag), "count": int(count)}
        for tag, count in sorted(tag_counts.items(), key=lambda item: int(item[1]), reverse=True)
    ]


def build_per_class_rows(evaluation: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    groups = evaluation.get("evaluation") or {}
    for split_name, split_payload in groups.items():
        for model_name, model_payload in split_payload.items():
            per_class = model_payload.get("perClass") or []
            for item in per_class:
                rows.append(
                    {
                        "split": split_name,
                        "model": model_name,
                        "classIndex": int(item.get("classIndex") or 0),
                        "className": str(item.get("className") or ""),
                        "precision": float(item.get("precision") or 0.0),
                        "recall": float(item.get("recall") or 0.0),
                        "f1": float(item.get("f1") or 0.0),
                        "support": int(item.get("support") or 0),
                    }
                )
    return rows


def build_confusion_matrix_rows(evaluation: Dict[str, Any]) -> List[Dict[str, Any]]:
    test_ensemble = ((evaluation.get("evaluation") or {}).get("test") or {}).get("ensemble") or {}
    matrix = test_ensemble.get("confusionMatrix") or []
    class_names = [str(item.get("className") or "") for item in (test_ensemble.get("perClass") or [])]
    rows: List[Dict[str, Any]] = []
    for actual_index, values in enumerate(matrix):
        actual_name = class_names[actual_index] if actual_index < len(class_names) else str(actual_index)
        for predicted_index, count in enumerate(values):
            predicted_name = (
                class_names[predicted_index] if predicted_index < len(class_names) else str(predicted_index)
            )
            rows.append(
                {
                    "actualIndex": actual_index,
                    "actualClass": actual_name,
                    "predictedIndex": predicted_index,
                    "predictedClass": predicted_name,
                    "count": int(count),
                }
            )
    return rows


def build_profile_rows(profiles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for profile in profiles:
        rows.append(
            {
                "profileKey": str(profile.get("profileKey") or ""),
                "careerName": str(profile.get("careerName") or ""),
                "pathKeys": " | ".join(str(value) for value in (profile.get("pathKeys") or [])),
                "levels": " | ".join(str(value) for value in (profile.get("levels") or [])),
                "representativeLevel": int(profile.get("representativeLevel") or 0),
            }
        )
    return rows


def build_ladder_rows(ladder_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for entry in ladder_entries:
        rows.append(
            {
                "pathKey": str(entry.get("pathKey") or ""),
                "pathName": str(entry.get("pathName") or ""),
                "careerName": str(entry.get("careerName") or ""),
                "level": int(entry.get("level") or 0),
                "profileKey": str(entry.get("profileKey") or ""),
            }
        )
    return rows


def resolve_dataset_path(cli_dataset_path: str | None, model_info: Dict[str, Any]) -> str | None:
    if cli_dataset_path:
        return cli_dataset_path
    data_source = str(model_info.get("dataSource") or "")
    prefix = "historical-json:"
    if data_source.startswith(prefix):
        return data_source[len(prefix) :]
    return None


def build_training_profile_debug_rows(training_debug: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for item in training_debug.get("profiles") or []:
        archetype_counts = item.get("archetypeCounts") or {}
        hard_tag_counts = item.get("hardTagCounts") or {}
        rows.append(
            {
                "label": int(item.get("label") or 0),
                "profileKey": str(item.get("profileKey") or ""),
                "careerName": str(item.get("careerName") or ""),
                "representativeLevel": int(item.get("representativeLevel") or 0),
                "levelBand": str(item.get("levelBand") or ""),
                "pathKeys": " | ".join(str(value) for value in (item.get("pathKeys") or [])),
                "signatureIndexes": " | ".join(str(value) for value in (item.get("signatureIndexes") or [])),
                "peerIndexes": " | ".join(str(value) for value in (item.get("peerIndexes") or [])),
                "strongFitCount": int(archetype_counts.get("strong_fit") or 0),
                "typicalFitCount": int(archetype_counts.get("typical_fit") or 0),
                "stretchFitCount": int(archetype_counts.get("stretch_fit") or 0),
                "avgPeerWeight": float(item.get("avgPeerWeight") or 0.0),
                "maxPeerWeight": float(item.get("maxPeerWeight") or 0.0),
                "avgDistanceToBase": float(item.get("avgDistanceToBase") or 0.0),
                "hardTagCounts": json.dumps(hard_tag_counts, separators=(",", ":")),
            }
        )
    return rows


def _join_path_keys(sample: Any) -> str:
    return " | ".join(str(value) for value in (sample.metadata.get("pathKeys") or []))


def build_split_sample_rows(split_name: str, samples: List[Any], profiles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for index, sample in enumerate(samples):
        profile = profiles[sample.label] if 0 <= sample.label < len(profiles) else {}
        rows.append(
            {
                "split": split_name,
                "sampleIndex": index,
                "label": int(sample.label),
                "profileKey": str(sample.metadata.get("profileKey") or profile.get("profileKey") or ""),
                "careerName": str(sample.metadata.get("careerName") or profile.get("careerName") or ""),
                "representativeLevel": int(sample.metadata.get("representativeLevel") or 0),
                "levelBand": str(sample.metadata.get("levelBand") or ""),
                "pathKeys": _join_path_keys(sample),
                "sharedProfile": bool(sample.metadata.get("sharedProfile") or False),
                "archetype": str(sample.metadata.get("archetype") or ""),
                "peerWeight": float(sample.metadata.get("peerWeight") or 0.0),
                "peerRelationship": str(sample.metadata.get("peerRelationship") or ""),
                "hardTags": " | ".join(str(value) for value in (sample.metadata.get("hardTags") or [])),
            }
        )
    return rows


def build_count_rows(rows: List[Dict[str, Any]], group_fields: List[str], count_name: str = "count") -> List[Dict[str, Any]]:
    counts: Dict[tuple[Any, ...], int] = {}
    for row in rows:
        key = tuple(row.get(field) for field in group_fields)
        counts[key] = counts.get(key, 0) + 1
    result: List[Dict[str, Any]] = []
    for key, count in sorted(counts.items()):
        item = {field: key[index] for index, field in enumerate(group_fields)}
        item[count_name] = count
        result.append(item)
    return result


def build_hard_tag_rows(split_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    counts: Dict[tuple[str, str], int] = {}
    for row in split_rows:
        split_name = str(row.get("split") or "")
        hard_tags = str(row.get("hardTags") or "")
        if not hard_tags:
            continue
        for tag in [value.strip() for value in hard_tags.split("|") if value.strip()]:
            key = (split_name, tag)
            counts[key] = counts.get(key, 0) + 1
    return [
        {"split": split_name, "tag": tag, "count": count}
        for (split_name, tag), count in sorted(counts.items(), key=lambda item: (-item[1], item[0][0], item[0][1]))
    ]


def build_gradient_boosting_trace_rows(training_diagnostics: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for item in training_diagnostics.get("gradientBoostingIterationTrace") or []:
        rows.append(
            {
                "iteration": int(float(item.get("iteration") or 0)),
                "gradient_boosting_train_top1": float(item.get("gradient_boosting_train_top1") or 0.0),
                "gradient_boosting_train_logLoss": float(item.get("gradient_boosting_train_logLoss") or 0.0),
                "gradient_boosting_validation_top1": float(item.get("gradient_boosting_validation_top1") or 0.0),
                "gradient_boosting_validation_logLoss": float(item.get("gradient_boosting_validation_logLoss") or 0.0),
                "gradient_boosting_hard_validation_top1": float(item.get("gradient_boosting_hard_validation_top1") or 0.0),
                "gradient_boosting_hard_validation_logLoss": float(item.get("gradient_boosting_hard_validation_logLoss") or 0.0),
                "gradient_boosting_test_top1": float(item.get("gradient_boosting_test_top1") or 0.0),
                "gradient_boosting_test_logLoss": float(item.get("gradient_boosting_test_logLoss") or 0.0),
                "ensemble_train_top1": float(item.get("ensemble_train_top1") or 0.0),
                "ensemble_train_logLoss": float(item.get("ensemble_train_logLoss") or 0.0),
                "ensemble_validation_top1": float(item.get("ensemble_validation_top1") or 0.0),
                "ensemble_validation_logLoss": float(item.get("ensemble_validation_logLoss") or 0.0),
                "ensemble_hard_validation_top1": float(item.get("ensemble_hard_validation_top1") or 0.0),
                "ensemble_hard_validation_logLoss": float(item.get("ensemble_hard_validation_logLoss") or 0.0),
                "ensemble_test_top1": float(item.get("ensemble_test_top1") or 0.0),
                "ensemble_test_logLoss": float(item.get("ensemble_test_logLoss") or 0.0),
            }
        )
    return rows


def build_learning_curve_rows(training_diagnostics: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for item in training_diagnostics.get("syntheticLearningCurve") or []:
        rows.append(
            {
                "fraction": float(item.get("fraction") or 0.0),
                "train_samples": int(float(item.get("train_samples") or 0)),
                "unique_labels": int(float(item.get("unique_labels") or 0)),
                "validation_top1": float(item.get("validation_top1") or 0.0),
                "validation_logLoss": float(item.get("validation_logLoss") or 0.0),
                "hard_validation_top1": float(item.get("hard_validation_top1") or 0.0),
                "hard_validation_logLoss": float(item.get("hard_validation_logLoss") or 0.0),
                "test_top1": float(item.get("test_top1") or 0.0),
                "test_top3": float(item.get("test_top3") or 0.0),
                "test_logLoss": float(item.get("test_logLoss") or 0.0),
                "test_brier": float(item.get("test_brier") or 0.0),
                "test_ece": float(item.get("test_ece") or 0.0),
                "ensemble_weight_logistic": float(item.get("ensemble_weight_logistic") or 0.0),
                "ensemble_weight_random_forest": float(item.get("ensemble_weight_random_forest") or 0.0),
                "ensemble_weight_gradient_boosting": float(item.get("ensemble_weight_gradient_boosting") or 0.0),
            }
        )
    return rows


def main() -> None:
    args = parse_args()
    model_path = Path(args.model_path).resolve()
    evaluation_path = model_path.with_name(model_path.stem + ".evaluation.json")

    model_payload = json.loads(model_path.read_text(encoding="utf-8"))
    evaluation = json.loads(evaluation_path.read_text(encoding="utf-8"))
    model_info = model_payload.get("modelInfo") or {}
    models = model_payload.get("models") or {}
    training_diagnostics = evaluation.get("trainingDiagnostics") or {}
    profiles = build_career_profiles()
    ladder_entries = build_career_ladder_entries()
    dataset_path = resolve_dataset_path(args.dataset_path, model_info)
    training_dataset = load_or_build_training_dataset(
        profiles=profiles,
        competency_order=COMPETENCY_ORDER,
        dataset_path=dataset_path,
    )
    training_split = split_samples(training_dataset.samples)
    hard_validation_samples, hard_validation_debug = build_hard_validation_subset(training_split["validation"])

    split = model_info.get("split") or {}
    calibration = model_info.get("confidenceCalibration") or models.get("confidenceCalibration") or {}
    hard_validation_info = model_info.get("hardValidation") or {}

    def metric_group(payload: Dict[str, Any]) -> Dict[str, Dict[str, float]]:
        result: Dict[str, Dict[str, float]] = {}
        for key in ("logistic", "randomForest", "gradientBoosting", "ensemble"):
            metric = payload.get(key) or {}
            result[key] = {
                "sampleCount": int(metric.get("sampleCount") or 0),
                "top1": float(metric.get("top1") or 0.0),
                "top3": float(metric.get("top3") or 0.0),
                "logLoss": float(metric.get("logLoss") or 0.0),
                "brier": float(metric.get("brier") or 0.0),
                "ece": float(metric.get("ece") or 0.0),
            }
        return result

    snapshot = {
        "model": {
            "trainedAt": str(model_info.get("trainedAt") or ""),
            "sampleCount": int(model_info.get("sampleCount") or 0),
            "featureCount": int(model_info.get("featureCount") or 0),
            "classCount": int(model_info.get("classCount") or 0),
            "ladderEntryCount": int(model_info.get("ladderEntryCount") or len(ladder_entries)),
            "dataSource": str(model_info.get("dataSource") or ""),
            "modelVersion": int(model_info["modelVersion"]) if model_info.get("modelVersion") is not None else None,
        },
        "split": {
            "train": int(split.get("train") or 0),
            "validation": int(split.get("validation") or 0),
            "hardValidation": int(split.get("hardValidation") or 0),
            "test": int(split.get("test") or 0),
        },
        "ensembleWeights": {
            "logistic": float((model_info.get("ensembleWeights") or {}).get("logistic", 0.0)),
            "randomForest": float((model_info.get("ensembleWeights") or {}).get("randomForest", 0.0)),
            "gradientBoosting": float((model_info.get("ensembleWeights") or {}).get("gradientBoosting", 0.0)),
        },
        "evaluation": metric_group((evaluation.get("evaluation") or {}).get("test") or {}),
        "validationComparison": {
            "baseline": metric_group((evaluation.get("evaluation") or {}).get("baselineValidation") or {}),
            "hard": metric_group((evaluation.get("evaluation") or {}).get("hardValidation") or {}),
        },
        "confidenceCalibration": {
            "binCount": int(calibration.get("binCount") or 0),
            "fallbackAccuracy": float(calibration.get("fallbackAccuracy") or 0.0),
            "bins": [
                {
                    "min": float(bin_data.get("min") or 0.0),
                    "max": float(bin_data.get("max") or 0.0),
                    "count": int(bin_data.get("count") or 0),
                    "accuracy": float(bin_data.get("accuracy") or 0.0),
                    "avgConfidence": float(bin_data.get("avgConfidence") or 0.0),
                }
                for bin_data in (calibration.get("bins") or [])
            ],
        },
        "hardValidation": {
            "source": str(hard_validation_info.get("source") or ""),
            "selectedCount": int(hard_validation_info.get("selectedCount") or 0),
            "availableCount": int(hard_validation_info.get("availableCount") or 0),
            "selectionMode": str(hard_validation_info.get("selectionMode") or ""),
            "avgHardness": float(hard_validation_info.get("avgHardness") or 0.0),
            "maxHardness": float(hard_validation_info.get("maxHardness") or 0.0),
            "minHardness": float(hard_validation_info.get("minHardness") or 0.0),
            "tagCounts": {str(key): int(value) for key, value in (hard_validation_info.get("tagCounts") or {}).items()},
        },
        "topFeatureImportances": build_feature_importance_rows(models)[:10],
    }

    out_dir = Path(args.out_dir).resolve()
    ensure_dir(out_dir)

    feature_importances = build_feature_importance_rows(models)
    feature_stats = build_feature_stats_rows(models)
    metric_rows = build_metric_rows(snapshot)
    calibration_rows = build_calibration_rows(snapshot)
    hard_validation_tags = build_hard_validation_tag_rows(snapshot)
    per_class_rows = build_per_class_rows(evaluation)
    confusion_matrix_rows = build_confusion_matrix_rows(evaluation)
    profile_rows = build_profile_rows(profiles)
    ladder_rows = build_ladder_rows(ladder_entries)
    training_profile_debug_rows = build_training_profile_debug_rows(training_dataset.debug or {})
    train_sample_rows = build_split_sample_rows("train", training_split["train"], profiles)
    validation_sample_rows = build_split_sample_rows("validation", training_split["validation"], profiles)
    hard_validation_sample_rows = build_split_sample_rows("hard_validation", hard_validation_samples, profiles)
    test_sample_rows = build_split_sample_rows("test", training_split["test"], profiles)
    split_sample_rows = (
        train_sample_rows
        + validation_sample_rows
        + hard_validation_sample_rows
        + test_sample_rows
    )
    split_class_distribution_rows = build_count_rows(split_sample_rows, ["split", "careerName"])
    split_level_distribution_rows = build_count_rows(split_sample_rows, ["split", "levelBand"])
    split_archetype_distribution_rows = build_count_rows(
        [row for row in split_sample_rows if row.get("archetype")],
        ["split", "archetype"],
    )
    split_relationship_distribution_rows = build_count_rows(
        [row for row in split_sample_rows if row.get("peerRelationship")],
        ["split", "peerRelationship"],
    )
    split_hard_tag_rows = build_hard_tag_rows(split_sample_rows)
    gradient_boosting_trace_rows = build_gradient_boosting_trace_rows(training_diagnostics)
    learning_curve_rows = build_learning_curve_rows(training_diagnostics)

    training_summary = {
        "dataSource": training_dataset.data_source,
        "datasetPath": dataset_path,
        "sampleCount": len(training_dataset.samples),
        "profileCount": len(profiles),
        "featureCount": len(COMPETENCY_ORDER),
        "debugMode": (training_dataset.debug or {}).get("mode"),
        "gradientBoostingTracePoints": len(gradient_boosting_trace_rows),
        "learningCurvePoints": len(learning_curve_rows),
        "split": {
            "train": len(training_split["train"]),
            "validation": len(training_split["validation"]),
            "hardValidation": len(hard_validation_samples),
            "test": len(training_split["test"]),
        },
        "hardValidationSelection": hard_validation_debug,
    }

    bundle = {
        "snapshot": snapshot,
        "evaluation": evaluation,
        "training": training_summary,
        "competencyOrder": COMPETENCY_ORDER,
        "competencyLabels": COMPETENCY_LABELS,
        "featureImportances": feature_importances,
        "featureStats": feature_stats,
        "evaluationMetrics": metric_rows,
        "calibrationBins": calibration_rows,
        "hardValidationTags": hard_validation_tags,
        "perClassMetrics": per_class_rows,
        "testEnsembleConfusionMatrix": confusion_matrix_rows,
        "trainingProfileDebug": training_profile_debug_rows,
        "trainingSplitSamples": split_sample_rows,
        "trainingSplitClassDistribution": split_class_distribution_rows,
        "trainingSplitLevelDistribution": split_level_distribution_rows,
        "trainingSplitArchetypeDistribution": split_archetype_distribution_rows,
        "trainingSplitRelationshipDistribution": split_relationship_distribution_rows,
        "trainingSplitHardTagDistribution": split_hard_tag_rows,
        "gradientBoostingIterationTrace": gradient_boosting_trace_rows,
        "syntheticLearningCurve": learning_curve_rows,
        "careerProfiles": profiles,
        "ladderEntries": ladder_entries,
    }

    write_json(out_dir / "visualization_bundle.json", bundle)
    write_json(out_dir / "snapshot.json", snapshot)
    write_json(out_dir / "evaluation.json", evaluation)
    write_json(out_dir / "training_summary.json", training_summary)

    write_csv(
        out_dir / "feature_importances.csv",
        feature_importances,
        ["featureIndex", "featureKey", "featureLabel", "logistic", "randomForest", "gradientBoosting", "ensemble"],
    )
    write_csv(
        out_dir / "feature_stats.csv",
        feature_stats,
        ["featureIndex", "featureKey", "featureLabel", "mean", "std"],
    )
    write_csv(
        out_dir / "evaluation_metrics.csv",
        metric_rows,
        ["split", "model", "sampleCount", "top1", "top3", "logLoss", "brier", "ece"],
    )
    write_csv(
        out_dir / "calibration_bins.csv",
        calibration_rows,
        ["binIndex", "min", "max", "count", "accuracy", "avgConfidence"],
    )
    write_csv(
        out_dir / "hard_validation_tags.csv",
        hard_validation_tags,
        ["tag", "count"],
    )
    write_csv(
        out_dir / "per_class_metrics.csv",
        per_class_rows,
        ["split", "model", "classIndex", "className", "precision", "recall", "f1", "support"],
    )
    write_csv(
        out_dir / "test_ensemble_confusion_matrix.csv",
        confusion_matrix_rows,
        ["actualIndex", "actualClass", "predictedIndex", "predictedClass", "count"],
    )
    write_csv(
        out_dir / "career_profiles.csv",
        profile_rows,
        ["profileKey", "careerName", "pathKeys", "levels", "representativeLevel"],
    )
    write_csv(
        out_dir / "ladder_entries.csv",
        ladder_rows,
        ["pathKey", "pathName", "careerName", "level", "profileKey"],
    )
    write_csv(
        out_dir / "training_profile_debug.csv",
        training_profile_debug_rows,
        [
            "label",
            "profileKey",
            "careerName",
            "representativeLevel",
            "levelBand",
            "pathKeys",
            "signatureIndexes",
            "peerIndexes",
            "strongFitCount",
            "typicalFitCount",
            "stretchFitCount",
            "avgPeerWeight",
            "maxPeerWeight",
            "avgDistanceToBase",
            "hardTagCounts",
        ],
    )
    write_csv(
        out_dir / "training_split_samples.csv",
        split_sample_rows,
        [
            "split",
            "sampleIndex",
            "label",
            "profileKey",
            "careerName",
            "representativeLevel",
            "levelBand",
            "pathKeys",
            "sharedProfile",
            "archetype",
            "peerWeight",
            "peerRelationship",
            "hardTags",
        ],
    )
    write_csv(
        out_dir / "training_split_class_distribution.csv",
        split_class_distribution_rows,
        ["split", "careerName", "count"],
    )
    write_csv(
        out_dir / "training_split_level_distribution.csv",
        split_level_distribution_rows,
        ["split", "levelBand", "count"],
    )
    write_csv(
        out_dir / "training_split_archetype_distribution.csv",
        split_archetype_distribution_rows,
        ["split", "archetype", "count"],
    )
    write_csv(
        out_dir / "training_split_relationship_distribution.csv",
        split_relationship_distribution_rows,
        ["split", "peerRelationship", "count"],
    )
    write_csv(
        out_dir / "training_split_hard_tag_distribution.csv",
        split_hard_tag_rows,
        ["split", "tag", "count"],
    )
    write_csv(
        out_dir / "gradient_boosting_iteration_trace.csv",
        gradient_boosting_trace_rows,
        [
            "iteration",
            "gradient_boosting_train_top1",
            "gradient_boosting_train_logLoss",
            "gradient_boosting_validation_top1",
            "gradient_boosting_validation_logLoss",
            "gradient_boosting_hard_validation_top1",
            "gradient_boosting_hard_validation_logLoss",
            "gradient_boosting_test_top1",
            "gradient_boosting_test_logLoss",
            "ensemble_train_top1",
            "ensemble_train_logLoss",
            "ensemble_validation_top1",
            "ensemble_validation_logLoss",
            "ensemble_hard_validation_top1",
            "ensemble_hard_validation_logLoss",
            "ensemble_test_top1",
            "ensemble_test_logLoss",
        ],
    )
    write_csv(
        out_dir / "synthetic_learning_curve.csv",
        learning_curve_rows,
        [
            "fraction",
            "train_samples",
            "unique_labels",
            "validation_top1",
            "validation_logLoss",
            "hard_validation_top1",
            "hard_validation_logLoss",
            "test_top1",
            "test_top3",
            "test_logLoss",
            "test_brier",
            "test_ece",
            "ensemble_weight_logistic",
            "ensemble_weight_random_forest",
            "ensemble_weight_gradient_boosting",
        ],
    )

    print(f"Visualization exports written to: {out_dir}")


if __name__ == "__main__":
    main()
