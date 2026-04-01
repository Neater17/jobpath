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
  includeExplainability?: boolean;
};

export type RecommendationFeedbackRequest = {
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

export type CareerGapRequest = {
  pathKey: CareerPathKey;
  careerName: string;
  featureVector: number[];
};

export type CareerGapResponse = {
  priorityGaps: PriorityGap[];
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

export type PriorityGap = {
  key: CompetencyKey;
  label: string;
  currentReadiness: number;
  importance: number;
  gapScore: number;
  recommendation: string;
};

export type RecommendationSummary = {
  completionRate: number;
  haveRate: number;
  answeredCount: number;
  totalQuestions: number;
  confidence: number;
  source: "frontend" | "backend";
};

export type ModelInfo = {
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

export type CompetencyScore = {
  key: CompetencyKey;
  label: string;
  haveRate: number;
  coverageRate: number;
  featureScore: number;
  answeredCount: number;
  totalTaggedQuestions: number;
};

export type FeatureImportance = {
  key: CompetencyKey;
  label: string;
  logistic: number;
  randomForest: number;
  gradientBoosting: number;
  ensemble: number;
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
    factors: ExplainabilityFactor[];
  };
  comparison: {
    shap: {
      quality: { runtimeMs: number; fidelity: number };
    };
    lime: {
      quality: { runtimeMs: number; fidelity: number };
    };
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

export type RecommendationApiResponse = {
  result: RecommendationResult;
  model: ModelInfo;
};

export type RecommendationExplainabilityResponse = {
  explainability: RecommendationExplainability;
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

export type CvAnalysis = {
  summary: CvAnalysisSummary;
  matchedSkills: CvMatchedSkill[];
  competencySignals: CvCompetencySignal[];
  pathHints: CvPathHint[];
};

export type CvAnalysisRequest = {
  cvText: string;
  selectedPathKey?: CareerPathKey | null;
  selectedCareerName?: string | null;
  fileName?: string | null;
};

export type CvRecommendationResponse = RecommendationApiResponse & {
  cvAnalysis: CvAnalysis;
};
