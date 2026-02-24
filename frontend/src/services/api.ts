import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL,
});

export type Career = {
  _id: string;
  careerId: string;
  careerPath: string | string[];
  careerTitle: string;
  careerLevel: string;
  description: string;
  criticalWorkFunctionsandKeyTasks: {
    workFunctionId: string;
    workFunctionName: string;
    keyTasks: string[];
  }[];
  performanceExpectations: string;
  functionalSkillsandCompetencies: {
    functionalSkillId: string;
    skillName: string;
    proficiencyLevel: string;
  }[];
  enablingSkillsandCompetencies: {
    enablingSkillId: string;
    skillName: string;
    proficiencyLevel: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
};

export type FunctionalSkill = {
  _id: string;
  functionalSkillId: string;
  skillName: string;
  category: string;
  relatedCategory: string;
  description: string;
  rangeOfApplication: string | null;
  proficiencyLevels: {
    proficiencyLevelId: string;
    level: string;
    description: string | null;
    knowledge: string[] | null;
    abilities: string[] | null;
  }[];
};

export type EnablingSkill = {
  _id: string;
  enablingSkillId: string;
  skillName: string;
  category: string;
  relatedCategory: string;
  description: string;
  rangeOfApplication: string | null;
  proficiencyLevels: {
    proficiencyLevelId: string;
    level: string;
    description: string;
    knowledge: string[];
    abilities: string[];
  }[];
};

export async function fetchCareers() {
  const response = await api.get<Career[]>("/api/careers");
  return response.data;
}

export async function fetchCareerById(id: string) {
  const response = await api.get<Career>(`/api/careers/${id}`);
  return response.data;
}

export async function fetchFunctionalSkills() {
  const response = await api.get<FunctionalSkill[]>("/api/functional-skills");
  return response.data;
}

export async function fetchEnablingSkills() {
  const response = await api.get<EnablingSkill[]>("/api/enabling-skills");
  return response.data;
}

export async function fetchFunctionalSkillById(id: string) {
  const response = await api.get<FunctionalSkill>(`/api/functional-skills/${id}`);
  return response.data;
}

export async function fetchEnablingSkillById(id: string) {
  const response = await api.get<EnablingSkill>(`/api/enabling-skills/${id}`);
  return response.data;
}
