import {
  buildCareerProfiles,
  competencyLabels,
  competencyOrder,
  gapRecommendations,
} from "./catalog.js";
import { loadOrBuildTrainingDataset } from "./dataset.js";
import { predictEnsembleProbabilities, trainEnsembleModels, type TrainedEnsembleModels } from "./models.js";
import type {
  CareerAlgorithmScores,
  CareerPathKey,
  CompetencyKey,
  CompetencyScore,
  FeatureImportance,
  ModelInfo,
  PathScore,
  PriorityGap,
  RecommendationApiResponse,
  RecommendationQuestion,
  RecommendationRequest,
} from "./types.js";
import { clamp01 } from "./utils.js";

const ENSEMBLE_WEIGHTS = {
  logistic: 0.35,
  randomForest: 0.45,
  gradientBoosting: 0.2,
} as const;

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

function calibrateScores(rawScores: number[]) {
  const mean = rawScores.reduce((sum, value) => sum + value, 0) / Math.max(1, rawScores.length);
  const variance =
    rawScores.reduce((sum, value) => {
      const delta = value - mean;
      return sum + delta * delta;
    }, 0) / Math.max(1, rawScores.length);
  const std = Math.sqrt(variance);

  if (!Number.isFinite(std) || std < 1e-9) {
    return rawScores.map(() => 0.5);
  }

  return rawScores.map((value) => {
    const z = (value - mean) / (std * 1.15);
    return clamp01(1 / (1 + Math.exp(-z)));
  });
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

export class RecommendationService {
  private models: TrainedEnsembleModels | null = null;

  private modelInfo: ModelInfo | null = null;

  private readonly profiles = buildCareerProfiles();

  async init(datasetPath?: string) {
    const dataset = await loadOrBuildTrainingDataset(this.profiles, competencyOrder, datasetPath);
    this.models = trainEnsembleModels(
      dataset.samples,
      this.profiles.length,
      competencyOrder.length
    );
    this.modelInfo = {
      trainedAt: new Date().toISOString(),
      sampleCount: dataset.samples.length,
      featureCount: competencyOrder.length,
      classCount: this.profiles.length,
      dataSource: dataset.dataSource,
    };
  }

  async retrain(datasetPath?: string) {
    await this.init(datasetPath);
    return this.getModelInfo();
  }

  getModelInfo() {
    if (!this.modelInfo) {
      throw new Error("Recommendation model is not initialized");
    }
    return this.modelInfo;
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

      // If a competency has no tagged questions in this assessment, infer readiness from
      // overall behavior instead of forcing it to 0.
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

    const probabilities = predictEnsembleProbabilities(this.models, featureVector);
    const logisticScores = calibrateScores(probabilities.logistic);
    const randomForestScores = calibrateScores(probabilities.randomForest);
    const gradientBoostingScores = calibrateScores(probabilities.gradientBoosting);
    const ensembleScores = logisticScores.map((value, index) =>
      clamp01(
        value * ENSEMBLE_WEIGHTS.logistic +
          randomForestScores[index] * ENSEMBLE_WEIGHTS.randomForest +
          gradientBoostingScores[index] * ENSEMBLE_WEIGHTS.gradientBoosting
      )
    );

    const allCareerScores: CareerAlgorithmScores[] = this.profiles
      .map((profile, index) => ({
        pathKey: profile.pathKey,
        pathName: profile.pathName,
        careerName: profile.careerName,
        level: profile.level,
        logistic: logisticScores[index],
        randomForest: randomForestScores[index],
        gradientBoosting: gradientBoostingScores[index],
        ensemble: ensembleScores[index],
      }))
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

    const runnerUpScore = allCareerScores[1]?.ensemble ?? topCareer.ensemble;
    const confidence = clamp01(
      0.46 + (topCareer.ensemble - runnerUpScore) * 1.25 + completionRate * 0.24
    );

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
        priorityGaps,
        featureImportances,
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
