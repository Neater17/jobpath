import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const passwordApiBaseURL =
  import.meta.env.VITE_PASSWORD_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export const passwordApi = axios.create({
  baseURL: passwordApiBaseURL,
  withCredentials: true,
});

export type Career = {
  _id: string;
  careerId: string;
  careerPath: string | string[];
  careerTitle: string;
  careerLevel: string;
  description: string;
  educationalLevel: string;
  criticalWorkFunctionsandKeyTasks: {
    workFunctionId: string;
    workFunctionName: string;
    keyTasks: string[];
  }[];
  performanceExpectations: string;
  functionalSkillsandCompetencies: {
    functionalSkillId: string;
    title: string;
    proficiencyLevel: string;
  }[];
  enablingSkillsandCompetencies: {
    enablingSkillId: string;
    title: string;
    proficiencyLevel: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
};

export type FunctionalSkill = {
  _id: string;
  functionalSkillId: string;
  title: string;
  category: string;
  relatedCategory: string;
  description: string;
  rangeOfApplication: string | null;
  proficiencyLevels: {
    proficiencyLevelId: string;
    level: string;
    description: string | null;
    underpinningKnowledge: string[] | null;
    skillsApplication: string[] | null;
  }[];
};

export type EnablingSkill = {
  _id: string;
  enablingSkillId: string;
  title: string;
  category: string;
  relatedCategory: string;
  description: string;
  rangeOfApplication: string | null;
  proficiencyLevels: {
    proficiencyLevelId: string;
    level: string;
    description: string;
    underpinningKnowledge: string[];
    skillsApplication: string[];
  }[];
};

export type PqfLevel = {
  _id: string;
  pqf_levels: {
    descriptor: string[];
    pqf_level: string | null;
    psf_level: number;
    qualification: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
};

export type ProficiencyLevel = {
  _id: string;
  proficiency_levels: {
    autonomy_and_complexity: string;
    knowledge_and_abilities: string;
    level: number;
    responsibility: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
};

export type PasswordStrengthResult = {
  score: number;
  strength: string;
  isStrong: boolean;
  feedback: string[];
};

export type RegisterUserPayload = {
  firstName?: string;
  lastName?: string;
  gender?: string;
  email: string;
  password: string;
};

export type LoginUserPayload = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  email: string;
  createdAt?: string;
};

export type AuthResponse = {
  message: string;
  user: AuthUser;
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

export async function fetchPqfLevels() {
  const response = await api.get<PqfLevel[]>("/api/pqf-levels");
  return response.data;
}

export async function fetchPqfLevelById(id: string) {
  const response = await api.get<PqfLevel>(`/api/pqf-levels/${id}`);
  return response.data;
}

export async function fetchProficiencyLevels() {
  const response = await api.get<ProficiencyLevel[]>("/api/proficiency-levels");
  return response.data;
}

export async function fetchProficiencyLevelById(id: string) {
  const response = await api.get<ProficiencyLevel>(`/api/proficiency-levels/${id}`);
  return response.data;
}

export async function checkPasswordStrength(password: string) {
  const response = await passwordApi.post<PasswordStrengthResult>(
    "/password-strength",
    { password }
  );
  return response.data;
}

export async function registerUser(payload: RegisterUserPayload) {
  const response = await api.post<AuthResponse>("/api/users/register", payload);
  return response.data;
}

export async function loginUser(payload: LoginUserPayload) {
  const response = await api.post<AuthResponse>("/api/users/login", payload);
  return response.data;
}

export async function fetchCurrentUser() {
  const response = await api.get<AuthResponse>("/api/users/me");
  return response.data;
}

export async function logoutUser() {
  const response = await api.post<{ message: string }>("/api/users/logout");
  return response.data;
}
