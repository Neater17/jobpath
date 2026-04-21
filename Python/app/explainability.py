from __future__ import annotations

import math
import random
import time
from typing import Any, Callable, Dict, List


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def solve_linear_system(matrix: List[List[float]], vector: List[float]) -> List[float]:
    n = len(vector)
    a = [row[:] for row in matrix]
    b = vector[:]

    for col in range(n):
      pivot = col
      for row in range(col + 1, n):
          if abs(a[row][col]) > abs(a[pivot][col]):
              pivot = row

      if abs(a[pivot][col]) < 1e-10:
          return [0.0 for _ in range(n)]

      if pivot != col:
          a[col], a[pivot] = a[pivot], a[col]
          b[col], b[pivot] = b[pivot], b[col]

      pivot_value = a[col][col]
      for j in range(col, n):
          a[col][j] /= pivot_value
      b[col] /= pivot_value

      for row in range(n):
          if row == col:
              continue
          factor = a[row][col]
          if abs(factor) < 1e-12:
              continue
          for j in range(col, n):
              a[row][j] -= factor * a[col][j]
          b[row] -= factor * b[col]

    return b


def build_factors(
    keys: List[str],
    labels: Dict[str, str],
    feature_vector: List[float],
    contributions: List[float],
    relevant_keys: List[str] | None = None,
) -> List[Dict[str, Any]]:
    relevant_lookup = set(relevant_keys or [])
    filtered_entries = [
        (index, key)
        for index, key in enumerate(keys)
        if not relevant_lookup or key in relevant_lookup
    ]
    total_impact = (
        sum(
            abs(contributions[index] if index < len(contributions) else 0.0)
            for index, _ in filtered_entries
        )
        or 1.0
    )
    factors = [
        {
            "key": key,
            "label": labels[key],
            "value": feature_vector[index] if index < len(feature_vector) else 0.0,
            "contribution": contributions[index] if index < len(contributions) else 0.0,
            "impactPct": abs(contributions[index] if index < len(contributions) else 0.0) / total_impact * 100,
            "direction": "positive" if (contributions[index] if index < len(contributions) else 0.0) >= 0 else "negative",
        }
        for index, key in filtered_entries
    ]
    return sorted(factors, key=lambda item: abs(item["contribution"]), reverse=True)


def merge_and_normalize_factors(
    base_factors: List[Dict[str, Any]],
    additional_factors: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    merged = [
        {**factor, "source": "competency"} for factor in base_factors
    ] + [
        {
            "key": factor["key"],
            "label": factor["label"],
            "value": factor["value"],
            "contribution": factor["contribution"],
            "impactPct": 0.0,
            "direction": "positive" if factor["contribution"] >= 0 else "negative",
            "source": "certification",
        }
        for factor in additional_factors
        if abs(factor["contribution"]) > 1e-8
    ]

    total_impact = sum(abs(factor["contribution"]) for factor in merged) or 1.0
    normalized = [
        {**factor, "impactPct": abs(factor["contribution"]) / total_impact * 100}
        for factor in merged
    ]
    return sorted(normalized, key=lambda item: abs(item["contribution"]), reverse=True)


def format_impact_pct(value: float) -> str:
    if not math.isfinite(value) or value <= 0:
        return "0%"
    if value >= 10:
        return f"{round(value)}%"
    if value >= 1:
        return f"{value:.1f}".rstrip("0").rstrip(".") + "%"
    return f"{value:.2f}".rstrip("0").rstrip(".") + "%"


def to_natural_list(items: List[str]) -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return f"{', '.join(items[:-1])}, and {items[-1]}"


def build_narrative(
    career_name: str,
    factors: List[Dict[str, Any]],
    gap_recommendations: Dict[str, str],
) -> str:
    top_positive = [factor for factor in factors if factor["contribution"] > 0][:3]
    top_negative = next((factor for factor in factors if factor["contribution"] < 0), None)
    top_improvement_areas = [
        factor
        for factor in factors
        if factor.get("source") != "certification"
        and factor["contribution"] < 0
        and factor.get("key") in gap_recommendations
    ][:2]

    if not top_positive:
        if top_negative:
            narrative = (
                f"We recommended {career_name} because your overall profile aligns best with this role. "
                f"The main factor reducing your score is {top_negative['label']}."
            )
        else:
            narrative = f"We recommended {career_name} because your overall profile aligns best with this role."
        if top_improvement_areas:
            guidance = " ".join(
                f"Improve {factor['label']} by {gap_recommendations[str(factor['key'])].lower()}"
                for factor in top_improvement_areas
            )
            narrative += f" To strengthen your fit further, {guidance}."
        return narrative

    highlights = [
        f"{factor['label']} ({format_impact_pct(float(factor['impactPct']))})"
        for factor in top_positive
    ]
    top_signals = to_natural_list(highlights)
    narrative = (
        f"We recommended {career_name} because your strongest signals were {top_signals}. "
        "These signals contributed most to your match for this role."
    )
    if top_negative:
        narrative += f" The main area lowering your score is {top_negative['label']}."
    if top_improvement_areas:
        areas = to_natural_list([factor["label"] for factor in top_improvement_areas])
        guidance = " ".join(
            f"For {factor['label']}, {gap_recommendations[str(factor['key'])].lower()}"
            for factor in top_improvement_areas
        )
        narrative += f" The main areas to improve next are {areas}. {guidance}."
    return narrative


def create_method_report(
    *,
    method: str,
    career_name: str,
    path_key: str,
    feature_vector: List[float],
    keys: List[str],
    labels: Dict[str, str],
    contributions: List[float],
    base_score: float,
    predicted_score: float,
    reconstructed_score: float,
    fidelity: float,
    runtime_ms: int,
    additional_factors: List[Dict[str, Any]],
    gap_recommendations: Dict[str, str],
    relevant_keys: List[str] | None = None,
) -> Dict[str, Any]:
    base_factors = build_factors(
        keys,
        labels,
        feature_vector,
        contributions,
        relevant_keys=relevant_keys,
    )
    factors = merge_and_normalize_factors(base_factors, additional_factors)
    return {
        "method": method,
        "careerName": career_name,
        "pathKey": path_key,
        "baseScore": clamp01(base_score),
        "predictedScore": clamp01(predicted_score),
        "reconstructedScore": clamp01(reconstructed_score),
        "narrative": build_narrative(career_name, factors, gap_recommendations),
        "quality": {
            "runtimeMs": runtime_ms,
            "fidelity": clamp01(fidelity),
        },
        "factors": factors,
    }


def create_empty_method_report(
    *,
    method: str,
    career_name: str,
    path_key: str,
) -> Dict[str, Any]:
    return {
        "method": method,
        "careerName": career_name,
        "pathKey": path_key,
        "baseScore": 0.0,
        "predictedScore": 0.0,
        "reconstructedScore": 0.0,
        "narrative": "",
        "quality": {
            "runtimeMs": 0,
            "fidelity": 0.0,
        },
        "factors": [],
    }


def explain_with_shap(
    predict_score: Callable[[List[float], int], float],
    feature_vector: List[float],
    career_index: int,
    means: List[float],
) -> Dict[str, Any]:
    start = time.time()
    rng = random.Random(20260301 + career_index)
    feature_count = len(feature_vector)
    permutations = max(120, feature_count * 20)

    contributions = [0.0 for _ in range(feature_count)]
    baseline = [clamp01(value) for value in means]
    base_score = predict_score(baseline, career_index)
    predicted_score = predict_score(feature_vector, career_index)

    for _ in range(permutations):
        indices = list(range(feature_count))
        rng.shuffle(indices)
        current = baseline[:]
        prev_score = predict_score(current, career_index)
        for index in indices:
            current[index] = feature_vector[index]
            next_score = predict_score(current, career_index)
            contributions[index] += next_score - prev_score
            prev_score = next_score

    contributions = [value / permutations for value in contributions]
    reconstructed = base_score + sum(contributions)
    error = abs(reconstructed - predicted_score)
    fidelity = clamp01(1 - error / 0.08)

    return {
        "contributions": contributions,
        "baseScore": base_score,
        "predictedScore": predicted_score,
        "reconstructedScore": reconstructed,
        "fidelity": fidelity,
        "runtimeMs": int((time.time() - start) * 1000),
    }


def explain_with_lime(
    predict_score: Callable[[List[float], int], float],
    feature_vector: List[float],
    career_index: int,
    means: List[float],
    stds: List[float],
) -> Dict[str, Any]:
    start = time.time()
    rng = random.Random(20260317 + career_index)
    feature_count = len(feature_vector)
    sample_count = 280
    kernel_width = 0.9
    lambda_reg = 1e-3

    samples: List[List[float]] = []
    targets: List[float] = []
    weights: List[float] = []

    for i in range(sample_count):
        sample: List[float] = []
        for feature_index, value in enumerate(feature_vector):
            if i == 0:
                sample.append(value)
                continue
            keep_original = rng.random() > 0.18
            if not keep_original:
                sample.append(means[feature_index])
                continue
            noise = (rng.random() - 0.5) * 1.2 * (stds[feature_index] or 0.2)
            sample.append(clamp01(value + noise))

        distance = math.sqrt(
            sum(
                (((sample[idx] - feature_vector[idx]) / max(stds[idx] or 0.2, 1e-3)) ** 2)
                for idx in range(feature_count)
            )
            / max(1, feature_count)
        )
        weight = math.exp(-(distance * distance) / (kernel_width * kernel_width))
        samples.append(sample)
        targets.append(predict_score(sample, career_index))
        weights.append(weight)

    dim = feature_count + 1
    a = [[0.0 for _ in range(dim)] for _ in range(dim)]
    b = [0.0 for _ in range(dim)]

    for row, sample in enumerate(samples):
        x = [1.0, *sample]
        y = targets[row]
        w = weights[row]
        for i in range(dim):
            b[i] += w * x[i] * y
            for j in range(dim):
                a[i][j] += w * x[i] * x[j]

    for i in range(dim):
        a[i][i] += lambda_reg

    beta = solve_linear_system(a, b)
    intercept = beta[0] if beta else 0.0
    coefs = beta[1:]
    base_score = predict_score(means, career_index)
    contributions = [
        (coefs[idx] if idx < len(coefs) else 0.0) * (feature_vector[idx] - means[idx])
        for idx in range(feature_count)
    ]
    predicted_score = predict_score(feature_vector, career_index)
    reconstructed_score = intercept + sum(
        (coefs[idx] if idx < len(coefs) else 0.0) * feature_vector[idx]
        for idx in range(feature_count)
    )

    weighted_total = sum(weights) or 1.0
    weighted_mean_y = sum(targets[idx] * weights[idx] for idx in range(len(targets))) / weighted_total
    sse = 0.0
    sst = 0.0
    for idx, sample in enumerate(samples):
        predicted = intercept + sum(
            (coefs[feature_index] if feature_index < len(coefs) else 0.0) * sample[feature_index]
            for feature_index in range(feature_count)
        )
        err = targets[idx] - predicted
        sse += weights[idx] * err * err
        centered = targets[idx] - weighted_mean_y
        sst += weights[idx] * centered * centered
    fidelity = clamp01(1 - sse / sst) if sst > 1e-12 else 0.5

    reconstructed_from_centered = base_score + sum(contributions)

    return {
        "contributions": contributions,
        "baseScore": base_score,
        "predictedScore": predicted_score,
        "reconstructedScore": reconstructed_from_centered or reconstructed_score,
        "fidelity": fidelity,
        "runtimeMs": int((time.time() - start) * 1000),
    }


def build_career_explainability(
    *,
    predict_score: Callable[[List[float], int], float],
    feature_vector: List[float],
    feature_keys: List[str],
    labels: Dict[str, str],
    career_index: int,
    career_name: str,
    path_key: str,
    method_preference: str = "auto",
    means: List[float],
    stds: List[float],
    additional_factors: List[Dict[str, Any]],
    gap_recommendations: Dict[str, str],
    relevant_keys: List[str] | None = None,
) -> Dict[str, Any]:
    if method_preference == "auto":
        selected_method = "lime" if len(feature_keys) > 40 else "shap"
    else:
        selected_method = method_preference

    shap_report = create_empty_method_report(method="shap", career_name=career_name, path_key=path_key)
    lime_report = create_empty_method_report(method="lime", career_name=career_name, path_key=path_key)

    if selected_method == "shap":
        shap = explain_with_shap(predict_score, feature_vector, career_index, means)
        shap_report = create_method_report(
            method="shap",
            career_name=career_name,
            path_key=path_key,
            feature_vector=feature_vector,
            keys=feature_keys,
            labels=labels,
            contributions=shap["contributions"],
            base_score=shap["baseScore"],
            predicted_score=shap["predictedScore"],
            reconstructed_score=shap["reconstructedScore"],
            fidelity=shap["fidelity"],
            runtime_ms=shap["runtimeMs"],
            additional_factors=additional_factors,
            gap_recommendations=gap_recommendations,
            relevant_keys=relevant_keys,
        )
        reason = (
            "SHAP was selected because it provides additive, stable contributions for this recommendation."
            if method_preference == "shap"
            else "SHAP was selected automatically because the feature count is small enough for a stable additive explanation."
        )
    else:
        lime = explain_with_lime(predict_score, feature_vector, career_index, means, stds)
        lime_report = create_method_report(
            method="lime",
            career_name=career_name,
            path_key=path_key,
            feature_vector=feature_vector,
            keys=feature_keys,
            labels=labels,
            contributions=lime["contributions"],
            base_score=lime["baseScore"],
            predicted_score=lime["predictedScore"],
            reconstructed_score=lime["reconstructedScore"],
            fidelity=lime["fidelity"],
            runtime_ms=lime["runtimeMs"],
            additional_factors=additional_factors,
            gap_recommendations=gap_recommendations,
            relevant_keys=relevant_keys,
        )
        reason = (
            "LIME was selected because it provides a faster local explanation for this recommendation."
            if method_preference == "lime"
            else "LIME was selected automatically because the current feature set is large and a faster local explanation is preferred."
        )

    return {
        "selectedMethod": selected_method,
        "reason": reason,
        "topCareer": shap_report if selected_method == "shap" else lime_report,
        "comparison": {
            "shap": shap_report,
            "lime": lime_report,
        },
    }
