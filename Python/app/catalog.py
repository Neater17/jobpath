from __future__ import annotations

from typing import Dict, List

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
            { "level": 1, "name": "Associate Data Analyst" },
            { "level": 2, "name": "Data Analyst" },
            { "level": 3, "name": "BI Analyst" },
            { "level": 4, "name": "Senior BI Analyst" },
            { "level": 5, "name": "Business Analystics Manager" },
            { "level": 6, "name": "Business Analystics Director" },
            { "level": 7, "name": "Chief Business Function Officer" },
        ],
    },
    "data_stewardship": {
        "name": "Data Stewardship",
        "careers": [
            {"level": 1, "name": "Associate Data Analyst"},
            {"level": 2, "name": "Data Analyst"},
            {"level": 3, "name": "BI Analyst"},
            {"level": 4, "name": "Data Quality Specialist"},
            {"level": 5, "name": "Data Governance Manager"},
            {"level": 6, "name": "Data Governance Officer"},
            {"level": 7, "name": "Chief Data Officer"},
        ],
    },
    "data_engineering": {
        "name": "Data Engineering",
        "careers": [
            {"level": 1, "name": "Associate Data Analyst"},
            {"level": 2, "name": "Associate Data Engineer"},
            {"level": 3, "name": "Data Engineer"},
            {"level": 4, "name": "Senior Data Engineer"},
            {"level": 5, "name": "Data Architech"},
            {"level": 6, "name": "Chief Data Architect"},
            {"level": 7, "name": "Chief Information Officer"},
        ],
    },
    "data_science": {
        "name": "Data Science",
        "careers": [
            {"level": 1, "name": "Associate Data Analyst"},
            {"level": 2, "name": "Associate Data Engineer"},
            {"level": 3, "name": "Machine Learniing Engineer"},
            {"level": 4, "name": "Data Scientist"},
            {"level": 5, "name": "Senior Data Scientist"},
            {"level": 6, "name": "Chief Data Scientist"},
            {"level": 7, "name": "Chief Analytics Officer"},
        ],
    },
    "ai_engineering": {
        "name": "AI Engineering",
        "careers": [
            {"level": 1, "name": "Associate Data Analyst"},
            {"level": 2, "name": "Associate Data Engineer"},
            {"level": 3, "name": "Machine Learniing Engineer"},
            {"level": 4, "name": "AI Engineer"},
            {"level": 5, "name": "Senior AI Engineer"},
            {"level": 6, "name": "Chief AI Engineering"},
            {"level": 7, "name": "Chief Technology Officer"},
        ],
    },
    "applied_research": {
        "name": "Applied Research",
        "careers": [
            {"level": 1, "name": "Research Assistant"},
            {"level": 2, "name": "Research Analyst"},
            {"level": 3, "name": "Research Scientist"},
            {"level": 4, "name": "Senior Research Scientist"},
            {"level": 5, "name": "Principal Research Scientist"},
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


def build_career_profiles() -> List[Dict[str, object]]:
    profiles: List[Dict[str, object]] = []
    for path_key, path in CAREER_PATHS.items():
        for career in path["careers"]:
            profiles.append(
                {
                    "pathKey": path_key,
                    "pathName": path["name"],
                    "careerName": career["name"],
                    "level": career["level"],
                    "weights": level_adjusted_weights(path_key, career["level"]),
                }
            )
    return profiles
