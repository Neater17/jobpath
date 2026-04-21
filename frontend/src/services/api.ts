import axios from "axios";
import type { CompetencyKey } from "../data/assessmentData";
import type { CareerPathKey } from "../data/careerData";

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

export type CareerSummary = Pick<
  Career,
  "_id" | "careerId" | "careerPath" | "careerTitle" | "careerLevel" | "description" | "educationalLevel"
>;

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

export type FunctionalSkillSummary = {
  functionalSkillId: string;
  title: string;
  category: string;
  relatedCategory: string;
  description: string;
  proficiencyLevels: {
    proficiencyLevelId: string;
    level: string;
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

export type EnablingSkillSummary = {
  enablingSkillId: string;
  title: string;
  category: string;
  relatedCategory: string;
  description: string;
  proficiencyLevels: {
    proficiencyLevelId: string;
    level: string;
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
  birthday: string;
  email: string;
  password: string;
};

export type LoginUserPayload = {
  email: string;
  password: string;
};

export type RecoveryEmailPayload = {
  email: string;
};

export type RecoveryVerificationPayload = {
  email: string;
  birthday: string;
};

export type ResetRecoveredPasswordPayload = {
  recoveryToken: string;
  password: string;
};

export type AuthUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  birthday?: string | null;
  email: string;
  createdAt?: string;
};

export type AuthResponse = {
  message: string;
  user: AuthUser;
};

export type PasswordRecoveryResponse = {
  message: string;
  email: string;
  recoveryToken?: string;
};

export type RecommendationQuestionPayload = {
  id: string;
  text?: string;
  competencies: CompetencyKey[];
};

export type RecommendationPayload = {
  selectedPathKey: CareerPathKey | null;
  selectedCareerName: string | null;
  iHave: string[];
  iHaveNot: string[];
  questions: RecommendationQuestionPayload[];
  explainabilityMethod?: "auto" | "shap" | "lime";
  includeExplainability?: boolean;
};

export type CareerGapPayload = {
  pathKey: CareerPathKey;
  careerName: string;
  featureVector: number[];
};

export type RecommendationModelInfo = {
  trainedAt: string;
  sampleCount: number;
  featureCount: number;
  classCount: number;
  dataSource: string;
  modelVersion?: number;
  dataQuality?: string;
  ensembleWeights?: {
    logistic: number;
    randomForest: number;
    gradientBoosting: number;
  };
  evaluation?: {
    logistic: { top1: number; top3: number; logLoss: number };
    randomForest: { top1: number; top3: number; logLoss: number };
    gradientBoosting: { top1: number; top3: number; logLoss: number };
    ensemble: { top1: number; top3: number; logLoss: number };
  };
};

export type CareerAlgorithmScores = {
  pathKey: CareerPathKey;
  pathName: string;
  careerName: string;
  level: number;
  profileKey?: string | null;
  logistic: number;
  randomForest: number;
  gradientBoosting: number;
  ensemble: number;
  recommendationConfidence: number;
};

export type PathScore = {
  pathKey: CareerPathKey;
  pathName: string;
  score: number;
  bestCareer: string;
};

export type GroupedCareerScore = {
  profileKey?: string | null;
  careerName: string;
  recommendationConfidence: number;
  ensemble: number;
  pathKeys: CareerPathKey[];
  pathNames: string[];
  entries: Array<{
    pathKey: CareerPathKey;
    pathName: string;
    careerName: string;
    level: number;
  }>;
};

export type CompetencyScore = {
  key: CompetencyKey;
  label: string;
  haveRate: number;
  coverageRate: number;
  featureScore: number;
  answeredCount: number;
  totalTaggedQuestions: number;
};

export type PriorityGap = {
  key: CompetencyKey;
  label: string;
  currentReadiness: number;
  importance: number;
  gapScore: number;
  recommendation: string;
};

export type FeatureImportance = {
  key: CompetencyKey;
  label: string;
  logistic: number;
  randomForest: number;
  gradientBoosting: number;
  ensemble: number;
};

export type RecommendationResult = {
  topCareer: CareerAlgorithmScores;
  selectedCareerScore: CareerAlgorithmScores | null;
  selectedCareerRank: number | null;
  alternativeCareers: CareerAlgorithmScores[];
  allCareerScores: CareerAlgorithmScores[];
  groupedCareerScores?: GroupedCareerScore[];
  pathScores: PathScore[];
  competencyScores: CompetencyScore[];
  certificationSignals: Array<{
    key: string;
    label: string;
    value: number;
  }>;
  priorityGaps: PriorityGap[];
  featureImportances: FeatureImportance[];
  explainability: RecommendationExplainability;
  summary: {
    completionRate: number;
    haveRate: number;
    answeredCount: number;
    totalQuestions: number;
    confidence: number;
    source: "frontend" | "backend";
  };
};

export type RecommendationExplainability = {
  selectedMethod: "shap" | "lime";
  reason: string;
  topCareer: {
    method: "shap" | "lime";
    careerName: string;
    pathKey: CareerPathKey;
    baseScore: number;
    predictedScore: number;
    reconstructedScore: number;
    narrative: string;
    quality: {
      runtimeMs: number;
      fidelity: number;
    };
    factors: Array<{
      key: string;
      label: string;
      value: number;
      contribution: number;
      impactPct: number;
      direction: "positive" | "negative";
      source?: "competency" | "certification";
    }>;
  };
  comparison: {
    shap: { quality: { runtimeMs: number; fidelity: number } };
    lime: { quality: { runtimeMs: number; fidelity: number } };
  };
};

export type RecommendationApiResponse = {
  result: RecommendationResult;
  model: RecommendationModelInfo;
};

export type RecommendationExplainabilityResponse = {
  explainability: RecommendationExplainability;
};

export type RecommendationModelInfoResponse = {
  model: RecommendationModelInfo;
};

export type CareerGapResponse = {
  priorityGaps: PriorityGap[];
};

export type CvMatchedSkillCategory =
  | "capability"
  | "tool"
  | "workflow"
  | "role"
  | "certification";

export type CvMatchedSkill = {
  label: string;
  competencyKey: CompetencyKey;
  competencyLabel: string;
  category: CvMatchedSkillCategory;
  evidence: string[];
  score: number;
};

export type CvCompetencySignal = {
  key: CompetencyKey;
  label: string;
  score: number;
  evidence: string[];
};

export type CvPathHint = {
  pathKey: CareerPathKey;
  pathName: string;
  score: number;
  evidence: string[];
};

export type CvAnalysisSummary = {
  textLength: number;
  matchedSkillCount: number;
  detectedYearsExperience: number | null;
  suggestedLevel: number;
  detectedTitle: string | null;
  levelEvidence: string[];
  isLikelyResume: boolean;
  resumeConfidence: number;
  rejectionReason: string | null;
  candidateName: string | null;
  uploadedFileName: string | null;
  inputKind: "resume" | "skills_profile" | "unknown";
};

export type CvAnalysisPayload = {
  cvText: string;
  fileName?: string | null;
  selectedPathKey?: CareerPathKey | null;
  selectedCareerName?: string | null;
};

export type CvAnalysisResponse = {
  result: RecommendationResult;
  model: RecommendationModelInfo;
  cvAnalysis: {
    summary: CvAnalysisSummary;
    matchedSkills: CvMatchedSkill[];
    competencySignals: CvCompetencySignal[];
    pathHints: CvPathHint[];
  };
};

export type RecommendationFeedbackPayload = {
  selectedPathKey: CareerPathKey | null;
  selectedCareerName: string | null;
  recommendedPathKey: CareerPathKey;
  recommendedCareerName: string;
  accepted: boolean;
  notes?: string | null;
  source?: "assessment" | "cv_upload";
  inputKind?: "resume" | "skills_profile" | "unknown";
  uploadedFileName?: string | null;
  candidateName?: string | null;
  detectedTitle?: string | null;
  suggestedLevel?: number | null;
  confidence?: number | null;
};

export type RecommendationFeedbackResponse = {
  saved: boolean;
  filePath: string;
  createdAt: string;
};

export async function fetchCareers() {
  const response = await api.get<Career[]>("/api/careers");
  return response.data;
}

export async function fetchCareerSummaries() {
  const response = await api.get<CareerSummary[]>("/api/careers/summary");
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

export async function fetchFunctionalSkillSummaries() {
  const response = await api.get<FunctionalSkillSummary[]>(
    "/api/functional-skills/summary"
  );
  return response.data;
}

export async function fetchEnablingSkills() {
  const response = await api.get<EnablingSkill[]>("/api/enabling-skills");
  return response.data;
}

export async function fetchEnablingSkillSummaries() {
  const response = await api.get<EnablingSkillSummary[]>(
    "/api/enabling-skills/summary"
  );
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

export async function fetchRecommendations(payload: RecommendationPayload) {
  const response = await api.post<RecommendationApiResponse>("/api/recommendations", payload);
  return response.data;
}

export async function fetchRecommendationExplainability(payload: RecommendationPayload) {
  const response = await api.post<RecommendationExplainabilityResponse>(
    "/api/recommendations/explainability",
    payload
  );
  return response.data;
}

export async function createRecommendationExplainabilityStreamSession(payload: RecommendationPayload) {
  const response = await api.post<{ sessionId: string }>(
    "/api/recommendations/explainability/stream-session",
    payload
  );
  return response.data;
}

export function buildRecommendationExplainabilityStreamUrl(sessionId: string) {
  const params = new URLSearchParams({
    sessionId,
  });
  return `${baseURL}/api/recommendations/explainability/stream?${params.toString()}`;
}

export async function fetchRecommendationModelInfo() {
  const response = await api.get<RecommendationModelInfoResponse>(
    "/api/recommendations/model-info"
  );
  return response.data.model;
}

export async function fetchCareerGaps(payload: CareerGapPayload) {
  const response = await api.post<CareerGapResponse>("/api/recommendations/career-gaps", payload);
  return response.data;
}

export async function analyzeCv(payload: CvAnalysisPayload) {
  const response = await api.post<CvAnalysisResponse>("/api/recommendations/analyze-cv", payload);
  return response.data;
}

export async function submitRecommendationFeedback(payload: RecommendationFeedbackPayload) {
  const response = await api.post<RecommendationFeedbackResponse>(
    "/api/recommendations/feedback",
    payload
  );
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

export async function startPasswordRecovery(payload: RecoveryEmailPayload) {
  const response = await api.post<PasswordRecoveryResponse>(
    "/api/users/recover-password/email",
    payload
  );
  return response.data;
}

export async function verifyPasswordRecovery(payload: RecoveryVerificationPayload) {
  const response = await api.post<PasswordRecoveryResponse>(
    "/api/users/recover-password/verify",
    payload
  );
  return response.data;
}

export async function resetRecoveredPassword(payload: ResetRecoveredPasswordPayload) {
  const response = await api.post<PasswordRecoveryResponse>(
    "/api/users/recover-password/reset",
    payload
  );
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
