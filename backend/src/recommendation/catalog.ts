import type { CareerPathKey, CareerProfile, CompetencyKey } from "./types.js";

export const competencyOrder: CompetencyKey[] = [
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
];

export const competencyLabels: Record<CompetencyKey, string> = {
  business_strategy: "Business Strategy",
  sql_data_access: "SQL and Data Access",
  data_visualization: "Data Visualization",
  data_quality_governance: "Data Quality and Governance",
  data_engineering: "Data Engineering",
  statistics_experimentation: "Statistics and Experimentation",
  machine_learning: "Machine Learning",
  mlops_deployment: "MLOps and Deployment",
  research_innovation: "Research and Innovation",
  communication_storytelling: "Communication and Storytelling",
  responsible_ai: "Responsible AI",
  collaboration_delivery: "Collaboration and Delivery",
  leadership_execution: "Leadership and Execution",
  role_mastery: "Role Mastery",
};

export const gapRecommendations: Record<CompetencyKey, string> = {
  business_strategy: "Practice framing analytics outputs into clear business decisions.",
  sql_data_access: "Strengthen SQL querying and data extraction workflows.",
  data_visualization: "Build dashboard storytelling and data communication skills.",
  data_quality_governance: "Apply data quality controls and governance standards consistently.",
  data_engineering: "Improve pipeline design, orchestration, and reliability practices.",
  statistics_experimentation: "Deepen statistical reasoning and experiment design.",
  machine_learning: "Advance model development, evaluation, and validation capability.",
  mlops_deployment: "Focus on model deployment, monitoring, and lifecycle operations.",
  research_innovation: "Improve literature review and evidence-based experimentation methods.",
  communication_storytelling: "Translate technical insights into audience-specific narratives.",
  responsible_ai: "Apply fairness, safety, and governance checks in data/AI workflows.",
  collaboration_delivery: "Improve cross-team coordination and delivery management.",
  leadership_execution: "Lead priorities, resource decisions, and strategic execution.",
  role_mastery: "Build practical depth in core responsibilities of the target role.",
};

const careerPaths: Record<CareerPathKey, { name: string; careers: { level: number; name: string }[] }> = {
  business_intelligence: {
    name: "Business Intelligence & Strategy",
    careers: [
      { level: 1, name: "Junior BI Analyst" },
      { level: 2, name: "BI Analyst" },
      { level: 3, name: "Senior BI Analyst" },
      { level: 4, name: "BI Manager" },
      { level: 5, name: "BI Director" },
    ],
  },
  data_stewardship: {
    name: "Data Stewardship",
    careers: [
      { level: 1, name: "Data Coordinator" },
      { level: 2, name: "Data Steward" },
      { level: 3, name: "Senior Data Steward" },
      { level: 4, name: "Data Governance Lead" },
      { level: 5, name: "Chief Data Officer" },
    ],
  },
  data_engineering: {
    name: "Data Engineering",
    careers: [
      { level: 1, name: "Junior Data Engineer" },
      { level: 2, name: "Data Engineer" },
      { level: 3, name: "Senior Data Engineer" },
      { level: 4, name: "Lead Data Engineer" },
      { level: 5, name: "Data Engineering Manager" },
    ],
  },
  data_science: {
    name: "Data Science",
    careers: [
      { level: 1, name: "Junior Data Analyst" },
      { level: 2, name: "Data Scientist" },
      { level: 3, name: "Senior Data Scientist" },
      { level: 4, name: "Lead Data Scientist" },
      { level: 5, name: "Data Science Manager" },
    ],
  },
  ai_engineering: {
    name: "AI Engineering",
    careers: [
      { level: 1, name: "AI/ML Intern" },
      { level: 2, name: "ML Engineer" },
      { level: 3, name: "Senior ML Engineer" },
      { level: 4, name: "AI/ML Lead" },
      { level: 5, name: "AI/ML Manager" },
    ],
  },
  applied_research: {
    name: "Applied Research",
    careers: [
      { level: 1, name: "Research Assistant" },
      { level: 2, name: "Research Analyst" },
      { level: 3, name: "Research Scientist" },
      { level: 4, name: "Senior Research Scientist" },
      { level: 5, name: "Principal Research Scientist" },
    ],
  },
};

const basePathWeights: Record<CareerPathKey, Record<CompetencyKey, number>> = {
  business_intelligence: {
    business_strategy: 1.0,
    sql_data_access: 0.9,
    data_visualization: 1.0,
    data_quality_governance: 0.7,
    data_engineering: 0.4,
    statistics_experimentation: 0.6,
    machine_learning: 0.35,
    mlops_deployment: 0.2,
    research_innovation: 0.2,
    communication_storytelling: 1.0,
    responsible_ai: 0.45,
    collaboration_delivery: 0.85,
    leadership_execution: 0.65,
    role_mastery: 0.8,
  },
  data_stewardship: {
    business_strategy: 0.7,
    sql_data_access: 0.7,
    data_visualization: 0.45,
    data_quality_governance: 1.0,
    data_engineering: 0.55,
    statistics_experimentation: 0.45,
    machine_learning: 0.25,
    mlops_deployment: 0.2,
    research_innovation: 0.25,
    communication_storytelling: 0.8,
    responsible_ai: 0.85,
    collaboration_delivery: 0.9,
    leadership_execution: 0.7,
    role_mastery: 0.85,
  },
  data_engineering: {
    business_strategy: 0.5,
    sql_data_access: 0.85,
    data_visualization: 0.35,
    data_quality_governance: 0.75,
    data_engineering: 1.0,
    statistics_experimentation: 0.4,
    machine_learning: 0.55,
    mlops_deployment: 0.8,
    research_innovation: 0.3,
    communication_storytelling: 0.65,
    responsible_ai: 0.55,
    collaboration_delivery: 0.8,
    leadership_execution: 0.65,
    role_mastery: 0.9,
  },
  data_science: {
    business_strategy: 0.65,
    sql_data_access: 0.75,
    data_visualization: 0.65,
    data_quality_governance: 0.6,
    data_engineering: 0.55,
    statistics_experimentation: 1.0,
    machine_learning: 1.0,
    mlops_deployment: 0.55,
    research_innovation: 0.7,
    communication_storytelling: 0.75,
    responsible_ai: 0.7,
    collaboration_delivery: 0.75,
    leadership_execution: 0.6,
    role_mastery: 0.85,
  },
  ai_engineering: {
    business_strategy: 0.55,
    sql_data_access: 0.6,
    data_visualization: 0.35,
    data_quality_governance: 0.6,
    data_engineering: 0.9,
    statistics_experimentation: 0.55,
    machine_learning: 1.0,
    mlops_deployment: 1.0,
    research_innovation: 0.6,
    communication_storytelling: 0.6,
    responsible_ai: 0.9,
    collaboration_delivery: 0.8,
    leadership_execution: 0.65,
    role_mastery: 0.9,
  },
  applied_research: {
    business_strategy: 0.45,
    sql_data_access: 0.55,
    data_visualization: 0.45,
    data_quality_governance: 0.55,
    data_engineering: 0.45,
    statistics_experimentation: 0.95,
    machine_learning: 0.8,
    mlops_deployment: 0.35,
    research_innovation: 1.0,
    communication_storytelling: 0.75,
    responsible_ai: 0.8,
    collaboration_delivery: 0.7,
    leadership_execution: 0.6,
    role_mastery: 0.8,
  },
};

function levelAdjustedWeights(pathKey: CareerPathKey, level: number) {
  const weights = { ...basePathWeights[pathKey] };
  const levelMultiplier = 1 + (level - 1) * 0.03;
  weights.role_mastery *= 1.05 * levelMultiplier;

  if (level >= 3) {
    weights.leadership_execution *= 1.15;
    weights.collaboration_delivery *= 1.08;
  }
  if (level >= 4) {
    weights.business_strategy *= 1.15;
  }
  if (level === 5) {
    weights.responsible_ai *= 1.12;
  }

  return weights;
}

export function buildCareerProfiles(): CareerProfile[] {
  return (Object.keys(careerPaths) as CareerPathKey[]).flatMap((pathKey) => {
    const path = careerPaths[pathKey];
    return path.careers.map((career) => ({
      pathKey,
      pathName: path.name,
      careerName: career.name,
      level: career.level,
      weights: levelAdjustedWeights(pathKey, career.level),
    }));
  });
}
