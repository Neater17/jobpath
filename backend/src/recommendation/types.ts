export type CareerPathKey =
  | "business_intelligence"
  | "data_stewardship"
  | "data_engineering"
  | "data_science"
  | "ai_engineering"
  | "applied_research";

export type CompetencyKey =
  | "business_strategy"
  | "sql_data_access"
  | "data_visualization"
  | "data_quality_governance"
  | "data_engineering"
  | "statistics_experimentation"
  | "machine_learning"
  | "mlops_deployment"
  | "research_innovation"
  | "communication_storytelling"
  | "responsible_ai"
  | "collaboration_delivery"
  | "leadership_execution"
  | "role_mastery";

export type RecommendationQuestion = {
  id: string;
  competencies: CompetencyKey[];
};

export type RecommendationRequest = {
  selectedPathKey: CareerPathKey | null;
  selectedCareerName: string | null;
  iHave: string[];
  iHaveNot: string[];
  questions: RecommendationQuestion[];
};

export type CareerProfile = {
  pathKey: CareerPathKey;
  pathName: string;
  careerName: string;
  level: number;
  weights: Record<CompetencyKey, number>;
};

export type CareerAlgorithmScores = {
  pathKey: CareerPathKey;
  pathName: string;
  careerName: string;
  level: number;
  logistic: number;
  randomForest: number;
  gradientBoosting: number;
  ensemble: number;
};

export type PathScore = {
  pathKey: CareerPathKey;
  pathName: string;
  score: number;
  bestCareer: string;
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

export type RecommendationSummary = {
  completionRate: number;
  haveRate: number;
  answeredCount: number;
  totalQuestions: number;
  confidence: number;
  source: "backend";
};

export type RecommendationResult = {
  topCareer: CareerAlgorithmScores;
  selectedCareerScore: CareerAlgorithmScores | null;
  selectedCareerRank: number | null;
  alternativeCareers: CareerAlgorithmScores[];
  allCareerScores: CareerAlgorithmScores[];
  pathScores: PathScore[];
  competencyScores: CompetencyScore[];
  priorityGaps: PriorityGap[];
  featureImportances: FeatureImportance[];
  summary: RecommendationSummary;
};

export type ModelInfo = {
  trainedAt: string;
  sampleCount: number;
  featureCount: number;
  classCount: number;
  dataSource: string;
};

export type RecommendationApiResponse = {
  result: RecommendationResult;
  model: ModelInfo;
};

export type RecommendationModelInfoResponse = {
  model: ModelInfo;
};
