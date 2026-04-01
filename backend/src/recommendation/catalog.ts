import type { CareerPathKey, CompetencyKey } from "./types.js";

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

export const careerPaths: Record<
  CareerPathKey,
  { name: string; careers: { level: number; name: string }[] }
> = {
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
