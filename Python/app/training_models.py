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

GRADIENT_BOOSTING_ESTIMATORS = 80
RANDOM_FOREST_MIN_SAMPLES_LEAF = 4
HARD_VALIDATION_RATIO = 0.55
TUNING_CV_FOLDS = 3
TUNING_CV_RANDOM_STATE = 20260303
RANDOM_FOREST_SEARCH_ITERATIONS = 12
GRADIENT_BOOSTING_SEARCH_ITERATIONS = 10
SEARCH_PRIMARY_METRIC = "neg_log_loss"
SEARCH_TOP1_METRIC = "top1"
SEARCH_ECE_METRIC = "neg_ece"
ENSEMBLE_COARSE_STEP = 0.05
ENSEMBLE_FINE_STEP = 0.01
ENSEMBLE_FINE_RADIUS = 0.10


def _emit_progress(progress: Optional[Callable[[str], None]], message: str) -> None:
    if progress is not None:
        progress(message)


def _to_builtin(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, dict):
        return {str(key): _to_builtin(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_builtin(item) for item in value]
    if hasattr(value, "item"):
        return _to_builtin(value.item())
    return str(value)


def _normalize_params(params: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
    normalized: Dict[str, Any] = {}
    for key, value in params.items():
        normalized_key = key[len(prefix) :] if prefix and key.startswith(prefix) else key
        normalized[normalized_key] = _to_builtin(value)
    return normalized


def _params_equal(left: Dict[str, Any], right: Dict[str, Any]) -> bool:
    return _normalize_params(left) == _normalize_params(right)


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


def _load_search_dependencies() -> Tuple[Any, Any, Any, Any]:
    try:
        from sklearn.metrics import accuracy_score, log_loss, make_scorer
        from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, StratifiedKFold
    except ImportError as error:  # pragma: no cover - depends on environment
        raise RuntimeError(
            "scikit-learn is required for recommendation tuning. "
            "Install Python/requirements.txt before retraining."
        ) from error
    return GridSearchCV, RandomizedSearchCV, StratifiedKFold, (accuracy_score, log_loss, make_scorer)


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


def _logistic_default_params() -> Dict[str, Any]:
    return {
        "C": 1.0,
        "class_weight": None,
    }


def _random_forest_default_params() -> Dict[str, Any]:
    return {
        "n_estimators": 240,
        "max_depth": 12,
        "min_samples_split": 8,
        "min_samples_leaf": RANDOM_FOREST_MIN_SAMPLES_LEAF,
        "max_features": "sqrt",
    }


def _gradient_boosting_default_params() -> Dict[str, Any]:
    return {
        "n_estimators": GRADIENT_BOOSTING_ESTIMATORS,
        "learning_rate": 0.05,
        "max_depth": 3,
        "min_samples_split": 2,
        "min_samples_leaf": 1,
        "subsample": 1.0,
    }


def _create_logistic_estimator(params: Optional[Dict[str, Any]] = None) -> Any:
    LogisticRegression, OneVsRestClassifier, _, _ = _load_training_dependencies()
    resolved = {**_logistic_default_params(), **_normalize_params(params or {})}
    return OneVsRestClassifier(
        LogisticRegression(
            C=float(resolved["C"]),
            class_weight=resolved.get("class_weight"),
            max_iter=1200,
            penalty="l2",
            random_state=880301,
            solver="lbfgs",
        )
    )


def _create_random_forest_estimator(
    params: Optional[Dict[str, Any]] = None,
    *,
    n_jobs: int = -1,
) -> Any:
    _, _, RandomForestClassifier, _ = _load_training_dependencies()
    resolved = {**_random_forest_default_params(), **_normalize_params(params or {})}
    return RandomForestClassifier(
        n_estimators=int(resolved["n_estimators"]),
        max_depth=None if resolved.get("max_depth") is None else int(resolved["max_depth"]),
        min_samples_split=int(resolved["min_samples_split"]),
        min_samples_leaf=int(resolved["min_samples_leaf"]),
        max_features=resolved.get("max_features"),
        random_state=227901,
        n_jobs=n_jobs,
    )


def _create_gradient_boosting_estimator(
    params: Optional[Dict[str, Any]] = None,
    *,
    verbose: int = 1,
) -> Any:
    _, _, _, GradientBoostingClassifier = _load_training_dependencies()
    resolved = {**_gradient_boosting_default_params(), **_normalize_params(params or {})}
    return GradientBoostingClassifier(
        n_estimators=int(resolved["n_estimators"]),
        learning_rate=float(resolved["learning_rate"]),
        max_depth=int(resolved["max_depth"]),
        min_samples_split=int(resolved["min_samples_split"]),
        min_samples_leaf=int(resolved["min_samples_leaf"]),
        subsample=float(resolved["subsample"]),
        random_state=20260302,
        verbose=verbose,
    )


def _expected_calibration_error_from_probabilities(labels: List[int], probabilities: List[List[float]]) -> float:
    num_classes = len(probabilities[0]) if probabilities else max(1, len(set(labels)))
    return evaluate_probabilities(probabilities, labels, num_classes)["ece"]


def _expected_calibration_error_score(y_true: Any, y_prob: Any) -> float:
    labels = [int(value) for value in y_true]
    probabilities = [
        [float(cell) for cell in row]
        for row in y_prob
    ]
    return _expected_calibration_error_from_probabilities(labels, probabilities)


def _build_search_scoring(num_classes: int) -> Dict[str, Any]:
    _, _, _, metrics_bundle = _load_search_dependencies()
    _, log_loss, make_scorer = metrics_bundle
    return {
        SEARCH_PRIMARY_METRIC: make_scorer(
            log_loss,
            response_method="predict_proba",
            greater_is_better=False,
            labels=list(range(num_classes)),
        ),
        SEARCH_TOP1_METRIC: "accuracy",
        SEARCH_ECE_METRIC: make_scorer(
            _expected_calibration_error_score,
            response_method="predict_proba",
            greater_is_better=False,
        ),
    }


def _build_cv_splitter() -> Any:
    _, _, StratifiedKFold, _ = _load_search_dependencies()
    return StratifiedKFold(
        n_splits=TUNING_CV_FOLDS,
        shuffle=True,
        random_state=TUNING_CV_RANDOM_STATE,
    )


def _can_run_hyperparameter_search(labels: List[int], cv_folds: int = TUNING_CV_FOLDS) -> Tuple[bool, str]:
    if len(labels) < cv_folds:
        return False, f"need at least {cv_folds} samples for stratified CV"
    label_counts: Dict[int, int] = {}
    for label in labels:
        label_counts[label] = label_counts.get(label, 0) + 1
    if len(label_counts) < 2:
        return False, "need at least two classes for hyperparameter search"
    min_class_count = min(label_counts.values())
    if min_class_count < cv_folds:
        return False, f"smallest class has {min_class_count} samples; need at least {cv_folds}"
    return True, ""


def _collect_oof_probabilities(
    samples: List[TrainingSample],
    *,
    num_classes: int,
    estimator_factory: Callable[[Dict[str, Any]], Any],
    params: Dict[str, Any],
) -> List[List[float]]:
    features, labels = _samples_to_arrays(samples)
    probabilities = [
        [0.0 for _ in range(num_classes)]
        for _ in range(len(samples))
    ]
    splitter = _build_cv_splitter()
    for train_indexes, validation_indexes in splitter.split(features, labels):
        estimator = estimator_factory(params)
        train_features = [features[index] for index in train_indexes]
        train_labels = [labels[index] for index in train_indexes]
        validation_features = [features[index] for index in validation_indexes]
        estimator.fit(train_features, train_labels)
        raw = estimator.predict_proba(validation_features)
        aligned = _align_probability_rows(raw, list(estimator.classes_), num_classes)
        for row_index, sample_index in enumerate(validation_indexes):
            probabilities[int(sample_index)] = aligned[row_index]
    return probabilities


def _sorted_search_candidates(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    ranked = sorted(
        candidates,
        key=lambda item: (
            float(item.get("meanLogLoss") or 0.0),
            -float(item.get("meanTop1") or 0.0),
            float(item.get("meanEce") or 0.0),
            float(item.get("meanFitTime") or 0.0),
        ),
    )
    for index, item in enumerate(ranked, start=1):
        item["rank"] = index
    return ranked


def _build_search_candidate_rows(
    cv_results: Dict[str, Any],
    *,
    best_params: Dict[str, Any],
    default_params: Dict[str, Any],
    prefix: str = "",
) -> List[Dict[str, Any]]:
    def result_value(key: str, index: int, default: float = 0.0) -> float:
        values = cv_results.get(key)
        if values is None:
            return default
        if index >= len(values):
            return default
        return float(values[index])

    rows: List[Dict[str, Any]] = []
    params_list = list(cv_results.get("params") or [])
    for index, raw_params in enumerate(params_list):
        normalized = _normalize_params(raw_params, prefix=prefix)
        rows.append(
            {
                "params": normalized,
                "meanLogLoss": -result_value(f"mean_test_{SEARCH_PRIMARY_METRIC}", index),
                "meanTop1": result_value(f"mean_test_{SEARCH_TOP1_METRIC}", index),
                "meanEce": -result_value(f"mean_test_{SEARCH_ECE_METRIC}", index),
                "stdLogLoss": result_value(f"std_test_{SEARCH_PRIMARY_METRIC}", index),
                "meanFitTime": result_value("mean_fit_time", index),
                "selected": _params_equal(normalized, best_params),
                "isDefault": _params_equal(normalized, default_params),
            }
        )
    return _sorted_search_candidates(rows)


def _build_skipped_tuning_summary(
    *,
    model_key: str,
    search_kind: str,
    default_params: Dict[str, Any],
    skip_reason: str,
) -> Dict[str, Any]:
    return {
        "modelKey": model_key,
        "searchKind": search_kind,
        "searchSource": "train_cv",
        "searchSkipped": True,
        "skipReason": skip_reason,
        "cvFolds": TUNING_CV_FOLDS,
        "scoringMetric": SEARCH_PRIMARY_METRIC,
        "defaultParams": dict(default_params),
        "bestParams": dict(default_params),
        "bestScore": None,
        "candidateCount": 0,
        "candidates": [
            {
                "rank": 1,
                "params": dict(default_params),
                "meanLogLoss": None,
                "meanTop1": None,
                "meanEce": None,
                "stdLogLoss": None,
                "meanFitTime": None,
                "selected": True,
                "isDefault": True,
            }
        ],
        "baselineMetrics": None,
        "bestMetrics": None,
        "baselineOofProbabilities": [],
        "tunedOofProbabilities": [],
    }


def _fit_model_result(
    *,
    estimator: Any,
    estimator_class: str,
    model_key: str,
    resolved_params: Dict[str, Any],
    num_features: int,
) -> Dict[str, Any]:
    feature_importance_builder = (
        _logistic_feature_importance
        if model_key == "logistic"
        else _tree_feature_importance
    )
    return {
        "backend": "sklearn",
        "estimatorClass": estimator_class,
        "classes": [int(value) for value in estimator.classes_],
        "featureImportance": feature_importance_builder(estimator, num_features),
        "resolvedParams": dict(resolved_params),
        "_estimator": estimator,
    }


def train_logistic_one_vs_rest(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    progress: Optional[Callable[[str], None]] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    _emit_progress(progress, f"      logistic: starting sklearn one-vs-rest training for {num_classes} classes")
    _emit_progress(progress, "      logistic: preparing training arrays")
    features, labels = _samples_to_arrays(samples)
    resolved_params = {**_logistic_default_params(), **_normalize_params(params or {})}
    estimator = _create_logistic_estimator(resolved_params)
    _emit_progress(progress, "      logistic: fitting estimator")
    estimator.fit(features, labels)
    _emit_progress(progress, "      logistic: extracting feature importance")
    _emit_progress(progress, "      logistic: finished")
    return _fit_model_result(
        estimator=estimator,
        estimator_class="OneVsRestClassifier(LogisticRegression)",
        model_key="logistic",
        resolved_params=resolved_params,
        num_features=num_features,
    )


def train_random_forest(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    progress: Optional[Callable[[str], None]] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    _emit_progress(progress, "      random forest: starting sklearn random forest training")
    _emit_progress(progress, "      random forest: preparing training arrays")
    features, labels = _samples_to_arrays(samples)
    resolved_params = {**_random_forest_default_params(), **_normalize_params(params or {})}
    estimator = _create_random_forest_estimator(resolved_params, n_jobs=-1)
    _emit_progress(progress, "      random forest: fitting estimator")
    estimator.fit(features, labels)
    _emit_progress(progress, "      random forest: extracting feature importance")
    _emit_progress(progress, "      random forest: finished")
    return _fit_model_result(
        estimator=estimator,
        estimator_class="RandomForestClassifier",
        model_key="randomForest",
        resolved_params=resolved_params,
        num_features=num_features,
    )


def train_gradient_boosting(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    verbose: int = 1,
    progress: Optional[Callable[[str], None]] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    _emit_progress(progress, "      gradient boosting: starting sklearn gradient boosting training")
    _emit_progress(progress, "      gradient boosting: preparing training arrays")
    features, labels = _samples_to_arrays(samples)
    resolved_params = {**_gradient_boosting_default_params(), **_normalize_params(params or {})}
    start_time = time.perf_counter()
    estimator = _create_gradient_boosting_estimator(resolved_params, verbose=verbose)
    _emit_progress(progress, "      gradient boosting: fitting estimator")
    estimator.fit(features, labels)
    elapsed_seconds = time.perf_counter() - start_time
    _emit_progress(progress, "      gradient boosting: extracting feature importance")
    _emit_progress(progress, f"      gradient boosting: finished in {elapsed_seconds:.2f}s")
    return _fit_model_result(
        estimator=estimator,
        estimator_class="GradientBoostingClassifier",
        model_key="gradientBoosting",
        resolved_params=resolved_params,
        num_features=num_features,
    )


def _run_model_hyperparameter_search(
    *,
    model_key: str,
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    default_params: Dict[str, Any],
    train_model: Callable[..., Dict[str, Any]],
    estimator_factory: Callable[[Dict[str, Any]], Any],
    search_estimator_factory: Callable[[Dict[str, Any]], Any],
    search_kind: str,
    search_space: Dict[str, Any],
    prefix: str = "",
    search_iterations: Optional[int] = None,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    features, labels = _samples_to_arrays(samples)
    can_search, skip_reason = _can_run_hyperparameter_search(labels)
    if not can_search:
        model = train_model(
            samples,
            num_classes,
            num_features,
            progress=progress,
            params=default_params,
        )
        model["tuning"] = _build_skipped_tuning_summary(
            model_key=model_key,
            search_kind=search_kind,
            default_params=default_params,
            skip_reason=skip_reason,
        )
        return model

    baseline_oof = _collect_oof_probabilities(
        samples,
        num_classes=num_classes,
        estimator_factory=estimator_factory,
        params=default_params,
    )
    baseline_metrics = evaluate_probabilities(baseline_oof, labels, num_classes)

    GridSearchCV, RandomizedSearchCV, _, _ = _load_search_dependencies()
    search_cls = GridSearchCV if search_kind == "grid" else RandomizedSearchCV
    search_kwargs: Dict[str, Any] = {
        "estimator": search_estimator_factory(default_params),
        "scoring": _build_search_scoring(num_classes),
        "refit": SEARCH_PRIMARY_METRIC,
        "cv": _build_cv_splitter(),
        "n_jobs": -1,
        "return_train_score": False,
    }
    if search_kind == "grid":
        search_kwargs["param_grid"] = search_space
    else:
        search_kwargs["param_distributions"] = search_space
        search_kwargs["n_iter"] = int(search_iterations or 1)
        search_kwargs["random_state"] = TUNING_CV_RANDOM_STATE

    _emit_progress(progress, f"      {model_key}: running {search_kind} hyperparameter search")
    search = search_cls(**search_kwargs)
    search_start = time.perf_counter()
    search.fit(features, labels)
    search_elapsed = time.perf_counter() - search_start

    best_params = _normalize_params(search.best_params_, prefix=prefix)
    tuned_oof = _collect_oof_probabilities(
        samples,
        num_classes=num_classes,
        estimator_factory=estimator_factory,
        params=best_params,
    )
    tuned_metrics = evaluate_probabilities(tuned_oof, labels, num_classes)
    candidates = _build_search_candidate_rows(
        search.cv_results_,
        best_params=best_params,
        default_params=default_params,
        prefix=prefix,
    )

    model = train_model(
        samples,
        num_classes,
        num_features,
        progress=progress,
        params=best_params,
    )
    model["tuning"] = {
        "modelKey": model_key,
        "searchKind": search_kind,
        "searchSource": "train_cv",
        "searchSkipped": False,
        "skipReason": "",
        "cvFolds": TUNING_CV_FOLDS,
        "scoringMetric": SEARCH_PRIMARY_METRIC,
        "defaultParams": dict(default_params),
        "bestParams": dict(best_params),
        "bestScore": -float(search.best_score_),
        "candidateCount": len(candidates),
        "candidates": candidates,
        "baselineMetrics": baseline_metrics,
        "bestMetrics": tuned_metrics,
        "baselineOofProbabilities": baseline_oof,
        "tunedOofProbabilities": tuned_oof,
        "searchElapsedSeconds": search_elapsed,
    }
    return model


def train_tuned_logistic_one_vs_rest(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    return _run_model_hyperparameter_search(
        model_key="logistic",
        samples=samples,
        num_classes=num_classes,
        num_features=num_features,
        default_params=_logistic_default_params(),
        train_model=train_logistic_one_vs_rest,
        estimator_factory=_create_logistic_estimator,
        search_estimator_factory=_create_logistic_estimator,
        search_kind="grid",
        search_space={
            "estimator__C": [0.25, 0.5, 1.0, 2.0, 4.0],
            "estimator__class_weight": [None, "balanced"],
        },
        prefix="estimator__",
        progress=progress,
    )


def train_tuned_random_forest(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    return _run_model_hyperparameter_search(
        model_key="randomForest",
        samples=samples,
        num_classes=num_classes,
        num_features=num_features,
        default_params=_random_forest_default_params(),
        train_model=train_random_forest,
        estimator_factory=lambda params: _create_random_forest_estimator(params, n_jobs=1),
        search_estimator_factory=lambda params: _create_random_forest_estimator(params, n_jobs=1),
        search_kind="randomized",
        search_space={
            "n_estimators": [160, 240, 320, 400],
            "max_depth": [8, 12, 16, None],
            "min_samples_split": [4, 8, 12],
            "min_samples_leaf": [2, 4, 6],
            "max_features": ["sqrt", 0.6, 0.8],
        },
        search_iterations=RANDOM_FOREST_SEARCH_ITERATIONS,
        progress=progress,
    )


def train_tuned_gradient_boosting(
    samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    progress: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    return _run_model_hyperparameter_search(
        model_key="gradientBoosting",
        samples=samples,
        num_classes=num_classes,
        num_features=num_features,
        default_params=_gradient_boosting_default_params(),
        train_model=lambda train_samples, train_num_classes, train_num_features, **kwargs: train_gradient_boosting(
            train_samples,
            train_num_classes,
            train_num_features,
            verbose=1,
            **kwargs,
        ),
        estimator_factory=lambda params: _create_gradient_boosting_estimator(params, verbose=0),
        search_estimator_factory=lambda params: _create_gradient_boosting_estimator(params, verbose=0),
        search_kind="randomized",
        search_space={
            "n_estimators": [60, 80, 120, 160],
            "learning_rate": [0.03, 0.05, 0.08, 0.1],
            "max_depth": [2, 3, 4],
            "min_samples_split": [2, 4, 8],
            "min_samples_leaf": [1, 2, 4],
            "subsample": [0.7, 0.85, 1.0],
        },
        search_iterations=GRADIENT_BOOSTING_SEARCH_ITERATIONS,
        progress=progress,
    )


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
) -> Dict[str, Any]:
    def build_combined_probabilities(weights: Dict[str, float]) -> List[List[float]]:
        return [
            combine_probabilities(
                probs,
                random_forest[index],
                gradient_boosting[index],
                weights,
            )
            for index, probs in enumerate(logistic)
        ]

    def better_metrics(candidate: Dict[str, float], current: Dict[str, float]) -> bool:
        if candidate["logLoss"] < current["logLoss"] - 1e-8:
            return True
        if abs(candidate["logLoss"] - current["logLoss"]) <= 1e-8 and candidate["top1"] > current["top1"] + 1e-8:
            return True
        if (
            abs(candidate["logLoss"] - current["logLoss"]) <= 1e-8
            and abs(candidate["top1"] - current["top1"]) <= 1e-8
            and candidate["ece"] < current["ece"] - 1e-8
        ):
            return True
        return False

    def weight_steps(step: float, *, center: Optional[Dict[str, float]] = None) -> List[Dict[str, float]]:
        total_steps = int(round(1.0 / step))
        window_steps = int(round(ENSEMBLE_FINE_RADIUS / step))
        center_steps = (
            {
                key: int(round(float(center[key]) / step))
                for key in ("logistic", "randomForest", "gradientBoosting")
            }
            if center is not None
            else {}
        )
        candidates: List[Dict[str, float]] = []
        for logistic_step in range(0, total_steps + 1):
            for random_forest_step in range(0, total_steps - logistic_step + 1):
                gradient_boosting_step = total_steps - logistic_step - random_forest_step
                if center_steps:
                    if abs(logistic_step - center_steps["logistic"]) > window_steps:
                        continue
                    if abs(random_forest_step - center_steps["randomForest"]) > window_steps:
                        continue
                    if abs(gradient_boosting_step - center_steps["gradientBoosting"]) > window_steps:
                        continue
                candidates.append(
                    {
                        "logistic": logistic_step * step,
                        "randomForest": random_forest_step * step,
                        "gradientBoosting": gradient_boosting_step * step,
                    }
                )
        return candidates

    def build_trace_rows(
        stage: str,
        candidates: List[Dict[str, float]],
        selected_weights: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        for weights in candidates:
            probabilities = build_combined_probabilities(weights)
            metrics = evaluate_probabilities(probabilities, labels, num_classes)
            rows.append(
                {
                    "stage": stage,
                    "logistic": float(weights["logistic"]),
                    "randomForest": float(weights["randomForest"]),
                    "gradientBoosting": float(weights["gradientBoosting"]),
                    "logLoss": float(metrics["logLoss"]),
                    "top1": float(metrics["top1"]),
                    "ece": float(metrics["ece"]),
                    "selected": False,
                }
            )
        ranked = sorted(
            rows,
            key=lambda item: (float(item["logLoss"]), -float(item["top1"]), float(item["ece"])),
        )
        for index, row in enumerate(ranked, start=1):
            row["rank"] = index
            row["selected"] = (
                abs(float(row["logistic"]) - float(selected_weights["logistic"])) <= 1e-9
                and abs(float(row["randomForest"]) - float(selected_weights["randomForest"])) <= 1e-9
                and abs(float(row["gradientBoosting"]) - float(selected_weights["gradientBoosting"])) <= 1e-9
            )
        return ranked

    if not logistic or not labels:
        return {
            "weights": dict(DEFAULT_ENSEMBLE_WEIGHTS),
            "searchSource": "train_oof",
            "searchSkipped": True,
            "skipReason": "missing probability rows or labels",
            "defaultWeights": dict(DEFAULT_ENSEMBLE_WEIGHTS),
            "defaultMetrics": None,
            "bestMetrics": None,
            "coarseStep": ENSEMBLE_COARSE_STEP,
            "fineStep": ENSEMBLE_FINE_STEP,
            "fineRadius": ENSEMBLE_FINE_RADIUS,
            "candidateCount": 0,
            "coarseCandidateCount": 0,
            "fineCandidateCount": 0,
            "trace": [],
        }

    default_weights = dict(DEFAULT_ENSEMBLE_WEIGHTS)
    default_metrics = evaluate_probabilities(
        build_combined_probabilities(default_weights),
        labels,
        num_classes,
    )

    best_weights = default_weights
    best_metrics = default_metrics
    coarse_candidates = weight_steps(ENSEMBLE_COARSE_STEP)
    for candidate in coarse_candidates:
        metrics = evaluate_probabilities(build_combined_probabilities(candidate), labels, num_classes)
        if better_metrics(metrics, best_metrics):
            best_weights = candidate
            best_metrics = metrics

    coarse_trace = build_trace_rows("coarse", coarse_candidates, best_weights)

    refined_candidates = weight_steps(ENSEMBLE_FINE_STEP, center=best_weights)
    refined_best_weights = best_weights
    refined_best_metrics = best_metrics
    for candidate in refined_candidates:
        metrics = evaluate_probabilities(build_combined_probabilities(candidate), labels, num_classes)
        if better_metrics(metrics, refined_best_metrics):
            refined_best_weights = candidate
            refined_best_metrics = metrics

    fine_trace = build_trace_rows("fine", refined_candidates, refined_best_weights)
    if better_metrics(refined_best_metrics, best_metrics):
        best_weights = refined_best_weights
        best_metrics = refined_best_metrics

    for row in coarse_trace + fine_trace:
        row["selected"] = (
            abs(float(row["logistic"]) - float(best_weights["logistic"])) <= 1e-9
            and abs(float(row["randomForest"]) - float(best_weights["randomForest"])) <= 1e-9
            and abs(float(row["gradientBoosting"]) - float(best_weights["gradientBoosting"])) <= 1e-9
        )

    return {
        "weights": best_weights,
        "searchSource": "train_oof",
        "searchSkipped": False,
        "skipReason": "",
        "defaultWeights": default_weights,
        "defaultMetrics": default_metrics,
        "bestMetrics": best_metrics,
        "coarseStep": ENSEMBLE_COARSE_STEP,
        "fineStep": ENSEMBLE_FINE_STEP,
        "fineRadius": ENSEMBLE_FINE_RADIUS,
        "candidateCount": len(coarse_trace) + len(fine_trace),
        "coarseCandidateCount": len(coarse_trace),
        "fineCandidateCount": len(fine_trace),
        "trace": coarse_trace + fine_trace,
    }


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


def _combine_probability_batches(
    logistic_probs: List[List[float]],
    random_forest_probs: List[List[float]],
    gradient_boosting_probs: List[List[float]],
    weights: Dict[str, float],
) -> List[List[float]]:
    return [
        combine_probabilities(
            logistic_probs[index],
            random_forest_probs[index],
            gradient_boosting_probs[index],
            weights,
        )
        for index in range(len(gradient_boosting_probs))
    ]


def build_gradient_boosting_iteration_trace(
    estimator: Any,
    split_samples: Dict[str, List[TrainingSample]],
    fixed_probabilities: Dict[str, Dict[str, List[List[float]]]],
    tuned_weights: Dict[str, float],
    num_classes: int,
) -> List[Dict[str, float]]:
    classes = [int(value) for value in getattr(estimator, "classes_", [])]
    split_names = ["train", "validation", "hard_validation", "test"]
    feature_rows = {
        split_name: [sample.features for sample in split_samples[split_name]]
        for split_name in split_names
    }
    labels = {
        split_name: [sample.label for sample in split_samples[split_name]]
        for split_name in split_names
    }
    staged_iterators = {
        split_name: estimator.staged_predict_proba(feature_rows[split_name])
        for split_name in split_names
    }

    trace: List[Dict[str, float]] = []
    iteration = 0
    while True:
        staged_batches: Dict[str, List[List[float]]] = {}
        for split_name in split_names:
            try:
                raw = next(staged_iterators[split_name])
            except StopIteration:
                return trace
            staged_batches[split_name] = _align_probability_rows(raw, classes, num_classes)

        iteration += 1
        row: Dict[str, float] = {"iteration": float(iteration)}
        for split_name in split_names:
            gb_metrics = evaluate_probabilities(
                staged_batches[split_name], labels[split_name], num_classes
            )
            ensemble_metrics = evaluate_probabilities(
                _combine_probability_batches(
                    fixed_probabilities[split_name]["logistic"],
                    fixed_probabilities[split_name]["randomForest"],
                    staged_batches[split_name],
                    tuned_weights,
                ),
                labels[split_name],
                num_classes,
            )
            row[f"gradient_boosting_{split_name}_top1"] = gb_metrics["top1"]
            row[f"gradient_boosting_{split_name}_logLoss"] = gb_metrics["logLoss"]
            row[f"ensemble_{split_name}_top1"] = ensemble_metrics["top1"]
            row[f"ensemble_{split_name}_logLoss"] = ensemble_metrics["logLoss"]
        trace.append(row)


def build_training_size_learning_curve(
    train_samples: List[TrainingSample],
    validation_samples: List[TrainingSample],
    hard_validation_samples: List[TrainingSample],
    test_samples: List[TrainingSample],
    num_classes: int,
    num_features: int,
    model_params: Dict[str, Dict[str, Any]],
    progress: Optional[Callable[[str], None]] = None,
) -> List[Dict[str, float]]:
    if len(train_samples) < max(24, num_classes * 2):
        return []

    fractions = [0.1, 0.25, 0.5, 0.75, 1.0]
    curve: List[Dict[str, float]] = []
    total_train = len(train_samples)
    minimum_size = max(num_classes * 3, 64)

    for fraction in fractions:
        subset_size = min(total_train, max(minimum_size, math.ceil(total_train * fraction)))
        subset = list(train_samples[:subset_size])
        unique_labels = len({sample.label for sample in subset})
        _emit_progress(
            progress,
            f"      learning curve: fitting subset {subset_size}/{total_train} ({fraction:.0%})",
        )
        logistic = train_logistic_one_vs_rest(
            subset,
            num_classes,
            num_features,
            progress=None,
            params=model_params.get("logistic") or _logistic_default_params(),
        )
        random_forest = train_random_forest(
            subset,
            num_classes,
            num_features,
            progress=None,
            params=model_params.get("randomForest") or _random_forest_default_params(),
        )
        gradient_boosting = train_gradient_boosting(
            subset,
            num_classes,
            num_features,
            verbose=0,
            progress=None,
            params=model_params.get("gradientBoosting") or _gradient_boosting_default_params(),
        )
        validation_probs = collect_probabilities(
            logistic, random_forest, gradient_boosting, validation_samples
        )
        hard_validation_probs = collect_probabilities(
            logistic, random_forest, gradient_boosting, hard_validation_samples
        )
        validation_labels = [sample.label for sample in validation_samples]
        hard_validation_labels = [sample.label for sample in hard_validation_samples]
        subset_labels = [sample.label for sample in subset]
        can_search_weights, _ = _can_run_hyperparameter_search(subset_labels)
        if can_search_weights:
            ensemble_tuning = tune_ensemble_weights(
                _collect_oof_probabilities(
                    subset,
                    num_classes=num_classes,
                    estimator_factory=_create_logistic_estimator,
                    params=logistic.get("resolvedParams") or _logistic_default_params(),
                ),
                _collect_oof_probabilities(
                    subset,
                    num_classes=num_classes,
                    estimator_factory=lambda params: _create_random_forest_estimator(params, n_jobs=1),
                    params=random_forest.get("resolvedParams") or _random_forest_default_params(),
                ),
                _collect_oof_probabilities(
                    subset,
                    num_classes=num_classes,
                    estimator_factory=lambda params: _create_gradient_boosting_estimator(params, verbose=0),
                    params=gradient_boosting.get("resolvedParams") or _gradient_boosting_default_params(),
                ),
                subset_labels,
                num_classes,
            )
        else:
            ensemble_tuning = {
                "weights": dict(DEFAULT_ENSEMBLE_WEIGHTS),
            }
        tuned_weights = ensemble_tuning["weights"]
        test_probs = collect_probabilities(
            logistic, random_forest, gradient_boosting, test_samples
        )
        test_labels = [sample.label for sample in test_samples]
        ensemble_validation_probs = _combine_probability_batches(
            validation_probs["logistic"],
            validation_probs["randomForest"],
            validation_probs["gradientBoosting"],
            tuned_weights,
        )
        ensemble_hard_validation_probs = _combine_probability_batches(
            hard_validation_probs["logistic"],
            hard_validation_probs["randomForest"],
            hard_validation_probs["gradientBoosting"],
            tuned_weights,
        )
        ensemble_test_probs = _combine_probability_batches(
            test_probs["logistic"],
            test_probs["randomForest"],
            test_probs["gradientBoosting"],
            tuned_weights,
        )
        validation_metrics = evaluate_probabilities(
            ensemble_validation_probs, validation_labels, num_classes
        )
        hard_validation_metrics = evaluate_probabilities(
            ensemble_hard_validation_probs, hard_validation_labels, num_classes
        )
        test_metrics = evaluate_probabilities(
            ensemble_test_probs, test_labels, num_classes
        )
        curve.append(
            {
                "fraction": fraction,
                "train_samples": float(subset_size),
                "unique_labels": float(unique_labels),
                "validation_top1": validation_metrics["top1"],
                "validation_logLoss": validation_metrics["logLoss"],
                "hard_validation_top1": hard_validation_metrics["top1"],
                "hard_validation_logLoss": hard_validation_metrics["logLoss"],
                "test_top1": test_metrics["top1"],
                "test_top3": test_metrics["top3"],
                "test_logLoss": test_metrics["logLoss"],
                "test_brier": test_metrics["brier"],
                "test_ece": test_metrics["ece"],
                "ensemble_weight_logistic": float(tuned_weights["logistic"]),
                "ensemble_weight_random_forest": float(tuned_weights["randomForest"]),
                "ensemble_weight_gradient_boosting": float(tuned_weights["gradientBoosting"]),
            }
        )
    return curve


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

    logistic = train_tuned_logistic_one_vs_rest(
        train_samples, num_classes, num_features, progress=progress
    )
    random_forest = train_tuned_random_forest(
        train_samples, num_classes, num_features, progress=progress
    )
    gradient_boosting = train_tuned_gradient_boosting(
        train_samples, num_classes, num_features, progress=progress
    )
    logistic_tuning = logistic.get("tuning") or {}
    random_forest_tuning = random_forest.get("tuning") or {}
    gradient_boosting_tuning = gradient_boosting.get("tuning") or {}
    feature_stats = compute_feature_stats(train_samples, num_features)
    _emit_progress(progress, "      ensemble: computing validation metrics and tuning weights")

    train_probs = collect_probabilities(
        logistic, random_forest, gradient_boosting, train_samples
    )
    validation_probs = collect_probabilities(
        logistic, random_forest, gradient_boosting, validation_samples
    )
    validation_labels = [sample.label for sample in validation_samples]
    hard_validation_probs = collect_probabilities(
        logistic, random_forest, gradient_boosting, hard_validation_samples
    )
    hard_validation_labels = [sample.label for sample in hard_validation_samples]
    train_labels = [sample.label for sample in train_samples]
    _emit_progress(progress, "      ensemble: tuning train-oof ensemble weights")
    ensemble_tuning = tune_ensemble_weights(
        logistic_tuning.get("tunedOofProbabilities") or [],
        random_forest_tuning.get("tunedOofProbabilities") or [],
        gradient_boosting_tuning.get("tunedOofProbabilities") or [],
        train_labels,
        num_classes,
    )
    tuned_weights = ensemble_tuning["weights"]

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
    train_ensemble_probs = [
        combine_probabilities(
            probs,
            train_probs["randomForest"][index],
            train_probs["gradientBoosting"][index],
            tuned_weights,
        )
        for index, probs in enumerate(train_probs["logistic"])
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
    _emit_progress(progress, "      ensemble: collecting gradient boosting iteration traces")
    gradient_boosting_iteration_trace = build_gradient_boosting_iteration_trace(
        gradient_boosting["_estimator"],
        split_samples={
            "train": train_samples,
            "validation": validation_samples,
            "hard_validation": hard_validation_samples,
            "test": test_samples,
        },
        fixed_probabilities={
            "train": {
                "logistic": train_probs["logistic"],
                "randomForest": train_probs["randomForest"],
            },
            "validation": {
                "logistic": validation_probs["logistic"],
                "randomForest": validation_probs["randomForest"],
            },
            "hard_validation": {
                "logistic": hard_validation_probs["logistic"],
                "randomForest": hard_validation_probs["randomForest"],
            },
            "test": {
                "logistic": test_probs["logistic"],
                "randomForest": test_probs["randomForest"],
            },
        },
        tuned_weights=tuned_weights,
        num_classes=num_classes,
    )
    _emit_progress(progress, "      ensemble: building synthetic-data learning curve diagnostics")
    learning_curve = build_training_size_learning_curve(
        train_samples=train_samples,
        validation_samples=validation_samples,
        hard_validation_samples=hard_validation_samples,
        test_samples=test_samples,
        num_classes=num_classes,
        num_features=num_features,
        model_params={
            "logistic": dict(logistic.get("resolvedParams") or _logistic_default_params()),
            "randomForest": dict(random_forest.get("resolvedParams") or _random_forest_default_params()),
            "gradientBoosting": dict(
                gradient_boosting.get("resolvedParams") or _gradient_boosting_default_params()
            ),
        },
        progress=progress,
    )
    _emit_progress(progress, "      ensemble: finished")

    def compact_tuning_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            key: value
            for key, value in payload.items()
            if key not in {"baselineOofProbabilities", "tunedOofProbabilities"}
        }

    hyperparameter_search = {
        "logistic": compact_tuning_payload(logistic_tuning),
        "randomForest": compact_tuning_payload(random_forest_tuning),
        "gradientBoosting": compact_tuning_payload(gradient_boosting_tuning),
    }
    hyperparameter_tuning = {
        "cvFolds": TUNING_CV_FOLDS,
        "scoringMetric": SEARCH_PRIMARY_METRIC,
        "models": {
            key: {
                "searchSource": str((payload or {}).get("searchSource") or "train_cv"),
                "searchSkipped": bool((payload or {}).get("searchSkipped")),
                "bestParams": dict((payload or {}).get("bestParams") or {}),
                "bestScore": (payload or {}).get("bestScore"),
                "candidateCount": int((payload or {}).get("candidateCount") or 0),
            }
            for key, payload in hyperparameter_search.items()
        },
        "ensemble": {
            "searchSource": str(ensemble_tuning.get("searchSource") or "train_oof"),
            "searchSkipped": bool(ensemble_tuning.get("searchSkipped")),
            "defaultWeights": dict(ensemble_tuning.get("defaultWeights") or DEFAULT_ENSEMBLE_WEIGHTS),
            "bestWeights": dict(tuned_weights),
            "candidateCount": int(ensemble_tuning.get("candidateCount") or 0),
        },
    }
    training_oof_metrics = {
        "logistic": logistic_tuning.get("bestMetrics"),
        "randomForest": random_forest_tuning.get("bestMetrics"),
        "gradientBoosting": gradient_boosting_tuning.get("bestMetrics"),
        "ensemble": ensemble_tuning.get("bestMetrics"),
    }
    model_comparison_before_after = {
        "logistic": {
            "baseline": logistic_tuning.get("baselineMetrics"),
            "tuned": logistic_tuning.get("bestMetrics"),
        },
        "randomForest": {
            "baseline": random_forest_tuning.get("baselineMetrics"),
            "tuned": random_forest_tuning.get("bestMetrics"),
        },
        "gradientBoosting": {
            "baseline": gradient_boosting_tuning.get("baselineMetrics"),
            "tuned": gradient_boosting_tuning.get("bestMetrics"),
        },
        "ensemble": {
            "baseline": ensemble_tuning.get("defaultMetrics"),
            "tuned": ensemble_tuning.get("bestMetrics"),
        },
    }

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
            "tuningSources": {
                "baseModels": "train_cv",
                "ensembleWeights": "train_oof",
                "hardValidation": "evaluation_only",
            },
            "hardValidation": hard_validation_debug,
            "hyperparameterTuning": hyperparameter_tuning,
            "hyperparameterSearch": hyperparameter_search,
            "ensembleWeightSearch": ensemble_tuning,
            "training": {
                "gradientBoostingIterationTrace": gradient_boosting_iteration_trace,
                "syntheticLearningCurve": learning_curve,
                "trainMetrics": {
                    "ensemble": evaluate_probabilities(
                        train_ensemble_probs, train_labels, num_classes
                    ),
                    "gradientBoosting": evaluate_probabilities(
                        train_probs["gradientBoosting"], train_labels, num_classes
                    ),
                },
                "oofMetrics": training_oof_metrics,
                "modelComparisonBeforeAfterTuning": model_comparison_before_after,
            },
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
