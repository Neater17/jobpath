import fs from "node:fs";
import path from "node:path";
import type { CareerPathKey, CompetencyKey } from "./types.js";

type SkillSnapshot = {
  title?: string | null;
};

function competencyKeyFromTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

function readJsonFile<T>(filename: string): T[] {
  const fullPath = path.resolve(process.cwd(), "data", filename);
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T[];
  } catch {
    return [];
  }
}

function buildDynamicCompetencies() {
  const functionalSkills = readJsonFile<SkillSnapshot>("PSF-AAI-Functional-Skills.json");
  const enablingSkills = readJsonFile<SkillSnapshot>("PSF-AAI-Enabling-Skills.json");

  const competencyOrder: CompetencyKey[] = [];
  const competencyLabels: Record<CompetencyKey, string> = {};
  const gapRecommendations: Record<CompetencyKey, string> = {};

  for (const skill of [...functionalSkills, ...enablingSkills]) {
    const title = typeof skill.title === "string" ? skill.title.trim() : "";
    if (!title) {
      continue;
    }
    const key = competencyKeyFromTitle(title);
    if (competencyLabels[key]) {
      continue;
    }
    competencyOrder.push(key);
    competencyLabels[key] = title;
    gapRecommendations[key] = `Build stronger evidence and applied practice in ${title.toLowerCase()}.`;
  }

  return {
    competencyOrder,
    competencyLabels,
    gapRecommendations,
  };
}

const dynamicCompetencies = buildDynamicCompetencies();

export const competencyOrder: CompetencyKey[] = dynamicCompetencies.competencyOrder;

export const competencyLabels: Record<CompetencyKey, string> = dynamicCompetencies.competencyLabels;

export const gapRecommendations: Record<CompetencyKey, string> = dynamicCompetencies.gapRecommendations;

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
      { level: 3, name: "Machine Learning Engineer" },
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
      { level: 3, name: "Machine Learning Engineer" },
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
