export type CareerPathKey =
  | "business_intelligence"
  | "data_stewardship"
  | "data_engineering"
  | "data_science"
  | "ai_engineering"
  | "applied_research";

export type CareerRole = { level: number; name: string };

export type CareerPath = {
  key: CareerPathKey;
  name: string;
  careers: CareerRole[];
};

export const careerPaths: Record<CareerPathKey, CareerPath> = {
  business_intelligence: {
    key: "business_intelligence",
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
    key: "data_stewardship",
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
    key: "data_engineering",
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
    key: "data_science",
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
    key: "ai_engineering",
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
    key: "applied_research",
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

export const skillMap = {
  headers: [
    "Business Intelligence",
    "Data Stewardship",
    "Data Engineering",
    "Data Science",
    "AI Engineering",
    "Applied Research",
  ],
  roleRow: ["BI Analyst", "Data Steward", "Data Engineer", "Data Scientist", "ML Engineer", "Research Scientist"],
  skills: [
    { name: "Data Analysis", values: ["Level 4", "Level 3", "Level 3", "Level 5", "Level 4", "Level 5"] },
    { name: "Programming (Python/R)", values: ["Level 2", "Level 2", "Level 5", "Level 5", "Level 5", "Level 5"] },
    { name: "SQL Querying", values: ["Level 4", "Level 4", "Level 5", "Level 4", "Level 3", "Level 3"] },
    { name: "Machine Learning", values: ["N/A", "N/A", "Level 2", "Level 5", "Level 5", "Level 5"] },
    { name: "Data Visualization", values: ["Level 5", "Level 3", "Level 3", "Level 4", "Level 3", "Level 3"] },
    { name: "Data Governance", values: ["Level 2", "Level 5", "Level 3", "Level 2", "Level 2", "Level 2"] },
  ],
};





// Career Map Page Data NEW
export const tracks = [
  "Business Intelligence & Strategy",
  "Data Stewardship",
  "Data Engineering",
  "Data Science",
  "AI Engineering",
  "Applied Data/AI Research"
];

export const levels = [
  "C-Level",
  "Senior Director",
  "Director",
  "Senior Manager",
  "Manager",
  "Senior Professional/ Supervisor",
  "Professional",
  "Senior Associate",
  "Associate"
];

export type Role = {
  Id: string;
  title: string;
  trackStart: number;
  trackSpan: number;
  level: number;
  levelSpan?: number;
};

export const roles: Role[] = [
  // ===== Business Intelligence & Strategy =====
  { Id: "CBFO", title: "Chief [Business Function] Officer", trackStart: 1, trackSpan: 1, level: 1 },
  { Id: "BAD", title: "Business Analytics Director ", trackStart: 1, trackSpan: 1, level: 2, levelSpan: 2 },
  { Id: "BAM", title: "Business Analytics Manager", trackStart: 1, trackSpan: 1, level: 4, levelSpan: 2 },
  { Id: "SBIA", title: "Senior Business Intelligence Analyst", trackStart: 1, trackSpan: 1, level: 6 },
  { Id: "BIA", title: "Business Intelligence Analyst", trackStart: 1, trackSpan: 2, level: 7 },

  // ===== Data Stewardship =====
  { Id: "CDO", title: "Chief Data Officer", trackStart: 2, trackSpan: 1, level: 1 },
  { Id: "DGO", title: "Data Governance Officer", trackStart: 2, trackSpan: 1, level: 2, levelSpan: 2 },
  { Id: "DGM", title: "Data Governance Manager", trackStart: 2, trackSpan: 1, level: 4, levelSpan: 2 },
  { Id: "DQS", title: "Data Quality Specialist", trackStart: 2, trackSpan: 1, level: 6 },

  // ===== Data Engineering =====
  { Id: "CIO", title: "Chief Information Officer", trackStart: 3, trackSpan: 1, level: 1 },
  { Id: "CDA", title: "Chief Data Architect", trackStart: 3, trackSpan: 1, level: 2, levelSpan: 2 },
  { Id: "DAR", title: "Data Architect", trackStart: 3, trackSpan: 1, level: 4, levelSpan: 2 },
  { Id: "SDE", title: "Senior Data Engineer", trackStart: 3, trackSpan: 1, level: 6 },
  { Id: "DE", title: "Data Engineer", trackStart: 3, trackSpan: 1, level: 7 },

  // ===== Data Science =====
  { Id: "CAO", title: "Chief Analytics Officer", trackStart: 4, trackSpan: 1, level: 1 },
  { Id: "CDS", title: "Chief Data Scientist", trackStart: 4, trackSpan: 1, level: 2, levelSpan: 2 },
  { Id: "SDS", title: "Senior Data Scientist", trackStart: 4, trackSpan: 1, level: 4, levelSpan: 2 },
  { Id: "DS", title: "Data Scientist", trackStart: 4, trackSpan: 1, level: 6 },

  // ===== AI Engineering =====
  { Id: "CTO", title: "Chief Technology Officer", trackStart: 5, trackSpan: 1, level: 1 },
  { Id: "CAE", title: "Chief AI Engineer", trackStart: 5, trackSpan: 1, level: 2, levelSpan: 2 },
  { Id: "SAE", title: "Senior AI Engineering", trackStart: 5, trackSpan: 1, level: 4, levelSpan: 2 },
  { Id: "AIE", title: "AI Engineer", trackStart: 5, trackSpan: 1, level: 6 },
  
  // ===== Applied Data / AI Research =====
  { Id: "CSO", title: "Chief Scientific Officer", trackStart: 6, trackSpan: 1, level: 1 },
  { Id: "DOR", title: "Director of Research", trackStart: 6, trackSpan: 1, level: 2, levelSpan: 2 },
  { Id: "RM", title: "Research Manager", trackStart: 6, trackSpan: 1, level: 4, levelSpan: 2 },
  { Id: "SADR", title: "Senior Applied Data Researcher/ AI Researcher", trackStart: 6, trackSpan: 1, level: 6 },
  { Id: "ADR", title: "Applied Data/AI Researcher", trackStart: 6, trackSpan: 1, level: 7 },

  // ===== Cross-Track Roles =====
  { Id: "DA", title: "Data Analyst ", trackStart: 1, trackSpan: 2, level: 8 },
  { Id: "MLE", title: "Machine Learning Engineer", trackStart: 4, trackSpan: 2, level: 7 },

  { Id: "ASDE", title: "Associate Data Engineer", trackStart: 3, trackSpan: 4, level: 8 },
  { Id: "ASDA", title: "Associate Data Analyst", trackStart: 1, trackSpan: 6, level: 9 },
];
