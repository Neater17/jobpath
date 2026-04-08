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
      { level: 1, name: "Associate Data Analyst" },
      { level: 2, name: "Data Analyst" },
      { level: 3, name: "BI Analyst" },
      { level: 4, name: "Senior BI Analyst" },
      { level: 5, name: "Business Analystics Manager" },
      { level: 6, name: "Business Analystics Director" },
      { level: 7, name: "Chief Business Function Officer" },
    ],
  },
  data_stewardship: {
    name: "Data Stewardship",
    careers: [
      { level: 1, name: "Associate Data Analyst" },
      { level: 2, name: "Data Analyst" },
      { level: 3, name: "BI Analyst" },
      { level: 4, name: "Data Quality Specialist" },
      { level: 5, name: "Data Governance Manager" },
      { level: 6, name: "Data Governance Officer" },
      { level: 7, name: "Chief Data Officer" },
    ],
  },
  data_engineering: {
    name: "Data Engineering",
    careers: [
      { level: 1, name: "Associate Data Analyst" },
      { level: 2, name: "Associate Data Engineer" },
      { level: 3, name: "Data Engineer" },
      { level: 4, name: "Senior Data Engineer" },
      { level: 5, name: "Data Architech" },
      { level: 6, name: "Chief Data Architect" },
      { level: 7, name: "Chief Information Officer" },
    ],
  },
  data_science: {
    name: "Data Science",
    careers: [
      { level: 1, name: "Associate Data Analyst" },
      { level: 2, name: "Associate Data Engineer" },
      { level: 3, name: "Machine Learniing Engineer" },
      { level: 4, name: "Data Scientist" },
      { level: 5, name: "Senior Data Scientist" },
      { level: 6, name: "Chief Data Scientist" },
      { level: 7, name: "Chief Analytics Officer" },
    ],
  },
  ai_engineering: {
    name: "AI Engineering",
    careers: [
      { level: 1, name: "Associate Data Analyst" },
      { level: 2, name: "Associate Data Engineer" },
      { level: 3, name: "Machine Learniing Engineer" },
      { level: 4, name: "AI Engineer" },
      { level: 5, name: "Senior AI Engineer" },
      { level: 6, name: "Chief AI Engineering" },
      { level: 7, name: "Chief Technology Officer" },
    ],
  },
  applied_research: {
    name: "Applied Research",
    careers: [
      { level: 1, name: "Associate Data Analyst" },
      { level: 2, name: "Associate Data Engineer" },
      { level: 3, name: "Applied Data/ AI Researcher" },
      { level: 4, name: "Senior Applied Data Researcher/ AI Researcher" },
      { level: 5, name: "Research Manager" },
      { level: 6, name: "Director of Research" },
      { level: 7, name: "Chief Scientific Officer" },
    ],
  },
};
