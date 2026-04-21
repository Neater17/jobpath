from __future__ import annotations

import re
from collections import OrderedDict
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, cast


def _slugify_title(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")
    return slug or "competency"


def competency_key_for_title(title: str) -> str:
    return _slugify_title(title)


FALLBACK_COMPETENCY_ORDER: List[str] = [
    "business_strategy",
    "sql_data_access",
    "data_visualization",
    "data_quality_governance",
    "data_engineering",
    "statistics_experimentation",
    "machine_learning",
    "mlops_deployment",
    "research_innovation",
    "communication_storytelling",
    "responsible_ai",
    "collaboration_delivery",
    "leadership_execution",
    "role_mastery",
]

FALLBACK_COMPETENCY_LABELS: Dict[str, str] = {
    "business_strategy": "Business Strategy",
    "sql_data_access": "SQL and Data Access",
    "data_visualization": "Data Visualization",
    "data_quality_governance": "Data Quality and Governance",
    "data_engineering": "Data Engineering",
    "statistics_experimentation": "Statistics and Experimentation",
    "machine_learning": "Machine Learning",
    "mlops_deployment": "MLOps and Deployment",
    "research_innovation": "Research and Innovation",
    "communication_storytelling": "Communication and Storytelling",
    "responsible_ai": "Responsible AI",
    "collaboration_delivery": "Collaboration and Delivery",
    "leadership_execution": "Leadership and Execution",
    "role_mastery": "Role Mastery",
}

FALLBACK_GAP_RECOMMENDATIONS: Dict[str, str] = {
    "business_strategy": "Practice framing analytics outputs into clear business decisions.",
    "sql_data_access": "Strengthen SQL querying and data extraction workflows.",
    "data_visualization": "Build dashboard storytelling and data communication skills.",
    "data_quality_governance": "Apply data quality controls and governance standards consistently.",
    "data_engineering": "Improve pipeline design, orchestration, and reliability practices.",
    "statistics_experimentation": "Deepen statistical reasoning and experiment design.",
    "machine_learning": "Advance model development, evaluation, and validation capability.",
    "mlops_deployment": "Focus on model deployment, monitoring, and lifecycle operations.",
    "research_innovation": "Improve literature review and evidence-based experimentation methods.",
    "communication_storytelling": "Translate technical insights into audience-specific narratives.",
    "responsible_ai": "Apply fairness, safety, and governance checks in data/AI workflows.",
    "collaboration_delivery": "Improve cross-team coordination and delivery management.",
    "leadership_execution": "Lead priorities, resource decisions, and strategic execution.",
    "role_mastery": "Build practical depth in core responsibilities of the target role.",
}

DATA_DIR = Path(__file__).resolve().parents[2] / "backend" / "data"
CAREER_MAP_JSON = DATA_DIR / "PSF-AAI-Career-Map.json"
FUNCTIONAL_SKILLS_JSON = DATA_DIR / "PSF-AAI-Functional-Skills.json"
ENABLING_SKILLS_JSON = DATA_DIR / "PSF-AAI-Enabling-Skills.json"


def _normalize_path_key(value: str) -> str:
    normalized = _slugify_title(value).replace("_", "")
    mapping = {
        "businessintelligence": "business_intelligence",
        "businessintelligencestrategy": "business_intelligence",
        "businessstrategy": "business_intelligence",
        "datastewardship": "data_stewardship",
        "datagovernance": "data_stewardship",
        "dataengineering": "data_engineering",
        "datascience": "data_science",
        "aiengineering": "ai_engineering",
        "appliedresearch": "applied_research",
        "applieddataairesearch": "applied_research",
    }
    return mapping.get(normalized, value if value in mapping.values() else _slugify_title(value))


def _career_title_variants(title: str) -> List[str]:
    normalized = _slugify_title(title).replace("_", "")
    variants = {normalized}
    variants.add(normalized.replace("analystics", "analytics"))
    variants.add(normalized.replace("architech", "architect"))
    variants.add(normalized.replace("learniing", "learning"))
    variants.add(normalized.replace("dataai", "dataairesearch").replace("applied", ""))
    return list(variants)


def _parse_proficiency_weight(raw: Any) -> float:
    if isinstance(raw, (int, float)):
        value = float(raw)
        if value <= 1:
            return max(0.0, min(1.0, value))
        if value <= 5:
            return value / 5
        if value <= 7:
            return value / 7
        return min(1.0, value / 100)
    if not isinstance(raw, str):
        return 0.65

    text = raw.strip().lower()
    if not text:
        return 0.65
    numbers = [float(match) for match in re.findall(r"\d+(?:\.\d+)?", text)]
    if numbers:
        candidate = max(numbers)
        if candidate <= 5:
            return candidate / 5
        if candidate <= 7:
            return candidate / 7
        if candidate <= 100:
            return candidate / 100
    if any(token in text for token in ["beginner", "basic", "foundation", "foundational", "associate"]):
        return 0.3
    if any(token in text for token in ["intermediate", "working", "practitioner", "professional"]):
        return 0.55
    if any(token in text for token in ["advanced", "senior", "supervisor", "specialist"]):
        return 0.78
    if any(token in text for token in ["expert", "lead", "manager", "director", "chief", "executive"]):
        return 0.92
    return 0.65


def _generic_gap_recommendation(label: str) -> str:
    return f"Build stronger evidence and applied practice in {label.lower()}."


@lru_cache(maxsize=1)
def _load_database_catalog() -> Dict[str, Any]:
    if not (CAREER_MAP_JSON.exists() and FUNCTIONAL_SKILLS_JSON.exists() and ENABLING_SKILLS_JSON.exists()):
        return {
            "available": False,
            "competency_order": FALLBACK_COMPETENCY_ORDER,
            "competency_labels": FALLBACK_COMPETENCY_LABELS,
            "gap_recommendations": FALLBACK_GAP_RECOMMENDATIONS,
            "career_weights": {},
            "path_averages": {},
            "global_average": {key: 0.0 for key in FALLBACK_COMPETENCY_ORDER},
        }

    try:
        import json

        functional_skills = json.loads(FUNCTIONAL_SKILLS_JSON.read_text(encoding="utf-8"))
        enabling_skills = json.loads(ENABLING_SKILLS_JSON.read_text(encoding="utf-8"))
        careers = json.loads(CAREER_MAP_JSON.read_text(encoding="utf-8"))
    except Exception:
        return {
            "available": False,
            "competency_order": FALLBACK_COMPETENCY_ORDER,
            "competency_labels": FALLBACK_COMPETENCY_LABELS,
            "gap_recommendations": FALLBACK_GAP_RECOMMENDATIONS,
            "career_weights": {},
            "path_averages": {},
            "global_average": {key: 0.0 for key in FALLBACK_COMPETENCY_ORDER},
        }

    competency_order: List[str] = []
    competency_labels: Dict[str, str] = {}

    for skill in [*functional_skills, *enabling_skills]:
        title = str(skill.get("title") or "").strip()
        if not title:
            continue
        key = competency_key_for_title(title)
        if key in competency_labels:
            continue
        competency_order.append(key)
        competency_labels[key] = title

    gap_recommendations = {
        key: _generic_gap_recommendation(label) for key, label in competency_labels.items()
    }

    career_weights: Dict[str, Dict[str, float]] = {}
    path_weight_samples: Dict[str, List[Dict[str, float]]] = {}
    global_weight_samples: List[Dict[str, float]] = []

    def empty_weights() -> Dict[str, float]:
        return {key: 0.0 for key in competency_order}

    for career in careers:
        title = str(career.get("careerTitle") or "").strip()
        if not title:
            continue
        weights = empty_weights()
        for skill in career.get("functionalSkillsandCompetencies") or []:
            skill_title = str(skill.get("title") or "").strip()
            key = competency_key_for_title(skill_title)
            if key in weights:
                weights[key] = max(weights[key], _parse_proficiency_weight(skill.get("proficiencyLevel")))
        for skill in career.get("enablingSkillsandCompetencies") or []:
            skill_title = str(skill.get("title") or "").strip()
            key = competency_key_for_title(skill_title)
            if key in weights:
                weights[key] = max(weights[key], _parse_proficiency_weight(skill.get("proficiencyLevel")))

        paths = career.get("careerPath")
        normalized_paths = (
            [_normalize_path_key(path) for path in paths if isinstance(path, str)]
            if isinstance(paths, list)
            else [_normalize_path_key(paths)] if isinstance(paths, str) else []
        )
        for path_key in normalized_paths or [""]:
            for title_variant in _career_title_variants(title):
                career_weights[f"{path_key}::{title_variant}"] = dict(weights)
            if path_key:
                path_weight_samples.setdefault(path_key, []).append(dict(weights))
        global_weight_samples.append(dict(weights))

    def average_weights(items: List[Dict[str, float]]) -> Dict[str, float]:
        if not items:
            return empty_weights()
        return {
            key: sum(item.get(key, 0.0) for item in items) / len(items)
            for key in competency_order
        }

    path_averages = {
        path_key: average_weights(items) for path_key, items in path_weight_samples.items()
    }
    global_average = average_weights(global_weight_samples)
    return {
        "available": bool(competency_order),
        "competency_order": competency_order or FALLBACK_COMPETENCY_ORDER,
        "competency_labels": competency_labels or FALLBACK_COMPETENCY_LABELS,
        "gap_recommendations": gap_recommendations or FALLBACK_GAP_RECOMMENDATIONS,
        "career_weights": career_weights,
        "path_averages": path_averages,
        "global_average": global_average if competency_order else {key: 0.0 for key in FALLBACK_COMPETENCY_ORDER},
    }


_DATABASE_CATALOG = _load_database_catalog()
COMPETENCY_ORDER: List[str] = list(_DATABASE_CATALOG["competency_order"])
COMPETENCY_LABELS: Dict[str, str] = dict(_DATABASE_CATALOG["competency_labels"])
GAP_RECOMMENDATIONS: Dict[str, str] = dict(_DATABASE_CATALOG["gap_recommendations"])
CAREER_WEIGHT_LOOKUP: Dict[str, Dict[str, float]] = dict(_DATABASE_CATALOG["career_weights"])
PATH_WEIGHT_LOOKUP: Dict[str, Dict[str, float]] = dict(_DATABASE_CATALOG["path_averages"])
GLOBAL_WEIGHT_LOOKUP: Dict[str, float] = dict(_DATABASE_CATALOG["global_average"])

CAREER_PATHS = {
    "business_intelligence": {
        "name": "Business Intelligence & Strategy",
        "careers": [
            {"level": 1, "name": "Associate Data Analyst", "profileKey": "associate_data_analyst"},
            {"level": 2, "name": "Data Analyst", "profileKey": "data_analyst"},
            {"level": 3, "name": "BI Analyst", "profileKey": "bi_analyst"},
            {"level": 4, "name": "Senior BI Analyst", "profileKey": "senior_bi_analyst"},
            {"level": 5, "name": "Business Analystics Manager", "profileKey": "business_analystics_manager"},
            {"level": 6, "name": "Business Analystics Director", "profileKey": "business_analystics_director"},
            {"level": 7, "name": "Chief Business Function Officer", "profileKey": "chief_business_function_officer"},
        ],
    },
    "data_stewardship": {
        "name": "Data Stewardship",
        "careers": [
            {"level": 1, "name": "Associate Data Analyst", "profileKey": "associate_data_analyst"},
            {"level": 2, "name": "Data Analyst", "profileKey": "data_analyst"},
            {"level": 3, "name": "BI Analyst", "profileKey": "bi_analyst"},
            {"level": 4, "name": "Data Quality Specialist", "profileKey": "data_quality_specialist"},
            {"level": 5, "name": "Data Governance Manager", "profileKey": "data_governance_manager"},
            {"level": 6, "name": "Data Governance Officer", "profileKey": "data_governance_officer"},
            {"level": 7, "name": "Chief Data Officer", "profileKey": "chief_data_officer"},
        ],
    },
    "data_engineering": {
        "name": "Data Engineering",
        "careers": [
            {"level": 1, "name": "Associate Data Analyst", "profileKey": "associate_data_analyst"},
            {"level": 2, "name": "Associate Data Engineer", "profileKey": "associate_data_engineer"},
            {"level": 3, "name": "Data Engineer", "profileKey": "data_engineer"},
            {"level": 4, "name": "Senior Data Engineer", "profileKey": "senior_data_engineer"},
            {"level": 5, "name": "Data Architech", "profileKey": "data_architech"},
            {"level": 6, "name": "Chief Data Architect", "profileKey": "chief_data_architect"},
            {"level": 7, "name": "Chief Information Officer", "profileKey": "chief_information_officer"},
        ],
    },
    "data_science": {
        "name": "Data Science",
        "careers": [
            {"level": 1, "name": "Associate Data Analyst", "profileKey": "associate_data_analyst"},
            {"level": 2, "name": "Associate Data Engineer", "profileKey": "associate_data_engineer"},
            {"level": 3, "name": "Machine Learning Engineer", "profileKey": "machine_learning_engineer"},
            {"level": 4, "name": "Data Scientist", "profileKey": "data_scientist"},
            {"level": 5, "name": "Senior Data Scientist", "profileKey": "senior_data_scientist"},
            {"level": 6, "name": "Chief Data Scientist", "profileKey": "chief_data_scientist"},
            {"level": 7, "name": "Chief Analytics Officer", "profileKey": "chief_analytics_officer"},
        ],
    },
    "ai_engineering": {
        "name": "AI Engineering",
        "careers": [
            {"level": 1, "name": "Associate Data Analyst", "profileKey": "associate_data_analyst"},
            {"level": 2, "name": "Associate Data Engineer", "profileKey": "associate_data_engineer"},
            {"level": 3, "name": "Machine Learning Engineer", "profileKey": "machine_learning_engineer"},
            {"level": 4, "name": "AI Engineer", "profileKey": "ai_engineer"},
            {"level": 5, "name": "Senior AI Engineer", "profileKey": "senior_ai_engineer"},
            {"level": 6, "name": "Chief AI Engineering", "profileKey": "chief_ai_engineering"},
            {"level": 7, "name": "Chief Technology Officer", "profileKey": "chief_technology_officer"},
        ],
    },
    "applied_research": {
        "name": "Applied Research",
        "careers": [
            {"level": 1, "name": "Associate Data Analyst", "profileKey": "associate_data_analyst"},
            {"level": 2, "name": "Associate Data Engineer", "profileKey": "associate_data_engineer"},
            {"level": 3, "name": "Applied Data/AI Researcher", "profileKey": "applied_dataai_researcher"},
            {"level": 4, "name": "Senior Applied Data/AI Researcher", "profileKey": "senior_applied_dataai_researcher"},
            {"level": 5, "name": "Research Manager", "profileKey": "research_manager"},
            {"level": 6, "name": "Director of Research", "profileKey": "director_of_research"},
            {"level": 7, "name": "Chief Scientific Officer", "profileKey": "chief_scientific_officer"},
        ],
    },
}

BASE_PATH_WEIGHTS = {
    path_key: dict(PATH_WEIGHT_LOOKUP.get(path_key, GLOBAL_WEIGHT_LOOKUP))
    for path_key in CAREER_PATHS
}


def _career_weight_lookup_key(path_key: str, career_name: str) -> str:
    return f"{path_key}::{_slugify_title(career_name).replace('_', '')}"


def _resolve_career_snapshot_weights(path_key: str, career_name: str) -> Dict[str, float] | None:
    for career_title_variant in _career_title_variants(career_name):
        weights = CAREER_WEIGHT_LOOKUP.get(f"{path_key}::{career_title_variant}")
        if weights:
            return dict(weights)
    return None


def _cap_senior_role_weights(weights: Dict[str, float], level: int) -> Dict[str, float]:
    if level < 6:
        return {key: max(0.0, min(1.0, float(value))) for key, value in weights.items()}

    cap = 0.88 if level == 6 else 0.82
    softened: Dict[str, float] = {}
    for key, raw_value in weights.items():
        value = max(0.0, min(1.0, float(raw_value)))
        if value > 0.72:
            # Compress very high weights so senior strategic roles do not look like universal matches.
            value = 0.72 + (value - 0.72) * 0.45
        softened[key] = min(cap, value)
    return softened


def level_adjusted_weights(path_key: str, level: int, career_name: str | None = None) -> Dict[str, float]:
    if career_name:
        matched = _resolve_career_snapshot_weights(path_key, career_name)
        if matched:
            return _cap_senior_role_weights(
                {key: max(0.0, float(matched.get(key, 0.0))) for key in COMPETENCY_ORDER},
                level,
            )

    weights = dict(BASE_PATH_WEIGHTS.get(path_key, GLOBAL_WEIGHT_LOOKUP))
    level_bias = min(1.0, max(0.0, level / 7))
    for key in list(weights.keys()):
        weights[key] = max(0.0, min(1.0, float(weights[key]) * (0.92 + level_bias * 0.12)))
    return _cap_senior_role_weights(
        {key: max(0.0, float(weights.get(key, 0.0))) for key in COMPETENCY_ORDER},
        level,
    )


def _average_weights(weight_sets: List[Dict[str, float]]) -> Dict[str, float]:
    if not weight_sets:
        return {key: 0.0 for key in COMPETENCY_ORDER}
    averaged: Dict[str, float] = {}
    for key in COMPETENCY_ORDER:
        averaged[key] = sum(weights.get(key, 0.0) for weights in weight_sets) / len(weight_sets)
    return averaged


def build_career_ladder_entries() -> List[Dict[str, object]]:
    ladders: List[Dict[str, object]] = []
    for path_key, path in CAREER_PATHS.items():
        for career in path["careers"]:
            ladders.append(
                {
                    "pathKey": path_key,
                    "pathName": path["name"],
                    "careerName": career["name"],
                    "level": career["level"],
                    "profileKey": career["profileKey"],
                    "weights": level_adjusted_weights(path_key, career["level"], str(career["name"])),
                }
            )
    return ladders


def build_career_profiles() -> List[Dict[str, object]]:
    grouped: "OrderedDict[str, Dict[str, object]]" = OrderedDict()
    for ladder in build_career_ladder_entries():
        profile_key = str(ladder["profileKey"])
        entry = grouped.get(profile_key)
        if entry is None:
            entry = {
                "profileKey": profile_key,
                "careerName": ladder["careerName"],
                "weightsList": [],
                "ladderEntries": [],
            }
            grouped[profile_key] = entry
        weights_list = cast(List[Dict[str, float]], entry["weightsList"])
        ladder_entries = cast(List[Dict[str, object]], entry["ladderEntries"])
        weights_list.append(cast(Dict[str, float], ladder["weights"]))
        ladder_entries.append(
            {
                "pathKey": ladder["pathKey"],
                "pathName": ladder["pathName"],
                "careerName": ladder["careerName"],
                "level": ladder["level"],
            }
        )

    profiles: List[Dict[str, object]] = []
    for profile_key, entry in grouped.items():
        ladder_entries = cast(List[Dict[str, object]], entry["ladderEntries"])
        weights_list = cast(List[Dict[str, float]], entry["weightsList"])
        profiles.append(
            {
                "profileKey": profile_key,
                "careerName": entry["careerName"],
                "weights": _average_weights(weights_list),
                "ladderEntries": list(ladder_entries),
                "pathKeys": [item["pathKey"] for item in ladder_entries],
                "levels": [item["level"] for item in ladder_entries],
            }
        )
    return profiles
