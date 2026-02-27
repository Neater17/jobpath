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
