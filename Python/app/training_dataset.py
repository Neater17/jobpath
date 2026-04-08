from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from .catalog import COMPETENCY_ORDER


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


@dataclass
class TrainingSample:
    features: List[float]
    label: int


@dataclass
class TrainingDataset:
    samples: List[TrainingSample]
    data_source: str


target_synthetic_sample_count = 9800

path_alias_map: Dict[str, str] = {
    "businessintelligence": "business_intelligence",
    "businessintelligencestrategy": "business_intelligence",
    "businessstrategy": "business_intelligence",
    "datastewardship": "data_stewardship",
    "datasteward": "data_stewardship",
    "governance": "data_stewardship",
    "dataengineering": "data_engineering",
    "engineering": "data_engineering",
    "datascience": "data_science",
    "science": "data_science",
    "aiengineering": "ai_engineering",
    "machinelearningengineering": "ai_engineering",
    "mlengineering": "ai_engineering",
    "appliedresearch": "applied_research",
    "research": "applied_research",
}

skill_alias_entries = [
    ("business", "business_strategy"),
    ("strategy", "business_strategy"),
    ("kpi", "business_strategy"),
    ("sql", "sql_data_access"),
    ("query", "sql_data_access"),
    ("database", "sql_data_access"),
    ("visual", "data_visualization"),
    ("dashboard", "data_visualization"),
    ("report", "data_visualization"),
    ("governance", "data_quality_governance"),
    ("quality", "data_quality_governance"),
    ("lineage", "data_quality_governance"),
    ("pipeline", "data_engineering"),
    ("etl", "data_engineering"),
    ("elt", "data_engineering"),
    ("engineering", "data_engineering"),
    ("statistics", "statistics_experimentation"),
    ("experiment", "statistics_experimentation"),
    ("hypothesis", "statistics_experimentation"),
    ("machine learning", "machine_learning"),
    ("model", "machine_learning"),
    ("prediction", "machine_learning"),
    ("mlops", "mlops_deployment"),
    ("deployment", "mlops_deployment"),
    ("monitoring", "mlops_deployment"),
    ("research", "research_innovation"),
    ("innovation", "research_innovation"),
    ("publication", "research_innovation"),
    ("communication", "communication_storytelling"),
    ("storytelling", "communication_storytelling"),
    ("presentation", "communication_storytelling"),
    ("responsible", "responsible_ai"),
    ("ethic", "responsible_ai"),
    ("fairness", "responsible_ai"),
    ("collaboration", "collaboration_delivery"),
    ("stakeholder", "collaboration_delivery"),
    ("delivery", "collaboration_delivery"),
    ("lead", "leadership_execution"),
    ("management", "leadership_execution"),
    ("execution", "leadership_execution"),
    ("role", "role_mastery"),
    ("mastery", "role_mastery"),
    ("proficiency", "role_mastery"),
]


def normalize_token(value: str) -> str:
    return "".join(char.lower() if char.isalnum() else " " for char in value).strip()


def build_skill_alias_map() -> Dict[str, str]:
    alias_map: Dict[str, str] = {}
    for key in COMPETENCY_ORDER:
        alias_map[key] = key
        alias_map[normalize_token(key)] = key
    for alias, key in skill_alias_entries:
        alias_map[normalize_token(alias)] = key
    return alias_map


skill_alias_map = build_skill_alias_map()


def parse_proficiency_score(raw: Any) -> float:
    if isinstance(raw, (int, float)):
        return clamp01(float(raw) / 100 if float(raw) > 1 else float(raw))
    if not isinstance(raw, str):
        return 0.65

    text = raw.strip()
    if not text:
        return 0.65
    normalized = normalize_token(text)

    if text.endswith("%"):
        try:
            return clamp01(float(text[:-1].strip()) / 100)
        except ValueError:
            pass

    parts = normalized.split()
    if "level" in parts:
        try:
            index = parts.index("level")
            return clamp01((float(parts[index + 1]) - 1) / 4)
        except (ValueError, IndexError):
            pass

    try:
        numeric = float(text)
        return clamp01(numeric / 100 if numeric > 1 else numeric)
    except ValueError:
        pass

    if "beginner" in normalized or "basic" in normalized:
        return 0.3
    if "intermediate" in normalized:
        return 0.55
    if "advanced" in normalized:
        return 0.8
    if "expert" in normalized or "master" in normalized:
        return 0.95
    return 0.65


def parse_external_samples(raw: Any) -> List[Dict[str, Any]]:
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    if isinstance(raw, dict) and isinstance(raw.get("samples"), list):
        return [item for item in raw["samples"] if isinstance(item, dict)]
    raise ValueError("Dataset JSON must be an array or an object with a samples array")


def _profile_indexes(profiles: List[Dict[str, Any]]) -> tuple[Dict[str, int], Dict[str, int]]:
    by_path_and_career: Dict[str, int] = {}
    by_career: Dict[str, int] = {}
    for index, profile in enumerate(profiles):
        by_path_and_career[f"{profile['pathKey']}::{profile['careerName']}"] = index
        by_career.setdefault(str(profile["careerName"]), index)
    return by_path_and_career, by_career


def _clean_feature_vector(raw_features: Dict[str, Any], competency_order: List[str]) -> List[float]:
    vector: List[float] = []
    for key in competency_order:
        raw_value = raw_features.get(key, 0)
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            value = parse_proficiency_score(raw_value)
        vector.append(clamp01(value))
    return vector


def load_dataset_from_file(
    file_path: str | Path, profiles: List[Dict[str, Any]], competency_order: List[str]
) -> TrainingDataset:
    content = Path(file_path).read_text(encoding="utf-8")
    external_samples = parse_external_samples(json.loads(content))
    by_path_and_career, by_career = _profile_indexes(profiles)

    samples: List[TrainingSample] = []
    for sample in external_samples:
        career_name = sample.get("careerName")
        raw_features = sample.get("features")
        if not isinstance(career_name, str) or not career_name.strip():
            continue
        if not isinstance(raw_features, dict):
            continue

        path_key = sample.get("pathKey")
        label = None
        if isinstance(path_key, str):
            label = by_path_and_career.get(f"{path_key}::{career_name}")
        if label is None:
            label = by_career.get(career_name)
        if label is None:
            continue

        samples.append(
            TrainingSample(
                features=_clean_feature_vector(raw_features, competency_order),
                label=label,
            )
        )

    if len(samples) < max(3, len(profiles)):
        raise ValueError("Dataset has too few valid samples to train the ensemble")

    return TrainingDataset(samples=samples, data_source=f"historical-json:{Path(file_path).resolve()}")


def build_synthetic_dataset(profiles: List[Dict[str, Any]], competency_order: List[str]) -> TrainingDataset:
    rng = random.Random(20260224)
    samples: List[TrainingSample] = []
    profile_weight_vectors = [
        [clamp01(float(profile["weights"].get(key, 0.0))) for key in competency_order]
        for profile in profiles
    ]

    base_samples_per_career = target_synthetic_sample_count // max(1, len(profile_weight_vectors))
    remainder_samples = target_synthetic_sample_count % max(1, len(profile_weight_vectors))

    for label, base_vector in enumerate(profile_weight_vectors):
        samples_for_career = base_samples_per_career + (1 if label < remainder_samples else 0)
        for _ in range(samples_for_career):
            difficulty_mix = rng.random()
            peer_vector = profile_weight_vectors[rng.randrange(len(profile_weight_vectors))]
            vector = []
            for feature_index, base_value in enumerate(base_vector):
                peer_weight = peer_vector[feature_index]
                mixed_target = clamp01(base_value * (0.82 + difficulty_mix * 0.12) + peer_weight * 0.06)
                perturbation = (rng.random() - 0.5) * 0.34
                confidence_lift = 0.08 if rng.random() > 0.78 else 0.0
                vector.append(clamp01(mixed_target + perturbation + confidence_lift))
            samples.append(TrainingSample(features=vector, label=label))

    return TrainingDataset(samples=samples, data_source=f"synthetic-profile-bootstrap:{len(samples)}")


def load_or_build_training_dataset(
    profiles: List[Dict[str, Any]],
    competency_order: Optional[Iterable[str]] = None,
    dataset_path: Optional[str] = None,
) -> TrainingDataset:
    order = list(competency_order or COMPETENCY_ORDER)
    if dataset_path:
        try:
            return load_dataset_from_file(dataset_path, profiles, order)
        except Exception:
            pass
    return build_synthetic_dataset(profiles, order)
