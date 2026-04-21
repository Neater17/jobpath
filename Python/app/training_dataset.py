from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from .catalog import COMPETENCY_ORDER


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


@dataclass
class TrainingSample:
    features: List[float]
    label: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TrainingDataset:
    samples: List[TrainingSample]
    data_source: str
    debug: Optional[Dict[str, Any]] = None


target_synthetic_sample_count = 9800
SIGNATURE_WEIGHT_THRESHOLD = 0.76
HANDS_ON_COMPETENCIES = {
    "sql_data_access",
    "data_visualization",
    "data_engineering",
    "statistics_experimentation",
    "machine_learning",
    "mlops_deployment",
    "research_innovation",
    "role_mastery",
}
STRATEGIC_COMPETENCIES = {
    "business_strategy",
    "communication_storytelling",
    "responsible_ai",
    "collaboration_delivery",
    "leadership_execution",
}
PATH_NEIGHBOR_MAP: Dict[str, set[str]] = {
    "business_intelligence": {"data_stewardship"},
    "data_stewardship": {"business_intelligence", "data_engineering", },
    "data_engineering": {"data_stewardship", "data_science", },
    "data_science": {
        "data_engineering",
        "ai_engineering",
    },
    "ai_engineering": {"data_science", "applied_research"},
    "applied_research": {"ai_engineering"},
}

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


def _profile_indexes(profiles: List[Dict[str, Any]]) -> tuple[Dict[str, int], Dict[str, int], Dict[str, int]]:
    by_path_and_career: Dict[str, int] = {}
    by_career: Dict[str, int] = {}
    by_profile_key: Dict[str, int] = {}
    for index, profile in enumerate(profiles):
        profile_key = str(profile.get("profileKey") or "")
        if profile_key:
            by_profile_key[profile_key] = index
        ladder_entries = profile.get("ladderEntries") or []
        if ladder_entries:
            for ladder_entry in ladder_entries:
                if not isinstance(ladder_entry, dict):
                    continue
                path_key = ladder_entry.get("pathKey")
                career_name = ladder_entry.get("careerName")
                if isinstance(path_key, str) and isinstance(career_name, str):
                    by_path_and_career[f"{path_key}::{career_name}"] = index
                    by_career.setdefault(career_name, index)
        else:
            path_key = profile.get("pathKey")
            career_name = profile.get("careerName")
            if isinstance(path_key, str) and isinstance(career_name, str):
                by_path_and_career[f"{path_key}::{career_name}"] = index
                by_career.setdefault(career_name, index)
    return by_path_and_career, by_career, by_profile_key


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


def _representative_level(profile: Dict[str, Any]) -> int:
    levels = [int(level) for level in (profile.get("levels") or []) if isinstance(level, int)]
    if levels:
        return min(levels)
    ladder_entries = profile.get("ladderEntries") or []
    derived_levels: List[int] = []
    for entry in ladder_entries:
        if not isinstance(entry, dict):
            continue
        level_value = entry.get("level")
        if isinstance(level_value, int):
            derived_levels.append(level_value)
    return min(derived_levels) if derived_levels else 1


def _level_band(level: int) -> str:
    if level <= 2:
        return "low"
    if level <= 5:
        return "mid"
    return "high"


def _profile_path_keys(profile: Dict[str, Any]) -> List[str]:
    path_keys = [str(value) for value in (profile.get("pathKeys") or []) if isinstance(value, str)]
    if path_keys:
        return path_keys
    ladder_entries = profile.get("ladderEntries") or []
    return [
        str(entry.get("pathKey"))
        for entry in ladder_entries
        if isinstance(entry, dict) and isinstance(entry.get("pathKey"), str)
    ]


def _signature_feature_indexes(base_vector: List[float]) -> List[int]:
    ranked = sorted(range(len(base_vector)), key=lambda index: base_vector[index], reverse=True)
    strong = [index for index, value in enumerate(base_vector) if value >= SIGNATURE_WEIGHT_THRESHOLD]
    return strong or ranked[: max(2, min(4, len(ranked)))]


def _profile_metadata(profiles: List[Dict[str, Any]], competency_order: List[str]) -> List[Dict[str, Any]]:
    metadata: List[Dict[str, Any]] = []
    for index, profile in enumerate(profiles):
        base_vector = [clamp01(float(profile["weights"].get(key, 0.0))) for key in competency_order]
        representative_level = _representative_level(profile)
        path_keys = _profile_path_keys(profile)
        metadata.append(
            {
                "index": index,
                "profileKey": str(profile.get("profileKey") or f"profile_{index}"),
                "careerName": str(profile.get("careerName") or f"profile_{index}"),
                "baseVector": base_vector,
                "representativeLevel": representative_level,
                "levelBand": _level_band(representative_level),
                "pathKeys": path_keys,
                "sharedProfile": len(set(path_keys)) > 1,
                "roleFamilies": _role_families(
                    str(profile.get("profileKey") or ""),
                    str(profile.get("careerName") or ""),
                ),
                "signatureIndexes": _signature_feature_indexes(base_vector),
            }
        )
    return metadata


def _role_families(profile_key: str, career_name: str) -> List[str]:
    normalized = normalize_token(f"{profile_key} {career_name}")
    families: List[str] = []
    family_terms = {
        "associate": ["associate", "junior", "entry"],
        "analyst": ["analyst", "analytics"],
        "engineer": ["engineer", "engineering", "mlops"],
        "scientist": ["scientist", "science"],
        "researcher": ["research", "researcher"],
        "architect": ["architect", "architecture"],
        "governance": ["governance", "steward", "quality", "compliance"],
        "executive": ["chief", "officer", "executive", "cto", "cio", "cdo"],
        "leadership": ["manager", "director", "head", "lead"],
    }
    for family, terms in family_terms.items():
        if any(term in normalized for term in terms):
            families.append(family)
    return families or ["generalist"]


def _paths_are_neighbors(left: Iterable[str], right: Iterable[str]) -> bool:
    left_set = {str(value) for value in left}
    right_set = {str(value) for value in right}
    if left_set & right_set:
        return True
    for path_key in left_set:
        if PATH_NEIGHBOR_MAP.get(path_key, set()) & right_set:
            return True
    return False


def _profiles_are_nearby(current: Dict[str, Any], peer: Dict[str, Any]) -> bool:
    if bool(current.get("sharedProfile")) or bool(peer.get("sharedProfile")):
        return True
    if set(current.get("roleFamilies") or []) & set(peer.get("roleFamilies") or []):
        return True
    return _paths_are_neighbors(current.get("pathKeys") or [], peer.get("pathKeys") or [])


def _peer_relationship(current: Dict[str, Any], peer: Dict[str, Any]) -> str:
    current_paths = set(current.get("pathKeys") or [])
    peer_paths = set(peer.get("pathKeys") or [])
    if bool(current.get("sharedProfile")) or bool(peer.get("sharedProfile")):
        return "shared_foundation"
    if current_paths & peer_paths:
        if abs(int(current["representativeLevel"]) - int(peer["representativeLevel"])) <= 1:
            return "same_path_adjacent"
        return "same_path"
    if set(current.get("roleFamilies") or []) & set(peer.get("roleFamilies") or []):
        return "same_family_neighbor"
    if _paths_are_neighbors(current_paths, peer_paths):
        return "cross_path_neighbor"
    return "distant"


def _eligible_peer_indexes(
    metadata: List[Dict[str, Any]],
    current: Dict[str, Any],
    allow_advanced_mixing: bool = True,
) -> List[int]:
    current_level = int(current["representativeLevel"])
    current_band = str(current["levelBand"])
    current_role_families = set(str(value) for value in (current.get("roleFamilies") or []))
    executive_profile = "executive" in current_role_families
    peers: List[int] = []
    for peer in metadata:
        if int(peer["index"]) == int(current["index"]):
            continue
        peer_level = int(peer["representativeLevel"])
        peer_band = str(peer["levelBand"])
        peer_role_families = set(str(value) for value in (peer.get("roleFamilies") or []))
        executive_pair = executive_profile or "executive" in peer_role_families

        relationship = _peer_relationship(current, peer)

        if current_band == "low":
            if abs(peer_level - current_level) > 2:
                continue
            if relationship in {"same_path", "same_path_adjacent", "shared_foundation"}:
                peers.append(int(peer["index"]))
                continue
            if relationship in {"same_family_neighbor", "cross_path_neighbor"} and peer_band in {"low", "mid"}:
                peers.append(int(peer["index"]))
            continue

        if not allow_advanced_mixing:
            continue

        if current_band == "mid":
            if abs(peer_level - current_level) > 1:
                continue
            if relationship in {"same_path", "same_path_adjacent", "shared_foundation"}:
                peers.append(int(peer["index"]))
                continue
            if relationship in {"same_family_neighbor", "cross_path_neighbor"} and peer_band == "mid":
                peers.append(int(peer["index"]))
            continue

        if executive_pair and relationship in {"same_family_neighbor", "cross_path_neighbor"}:
            if peer_band in {"mid", "high"} and abs(peer_level - current_level) <= 2:
                peers.append(int(peer["index"]))
                continue

        if peer_band != "high" or abs(peer_level - current_level) > 1:
            continue
        if relationship in {"same_path", "same_path_adjacent", "shared_foundation"}:
            peers.append(int(peer["index"]))
            continue
        if relationship in {"same_family_neighbor", "cross_path_neighbor"}:
            peers.append(int(peer["index"]))
    return peers


def _generation_config(level: int, archetype: str) -> Dict[str, float]:
    band = _level_band(level)
    if band == "low":
        archetype_adjustments = {
            "strong_fit": {"baseScale": 0.92, "peerMin": 0.18, "peerMax": 0.28, "noise": 0.2, "lift": 0.025},
            "typical_fit": {"baseScale": 0.86, "peerMin": 0.22, "peerMax": 0.34, "noise": 0.24, "lift": 0.01},
            "stretch_fit": {"baseScale": 0.8, "peerMin": 0.26, "peerMax": 0.4, "noise": 0.28, "lift": 0.0},
        }
        return archetype_adjustments[archetype]

    if band == "mid":
        archetype_adjustments = {
            "strong_fit": {"baseScale": 0.98, "peerMin": 0.1, "peerMax": 0.18, "noise": 0.12, "lift": 0.025},
            "typical_fit": {"baseScale": 0.95, "peerMin": 0.12, "peerMax": 0.22, "noise": 0.15, "lift": 0.015},
            "stretch_fit": {"baseScale": 0.9, "peerMin": 0.15, "peerMax": 0.28, "noise": 0.18, "lift": 0.005},
        }
        return archetype_adjustments[archetype]

    archetype_adjustments = {
        "strong_fit": {"baseScale": 1.0, "peerMin": 0.02, "peerMax": 0.045, "noise": 0.09, "lift": 0.014},
        "typical_fit": {"baseScale": 0.98, "peerMin": 0.03, "peerMax": 0.065, "noise": 0.12, "lift": 0.008},
        "stretch_fit": {"baseScale": 0.95, "peerMin": 0.04, "peerMax": 0.085, "noise": 0.15, "lift": 0.0},
    }
    return archetype_adjustments[archetype]


def _feature_noise_scale(feature_key: str, level: int, signature: bool) -> float:
    band = _level_band(level)
    if band == "low":
        if feature_key in HANDS_ON_COMPETENCIES:
            return 1.2
        if feature_key in STRATEGIC_COMPETENCIES:
            return 0.6
        return 1.0
    if band == "mid":
        if signature:
            return 0.75
        if feature_key in HANDS_ON_COMPETENCIES:
            return 0.95
        if feature_key in STRATEGIC_COMPETENCIES:
            return 0.7
        return 0.82
    if signature:
        return 0.45
    if feature_key in STRATEGIC_COMPETENCIES:
        return 0.55
    return 0.7


def _build_archetype_sample(
    rng: random.Random,
    base_vector: List[float],
    peer_vector: Optional[List[float]],
    competency_order: List[str],
    representative_level: int,
    signature_indexes: List[int],
    archetype: str,
) -> tuple[List[float], float]:
    config = _generation_config(representative_level, archetype)
    peer_weight = rng.uniform(config["peerMin"], config["peerMax"]) if peer_vector is not None else 0.0
    base_weight = max(0.0, 1.0 - peer_weight)
    vector: List[float] = []
    for feature_index, base_value in enumerate(base_vector):
        signature = feature_index in signature_indexes
        peer_value = peer_vector[feature_index] if peer_vector is not None else base_value
        target = clamp01(base_value * config["baseScale"] * base_weight + peer_value * peer_weight)
        noise = (rng.random() - 0.5) * 2 * config["noise"] * _feature_noise_scale(
            competency_order[feature_index],
            representative_level,
            signature,
        )
        confidence_lift = config["lift"] if rng.random() > 0.35 else 0.0
        vector.append(clamp01(target + noise + confidence_lift))
    return vector, peer_weight


def _sample_hard_tags(
    profile_meta: Dict[str, Any],
    chosen_peer: Optional[Dict[str, Any]],
    archetype: str,
    peer_weight: float,
) -> List[str]:
    tags: List[str] = []
    if bool(profile_meta.get("sharedProfile")):
        tags.append("shared_foundation_role")
    if archetype == "stretch_fit":
        tags.append("stretch_fit")
    if archetype == "typical_fit" and int(profile_meta["representativeLevel"]) >= 5:
        tags.append("upper_level_typical")
    if int(profile_meta["representativeLevel"]) >= 6:
        tags.append("high_level_profile")
    if chosen_peer is not None:
        relationship = _peer_relationship(profile_meta, chosen_peer)
        if relationship != "distant":
            tags.append(relationship)
        if set(profile_meta.get("roleFamilies") or []) & {"executive", "leadership"}:
            tags.append("strategic_profile")
        if peer_weight >= 0.05:
            tags.append("mixed_signal")
    return sorted(set(tags))


def _vector_distance(left: List[float], right: List[float]) -> float:
    if not left and not right:
        return 0.0
    squared = sum((left[index] - right[index]) ** 2 for index in range(min(len(left), len(right))))
    return math.sqrt(squared / max(1, min(len(left), len(right))))


def load_dataset_from_file(
    file_path: str | Path, profiles: List[Dict[str, Any]], competency_order: List[str]
) -> TrainingDataset:
    content = Path(file_path).read_text(encoding="utf-8")
    external_samples = parse_external_samples(json.loads(content))
    by_path_and_career, by_career, by_profile_key = _profile_indexes(profiles)

    samples: List[TrainingSample] = []
    for sample in external_samples:
        career_name = sample.get("careerName")
        raw_features = sample.get("features")
        if not isinstance(career_name, str) or not career_name.strip():
            continue
        if not isinstance(raw_features, dict):
            continue

        path_key = sample.get("pathKey")
        profile_key = sample.get("profileKey")
        label = None
        if isinstance(profile_key, str):
            label = by_profile_key.get(profile_key)
        if isinstance(path_key, str):
            label = label if label is not None else by_path_and_career.get(f"{path_key}::{career_name}")
        if label is None:
            label = by_career.get(career_name)
        if label is None:
            continue

        samples.append(
            TrainingSample(
                features=_clean_feature_vector(raw_features, competency_order),
                label=label,
                metadata={
                    "source": "historical",
                    "careerName": career_name,
                    "pathKey": path_key,
                    "profileKey": profile_key,
                },
            )
        )

    if len(samples) < max(3, len(profiles)):
        raise ValueError("Dataset has too few valid samples to train the ensemble")

    return TrainingDataset(samples=samples, data_source=f"historical-json:{Path(file_path).resolve()}")


def build_synthetic_dataset(profiles: List[Dict[str, Any]], competency_order: List[str]) -> TrainingDataset:
    rng = random.Random(20260224)
    samples: List[TrainingSample] = []
    metadata = _profile_metadata(profiles, competency_order)
    base_samples_per_profile = target_synthetic_sample_count // max(1, len(metadata))
    remainder_samples = target_synthetic_sample_count % max(1, len(metadata))
    archetypes = ["strong_fit", "typical_fit", "stretch_fit"]
    debug_profiles: List[Dict[str, Any]] = []

    for label, profile_meta in enumerate(metadata):
        base_vector = list(profile_meta["baseVector"])
        representative_level = int(profile_meta["representativeLevel"])
        peer_indexes = _eligible_peer_indexes(metadata, profile_meta, allow_advanced_mixing=True)
        samples_for_profile = base_samples_per_profile + (1 if label < remainder_samples else 0)
        profile_peer_weights: List[float] = []
        profile_distances: List[float] = []
        archetype_counts = {name: 0 for name in archetypes}
        hard_tag_counts: Dict[str, int] = {}

        for sample_index in range(samples_for_profile):
            archetype = archetypes[sample_index % len(archetypes)]
            archetype_counts[archetype] += 1
            peer_vector: Optional[List[float]] = None
            chosen_peer: Optional[Dict[str, Any]] = None
            if peer_indexes:
                chosen_peer = metadata[peer_indexes[sample_index % len(peer_indexes)]]
                peer_vector = list(chosen_peer["baseVector"])
            vector, peer_weight = _build_archetype_sample(
                rng=rng,
                base_vector=base_vector,
                peer_vector=peer_vector,
                competency_order=competency_order,
                representative_level=representative_level,
                signature_indexes=list(profile_meta["signatureIndexes"]),
                archetype=archetype,
            )
            hard_tags = _sample_hard_tags(profile_meta, chosen_peer, archetype, peer_weight)
            for tag in hard_tags:
                hard_tag_counts[tag] = hard_tag_counts.get(tag, 0) + 1
            samples.append(
                TrainingSample(
                    features=vector,
                    label=label,
                    metadata={
                        "source": "synthetic",
                        "profileKey": profile_meta["profileKey"],
                        "careerName": profile_meta["careerName"],
                        "representativeLevel": representative_level,
                        "levelBand": profile_meta["levelBand"],
                        "pathKeys": list(profile_meta["pathKeys"]),
                        "sharedProfile": bool(profile_meta["sharedProfile"]),
                        "roleFamilies": list(profile_meta["roleFamilies"]),
                        "archetype": archetype,
                        "peerWeight": peer_weight,
                        "peerProfileKey": chosen_peer["profileKey"] if chosen_peer is not None else None,
                        "peerLevelBand": chosen_peer["levelBand"] if chosen_peer is not None else None,
                        "peerRelationship": _peer_relationship(profile_meta, chosen_peer)
                        if chosen_peer is not None
                        else "none",
                        "hardTags": hard_tags,
                    },
                )
            )
            profile_peer_weights.append(peer_weight)
            profile_distances.append(_vector_distance(vector, base_vector))

        debug_profiles.append(
            {
                "label": label,
                "profileKey": profile_meta["profileKey"],
                "careerName": profile_meta["careerName"],
                "representativeLevel": representative_level,
                "levelBand": profile_meta["levelBand"],
                "pathKeys": list(profile_meta["pathKeys"]),
                "signatureIndexes": list(profile_meta["signatureIndexes"]),
                "peerIndexes": peer_indexes,
                "archetypeCounts": archetype_counts,
                "hardTagCounts": hard_tag_counts,
                "avgPeerWeight": (sum(profile_peer_weights) / len(profile_peer_weights)) if profile_peer_weights else 0.0,
                "maxPeerWeight": max(profile_peer_weights) if profile_peer_weights else 0.0,
                "avgDistanceToBase": (sum(profile_distances) / len(profile_distances)) if profile_distances else 0.0,
            }
        )

    return TrainingDataset(
        samples=samples,
        data_source=f"synthetic-profile-bootstrap-level-aware:{len(samples)}",
        debug={
            "mode": "level-aware-synthetic",
            "profileCount": len(metadata),
            "profiles": debug_profiles,
        },
    )


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
