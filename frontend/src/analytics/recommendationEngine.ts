import { careerPaths, type CareerPathKey } from "../data/careerData";
import type { Question, CompetencyKey } from "../data/assessmentData";
import type { AssessmentState } from "../state/storage";

type Profile = {
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
  summary: {
    completionRate: number;
    haveRate: number;
    answeredCount: number;
    totalQuestions: number;
    confidence: number;
    source: "frontend" | "backend";
  };
};

const competencyLabels: Record<CompetencyKey, string> = {
  business_strategy: "Business Strategy",
  sql_data_access: "SQL and Data Access",
  data_visualization: "Data Visualization",
  data_quality_governance: "Data Quality and Governance",
  data_engineering: "Data Engineering",
  statistics_experimentation: "Statistics and Experimentation",
  machine_learning: "Machine Learning",
  mlops_deployment: "MLOps and Deployment",
  research_innovation: "Research and Innovation",
  communication_storytelling: "Communication and Storytelling",
  responsible_ai: "Responsible AI",
  collaboration_delivery: "Collaboration and Delivery",
  leadership_execution: "Leadership and Execution",
  role_mastery: "Role Mastery",
};

const gapRecommendations: Record<CompetencyKey, string> = {
  business_strategy: "Practice framing analytics outputs into clear business decisions.",
  sql_data_access: "Strengthen SQL querying and data extraction workflows.",
  data_visualization: "Build dashboard storytelling and data communication skills.",
  data_quality_governance: "Apply data quality controls and governance standards consistently.",
  data_engineering: "Improve pipeline design, orchestration, and reliability practices.",
  statistics_experimentation: "Deepen statistical reasoning and experiment design.",
  machine_learning: "Advance model development, evaluation, and validation capability.",
  mlops_deployment: "Focus on model deployment, monitoring, and lifecycle operations.",
  research_innovation: "Improve literature review and evidence-based experimentation methods.",
  communication_storytelling: "Translate technical insights into audience-specific narratives.",
  responsible_ai: "Apply fairness, safety, and governance checks in data/AI workflows.",
  collaboration_delivery: "Improve cross-team coordination and delivery management.",
  leadership_execution: "Lead priorities, resource decisions, and strategic execution.",
  role_mastery: "Build practical depth in core responsibilities of the target role.",
};

const basePathWeights: Record<CareerPathKey, Record<CompetencyKey, number>> = {
  business_intelligence: {
    business_strategy: 1.0,
    sql_data_access: 0.9,
    data_visualization: 1.0,
    data_quality_governance: 0.7,
    data_engineering: 0.4,
    statistics_experimentation: 0.6,
    machine_learning: 0.35,
    mlops_deployment: 0.2,
    research_innovation: 0.2,
    communication_storytelling: 1.0,
    responsible_ai: 0.45,
    collaboration_delivery: 0.85,
    leadership_execution: 0.65,
    role_mastery: 0.8,
  },
  data_stewardship: {
    business_strategy: 0.7,
    sql_data_access: 0.7,
    data_visualization: 0.45,
    data_quality_governance: 1.0,
    data_engineering: 0.55,
    statistics_experimentation: 0.45,
    machine_learning: 0.25,
    mlops_deployment: 0.2,
    research_innovation: 0.25,
    communication_storytelling: 0.8,
    responsible_ai: 0.85,
    collaboration_delivery: 0.9,
    leadership_execution: 0.7,
    role_mastery: 0.85,
  },
  data_engineering: {
    business_strategy: 0.5,
    sql_data_access: 0.85,
    data_visualization: 0.35,
    data_quality_governance: 0.75,
    data_engineering: 1.0,
    statistics_experimentation: 0.4,
    machine_learning: 0.55,
    mlops_deployment: 0.8,
    research_innovation: 0.3,
    communication_storytelling: 0.65,
    responsible_ai: 0.55,
    collaboration_delivery: 0.8,
    leadership_execution: 0.65,
    role_mastery: 0.9,
  },
  data_science: {
    business_strategy: 0.65,
    sql_data_access: 0.75,
    data_visualization: 0.65,
    data_quality_governance: 0.6,
    data_engineering: 0.55,
    statistics_experimentation: 1.0,
    machine_learning: 1.0,
    mlops_deployment: 0.55,
    research_innovation: 0.7,
    communication_storytelling: 0.75,
    responsible_ai: 0.7,
    collaboration_delivery: 0.75,
    leadership_execution: 0.6,
    role_mastery: 0.85,
  },
  ai_engineering: {
    business_strategy: 0.55,
    sql_data_access: 0.6,
    data_visualization: 0.35,
    data_quality_governance: 0.6,
    data_engineering: 0.9,
    statistics_experimentation: 0.55,
    machine_learning: 1.0,
    mlops_deployment: 1.0,
    research_innovation: 0.6,
    communication_storytelling: 0.6,
    responsible_ai: 0.9,
    collaboration_delivery: 0.8,
    leadership_execution: 0.65,
    role_mastery: 0.9,
  },
  applied_research: {
    business_strategy: 0.45,
    sql_data_access: 0.55,
    data_visualization: 0.45,
    data_quality_governance: 0.55,
    data_engineering: 0.45,
    statistics_experimentation: 0.95,
    machine_learning: 0.8,
    mlops_deployment: 0.35,
    research_innovation: 1.0,
    communication_storytelling: 0.75,
    responsible_ai: 0.8,
    collaboration_delivery: 0.7,
    leadership_execution: 0.6,
    role_mastery: 0.8,
  },
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

const ENSEMBLE_WEIGHTS = {
  logistic: 0.35,
  randomForest: 0.45,
  gradientBoosting: 0.2,
} as const;

function normalizeImportance(values: number[]) {
  const max = Math.max(...values, 0);
  if (max <= 0) {
    return values.map(() => 0);
  }
  return values.map((value) => value / max);
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function sortedCompetencies(weights: Record<CompetencyKey, number>) {
  return (Object.keys(weights) as CompetencyKey[]).sort((a, b) => weights[b] - weights[a]);
}

function levelAdjustedWeights(pathKey: CareerPathKey, level: number) {
  const weights = { ...basePathWeights[pathKey] };
  const levelMultiplier = 1 + (level - 1) * 0.03;
  weights.role_mastery *= 1.05 * levelMultiplier;

  if (level >= 3) {
    weights.leadership_execution *= 1.15;
    weights.collaboration_delivery *= 1.08;
  }
  if (level >= 4) {
    weights.business_strategy *= 1.15;
  }
  if (level === 5) {
    weights.responsible_ai *= 1.12;
  }

  return weights;
}

function buildProfiles(): Profile[] {
  return (Object.keys(careerPaths) as CareerPathKey[]).flatMap((pathKey) => {
    const path = careerPaths[pathKey];
    return path.careers.map((career) => ({
      pathKey,
      pathName: path.name,
      careerName: career.name,
      level: career.level,
      weights: levelAdjustedWeights(pathKey, career.level),
    }));
  });
}

function competencyScores(
  questions: Question[],
  iHaveSet: Set<string>,
  iHaveNotSet: Set<string>
): CompetencyScore[] {
  const answeredSet = new Set([...iHaveSet, ...iHaveNotSet]);
  const competencyKeys = Object.keys(competencyLabels) as CompetencyKey[];
  const totalQuestions = questions.length;
  const completionRate = totalQuestions > 0 ? answeredSet.size / totalQuestions : 0;
  const overallHaveRate = answeredSet.size > 0 ? iHaveSet.size / answeredSet.size : 0;

  return competencyKeys.map((key) => {
    const tagged = questions.filter((q) => q.competencies.includes(key));
    const taggedIds = tagged.map((q) => q.id);
    const answeredCount = taggedIds.filter((id) => answeredSet.has(id)).length;
    const haveCount = taggedIds.filter((id) => iHaveSet.has(id)).length;
    const totalTaggedQuestions = taggedIds.length;

    const noDirectEvidence = totalTaggedQuestions === 0;
    const inferredBaseline = clamp01(overallHaveRate * 0.78 + completionRate * 0.22);
    const haveRate = noDirectEvidence
      ? inferredBaseline
      : answeredCount > 0
        ? haveCount / answeredCount
        : inferredBaseline * 0.85;
    const coverageRate = noDirectEvidence ? completionRate : answeredCount / totalTaggedQuestions;
    const featureScore = clamp01(haveRate * 0.72 + coverageRate * 0.28);

    return {
      key,
      label: competencyLabels[key],
      haveRate,
      coverageRate,
      featureScore,
      answeredCount,
      totalTaggedQuestions,
    };
  });
}

function logisticScore(
  profile: Profile,
  featureMap: Record<CompetencyKey, number>,
  completionRate: number
) {
  let z = -1.1;
  (Object.keys(profile.weights) as CompetencyKey[]).forEach((key) => {
    const normalizedFeature = featureMap[key] * 2 - 1;
    z += profile.weights[key] * normalizedFeature;
  });
  return clamp01(sigmoid(z) * (0.66 + completionRate * 0.34));
}

function randomForestScore(
  profile: Profile,
  featureMap: Record<CompetencyKey, number>,
  completionRate: number
) {
  const ordered = sortedCompetencies(profile.weights);
  const node = (key: CompetencyKey, threshold: number) => {
    const value = featureMap[key];
    return value >= threshold ? 1 : clamp01((value / threshold) * 0.72);
  };

  const trees = [
    0.5 * node(ordered[0], 0.65) + 0.3 * node(ordered[1], 0.58) + 0.2 * node(ordered[2], 0.52),
    0.45 * node(ordered[1], 0.62) + 0.35 * node(ordered[2], 0.56) + 0.2 * node(ordered[3], 0.5),
    0.5 * node(ordered[2], 0.6) + 0.25 * node(ordered[4], 0.52) + 0.25 * node(ordered[5], 0.48),
    0.4 * node(ordered[0], 0.7) + 0.4 * node(ordered[3], 0.54) + 0.2 * node(ordered[6], 0.45),
    0.35 * node(ordered[4], 0.5) + 0.35 * node(ordered[5], 0.5) + 0.3 * node(ordered[6], 0.45),
  ];

  const raw = trees.reduce((sum, value) => sum + value, 0) / trees.length;
  return clamp01(raw * (0.62 + completionRate * 0.38));
}

function gradientBoostingScore(
  profile: Profile,
  featureMap: Record<CompetencyKey, number>,
  completionRate: number
) {
  const ordered = sortedCompetencies(profile.weights);
  let score = 0.5;

  ordered.slice(0, 8).forEach((key, index) => {
    const lr = 0.09 - index * 0.006;
    const centered = featureMap[key] - 0.5;
    score += lr * profile.weights[key] * centered * 2;
    if (profile.weights[key] > 0.82 && featureMap[key] < 0.35) {
      score -= 0.035;
    }
  });

  return clamp01(score * (0.64 + completionRate * 0.36));
}

function pathScoresFromCareers(careerScores: CareerAlgorithmScores[]): PathScore[] {
  const grouped = new Map<CareerPathKey, CareerAlgorithmScores[]>();
  careerScores.forEach((score) => {
    const list = grouped.get(score.pathKey) ?? [];
    list.push(score);
    grouped.set(score.pathKey, list);
  });

  return Array.from(grouped.entries())
    .map(([pathKey, scores]) => {
      const sorted = [...scores].sort((a, b) => b.ensemble - a.ensemble);
      return {
        pathKey,
        pathName: sorted[0].pathName,
        score: sorted[0].ensemble,
        bestCareer: sorted[0].careerName,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function priorityGapsForTopCareer(
  topCareer: CareerAlgorithmScores,
  profiles: Profile[],
  competencyMap: Map<CompetencyKey, CompetencyScore>
) {
  const profile = profiles.find(
    (p) => p.pathKey === topCareer.pathKey && p.careerName === topCareer.careerName
  );
  if (!profile) return [];

  const ranked = (Object.keys(profile.weights) as CompetencyKey[])
    .map((key) => {
      const current = competencyMap.get(key)?.featureScore ?? 0;
      const importance = profile.weights[key];
      const gapScore = clamp01((1 - current) * importance);

      return {
        key,
        label: competencyLabels[key],
        currentReadiness: current,
        importance,
        gapScore,
        recommendation: gapRecommendations[key],
      };
    })
    .sort((a, b) => b.gapScore - a.gapScore);

  const meaningful = ranked.filter((item) => item.gapScore >= 0.03);
  return meaningful.slice(0, 6);
}

function fallbackFeatureImportances(topCareer: CareerAlgorithmScores, profiles: Profile[]) {
  const profile = profiles.find(
    (item) => item.pathKey === topCareer.pathKey && item.careerName === topCareer.careerName
  );
  if (!profile) return [] as FeatureImportance[];

  const logisticRaw = (Object.keys(profile.weights) as CompetencyKey[]).map((key) => profile.weights[key]);
  const randomForestRaw = logisticRaw.map((value) => Math.sqrt(value));
  const gradientBoostingRaw = logisticRaw.map((value) => Math.pow(value, 1.15));

  const logistic = normalizeImportance(logisticRaw);
  const randomForest = normalizeImportance(randomForestRaw);
  const gradientBoosting = normalizeImportance(gradientBoostingRaw);
  const ensemble = normalizeImportance(
    logistic.map(
      (value, index) =>
        value * ENSEMBLE_WEIGHTS.logistic +
        randomForest[index] * ENSEMBLE_WEIGHTS.randomForest +
        gradientBoosting[index] * ENSEMBLE_WEIGHTS.gradientBoosting
    )
  );

  return (Object.keys(profile.weights) as CompetencyKey[])
    .map((key, index) => ({
      key,
      label: competencyLabels[key],
      logistic: logistic[index],
      randomForest: randomForest[index],
      gradientBoosting: gradientBoosting[index],
      ensemble: ensemble[index],
    }))
    .sort((a, b) => b.ensemble - a.ensemble);
}

export function runRecommendationEngine(
  state: AssessmentState,
  questions: Question[]
): RecommendationResult {
  const iHaveSet = new Set(state.iHave);
  const iHaveNotSet = new Set(state.iHaveNot);
  const answeredCount = iHaveSet.size + iHaveNotSet.size;
  const totalQuestions = questions.length;
  const completionRate = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
  const haveRate = answeredCount > 0 ? iHaveSet.size / answeredCount : 0;

  const competencies = competencyScores(questions, iHaveSet, iHaveNotSet);
  const featureMap = competencies.reduce(
    (acc, item) => {
      acc[item.key] = item.featureScore;
      return acc;
    },
    {} as Record<CompetencyKey, number>
  );

  const profiles = buildProfiles();
  const allCareerScores = profiles
    .map((profile) => {
      const logistic = logisticScore(profile, featureMap, completionRate);
      const randomForest = randomForestScore(profile, featureMap, completionRate);
      const gradientBoosting = gradientBoostingScore(profile, featureMap, completionRate);
      const ensemble = clamp01(
        logistic * ENSEMBLE_WEIGHTS.logistic +
          randomForest * ENSEMBLE_WEIGHTS.randomForest +
          gradientBoosting * ENSEMBLE_WEIGHTS.gradientBoosting
      );

      return {
        pathKey: profile.pathKey,
        pathName: profile.pathName,
        careerName: profile.careerName,
        level: profile.level,
        logistic,
        randomForest,
        gradientBoosting,
        ensemble,
      };
    })
    .sort((a, b) => b.ensemble - a.ensemble);

  const topCareer = allCareerScores[0];
  const selectedCareerScore =
    state.selectedPathKey && state.selectedCareerName
      ? allCareerScores.find(
          (score) =>
            score.pathKey === state.selectedPathKey && score.careerName === state.selectedCareerName
        ) ?? null
      : null;

  const selectedCareerRank = selectedCareerScore
    ? allCareerScores.findIndex(
        (score) =>
          score.pathKey === selectedCareerScore.pathKey &&
          score.careerName === selectedCareerScore.careerName
      ) + 1
    : null;

  const runnerUpScore = allCareerScores[1]?.ensemble ?? topCareer.ensemble;
  const confidence = clamp01(0.46 + (topCareer.ensemble - runnerUpScore) * 1.25 + completionRate * 0.24);
  const pathScores = pathScoresFromCareers(allCareerScores);
  const competencyMap = new Map(competencies.map((item) => [item.key, item]));
  const priorityGaps = priorityGapsForTopCareer(topCareer, profiles, competencyMap);
  const featureImportances = fallbackFeatureImportances(topCareer, profiles);

  return {
    topCareer,
    selectedCareerScore,
    selectedCareerRank,
    alternativeCareers: allCareerScores.slice(1, 4),
    allCareerScores,
    pathScores,
    competencyScores: competencies,
    priorityGaps,
    featureImportances,
    summary: {
      completionRate,
      haveRate,
      answeredCount,
      totalQuestions,
      confidence,
      source: "frontend",
    },
  };
}
