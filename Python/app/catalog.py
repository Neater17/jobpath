from __future__ import annotations

from collections import OrderedDict
from typing import Dict, List, cast

COMPETENCY_ORDER: List[str] = [
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

COMPETENCY_LABELS: Dict[str, str] = {
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

GAP_RECOMMENDATIONS: Dict[str, str] = {
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
    "business_intelligence": {
        "business_strategy": 1.0,
        "sql_data_access": 0.9,
        "data_visualization": 1.0,
        "data_quality_governance": 0.7,
        "data_engineering": 0.4,
        "statistics_experimentation": 0.6,
        "machine_learning": 0.35,
        "mlops_deployment": 0.2,
        "research_innovation": 0.2,
        "communication_storytelling": 1.0,
        "responsible_ai": 0.45,
        "collaboration_delivery": 0.85,
        "leadership_execution": 0.65,
        "role_mastery": 0.8,
    },
    "data_stewardship": {
        "business_strategy": 0.7,
        "sql_data_access": 0.7,
        "data_visualization": 0.45,
        "data_quality_governance": 1.0,
        "data_engineering": 0.55,
        "statistics_experimentation": 0.45,
        "machine_learning": 0.25,
        "mlops_deployment": 0.2,
        "research_innovation": 0.25,
        "communication_storytelling": 0.8,
        "responsible_ai": 0.85,
        "collaboration_delivery": 0.9,
        "leadership_execution": 0.7,
        "role_mastery": 0.85,
    },
    "data_engineering": {
        "business_strategy": 0.5,
        "sql_data_access": 0.85,
        "data_visualization": 0.35,
        "data_quality_governance": 0.75,
        "data_engineering": 1.0,
        "statistics_experimentation": 0.4,
        "machine_learning": 0.55,
        "mlops_deployment": 0.8,
        "research_innovation": 0.3,
        "communication_storytelling": 0.65,
        "responsible_ai": 0.55,
        "collaboration_delivery": 0.8,
        "leadership_execution": 0.65,
        "role_mastery": 0.9,
    },
    "data_science": {
        "business_strategy": 0.65,
        "sql_data_access": 0.75,
        "data_visualization": 0.65,
        "data_quality_governance": 0.6,
        "data_engineering": 0.55,
        "statistics_experimentation": 1.0,
        "machine_learning": 1.0,
        "mlops_deployment": 0.55,
        "research_innovation": 0.7,
        "communication_storytelling": 0.75,
        "responsible_ai": 0.7,
        "collaboration_delivery": 0.75,
        "leadership_execution": 0.6,
        "role_mastery": 0.85,
    },
    "ai_engineering": {
        "business_strategy": 0.55,
        "sql_data_access": 0.6,
        "data_visualization": 0.35,
        "data_quality_governance": 0.6,
        "data_engineering": 0.9,
        "statistics_experimentation": 0.55,
        "machine_learning": 1.0,
        "mlops_deployment": 1.0,
        "research_innovation": 0.6,
        "communication_storytelling": 0.6,
        "responsible_ai": 0.9,
        "collaboration_delivery": 0.8,
        "leadership_execution": 0.65,
        "role_mastery": 0.9,
    },
    "applied_research": {
        "business_strategy": 0.45,
        "sql_data_access": 0.55,
        "data_visualization": 0.45,
        "data_quality_governance": 0.55,
        "data_engineering": 0.45,
        "statistics_experimentation": 0.95,
        "machine_learning": 0.8,
        "mlops_deployment": 0.35,
        "research_innovation": 1.0,
        "communication_storytelling": 0.75,
        "responsible_ai": 0.8,
        "collaboration_delivery": 0.7,
        "leadership_execution": 0.6,
        "role_mastery": 0.8,
    },
}


def level_adjusted_weights(path_key: str, level: int) -> Dict[str, float]:
    weights = dict(BASE_PATH_WEIGHTS[path_key])

    # Early-career roles should read as more hands-on and execution-oriented.
    if level == 1:
        weights["role_mastery"] *= 1.18
        weights["business_strategy"] *= 0.78
        weights["leadership_execution"] *= 0.62
        weights["communication_storytelling"] *= 0.9
        weights["responsible_ai"] *= 0.9
    elif level == 2:
        weights["role_mastery"] *= 1.12
        weights["business_strategy"] *= 0.88
        weights["leadership_execution"] *= 0.76
        weights["collaboration_delivery"] *= 0.96
    elif level == 3:
        weights["role_mastery"] *= 1.08
        weights["collaboration_delivery"] *= 1.12
        weights["communication_storytelling"] *= 1.08
        weights["leadership_execution"] *= 0.95
    elif level == 4:
        weights["role_mastery"] *= 1.1
        weights["business_strategy"] *= 1.14
        weights["collaboration_delivery"] *= 1.16
        weights["communication_storytelling"] *= 1.14
        weights["leadership_execution"] *= 1.18
    elif level == 5:
        weights["role_mastery"] *= 1.05
        weights["business_strategy"] *= 1.32
        weights["collaboration_delivery"] *= 1.2
        weights["communication_storytelling"] *= 1.24
        weights["leadership_execution"] *= 1.42
        weights["responsible_ai"] *= 1.18
    elif level == 6:
        weights["role_mastery"] *= 0.98
        weights["business_strategy"] *= 1.48
        weights["collaboration_delivery"] *= 1.26
        weights["communication_storytelling"] *= 1.34
        weights["leadership_execution"] *= 1.62
        weights["responsible_ai"] *= 1.26
    elif level >= 7:
        weights["role_mastery"] *= 0.9
        weights["business_strategy"] *= 1.68
        weights["collaboration_delivery"] *= 1.32
        weights["communication_storytelling"] *= 1.46
        weights["leadership_execution"] *= 1.86
        weights["responsible_ai"] *= 1.38

    # Senior roles should become more strategic and less purely hands-on.
    if level >= 5:
        weights["sql_data_access"] *= 0.94
        weights["data_visualization"] *= 0.92
    if level >= 6:
        weights["statistics_experimentation"] *= 0.95
        weights["role_mastery"] *= 0.96

    # Path-specific executive shape so adjacent high-level roles are more separable.
    if path_key == "business_intelligence":
        if level >= 5:
            weights["business_strategy"] *= 1.14
            weights["communication_storytelling"] *= 1.12
            weights["data_visualization"] *= 1.04
            weights["data_engineering"] *= 0.9
            weights["mlops_deployment"] *= 0.88
    elif path_key == "data_stewardship":
        if level >= 4:
            weights["data_quality_governance"] *= 1.08
            weights["responsible_ai"] *= 1.08
        if level >= 6:
            weights["business_strategy"] *= 1.08
            weights["communication_storytelling"] *= 1.06
            weights["sql_data_access"] *= 0.92
            weights["machine_learning"] *= 0.88
    elif path_key == "data_engineering":
        if level >= 4:
            weights["data_engineering"] *= 1.06
            weights["mlops_deployment"] *= 1.06
        if level >= 5:
            weights["business_strategy"] *= 1.06
            weights["sql_data_access"] *= 1.02
        if level >= 6:
            weights["data_engineering"] *= 1.08
            weights["mlops_deployment"] *= 1.08
            weights["communication_storytelling"] *= 1.05
    elif path_key == "data_science":
        if level >= 4:
            weights["statistics_experimentation"] *= 1.05
            weights["research_innovation"] *= 1.04
        if level >= 6:
            weights["business_strategy"] *= 1.08
            weights["research_innovation"] *= 1.1
            weights["machine_learning"] *= 0.96
            weights["mlops_deployment"] *= 0.9
    elif path_key == "ai_engineering":
        if level >= 4:
            weights["data_engineering"] *= 1.04
            weights["mlops_deployment"] *= 1.08
        if level >= 6:
            weights["business_strategy"] *= 1.08
            weights["responsible_ai"] *= 1.08
            weights["communication_storytelling"] *= 1.06
            weights["research_innovation"] *= 0.94
    elif path_key == "applied_research":
        if level >= 4:
            weights["research_innovation"] *= 1.08
            weights["statistics_experimentation"] *= 1.04
        if level >= 5:
            weights["business_strategy"] *= 1.06
            weights["communication_storytelling"] *= 1.05

    for key in weights:
        weights[key] = max(0.0, weights[key])
    return weights


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
                    "weights": level_adjusted_weights(path_key, career["level"]),
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
