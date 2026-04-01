// Career Map Page Data NEW
export const tracks = [
  "Business Intelligence & Strategy",
  "Data Stewardship",
  "Data Engineering",
  "Data Science",
  "AI Engineering",
  "Applied Data/AI Research"
];

// define career levels
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

// Define career level order from Associate to C-Level
export const levelOrder: Record<string, number> = {
  'Associate': 1,
  'Senior Associate': 2,
  'Professional': 3,
  'Senior Professional/ Supervisor': 4,
  'Manager': 5,
  'Senior Manager': 6,
  'Director': 7,
  'Senior Director': 8,
  'C-Level': 9,
};

export const educationLevels = [
  "Doctoral/ Post Doctoral",
  "Post Baccalaureate",
  "Baccalaureate",
  "ACT Degree/ NC III, IV, Diploma",
  "NC II, III/ Sr. High School"
];

export const educationLevelOrder: Record<string, number> = {
  'NC II, III/ Sr. High School': 1,
  'ACT Degree/ NC III, IV, Diploma': 2,
  'Baccalaureate': 3,
  'Post Baccalaureate': 4,
  'Doctoral/ Post Doctoral': 5,
};

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
  { Id: "CBO", title: "Chief [Business Function] Officer", trackStart: 1, trackSpan: 1, level: 1 },
  { Id: "BAD", title: "Business Analytics Director ", trackStart: 1, trackSpan: 1, level: 2, levelSpan: 2 },
  { Id: "BAM", title: "Business Analytics Manager", trackStart: 1, trackSpan: 1, level: 4, levelSpan: 2 },
  { Id: "SBI", title: "Senior Business Intelligence Analyst", trackStart: 1, trackSpan: 1, level: 6 },
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
  { Id: "DEG", title: "Data Engineer", trackStart: 3, trackSpan: 1, level: 7 },

  // ===== Data Science =====
  { Id: "CAO", title: "Chief Analytics Officer", trackStart: 4, trackSpan: 1, level: 1 },
  { Id: "CDS", title: "Chief Data Scientist", trackStart: 4, trackSpan: 1, level: 2, levelSpan: 2 },
  { Id: "SDS", title: "Senior Data Scientist", trackStart: 4, trackSpan: 1, level: 4, levelSpan: 2 },
  { Id: "DSC", title: "Data Scientist", trackStart: 4, trackSpan: 1, level: 6 },

  // ===== AI Engineering =====
  { Id: "CTO", title: "Chief Technology Officer", trackStart: 5, trackSpan: 1, level: 1 },
  { Id: "CAI", title: "Chief AI Engineer", trackStart: 5, trackSpan: 1, level: 2, levelSpan: 2 },
  { Id: "SAI", title: "Senior AI Engineering", trackStart: 5, trackSpan: 1, level: 4, levelSpan: 2 },
  { Id: "AIE", title: "AI Engineer", trackStart: 5, trackSpan: 1, level: 6 },
  
  // ===== Applied Data / AI Research =====
  { Id: "CSO", title: "Chief Scientific Officer", trackStart: 6, trackSpan: 1, level: 1 },
  { Id: "DOR", title: "Director of Research", trackStart: 6, trackSpan: 1, level: 2, levelSpan: 2 },
  { Id: "RMG", title: "Research Manager", trackStart: 6, trackSpan: 1, level: 4, levelSpan: 2 },
  { Id: "SRS", title: "Senior Applied Data Researcher/ AI Researcher", trackStart: 6, trackSpan: 1, level: 6 },
  { Id: "RSC", title: "Applied Data/AI Researcher", trackStart: 6, trackSpan: 1, level: 7 },

  // ===== Cross-Track Roles =====
  { Id: "DAN", title: "Data Analyst ", trackStart: 1, trackSpan: 2, level: 8 },
  { Id: "MLE", title: "Machine Learning Engineer", trackStart: 4, trackSpan: 2, level: 7 },

  { Id: "ADE", title: "Associate Data Engineer", trackStart: 3, trackSpan: 4, level: 8 },
  { Id: "ADA", title: "Associate Data Analyst", trackStart: 1, trackSpan: 6, level: 9 },
];

export type CareerPathKey =
  | "business_intelligence"
  | "data_stewardship"
  | "data_engineering"
  | "data_science"
  | "ai_engineering"
  | "applied_research";

export type RecommendationCareerRole = {
  level: number;
  name: string;
};

export type CareerPath = {
  key: CareerPathKey;
  name: string;
  careers: RecommendationCareerRole[];
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

export const trackToCareerPathKey: Record<string, CareerPathKey> = {
  "Business Intelligence & Strategy": "business_intelligence",
  "Data Stewardship": "data_stewardship",
  "Data Engineering": "data_engineering",
  "Data Science": "data_science",
  "AI Engineering": "ai_engineering",
  "Applied Data/AI Research": "applied_research",
};

export function getCareerPathKeyFromTrack(track: string | null | undefined) {
  if (!track) {
    return null;
  }
  return trackToCareerPathKey[track] ?? null;
}

export function mapCareerLevelToRecommendationLevel(level: string | null | undefined) {
  switch (level) {
    case "Associate":
    case "Senior Associate":
      return 1;
    case "Professional":
      return 2;
    case "Senior Professional/ Supervisor":
      return 3;
    case "Manager":
    case "Senior Manager":
      return 4;
    case "Director":
    case "Senior Director":
    case "C-Level":
      return 5;
    default:
      return 2;
  }
}

export function getRecommendationCareerForPathLevel(
  pathKey: CareerPathKey | null,
  level: string | null | undefined
) {
  if (!pathKey) {
    return null;
  }
  const normalizedLevel = mapCareerLevelToRecommendationLevel(level);
  return (
    careerPaths[pathKey].careers.find((career) => career.level === normalizedLevel)?.name ?? null
  );
}
