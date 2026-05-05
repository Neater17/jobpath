from __future__ import annotations

import math
import random
import time
from typing import Any, Callable, Dict, List, Optional, Tuple

from .training_dataset import TrainingSample


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def ensure_distribution(values: List[float]) -> List[float]:
    bounded = [value if math.isfinite(value) and value > 0 else 0.0 for value in values]
    total = sum(bounded)
    if total <= 0:
        equal = 1.0 / max(1, len(bounded))
        return [equal for _ in bounded]
    return [value / total for value in bounded]


def mean(values: List[float]) -> float:
    return (sum(values) / len(values)) if values else 0.0


def normalize_importance(values: List[float]) -> List[float]:
    max_value = max([0.0] + values)
    if max_value <= 0:
        return [0.0 for _ in values]
    return [value / max_value for value in values]


DEFAULT_ENSEMBLE_WEIGHTS = {
    "logistic": 0.35,
    "randomForest": 0.45,
    "gradientBoosting": 0.2,
}

MIN_ENSEMBLE_WEIGHT = 0.15
GRADIENT_BOOSTING_ESTIMATORS = 80
RANDOM_FOREST_MIN_SAMPLES_LEAF = 4
HARD_VALIDATION_RATIO = 0.55


def _emit_progress(progress: Optional[Callable[[str], None]], message: str) -> None:
    if progress is not None:
        progress(message)


def _apply_ensemble_weight_floor(weights: Dict[str, float]) -> Dict[str, float]:
    floored = {
        key: max(float(value), MIN_ENSEMBLE_WEIGHT)
        for key, value in weights.items()
    }
    total = sum(floored.values())
    if total <= 0:
        return dict(DEFAULT_ENSEMBLE_WEIGHTS)
    return {key: value / total for key, value in floored.items()}


def _load_training_dependencies() -> Tuple[Any, Any, Any, Any]:
    try:
        from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
        from sklearn.linear_model import LogisticRegression
        from sklearn.multiclass import OneVsRestClassifier
    except ImportError as error:  # pragma: no cover - depends on environment
        raise RuntimeError(
            "scikit-learn is required for recommendation training. "
            "Install Python/requirements.txt before retraining."
        ) from error
    return LogisticRegression, OneVsRestClassifier, RandomForestClassifier, GradientBoostingClassifier


def _samples_to_arrays(samples: List[TrainingSample]) -> Tuple[Any, Any]:
    feature_rows = [sample.features for sample in samples]
    labels = [sample.label for sample in samples]
    return feature_rows, labels


def _align_probability_rows(raw_probabilities: Any, classes: List[int], num_classes: int) -> List[List[float]]:
    aligned_rows: List[List[float]] = []
    class_indexes = [int(value) for value in classes]
    for row in raw_probabilities:
        vector = [0.0 for _ in range(num_classes)]
        for class_index, value in zip(class_indexes, row):
            if 0 <= class_index < num_classes:
                vector[class_index] = float(value)
        aligned_rows.append(ensure_distribution(vector))
    return aligned_rows


def _predict_estimator_probabilities(estimator: Any, features: List[float], num_classes: int) -> List[float]:
    raw = estimator.predict_proba([features])
    aligned = _align_probability_rows(raw, list(estimator.classes_), num_classes)
    return aligned[0] if aligned else ensure_distribution([0.0 for _ in range(num_classes)])


def _collect_estimator_probabilities(estimator: Any, samples: List[TrainingSample], num_classes: int) -> List[List[float]]:
    feature_rows = [sample.features for sample in samples]
    raw = estimator.predict_proba(feature_rows)
    return _align_probability_rows(raw, list(estimator.classes_), num_classes)


def _logistic_feature_importance(estimator: Any, num_features: int) -> List[float]:
    estimators = getattr(estimator, "estimators_", []) or []
    if not estimators:
        return [0.0 for _ in range(num_features)]
    aggregate = [0.0 for _ in range(num_features)]
    for classifier in estimators:
        coefficients = getattr(classifier, "coef_", None)
        if coefficients is None or len(coefficients) == 0:
            continue
        row = coefficients[0]
        for feature_index in range(min(num_features, len(row))):
            aggregate[feature_index] += abs(float(row[feature_index]))
    return normalize_importance(aggregate)


def _tree_feature_importance(estimator: Any, num_features: int) -> List[float]:
    values = [0.0 for _ in range(num_features)]
    importances = getattr(estimator, "feature_importances_", None)
    if importances is None:
        return values
    for feature_index in range(min(num_features, len(importances))):
        values[feature_index] = abs(float(importances[feature_index]))
    return normalize_importance(values)


def train_logistic_one_vs_rest(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    LogisticRegression, OneVsRestClassifier, _, _ = _load_training_dependencies()
    _emit_progress(progress, f"      logistic: starting sklearn one-vs-rest training for {num_classes} classes")
    _emit_progress(progress, "      logistic: preparing training arrays")
    features, labels = _samples_to_arrays(samples)
    estimator = OneVsRestClassifier(
        LogisticRegression(
            max_iter=1200,
            solver="lbfgs",
            random_state=880301,
        )
    )
    _emit_progress(progress, "      logistic: fitting estimator")
    estimator.fit(features, labels)
    _emit_progress(progress, "      logistic: extracting feature importance")
    _emit_progress(progress, "      logistic: finished")
    return {
        "backend": "sklearn",
        "estimatorClass": "OneVsRestClassifier(LogisticRegression)",
        "classes": [int(value) for value in estimator.classes_],
        "featureImportance": _logistic_feature_importance(estimator, num_features),
        "_estimator": estimator,
    }


def train_random_forest(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    _, _, RandomForestClassifier, _ = _load_training_dependencies()
    _emit_progress(progress, "      random forest: starting sklearn random forest training")
    _emit_progress(progress, "      random forest: preparing training arrays")
    features, labels = _samples_to_arrays(samples)
    estimator = RandomForestClassifier(
        n_estimators=240,
        max_depth=12,
        min_samples_split=8,
        min_samples_leaf=RANDOM_FOREST_MIN_SAMPLES_LEAF,
        random_state=227901,
        n_jobs=-1,
    )
    _emit_progress(progress, "      random forest: fitting estimator")
    estimator.fit(features, labels)
    _emit_progress(progress, "      random forest: extracting feature importance")
    _emit_progress(progress, "      random forest: finished")
    return {
        "backend": "sklearn",
        "estimatorClass": "RandomForestClassifier",
        "classes": [int(value) for value in estimator.classes_],
        "featureImportance": _tree_feature_importance(estimator, num_features),
        "_estimator": estimator,
    }


def train_gradient_boosting(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    _, _, _, GradientBoostingClassifier = _load_training_dependencies()
    _emit_progress(progress, "      gradient boosting: starting sklearn gradient boosting training")
    _emit_progress(progress, "      gradient boosting: preparing training arrays")
    features, labels = _samples_to_arrays(samples)
    start_time = time.perf_counter()
    estimator = GradientBoostingClassifier(
        n_estimators=GRADIENT_BOOSTING_ESTIMATORS,
        learning_rate=0.05,
        max_depth=3,
        random_state=20260302,
        verbose=1,
    )
    _emit_progress(progress, "      gradient boosting: fitting estimator")
    estimator.fit(features, labels)
    elapsed_seconds = time.perf_counter() - start_time
    _emit_progress(progress, "      gradient boosting: extracting feature importance")
    _emit_progress(progress, f"      gradient boosting: finished in {elapsed_seconds:.2f}s")
    return {
        "backend": "sklearn",
        "estimatorClass": "GradientBoostingClassifier",
        "classes": [int(value) for value in estimator.classes_],
        "featureImportance": _tree_feature_importance(estimator, num_features),
        "_estimator": estimator,
    }


def predict_logistic(model: Dict[str, Any], features: List[float]) -> List[float]:
    if model.get("backend") == "sklearn":
        estimator = model.get("_estimator")
        num_classes = max(1, len(model.get("classes") or []))
        if estimator is None:
            raise ValueError("Sklearn logistic estimator is not loaded")
        return _predict_estimator_probabilities(estimator, features, num_classes)
    raise ValueError("Legacy logistic prediction should be handled by the runtime service")


def predict_random_forest(model: Dict[str, Any], features: List[float]) -> List[float]:
    if model.get("backend") == "sklearn":
        estimator = model.get("_estimator")
        num_classes = max(1, len(model.get("classes") or []))
        if estimator is None:
            raise ValueError("Sklearn random forest estimator is not loaded")
        return _predict_estimator_probabilities(estimator, features, num_classes)
    raise ValueError("Legacy random forest prediction should be handled by the runtime service")


def predict_gradient_boosting(model: Dict[str, Any], features: List[float]) -> List[float]:
    if model.get("backend") == "sklearn":
        estimator = model.get("_estimator")
        num_classes = max(1, len(model.get("classes") or []))
        if estimator is None:
            raise ValueError("Sklearn gradient boosting estimator is not loaded")
        return _predict_estimator_probabilities(estimator, features, num_classes)
    raise ValueError("Legacy gradient boosting prediction should be handled by the runtime service")


def split_samples(samples: List[TrainingSample]) -> Dict[str, List[TrainingSample]]:
    shuffled = list(samples)
    rng = random.Random(20260301)
    rng.shuffle(shuffled)

    if len(shuffled) < 12:
        return {"train": shuffled, "validation": shuffled, "test": shuffled}

    total = len(shuffled)
    test_count = max(1, math.floor(total * 0.1))
    validation_count = max(1, math.floor(total * 0.1))
    train_count = total - validation_count - test_count

    while train_count < 1 and (validation_count > 1 or test_count > 1):
        if validation_count > test_count and validation_count > 1:
            validation_count -= 1
        elif test_count > 1:
            test_count -= 1
        train_count = total - validation_count - test_count

    train = shuffled[:train_count]
    validation = shuffled[train_count : train_count + validation_count]
    test = shuffled[train_count + validation_count :]
    return {
        "train": train or shuffled,
        "validation": validation or shuffled,
        "test": test or shuffled,
    }


def _sample_hardness(sample: TrainingSample) -> float:
    metadata = sample.metadata or {}
    hard_tags = set(metadata.get("hardTags") or [])
    score = 0.0
    tag_weights = {
        "shared_foundation_role": 2.6,
        "shared_foundation": 2.4,
        "same_path_adjacent": 2.0,
        "same_family_neighbor": 1.9,
        "cross_path_neighbor": 1.8,
        "high_level_profile": 1.6,
        "upper_level_typical": 1.2,
        "strategic_profile": 1.1,
        "mixed_signal": 1.4,
        "stretch_fit": 1.6,
    }
    for tag, weight in tag_weights.items():
        if tag in hard_tags:
            score += weight
    score += float(metadata.get("peerWeight") or 0.0) * 4.0
    level_band = str(metadata.get("levelBand") or "")
    if level_band == "low":
        score += 0.35
    elif level_band == "mid":
        score += 0.55
    elif level_band == "high":
        score += 0.9
    if bool(metadata.get("sharedProfile")):
        score += 1.2
    if str(metadata.get("peerRelationship") or "") in {"same_family_neighbor", "cross_path_neighbor"}:
        score += 0.6
    return score


def build_hard_validation_subset(validation_samples: List[TrainingSample]) -> Tuple[List[TrainingSample], Dict[str, Any]]:
    if len(validation_samples) <= 12:
        return list(validation_samples), {
            "source": "validation",
            "selectedCount": len(validation_samples),
            "availableCount": len(validation_samples),
            "selectionMode": "all",
            "avgHardness": mean([_sample_hardness(sample) for sample in validation_samples]),
            "tagCounts": {},
        }

    scored = [
        (_sample_hardness(sample), index, sample)
        for index, sample in enumerate(validation_samples)
    ]
    scored.sort(key=lambda entry: (entry[0], -entry[1]), reverse=True)
    target_count = min(
        len(validation_samples),
        max(1, math.ceil(len(validation_samples) * HARD_VALIDATION_RATIO)),
    )
    selected = [entry[2] for entry in scored[:target_count]]
    tag_counts: Dict[str, int] = {}
    for sample in selected:
        for tag in sample.metadata.get("hardTags") or []:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    return selected, {
        "source": "validation",
        "selectedCount": len(selected),
        "availableCount": len(validation_samples),
        "selectionMode": "hardness-ranked",
        "avgHardness": mean([entry[0] for entry in scored[:target_count]]),
        "maxHardness": scored[0][0] if scored else 0.0,
        "minHardness": scored[target_count - 1][0] if scored and target_count > 0 else 0.0,
        "tagCounts": tag_counts,
    }


def compute_feature_stats(samples: List[TrainingSample], num_features: int) -> Dict[str, List[float]]:
    if not samples:
        return {
            "means": [0.5 for _ in range(num_features)],
            "stds": [0.2 for _ in range(num_features)],
        }

    means = [
        sum(
            (sample.features[feature_index] if feature_index < len(sample.features) else 0.0)
            for sample in samples
        )
        / len(samples)
        for feature_index in range(num_features)
    ]
    stds = []
    for feature_index in range(num_features):
        variance = (
            sum(
                (
                    (
                        sample.features[feature_index]
                        if feature_index < len(sample.features)
                        else 0.0
                    )
                    - means[feature_index]
                )
                ** 2
                for sample in samples
            )
            / len(samples)
        )
        stds.append(max(0.04, math.sqrt(variance)))
    return {"means": means, "stds": stds}


def evaluate_probabilities(
    probabilities: List[List[float]], labels: List[int], num_classes: int, bins: int = 10
) -> Dict[str, float]:
    sample_count = max(1, len(probabilities))
    top1_hits = 0
    top3_hits = 0
    log_loss_sum = 0.0
    brier_sum = 0.0
    bin_stats = [{"count": 0, "confidenceSum": 0.0, "correctSum": 0.0} for _ in range(bins)]

    for index, probs in enumerate(probabilities):
        dist = ensure_distribution(probs)
        label = labels[index] if index < len(labels) else 0
        best_index = max(range(len(dist)), key=lambda item: dist[item])
        best_value = dist[best_index]
        if best_index == label:
            top1_hits += 1
        top_indices = [
            entry[1]
            for entry in sorted(
                [(value, class_index) for class_index, value in enumerate(dist)], reverse=True
            )[: min(3, len(dist))]
        ]
        if label in top_indices:
            top3_hits += 1
        p_true = max(1e-12, dist[label] if label < len(dist) else 0.0)
        log_loss_sum += -math.log(p_true)

        for class_index in range(num_classes):
            target = 1.0 if class_index == label else 0.0
            diff = (dist[class_index] if class_index < len(dist) else 0.0) - target
            brier_sum += diff * diff

        confidence = clamp01(best_value)
        bin_index = min(bins - 1, math.floor(confidence * bins))
        bin_stats[bin_index]["count"] += 1
        bin_stats[bin_index]["confidenceSum"] += confidence
        bin_stats[bin_index]["correctSum"] += 1 if best_index == label else 0

    ece = 0.0
    for bucket in bin_stats:
        if bucket["count"] <= 0:
            continue
        accuracy = bucket["correctSum"] / bucket["count"]
        avg_confidence = bucket["confidenceSum"] / bucket["count"]
        ece += abs(accuracy - avg_confidence) * (bucket["count"] / sample_count)

    return {
        "sampleCount": len(probabilities),
        "top1": top1_hits / sample_count,
        "top3": top3_hits / sample_count,
        "logLoss": log_loss_sum / sample_count,
        "brier": brier_sum / sample_count,
        "ece": ece,
    }


def build_confusion_matrix(
    probabilities: List[List[float]], labels: List[int], num_classes: int
) -> List[List[int]]:
    matrix = [[0 for _ in range(num_classes)] for _ in range(num_classes)]
    for index, probs in enumerate(probabilities):
        dist = ensure_distribution(probs)
        actual = labels[index] if index < len(labels) else 0
        predicted = max(range(len(dist)), key=lambda item: dist[item])
        if 0 <= actual < num_classes and 0 <= predicted < num_classes:
            matrix[actual][predicted] += 1
    return matrix


def build_per_class_metrics(
    confusion_matrix: List[List[int]],
    class_names: List[str],
) -> List[Dict[str, Any]]:
    metrics: List[Dict[str, Any]] = []
    size = len(confusion_matrix)
    for class_index in range(size):
        true_positive = confusion_matrix[class_index][class_index]
        false_positive = sum(
            confusion_matrix[row][class_index] for row in range(size) if row != class_index
        )
        false_negative = sum(
            confusion_matrix[class_index][column]
            for column in range(size)
            if column != class_index
        )
        support = sum(confusion_matrix[class_index])
        precision = (
            true_positive / (true_positive + false_positive)
            if (true_positive + false_positive) > 0
            else 0.0
        )
        recall = (
            true_positive / (true_positive + false_negative)
            if (true_positive + false_negative) > 0
            else 0.0
        )
        f1 = (
            (2 * precision * recall / (precision + recall))
            if (precision + recall) > 0
            else 0.0
        )
        metrics.append(
            {
                "classIndex": class_index,
                "className": class_names[class_index]
                if class_index < len(class_names)
                else f"class_{class_index}",
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "support": support,
            }
        )
    return metrics


def build_detailed_evaluation(
    probabilities: List[List[float]],
    labels: List[int],
    num_classes: int,
    class_names: List[str],
) -> Dict[str, Any]:
    summary = evaluate_probabilities(probabilities, labels, num_classes)
    confusion_matrix = build_confusion_matrix(probabilities, labels, num_classes)
    return {
        **summary,
        "confusionMatrix": confusion_matrix,
        "perClass": build_per_class_metrics(confusion_matrix, class_names),
    }


def combine_probabilities(
    logistic: List[float],
    random_forest: List[float],
    gradient_boosting: List[float],
    weights: Dict[str, float],
) -> List[float]:
    raw = [
        logistic[index] * float(weights["logistic"])
        + random_forest[index] * float(weights["randomForest"])
        + gradient_boosting[index] * float(weights["gradientBoosting"])
        for index in range(len(logistic))
    ]
    return ensure_distribution(raw)


def tune_ensemble_weights(
    logistic: List[List[float]],
    random_forest: List[List[float]],
    gradient_boosting: List[List[float]],
    labels: List[int],
    num_classes: int,
) -> Dict[str, float]:
    steps = 20
    best_weights = _apply_ensemble_weight_floor(DEFAULT_ENSEMBLE_WEIGHTS)
    best_metrics = evaluate_probabilities(
        [
            combine_probabilities(
                probs,
                random_forest[index],
                gradient_boosting[index],
                best_weights,
            )
            for index, probs in enumerate(logistic)
        ],
        labels,
        num_classes,
    )

    for logistic_step in range(steps + 1):
        for random_forest_step in range(steps - logistic_step + 1):
            gradient_boosting_step = steps - logistic_step - random_forest_step
            candidate = _apply_ensemble_weight_floor(
                {
                    "logistic": logistic_step / steps,
                    "randomForest": random_forest_step / steps,
                    "gradientBoosting": gradient_boosting_step / steps,
                }
            )
            metrics = evaluate_probabilities(
                [
                    combine_probabilities(
                        probs,
                        random_forest[index],
                        gradient_boosting[index],
                        candidate,
                    )
                    for index, probs in enumerate(logistic)
                ],
                labels,
                num_classes,
            )
            if metrics["logLoss"] < best_metrics["logLoss"] - 1e-8 or (
                abs(metrics["logLoss"] - best_metrics["logLoss"]) <= 1e-8
                and metrics["top1"] > best_metrics["top1"]
            ):
                best_weights = candidate
                best_metrics = metrics
    return best_weights


def collect_probabilities(
    logistic_model: Dict[str, Any],
    random_forest_model: Dict[str, Any],
    gradient_boosting_model: Dict[str, Any],
    samples: List[TrainingSample],
) -> Dict[str, List[List[float]]]:
    logistic_classes = max(1, len(logistic_model.get("classes") or []))
    random_forest_classes = max(1, len(random_forest_model.get("classes") or []))
    gradient_boosting_classes = max(1, len(gradient_boosting_model.get("classes") or []))
    return {
        "logistic": _collect_estimator_probabilities(
            logistic_model["_estimator"], samples, logistic_classes
        ),
        "randomForest": _collect_estimator_probabilities(
            random_forest_model["_estimator"], samples, random_forest_classes
        ),
        "gradientBoosting": _collect_estimator_probabilities(
            gradient_boosting_model["_estimator"], samples, gradient_boosting_classes
        ),
    }


def build_confidence_calibration(
    probabilities: List[List[float]], labels: List[int], bin_count: int = 12
) -> Dict[str, Any]:
    bins = [
        {
            "min": index / bin_count,
            "max": (index + 1) / bin_count,
            "count": 0,
            "confidenceSum": 0.0,
            "correctSum": 0.0,
        }
        for index in range(bin_count)
    ]
    total_correct = 0

    for index, probs in enumerate(probabilities):
        dist = ensure_distribution(probs)
        label = labels[index] if index < len(labels) else 0
        best_index = max(range(len(dist)), key=lambda item: dist[item])
        best_value = dist[best_index]
        confidence = clamp01(best_value)
        bucket_index = min(bin_count - 1, math.floor(confidence * bin_count))
        bucket = bins[bucket_index]
        bucket["count"] += 1
        bucket["confidenceSum"] += confidence
        if best_index == label:
            bucket["correctSum"] += 1
            total_correct += 1

    return {
        "binCount": bin_count,
        "fallbackAccuracy": (total_correct / len(probabilities)) if probabilities else 0.5,
        "bins": [
            {
                "min": bucket["min"],
                "max": bucket["max"],
                "count": bucket["count"],
                "accuracy": (bucket["correctSum"] / bucket["count"])
                if bucket["count"]
                else 0.0,
                "avgConfidence": (bucket["confidenceSum"] / bucket["count"])
                if bucket["count"]
                else 0.0,
            }
            for bucket in bins
        ],
    }


def calibrate_confidence(calibration: Dict[str, Any], raw_confidence: float) -> float:
    bounded = clamp01(raw_confidence)
    matched = next(
        (
            bucket
            for bucket in calibration.get("bins", [])
            if bounded >= float(bucket.get("min", 0.0))
            and (
                bounded < float(bucket.get("max", 1.0))
                or float(bucket.get("max", 1.0)) >= 1.0
            )
        ),
        None,
    )
    if not matched or int(matched.get("count", 0)) <= 0:
        return clamp01(float(calibration.get("fallbackAccuracy", 0.5)))
    return clamp01(float(matched.get("accuracy", calibration.get("fallbackAccuracy", 0.5))))


def train_ensemble_models(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    class_names: Optional[List[str]] = None,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    split = split_samples(samples)
    train_samples = split["train"]
    validation_samples = split["validation"]
    test_samples = split["test"]
    hard_validation_samples, hard_validation_debug = build_hard_validation_subset(validation_samples)
    evaluation_class_names = class_names or [f"class_{index}" for index in range(num_classes)]

    logistic = train_logistic_one_vs_rest(
        train_samples, num_classes, num_features, progress=progress
    )
    random_forest = train_random_forest(
        train_samples, num_classes, num_features, progress=progress
    )
    gradient_boosting = train_gradient_boosting(
        train_samples, num_classes, num_features, progress=progress
    )
    feature_stats = compute_feature_stats(train_samples, num_features)
    _emit_progress(progress, "      ensemble: computing validation metrics and tuning weights")

    validation_probs = collect_probabilities(
        logistic, random_forest, gradient_boosting, validation_samples
    )
    validation_labels = [sample.label for sample in validation_samples]
    hard_validation_probs = collect_probabilities(
        logistic, random_forest, gradient_boosting, hard_validation_samples
    )
    hard_validation_labels = [sample.label for sample in hard_validation_samples]
    _emit_progress(progress, "      ensemble: tuning validation ensemble weights")
    tuned_weights = tune_ensemble_weights(
        hard_validation_probs["logistic"],
        hard_validation_probs["randomForest"],
        hard_validation_probs["gradientBoosting"],
        hard_validation_labels,
        num_classes,
    )

    logistic_importance = normalize_importance(
        [float(value) for value in logistic["featureImportance"]]
    )
    random_forest_importance = normalize_importance(
        [float(value) for value in random_forest["featureImportance"]]
    )
    gradient_boosting_importance = normalize_importance(
        [float(value) for value in gradient_boosting["featureImportance"]]
    )
    ensemble_importance = normalize_importance(
        [
            logistic_importance[index] * float(tuned_weights["logistic"])
            + random_forest_importance[index] * float(tuned_weights["randomForest"])
            + gradient_boosting_importance[index]
            * float(tuned_weights["gradientBoosting"])
            for index in range(num_features)
        ]
    )

    test_probs = collect_probabilities(logistic, random_forest, gradient_boosting, test_samples)
    test_labels = [sample.label for sample in test_samples]
    _emit_progress(progress, "      ensemble: evaluating test split probabilities")
    ensemble_test_probs = [
        combine_probabilities(
            probs,
            test_probs["randomForest"][index],
            test_probs["gradientBoosting"][index],
            tuned_weights,
        )
        for index, probs in enumerate(test_probs["logistic"])
    ]
    validation_ensemble_probs = [
        combine_probabilities(
            probs,
            validation_probs["randomForest"][index],
            validation_probs["gradientBoosting"][index],
            tuned_weights,
        )
        for index, probs in enumerate(validation_probs["logistic"])
    ]
    hard_validation_ensemble_probs = [
        combine_probabilities(
            probs,
            hard_validation_probs["randomForest"][index],
            hard_validation_probs["gradientBoosting"][index],
            tuned_weights,
        )
        for index, probs in enumerate(hard_validation_probs["logistic"])
    ]
    _emit_progress(progress, "      ensemble: finished")

    return {
        "backend": "sklearn",
        "logistic": logistic,
        "randomForest": random_forest,
        "gradientBoosting": gradient_boosting,
        "featureStats": feature_stats,
        "ensembleWeights": tuned_weights,
        "confidenceCalibration": build_confidence_calibration(
            validation_ensemble_probs, validation_labels
        ),
        "diagnostics": {
            "split": {
                "train": len(train_samples),
                "validation": len(validation_samples),
                "hardValidation": len(hard_validation_samples),
                "test": len(test_samples),
            },
            "tuningValidationMode": "hard",
            "hardValidation": hard_validation_debug,
            "metrics": {
                "baselineValidation": {
                    "logistic": evaluate_probabilities(
                        validation_probs["logistic"], validation_labels, num_classes
                    ),
                    "randomForest": evaluate_probabilities(
                        validation_probs["randomForest"], validation_labels, num_classes
                    ),
                    "gradientBoosting": evaluate_probabilities(
                        validation_probs["gradientBoosting"], validation_labels, num_classes
                    ),
                    "ensemble": evaluate_probabilities(
                        validation_ensemble_probs, validation_labels, num_classes
                    ),
                },
                "hardValidation": {
                    "logistic": evaluate_probabilities(
                        hard_validation_probs["logistic"], hard_validation_labels, num_classes
                    ),
                    "randomForest": evaluate_probabilities(
                        hard_validation_probs["randomForest"], hard_validation_labels, num_classes
                    ),
                    "gradientBoosting": evaluate_probabilities(
                        hard_validation_probs["gradientBoosting"], hard_validation_labels, num_classes
                    ),
                    "ensemble": evaluate_probabilities(
                        hard_validation_ensemble_probs, hard_validation_labels, num_classes
                    ),
                },
                "test": {
                    "logistic": evaluate_probabilities(
                        test_probs["logistic"], test_labels, num_classes
                    ),
                    "randomForest": evaluate_probabilities(
                        test_probs["randomForest"], test_labels, num_classes
                    ),
                    "gradientBoosting": evaluate_probabilities(
                        test_probs["gradientBoosting"], test_labels, num_classes
                    ),
                    "ensemble": evaluate_probabilities(
                        ensemble_test_probs, test_labels, num_classes
                    ),
                },
            },
            "detailedEvaluation": {
                "baselineValidation": {
                    "logistic": build_detailed_evaluation(
                        validation_probs["logistic"], validation_labels, num_classes, evaluation_class_names
                    ),
                    "randomForest": build_detailed_evaluation(
                        validation_probs["randomForest"], validation_labels, num_classes, evaluation_class_names
                    ),
                    "gradientBoosting": build_detailed_evaluation(
                        validation_probs["gradientBoosting"], validation_labels, num_classes, evaluation_class_names
                    ),
                    "ensemble": build_detailed_evaluation(
                        validation_ensemble_probs, validation_labels, num_classes, evaluation_class_names
                    ),
                },
                "hardValidation": {
                    "logistic": build_detailed_evaluation(
                        hard_validation_probs["logistic"], hard_validation_labels, num_classes, evaluation_class_names
                    ),
                    "randomForest": build_detailed_evaluation(
                        hard_validation_probs["randomForest"], hard_validation_labels, num_classes, evaluation_class_names
                    ),
                    "gradientBoosting": build_detailed_evaluation(
                        hard_validation_probs["gradientBoosting"], hard_validation_labels, num_classes, evaluation_class_names
                    ),
                    "ensemble": build_detailed_evaluation(
                        hard_validation_ensemble_probs, hard_validation_labels, num_classes, evaluation_class_names
                    ),
                },
                "test": {
                    "logistic": build_detailed_evaluation(
                        test_probs["logistic"], test_labels, num_classes, evaluation_class_names
                    ),
                    "randomForest": build_detailed_evaluation(
                        test_probs["randomForest"], test_labels, num_classes, evaluation_class_names
                    ),
                    "gradientBoosting": build_detailed_evaluation(
                        test_probs["gradientBoosting"], test_labels, num_classes, evaluation_class_names
                    ),
                    "ensemble": build_detailed_evaluation(
                        ensemble_test_probs, test_labels, num_classes, evaluation_class_names
                    ),
                },
            },
        },
        "featureImportance": {
            "logistic": logistic_importance,
            "randomForest": random_forest_importance,
            "gradientBoosting": gradient_boosting_importance,
            "ensemble": ensemble_importance,
        },
    }


def predict_ensemble_probabilities(models: Dict[str, Any], features: List[float]) -> Dict[str, List[float]]:
    logistic = predict_logistic(models["logistic"], features)
    random_forest = predict_random_forest(models["randomForest"], features)
    gradient_boosting = predict_gradient_boosting(models["gradientBoosting"], features)
    ensemble = combine_probabilities(
        logistic,
        random_forest,
        gradient_boosting,
        models.get("ensembleWeights") or DEFAULT_ENSEMBLE_WEIGHTS,
    )
    return {
        "logistic": logistic,
        "randomForest": random_forest,
        "gradientBoosting": gradient_boosting,
        "ensemble": ensemble,
    }
