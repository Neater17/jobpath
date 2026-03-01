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
  text?: string;
  competencies: CompetencyKey[];
};

export type RecommendationRequest = {
  selectedPathKey: CareerPathKey | null;
  selectedCareerName: string | null;
  iHave: string[];
  iHaveNot: string[];
  questions: RecommendationQuestion[];
  explainabilityMethod?: "auto" | "shap" | "lime";
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

export type CertificationSignalKey =
  | "sql_certification"
  | "python_certification"
  | "governance_certification";

export type CertificationSignal = {
  key: CertificationSignalKey;
  label: string;
  value: number;
};

export type ExplainabilityFactor = {
  key: CompetencyKey | CertificationSignalKey;
  label: string;
  value: number;
  contribution: number;
  impactPct: number;
  direction: "positive" | "negative";
  source?: "competency" | "certification";
};

export type ExplainabilityQuality = {
  runtimeMs: number;
  fidelity: number;
};

export type ExplainabilityMethodReport = {
  method: "shap" | "lime";
  careerName: string;
  pathKey: CareerPathKey;
  baseScore: number;
  predictedScore: number;
  reconstructedScore: number;
  narrative: string;
  quality: ExplainabilityQuality;
  factors: ExplainabilityFactor[];
};

export type RecommendationExplainability = {
  selectedMethod: "shap" | "lime";
  reason: string;
  topCareer: ExplainabilityMethodReport;
  comparison: {
    shap: ExplainabilityMethodReport;
    lime: ExplainabilityMethodReport;
  };
};

export type RecommendationResult = {
  topCareer: CareerAlgorithmScores;
  selectedCareerScore: CareerAlgorithmScores | null;
  selectedCareerRank: number | null;
  alternativeCareers: CareerAlgorithmScores[];
  allCareerScores: CareerAlgorithmScores[];
  pathScores: PathScore[];
  competencyScores: CompetencyScore[];
  certificationSignals: CertificationSignal[];
  priorityGaps: PriorityGap[];
  featureImportances: FeatureImportance[];
  explainability: RecommendationExplainability;
  summary: RecommendationSummary;
};

export type EnsembleWeights = {
  logistic: number;
  randomForest: number;
  gradientBoosting: number;
};

export type ModelEvaluationMetrics = {
  sampleCount: number;
  top1: number;
  top3: number;
  logLoss: number;
  brier: number;
  ece: number;
};

export type ModelDataQuality = "mongo" | "external" | "mixed" | "synthetic" | "unknown";

export type ModelInfo = {
  trainedAt: string;
  sampleCount: number;
  featureCount: number;
  classCount: number;
  dataSource: string;
  modelVersion: number;
  loadedFromCache: boolean;
  persistedModelPath: string;
  dataQuality: ModelDataQuality;
  usesSyntheticData: boolean;
  split: {
    train: number;
    validation: number;
    test: number;
  };
  ensembleWeights: EnsembleWeights;
  evaluation: {
    logistic: ModelEvaluationMetrics;
    randomForest: ModelEvaluationMetrics;
    gradientBoosting: ModelEvaluationMetrics;
    ensemble: ModelEvaluationMetrics;
  };
  confidenceCalibration: {
    binCount: number;
    fallbackAccuracy: number;
  };
};

export type RecommendationApiResponse = {
  result: RecommendationResult;
  model: ModelInfo;
};

export type RecommendationModelInfoResponse = {
  model: ModelInfo;
};

export type RecommendationFeedbackRequest = {
  selectedPathKey: CareerPathKey | null;
  selectedCareerName: string | null;
  recommendedPathKey: CareerPathKey;
  recommendedCareerName: string;
  accepted: boolean;
  notes?: string | null;
};
