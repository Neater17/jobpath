from __future__ import annotations

import math
import random
from typing import Any, Callable, Dict, List, Optional

from .training_dataset import TrainingSample


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


def softmax(values: List[float]) -> List[float]:
    if not values:
        return [1.0]
    max_value = max(values)
    exps = [math.exp(value - max_value) for value in values]
    total = sum(exps) or 1.0
    return [value / total for value in exps]


def ensure_distribution(values: List[float]) -> List[float]:
    bounded = [value if math.isfinite(value) and value > 0 else 0.0 for value in values]
    total = sum(bounded)
    if total <= 0:
        equal = 1.0 / max(1, len(bounded))
        return [equal for _ in bounded]
    return [value / total for value in bounded]


def dot(left: List[float], right: List[float]) -> float:
    return sum(
        (left[index] if index < len(left) else 0.0) * (right[index] if index < len(right) else 0.0)
        for index in range(max(len(left), len(right)))
    )


def mean(values: List[float]) -> float:
    return (sum(values) / len(values)) if values else 0.0


def squared_error(values: List[float], reference: float) -> float:
    return sum((value - reference) ** 2 for value in values)


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


def _emit_progress(progress: Optional[Callable[[str], None]], message: str) -> None:
    if progress is not None:
        progress(message)


def train_logistic_one_vs_rest(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    rng = random.Random(880301)
    weights = [[(rng.random() - 0.5) * 0.03 for _ in range(num_features)] for _ in range(num_classes)]
    bias = [0.0 for _ in range(num_classes)]
    feature_importance = [0.0 for _ in range(num_features)]
    total_epochs = 260
    _emit_progress(progress, f"      logistic: starting one-vs-rest training for {num_classes} classes")

    for class_index in range(num_classes):
        w = weights[class_index]
        b = bias[class_index]
        learning_rate = 0.22
        l2 = 0.002

        for epoch in range(total_epochs):
            grad_w = [0.0 for _ in range(num_features)]
            grad_b = 0.0
            for sample in samples:
                y = 1.0 if sample.label == class_index else 0.0
                z = dot(w, sample.features) + b
                p = sigmoid(z)
                err = p - y
                for feature_index in range(num_features):
                    grad_w[feature_index] += err * sample.features[feature_index]
                grad_b += err

            scale = 1.0 / max(1, len(samples))
            for feature_index in range(num_features):
                w[feature_index] -= learning_rate * (grad_w[feature_index] * scale + l2 * w[feature_index])
            b -= learning_rate * grad_b * scale
            learning_rate *= 0.995
            if epoch + 1 in {1, total_epochs // 2, total_epochs} and class_index == 0:
                _emit_progress(
                    progress,
                    f"      logistic: class {class_index + 1}/{num_classes}, epoch {epoch + 1}/{total_epochs}",
                )

        bias[class_index] = b
        for feature_index in range(num_features):
            feature_importance[feature_index] += abs(w[feature_index])
        _emit_progress(progress, f"      logistic: finished class {class_index + 1}/{num_classes}")

    _emit_progress(progress, "      logistic: finished")
    return {
        "weights": weights,
        "bias": bias,
        "featureImportance": normalize_importance(feature_importance),
    }


def sample_feature_subset(num_features: int, desired_count: int, rng: random.Random) -> List[int]:
    all_features = list(range(num_features))
    rng.shuffle(all_features)
    return all_features[: max(1, min(desired_count, num_features))]


def class_counts(indices: List[int], samples: List[TrainingSample], num_classes: int) -> List[int]:
    counts = [0 for _ in range(num_classes)]
    for index in indices:
        counts[samples[index].label] += 1
    return counts


def gini_from_counts(counts: List[int]) -> float:
    total = sum(counts)
    if total <= 0:
        return 0.0
    squared = 0.0
    for count in counts:
        p = count / total
        squared += p * p
    return 1.0 - squared


def distribution_from_counts(counts: List[int]) -> List[float]:
    total = sum(counts) or 1
    return [count / total for count in counts]


def train_random_forest(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    rng = random.Random(227901)
    trees: List[Dict[str, Any]] = []
    feature_importance = [0.0 for _ in range(num_features)]
    tree_count = 85
    max_depth = 5
    min_samples_split = 14
    threshold_candidates = 10
    mtry = max(3, int(math.sqrt(num_features)))

    def build_tree(indices: List[int], depth: int) -> Dict[str, Any]:
        counts = class_counts(indices, samples, num_classes)
        probs = distribution_from_counts(counts)
        total = len(indices)
        non_zero_classes = len([count for count in counts if count > 0])

        if depth >= max_depth or total < min_samples_split or non_zero_classes <= 1:
            return {"probs": probs}

        parent_gini = gini_from_counts(counts)
        candidate_features = sample_feature_subset(num_features, mtry, rng)

        best_feature = -1
        best_threshold = 0.0
        best_gain = 0.0
        best_left: List[int] = []
        best_right: List[int] = []

        for feature in candidate_features:
            values = [samples[index].features[feature] for index in indices]
            min_value = min(values)
            max_value = max(values)
            if max_value - min_value < 1e-6:
                continue

            for threshold_index in range(1, threshold_candidates + 1):
                threshold = min_value + ((max_value - min_value) * threshold_index) / (threshold_candidates + 1)
                left = [index for index in indices if samples[index].features[feature] <= threshold]
                right = [index for index in indices if samples[index].features[feature] > threshold]
                if not left or not right:
                    continue

                left_gini = gini_from_counts(class_counts(left, samples, num_classes))
                right_gini = gini_from_counts(class_counts(right, samples, num_classes))
                weighted_child_gini = (len(left) / total) * left_gini + (len(right) / total) * right_gini
                gain = parent_gini - weighted_child_gini
                if gain > best_gain:
                    best_gain = gain
                    best_feature = feature
                    best_threshold = threshold
                    best_left = left
                    best_right = right

        if best_feature < 0 or best_gain < 1e-5:
            return {"probs": probs}

        feature_importance[best_feature] += best_gain * total
        return {
            "probs": probs,
            "feature": best_feature,
            "threshold": best_threshold,
            "left": build_tree(best_left, depth + 1),
            "right": build_tree(best_right, depth + 1),
        }

    for _ in range(tree_count):
        bootstrap = [rng.randrange(len(samples)) for _ in range(len(samples))]
        trees.append(build_tree(bootstrap, 0))
        built = len(trees)
        if built in {1, max(1, tree_count // 2), tree_count}:
            _emit_progress(progress, f"      random forest: built tree {built}/{tree_count}")

    _emit_progress(progress, "      random forest: finished")
    return {
        "trees": trees,
        "featureImportance": normalize_importance(feature_importance),
    }


def predict_tree(tree: Dict[str, Any], features: List[float]) -> List[float]:
    if "feature" not in tree or "threshold" not in tree or "left" not in tree or "right" not in tree:
        return [float(value) for value in tree.get("probs", [1.0])]
    if features[int(tree["feature"])] <= float(tree["threshold"]):
        return predict_tree(tree["left"], features)
    return predict_tree(tree["right"], features)


def fit_regression_stump(samples: List[TrainingSample], residuals: List[float], num_features: int) -> Dict[str, Any]:
    parent_mean = mean(residuals)
    parent_sse = squared_error(residuals, parent_mean)
    threshold_candidates = 11
    best: Dict[str, Any] | None = None

    for feature in range(num_features):
        values = [sample.features[feature] for sample in samples]
        min_value = min(values)
        max_value = max(values)
        if max_value - min_value < 1e-6:
            continue

        for threshold_index in range(1, threshold_candidates + 1):
            threshold = min_value + ((max_value - min_value) * threshold_index) / (threshold_candidates + 1)
            left_residuals = [residuals[index] for index, sample in enumerate(samples) if sample.features[feature] <= threshold]
            right_residuals = [residuals[index] for index, sample in enumerate(samples) if sample.features[feature] > threshold]
            if len(left_residuals) < 2 or len(right_residuals) < 2:
                continue

            left_mean = mean(left_residuals)
            right_mean = mean(right_residuals)
            child_sse = squared_error(left_residuals, left_mean) + squared_error(right_residuals, right_mean)
            gain = parent_sse - child_sse
            if best is None or gain > float(best["gain"]):
                best = {
                    "feature": feature,
                    "threshold": threshold,
                    "leftValue": left_mean,
                    "rightValue": right_mean,
                    "gain": gain,
                }

    if best is None:
        return {
            "feature": 0,
            "threshold": 0.5,
            "leftValue": parent_mean,
            "rightValue": parent_mean,
            "gain": 0.0,
        }
    return best


def train_gradient_boosting(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    rounds = 46
    learning_rate = 0.17
    class_stumps: List[List[Dict[str, Any]]] = [[] for _ in range(num_classes)]
    feature_importance = [0.0 for _ in range(num_features)]
    score_matrix = [[0.0 for _ in range(num_classes)] for _ in range(len(samples))]
    _emit_progress(progress, f"      gradient boosting: starting {rounds} boosting rounds")

    for round_index in range(rounds):
        probability_matrix = [softmax(scores) for scores in score_matrix]
        for class_index in range(num_classes):
            residuals = []
            for index, sample in enumerate(samples):
                y = 1.0 if sample.label == class_index else 0.0
                p = probability_matrix[index][class_index]
                residuals.append(y - p)

            stump = fit_regression_stump(samples, residuals, num_features)
            class_stumps[class_index].append(stump)
            feature_importance[int(stump["feature"])] += max(0.0, float(stump["gain"]))

            for index, sample in enumerate(samples):
                value = float(stump["leftValue"]) if sample.features[int(stump["feature"])] <= float(stump["threshold"]) else float(stump["rightValue"])
                score_matrix[index][class_index] += learning_rate * value
        if round_index + 1 in {1, max(1, rounds // 2), rounds}:
            _emit_progress(progress, f"      gradient boosting: round {round_index + 1}/{rounds}")

    _emit_progress(progress, "      gradient boosting: finished")
    return {
        "classStumps": class_stumps,
        "learningRate": learning_rate,
        "featureImportance": normalize_importance(feature_importance),
    }


def predict_logistic(model: Dict[str, Any], features: List[float]) -> List[float]:
    raw = [sigmoid(dot([float(value) for value in weights], features) + float(model["bias"][class_index])) for class_index, weights in enumerate(model["weights"])]
    return ensure_distribution(raw)


def predict_random_forest(model: Dict[str, Any], features: List[float]) -> List[float]:
    tree_len = len((model.get("trees") or [{}])[0].get("probs", [1.0]))
    aggregate = [0.0 for _ in range(tree_len)]
    trees = model.get("trees") or []
    for tree in trees:
        probs = predict_tree(tree, features)
        for class_index, value in enumerate(probs):
            aggregate[class_index] += float(value)
    averaged = [value / max(1, len(trees)) for value in aggregate]
    return ensure_distribution(averaged)


def predict_gradient_boosting(model: Dict[str, Any], features: List[float]) -> List[float]:
    scores = []
    for stumps in model.get("classStumps") or []:
        total = 0.0
        for stump in stumps:
            leaf_value = float(stump["leftValue"]) if features[int(stump["feature"])] <= float(stump["threshold"]) else float(stump["rightValue"])
            total += float(model["learningRate"]) * leaf_value
        scores.append(total)
    return ensure_distribution(softmax(scores))


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
    validation = shuffled[train_count: train_count + validation_count]
    test = shuffled[train_count + validation_count:]
    return {
        "train": train or shuffled,
        "validation": validation or shuffled,
        "test": test or shuffled,
    }


def compute_feature_stats(samples: List[TrainingSample], num_features: int) -> Dict[str, List[float]]:
    if not samples:
        return {
            "means": [0.5 for _ in range(num_features)],
            "stds": [0.2 for _ in range(num_features)],
        }

    means = [
        sum((sample.features[feature_index] if feature_index < len(sample.features) else 0.0) for sample in samples) / len(samples)
        for feature_index in range(num_features)
    ]
    stds = []
    for feature_index in range(num_features):
        variance = sum((((sample.features[feature_index] if feature_index < len(sample.features) else 0.0) - means[feature_index]) ** 2) for sample in samples) / len(samples)
        stds.append(max(0.04, math.sqrt(variance)))
    return {"means": means, "stds": stds}


def evaluate_probabilities(probabilities: List[List[float]], labels: List[int], num_classes: int, bins: int = 10) -> Dict[str, float]:
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
        top_indices = [entry[1] for entry in sorted([(value, class_index) for class_index, value in enumerate(dist)], reverse=True)[: min(3, len(dist))]]
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


def build_confusion_matrix(probabilities: List[List[float]], labels: List[int], num_classes: int) -> List[List[int]]:
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
        false_positive = sum(confusion_matrix[row][class_index] for row in range(size) if row != class_index)
        false_negative = sum(confusion_matrix[class_index][column] for column in range(size) if column != class_index)
        support = sum(confusion_matrix[class_index])
        precision = true_positive / (true_positive + false_positive) if (true_positive + false_positive) > 0 else 0.0
        recall = true_positive / (true_positive + false_negative) if (true_positive + false_negative) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        metrics.append(
            {
                "classIndex": class_index,
                "className": class_names[class_index] if class_index < len(class_names) else f"class_{class_index}",
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


def combine_probabilities(logistic: List[float], random_forest: List[float], gradient_boosting: List[float], weights: Dict[str, float]) -> List[float]:
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
    best_weights = dict(DEFAULT_ENSEMBLE_WEIGHTS)
    best_metrics = evaluate_probabilities(
        [combine_probabilities(probs, random_forest[index], gradient_boosting[index], best_weights) for index, probs in enumerate(logistic)],
        labels,
        num_classes,
    )

    for logistic_step in range(steps + 1):
        for random_forest_step in range(steps - logistic_step + 1):
            gradient_boosting_step = steps - logistic_step - random_forest_step
            candidate = {
                "logistic": logistic_step / steps,
                "randomForest": random_forest_step / steps,
                "gradientBoosting": gradient_boosting_step / steps,
            }
            metrics = evaluate_probabilities(
                [combine_probabilities(probs, random_forest[index], gradient_boosting[index], candidate) for index, probs in enumerate(logistic)],
                labels,
                num_classes,
            )
            if metrics["logLoss"] < best_metrics["logLoss"] - 1e-8 or (
                abs(metrics["logLoss"] - best_metrics["logLoss"]) <= 1e-8 and metrics["top1"] > best_metrics["top1"]
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
    return {
        "logistic": [predict_logistic(logistic_model, sample.features) for sample in samples],
        "randomForest": [predict_random_forest(random_forest_model, sample.features) for sample in samples],
        "gradientBoosting": [predict_gradient_boosting(gradient_boosting_model, sample.features) for sample in samples],
    }


def build_confidence_calibration(probabilities: List[List[float]], labels: List[int], bin_count: int = 12) -> Dict[str, Any]:
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
                "accuracy": (bucket["correctSum"] / bucket["count"]) if bucket["count"] else 0.0,
                "avgConfidence": (bucket["confidenceSum"] / bucket["count"]) if bucket["count"] else 0.0,
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
            and (bounded < float(bucket.get("max", 1.0)) or float(bucket.get("max", 1.0)) >= 1.0)
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
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    split = split_samples(samples)
    train_samples = split["train"]
    validation_samples = split["validation"]
    test_samples = split["test"]

    logistic = train_logistic_one_vs_rest(train_samples, num_classes, num_features, progress=progress)
    random_forest = train_random_forest(train_samples, num_classes, num_features, progress=progress)
    gradient_boosting = train_gradient_boosting(train_samples, num_classes, num_features, progress=progress)
    feature_stats = compute_feature_stats(train_samples, num_features)
    _emit_progress(progress, "      ensemble: computing validation metrics and tuning weights")

    validation_probs = collect_probabilities(logistic, random_forest, gradient_boosting, validation_samples)
    validation_labels = [sample.label for sample in validation_samples]
    tuned_weights = tune_ensemble_weights(
        validation_probs["logistic"],
        validation_probs["randomForest"],
        validation_probs["gradientBoosting"],
        validation_labels,
        num_classes,
    )

    logistic_importance = normalize_importance([float(value) for value in logistic["featureImportance"]])
    random_forest_importance = normalize_importance([float(value) for value in random_forest["featureImportance"]])
    gradient_boosting_importance = normalize_importance([float(value) for value in gradient_boosting["featureImportance"]])
    ensemble_importance = normalize_importance(
        [
            logistic_importance[index] * float(tuned_weights["logistic"])
            + random_forest_importance[index] * float(tuned_weights["randomForest"])
            + gradient_boosting_importance[index] * float(tuned_weights["gradientBoosting"])
            for index in range(num_features)
        ]
    )

    test_probs = collect_probabilities(logistic, random_forest, gradient_boosting, test_samples)
    test_labels = [sample.label for sample in test_samples]
    ensemble_test_probs = [
        combine_probabilities(probs, test_probs["randomForest"][index], test_probs["gradientBoosting"][index], tuned_weights)
        for index, probs in enumerate(test_probs["logistic"])
    ]
    validation_ensemble_probs = [
        combine_probabilities(probs, validation_probs["randomForest"][index], validation_probs["gradientBoosting"][index], tuned_weights)
        for index, probs in enumerate(validation_probs["logistic"])
    ]
    _emit_progress(progress, "      ensemble: finished")

    return {
        "logistic": logistic,
        "randomForest": random_forest,
        "gradientBoosting": gradient_boosting,
        "featureStats": feature_stats,
        "ensembleWeights": tuned_weights,
        "confidenceCalibration": build_confidence_calibration(validation_ensemble_probs, validation_labels),
        "diagnostics": {
            "split": {
                "train": len(train_samples),
                "validation": len(validation_samples),
                "test": len(test_samples),
            },
            "metrics": {
                "logistic": evaluate_probabilities(test_probs["logistic"], test_labels, num_classes),
                "randomForest": evaluate_probabilities(test_probs["randomForest"], test_labels, num_classes),
                "gradientBoosting": evaluate_probabilities(test_probs["gradientBoosting"], test_labels, num_classes),
                "ensemble": evaluate_probabilities(ensemble_test_probs, test_labels, num_classes),
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
    ensemble = combine_probabilities(logistic, random_forest, gradient_boosting, models.get("ensembleWeights") or DEFAULT_ENSEMBLE_WEIGHTS)
    return {
        "logistic": logistic,
        "randomForest": random_forest,
        "gradientBoosting": gradient_boosting,
        "ensemble": ensemble,
    }
