import fs from "node:fs/promises";
import path from "node:path";
import {
  buildCareerProfiles,
  competencyLabels,
  competencyOrder,
  gapRecommendations,
} from "./catalog.js";
import { loadOrBuildTrainingDataset } from "./dataset.js";
import {
  calibrateConfidence,
  predictEnsembleProbabilities,
  trainEnsembleModels,
  type TrainedEnsembleModels,
} from "./models.js";
import { buildCareerExplainability } from "./explainability.js";
import type {
  CareerAlgorithmScores,
  CareerPathKey,
  CertificationSignal,
  CertificationSignalKey,
  CompetencyKey,
  CompetencyScore,
  FeatureImportance,
  ModelDataQuality,
  ModelInfo,
  PathScore,
  PriorityGap,
  RecommendationApiResponse,
  RecommendationFeedbackRequest,
  RecommendationQuestion,
  RecommendationRequest,
} from "./types.js";
import { clamp01 } from "./utils.js";

const MODEL_VERSION = 3;
const DEFAULT_MODEL_PATH = "data/recommendation-model.v3.json";
const DEFAULT_FEEDBACK_PATH = "data/recommendation-feedback.jsonl";
const CERTIFICATION_BOOST_SCALE = 0.16;

const certificationSignalLabels: Record<CertificationSignalKey, string> = {
  sql_certification: "PSF-aligned SQL Certification",
  python_certification: "PSF-aligned Python Certification",
  governance_certification: "Data Governance Certification",
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function certificationAffinity(pathKey: CareerPathKey): Record<CertificationSignalKey, number> {
  switch (pathKey) {
    case "business_intelligence":
      return { sql_certification: 1, python_certification: 0.45, governance_certification: 0.55 };
    case "data_stewardship":
      return { sql_certification: 0.6, python_certification: 0.25, governance_certification: 1 };
    case "data_engineering":
      return { sql_certification: 0.85, python_certification: 0.65, governance_certification: 0.45 };
    case "data_science":
      return { sql_certification: 0.8, python_certification: 1, governance_certification: 0.4 };
    case "ai_engineering":
      return { sql_certification: 0.55, python_certification: 1, governance_certification: 0.55 };
    case "applied_research":
      return { sql_certification: 0.45, python_certification: 0.9, governance_certification: 0.5 };
    default:
      return { sql_certification: 0.6, python_certification: 0.6, governance_certification: 0.6 };
  }
}

function computeCertificationSignals(
  questions: RecommendationQuestion[],
  iHaveSet: Set<string>
): CertificationSignal[] {
  const values: Record<CertificationSignalKey, number> = {
    sql_certification: 0,
    python_certification: 0,
    governance_certification: 0,
  };

  for (const question of questions) {
    if (!iHaveSet.has(question.id)) continue;
    const text = normalizeText(question.text ?? "");
    if (!text) continue;

    const hasCertToken =
      /\b(cert|certified|certification|credential|badge|licensed)\b/.test(text) ||
      /\b(psf)\b/.test(text);
    if (!hasCertToken) continue;

    if (/\b(sql|database|query)\b/.test(text)) {
      values.sql_certification += 0.6;
    }
    if (/\b(python|pandas|numpy|scikit|tensorflow)\b/.test(text)) {
      values.python_certification += 0.6;
    }
    if (/\b(governance|quality|stewardship|compliance|lineage)\b/.test(text)) {
      values.governance_certification += 0.6;
    }
  }

  return (Object.keys(values) as CertificationSignalKey[]).map((key) => ({
    key,
    label: certificationSignalLabels[key],
    value: clamp01(values[key]),
  }));
}

type PersistedRecommendationModel = {
  version: number;
  savedAt: string;
  modelInfo: ModelInfo;
  models: TrainedEnsembleModels;
};

function cleanQuestions(questions: RecommendationQuestion[]) {
  const seen = new Set<string>();
  const competencySet = new Set<CompetencyKey>(competencyOrder);
  const cleaned: RecommendationQuestion[] = [];

  for (const question of questions) {
    if (!question || typeof question.id !== "string" || seen.has(question.id)) continue;
    if (!Array.isArray(question.competencies)) continue;

    const competencies = Array.from(
      new Set(question.competencies.filter((key): key is CompetencyKey => competencySet.has(key)))
    );
    if (competencies.length === 0) continue;

    seen.add(question.id);
    cleaned.push({
      id: question.id,
      text: typeof question.text === "string" ? question.text : undefined,
      competencies,
    });
  }

  return cleaned;
}

function cleanAnswerIds(ids: string[], validIds: Set<string>) {
  const unique = new Set<string>();
  for (const id of ids) {
    if (typeof id === "string" && validIds.has(id)) {
      unique.add(id);
    }
  }
  return unique;
}

function sortedCompetencies(weights: Record<CompetencyKey, number>) {
  return (Object.keys(weights) as CompetencyKey[]).sort((a, b) => weights[b] - weights[a]);
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

function inferDataQuality(dataSource: string): ModelDataQuality {
  if (dataSource.startsWith("mongo-first-blend(")) return "mixed";
  if (dataSource.startsWith("mongo-career-benchmarks:")) return "mongo";
  if (dataSource.startsWith("historical-json:")) return "external";
  if (dataSource.startsWith("synthetic-profile-bootstrap:")) return "synthetic";
  return "unknown";
}

function isPersistedModelPayload(value: unknown): value is PersistedRecommendationModel {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<PersistedRecommendationModel>;
  return (
    typeof payload.version === "number" &&
    typeof payload.savedAt === "string" &&
    payload.modelInfo !== undefined &&
    payload.models !== undefined
  );
}

export class RecommendationService {
  private models: TrainedEnsembleModels | null = null;

  private modelInfo: ModelInfo | null = null;

  private readonly profiles = buildCareerProfiles();

  private getModelPath() {
    const configured = process.env.RECOMMENDER_MODEL_PATH;
    if (typeof configured === "string" && configured.trim().length > 0) {
      return path.resolve(configured);
    }
    return path.resolve(process.cwd(), DEFAULT_MODEL_PATH);
  }

  private getFeedbackPath() {
    const configured = process.env.RECOMMENDER_FEEDBACK_PATH;
    if (typeof configured === "string" && configured.trim().length > 0) {
      return path.resolve(configured);
    }
    return path.resolve(process.cwd(), DEFAULT_FEEDBACK_PATH);
  }

  private async loadPersistedModel(): Promise<boolean> {
    const modelPath = this.getModelPath();

    try {
      const raw = await fs.readFile(modelPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!isPersistedModelPayload(parsed)) {
        return false;
      }

      if (parsed.version !== MODEL_VERSION) {
        return false;
      }

      this.models = parsed.models;
      this.modelInfo = {
        ...parsed.modelInfo,
        modelVersion: MODEL_VERSION,
        loadedFromCache: true,
        persistedModelPath: modelPath,
      };
      return true;
    } catch {
      return false;
    }
  }

  private async persistModel() {
    if (!this.models || !this.modelInfo) {
      return;
    }

    const modelPath = this.getModelPath();
    await fs.mkdir(path.dirname(modelPath), { recursive: true });

    const modelInfo: ModelInfo = {
      ...this.modelInfo,
      loadedFromCache: false,
      persistedModelPath: modelPath,
      modelVersion: MODEL_VERSION,
    };

    const payload: PersistedRecommendationModel = {
      version: MODEL_VERSION,
      savedAt: new Date().toISOString(),
      modelInfo,
      models: this.models,
    };

    await fs.writeFile(modelPath, JSON.stringify(payload), "utf8");
    this.modelInfo = modelInfo;
  }

  async init(datasetPath?: string, forceRetrain = false) {
    if (!forceRetrain) {
      const loaded = await this.loadPersistedModel();
      if (loaded) {
        return;
      }
    }

    const dataset = await loadOrBuildTrainingDataset(this.profiles, competencyOrder, datasetPath);
    const trainedModels = trainEnsembleModels(
      dataset.samples,
      this.profiles.length,
      competencyOrder.length
    );

    const dataQuality = inferDataQuality(dataset.dataSource);
    if (dataQuality === "synthetic") {
      console.warn(
        "[recommendation] Training used synthetic fallback data. Add historical JSON or Mongo benchmarks for better quality."
      );
    }

    this.models = trainedModels;
    this.modelInfo = {
      trainedAt: new Date().toISOString(),
      sampleCount: dataset.samples.length,
      featureCount: competencyOrder.length,
      classCount: this.profiles.length,
      dataSource: dataset.dataSource,
      modelVersion: MODEL_VERSION,
      loadedFromCache: false,
      persistedModelPath: this.getModelPath(),
      dataQuality,
      usesSyntheticData: dataQuality === "synthetic" || dataQuality === "mixed",
      split: trainedModels.diagnostics.split,
      ensembleWeights: trainedModels.ensembleWeights,
      evaluation: trainedModels.diagnostics.metrics,
      confidenceCalibration: {
        binCount: trainedModels.confidenceCalibration.binCount,
        fallbackAccuracy: trainedModels.confidenceCalibration.fallbackAccuracy,
      },
    };

    await this.persistModel();
  }

  async retrain(datasetPath?: string) {
    await this.init(datasetPath, true);
    return this.getModelInfo();
  }

  getModelInfo() {
    if (!this.modelInfo) {
      throw new Error("Recommendation model is not initialized");
    }
    return this.modelInfo;
  }

  async recordFeedback(payload: RecommendationFeedbackRequest) {
    const feedbackPath = this.getFeedbackPath();
    await fs.mkdir(path.dirname(feedbackPath), { recursive: true });

    const row = {
      ...payload,
      createdAt: new Date().toISOString(),
      modelVersion: this.modelInfo?.modelVersion ?? MODEL_VERSION,
      trainedAt: this.modelInfo?.trainedAt ?? null,
      dataSource: this.modelInfo?.dataSource ?? null,
    };

    await fs.appendFile(feedbackPath, `${JSON.stringify(row)}\n`, "utf8");

    return {
      saved: true,
      filePath: feedbackPath,
      createdAt: row.createdAt,
    };
  }

  recommend(payload: RecommendationRequest): RecommendationApiResponse {
    if (!this.models || !this.modelInfo) {
      throw new Error("Recommendation model is not initialized");
    }

    const cleanedQuestions = cleanQuestions(payload.questions ?? []);
    if (cleanedQuestions.length === 0) {
      throw new Error("At least one valid assessment question is required");
    }

    const validIds = new Set(cleanedQuestions.map((question) => question.id));
    const iHaveSet = cleanAnswerIds(payload.iHave ?? [], validIds);
    const iHaveNotSet = cleanAnswerIds(payload.iHaveNot ?? [], validIds);
    for (const id of iHaveSet) {
      iHaveNotSet.delete(id);
    }

    const answeredSet = new Set([...iHaveSet, ...iHaveNotSet]);
    const answeredCount = answeredSet.size;
    const totalQuestions = cleanedQuestions.length;
    const completionRate = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
    const haveRate = answeredCount > 0 ? iHaveSet.size / answeredCount : 0;

    const competencyScores: CompetencyScore[] = competencyOrder.map((key) => {
      const taggedQuestions = cleanedQuestions.filter((question) => question.competencies.includes(key));
      const taggedIds = taggedQuestions.map((question) => question.id);
      const answeredTagged = taggedIds.filter((id) => answeredSet.has(id)).length;
      const haveTagged = taggedIds.filter((id) => iHaveSet.has(id)).length;
      const totalTagged = taggedIds.length;

      const noDirectEvidence = totalTagged === 0;
      const inferredBaseline = clamp01(haveRate * 0.78 + completionRate * 0.22);
      const haveRateForCompetency = noDirectEvidence
        ? inferredBaseline
        : answeredTagged > 0
          ? haveTagged / answeredTagged
          : inferredBaseline * 0.85;
      const coverageRate = noDirectEvidence ? completionRate : answeredTagged / totalTagged;
      const featureScore = clamp01(haveRateForCompetency * 0.72 + coverageRate * 0.28);

      return {
        key,
        label: competencyLabels[key],
        haveRate: haveRateForCompetency,
        coverageRate,
        featureScore,
        answeredCount: answeredTagged,
        totalTaggedQuestions: totalTagged,
      };
    });

    const featureVector = competencyOrder.map((key) => {
      const score = competencyScores.find((item) => item.key === key)?.featureScore ?? 0;
      return score;
    });

    const certificationSignals = computeCertificationSignals(cleanedQuestions, iHaveSet);
    const certificationSignalMap = certificationSignals.reduce(
      (acc, signal) => {
        acc[signal.key] = signal.value;
        return acc;
      },
      {
        sql_certification: 0,
        python_certification: 0,
        governance_certification: 0,
      } as Record<CertificationSignalKey, number>
    );

    const probabilities = predictEnsembleProbabilities(this.models, featureVector);

    const certificationContributionByCareer = new Map<
      string,
      Record<CertificationSignalKey, number>
    >();

    const rawCareerScores = this.profiles
      .map((profile, index) => ({
        pathKey: profile.pathKey,
        pathName: profile.pathName,
        careerName: profile.careerName,
        level: profile.level,
        logistic: clamp01(probabilities.logistic[index]),
        randomForest: clamp01(probabilities.randomForest[index]),
        gradientBoosting: clamp01(probabilities.gradientBoosting[index]),
        ensemble: clamp01(probabilities.ensemble[index]),
      }))
      .map((score) => {
        const affinity = certificationAffinity(score.pathKey);
        const contributions: Record<CertificationSignalKey, number> = {
          sql_certification:
            certificationSignalMap.sql_certification *
            affinity.sql_certification *
            CERTIFICATION_BOOST_SCALE,
          python_certification:
            certificationSignalMap.python_certification *
            affinity.python_certification *
            CERTIFICATION_BOOST_SCALE,
          governance_certification:
            certificationSignalMap.governance_certification *
            affinity.governance_certification *
            CERTIFICATION_BOOST_SCALE,
        };

        const totalBoost =
          contributions.sql_certification +
          contributions.python_certification +
          contributions.governance_certification;

        return {
          ...score,
          boostedEnsemble: clamp01(score.ensemble + totalBoost),
          certificationContributions: contributions,
        };
      });

    const normalizationTotal =
      rawCareerScores.reduce((sum, score) => sum + score.boostedEnsemble, 0) || 1;

    const allCareerScores: CareerAlgorithmScores[] = rawCareerScores
      .map((score) => {
        const normalizedContributions: Record<CertificationSignalKey, number> = {
          sql_certification: score.certificationContributions.sql_certification / normalizationTotal,
          python_certification: score.certificationContributions.python_certification / normalizationTotal,
          governance_certification:
            score.certificationContributions.governance_certification / normalizationTotal,
        };
        certificationContributionByCareer.set(
          `${score.pathKey}::${score.careerName}`,
          normalizedContributions
        );
        return {
          pathKey: score.pathKey,
          pathName: score.pathName,
          careerName: score.careerName,
          level: score.level,
          logistic: score.logistic,
          randomForest: score.randomForest,
          gradientBoosting: score.gradientBoosting,
          ensemble: clamp01(score.boostedEnsemble / normalizationTotal),
        };
      })
      .sort((a, b) => b.ensemble - a.ensemble);

    const topCareer = allCareerScores[0];
    const selectedCareerScore =
      payload.selectedPathKey && payload.selectedCareerName
        ? allCareerScores.find(
            (score) =>
              score.pathKey === payload.selectedPathKey &&
              score.careerName === payload.selectedCareerName
          ) ?? null
        : null;

    const selectedCareerRank = selectedCareerScore
      ? allCareerScores.findIndex(
          (score) =>
            score.pathKey === selectedCareerScore.pathKey &&
            score.careerName === selectedCareerScore.careerName
        ) + 1
      : null;

    const confidence = calibrateConfidence(this.models.confidenceCalibration, topCareer.ensemble);
    const topCareerIndex = this.profiles.findIndex(
      (profile) =>
        profile.pathKey === topCareer.pathKey && profile.careerName === topCareer.careerName
    );
    const explainabilityMethod =
      payload.explainabilityMethod === "shap" || payload.explainabilityMethod === "lime"
        ? payload.explainabilityMethod
        : "auto";
    const topCareerCertificationContributions =
      certificationContributionByCareer.get(`${topCareer.pathKey}::${topCareer.careerName}`) ??
      ({
        sql_certification: 0,
        python_certification: 0,
        governance_certification: 0,
      } as Record<CertificationSignalKey, number>);
    const explainability = buildCareerExplainability({
      models: this.models,
      featureVector,
      featureKeys: competencyOrder,
      labels: competencyLabels,
      careerIndex: topCareerIndex >= 0 ? topCareerIndex : 0,
      careerName: topCareer.careerName,
      pathKey: topCareer.pathKey,
      methodPreference: explainabilityMethod,
      additionalFactors: certificationSignals.map((signal) => ({
        key: signal.key,
        label: signal.label,
        value: signal.value,
        contribution: topCareerCertificationContributions[signal.key] ?? 0,
      })),
    });

    const pathScores = pathScoresFromCareers(allCareerScores);

    const topProfile = this.profiles.find(
      (profile) =>
        profile.pathKey === topCareer.pathKey && profile.careerName === topCareer.careerName
    );

    const competencyMap = new Map(competencyScores.map((item) => [item.key, item]));
    const priorityGaps: PriorityGap[] =
      topProfile === undefined
        ? []
        : (() => {
            const ranked = sortedCompetencies(topProfile.weights)
              .map((key) => {
                const current = competencyMap.get(key)?.featureScore ?? 0;
                const importance = topProfile.weights[key];
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
          })();

    const featureImportances: FeatureImportance[] = competencyOrder
      .map((key, index) => ({
        key,
        label: competencyLabels[key],
        logistic: this.models!.featureImportance.logistic[index],
        randomForest: this.models!.featureImportance.randomForest[index],
        gradientBoosting: this.models!.featureImportance.gradientBoosting[index],
        ensemble: this.models!.featureImportance.ensemble[index],
      }))
      .sort((a, b) => b.ensemble - a.ensemble);

    return {
      result: {
        topCareer,
        selectedCareerScore,
        selectedCareerRank,
        alternativeCareers: allCareerScores.slice(1, 4),
        allCareerScores,
        pathScores,
        competencyScores,
        certificationSignals,
        priorityGaps,
        featureImportances,
        explainability,
        summary: {
          completionRate,
          haveRate,
          answeredCount,
          totalQuestions,
          confidence,
          source: "backend",
        },
      },
      model: this.modelInfo,
    };
  }
}

export const recommendationService = new RecommendationService();
