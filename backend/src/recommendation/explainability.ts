import { predictEnsembleProbabilities, type TrainedEnsembleModels } from "./models.js";
import type {
  CertificationSignalKey,
  CareerPathKey,
  CompetencyKey,
  ExplainabilityFactor,
  ExplainabilityMethodReport,
  RecommendationExplainability,
} from "./types.js";
import { clamp01, SeededRng } from "./utils.js";

type LabelMap = Record<CompetencyKey, string>;

type ExplainerInput = {
  models: TrainedEnsembleModels;
  featureVector: number[];
  featureKeys: CompetencyKey[];
  labels: LabelMap;
  careerIndex: number;
  careerName: string;
  pathKey: CareerPathKey;
  methodPreference?: "auto" | "shap" | "lime";
  additionalFactors?: Array<{
    key: CertificationSignalKey;
    label: string;
    value: number;
    contribution: number;
  }>;
};

function scoreCareer(models: TrainedEnsembleModels, featureVector: number[], careerIndex: number) {
  const probabilities = predictEnsembleProbabilities(models, featureVector);
  return clamp01(probabilities.ensemble[careerIndex] ?? 0);
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const n = vector.length;
  const a = matrix.map((row) => [...row]);
  const b = [...vector];

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) {
        pivot = row;
      }
    }

    if (Math.abs(a[pivot][col]) < 1e-10) {
      return Array.from({ length: n }, () => 0);
    }

    if (pivot !== col) {
      const tempRow = a[col];
      a[col] = a[pivot];
      a[pivot] = tempRow;

      const tempB = b[col];
      b[col] = b[pivot];
      b[pivot] = tempB;
    }

    const pivotValue = a[col][col];
    for (let j = col; j < n; j += 1) {
      a[col][j] /= pivotValue;
    }
    b[col] /= pivotValue;

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = col; j < n; j += 1) {
        a[row][j] -= factor * a[col][j];
      }
      b[row] -= factor * b[col];
    }
  }

  return b;
}

function buildFactors(
  keys: CompetencyKey[],
  labels: LabelMap,
  featureVector: number[],
  contributions: number[]
) {
  const totalImpact = contributions.reduce((sum, value) => sum + Math.abs(value), 0) || 1;
  const factors: ExplainabilityFactor[] = keys.map((key, index) => ({
    key,
    label: labels[key],
    value: featureVector[index] ?? 0,
    contribution: contributions[index] ?? 0,
    impactPct: (Math.abs(contributions[index] ?? 0) / totalImpact) * 100,
    direction: (contributions[index] ?? 0) >= 0 ? "positive" : "negative",
  }));

  return factors.sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution));
}

function mergeAndNormalizeFactors(
  baseFactors: ExplainabilityFactor[],
  additionalFactors: Array<{
    key: CertificationSignalKey;
    label: string;
    value: number;
    contribution: number;
  }>
) {
  const merged: ExplainabilityFactor[] = [
    ...baseFactors.map((factor) => ({ ...factor, source: "competency" as const })),
    ...additionalFactors
      .filter((factor) => Math.abs(factor.contribution) > 1e-8)
      .map((factor) => ({
        key: factor.key,
        label: factor.label,
        value: factor.value,
        contribution: factor.contribution,
        impactPct: 0,
        direction: factor.contribution >= 0 ? ("positive" as const) : ("negative" as const),
        source: "certification" as const,
      })),
  ];

  const totalImpact = merged.reduce((sum, factor) => sum + Math.abs(factor.contribution), 0) || 1;
  const normalized = merged.map((factor) => ({
    ...factor,
    impactPct: (Math.abs(factor.contribution) / totalImpact) * 100,
  }));

  return normalized.sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution));
}

function formatImpactPct(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0%";
  }
  if (value >= 10) {
    return `${Math.round(value)}%`;
  }
  if (value >= 1) {
    return `${value.toFixed(1).replace(/\.0$/, "")}%`;
  }
  return `${value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

function toNaturalList(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildNarrative(careerName: string, factors: ExplainabilityFactor[]) {
  const topPositive = factors
    .filter((factor) => factor.contribution > 0)
    .sort((left, right) => right.contribution - left.contribution)
    .slice(0, 3);
  const topNegative = factors
    .filter((factor) => factor.contribution < 0)
    .sort((left, right) => left.contribution - right.contribution)[0];

  if (topPositive.length === 0) {
    if (topNegative) {
      return `We recommended ${careerName} because your overall profile aligns best with this role. The main factor reducing your score is ${topNegative.label}.`;
    }
    return `We recommended ${careerName} because your overall profile aligns best with this role.`;
  }

  const highlights = topPositive.map(
    (factor) => `${factor.label} (${formatImpactPct(factor.impactPct)})`
  );
  const topSignals = toNaturalList(highlights);

  let narrative = `We recommended ${careerName} because your strongest signals were ${topSignals}.`;
  narrative += " These signals contributed most to your match for this role.";
  if (topNegative) {
    narrative += ` The main area lowering your score is ${topNegative.label}.`;
  }
  return narrative;
}

function createMethodReport(args: {
  method: "shap" | "lime";
  careerName: string;
  pathKey: CareerPathKey;
  featureVector: number[];
  keys: CompetencyKey[];
  labels: LabelMap;
  contributions: number[];
  baseScore: number;
  predictedScore: number;
  reconstructedScore: number;
  fidelity: number;
  runtimeMs: number;
  additionalFactors?: Array<{
    key: CertificationSignalKey;
    label: string;
    value: number;
    contribution: number;
  }>;
}): ExplainabilityMethodReport {
  const baseFactors = buildFactors(args.keys, args.labels, args.featureVector, args.contributions);
  const factors = mergeAndNormalizeFactors(baseFactors, args.additionalFactors ?? []);
  return {
    method: args.method,
    careerName: args.careerName,
    pathKey: args.pathKey,
    baseScore: clamp01(args.baseScore),
    predictedScore: clamp01(args.predictedScore),
    reconstructedScore: clamp01(args.reconstructedScore),
    narrative: buildNarrative(args.careerName, factors),
    quality: {
      runtimeMs: args.runtimeMs,
      fidelity: clamp01(args.fidelity),
    },
    factors,
  };
}

function explainWithShap(
  models: TrainedEnsembleModels,
  featureVector: number[],
  careerIndex: number
) {
  const start = Date.now();
  const rng = new SeededRng(20260301 + careerIndex);
  const featureCount = featureVector.length;
  const means = models.featureStats?.means ?? Array.from({ length: featureCount }, () => 0.5);
  const permutations = Math.max(120, featureCount * 20);

  const contributions = Array.from({ length: featureCount }, () => 0);
  const baseline = means.map((value) => clamp01(value));
  const baseScore = scoreCareer(models, baseline, careerIndex);
  const predictedScore = scoreCareer(models, featureVector, careerIndex);

  for (let round = 0; round < permutations; round += 1) {
    const indices = Array.from({ length: featureCount }, (_, index) => index);
    rng.shuffle(indices);

    const current = [...baseline];
    let prevScore = scoreCareer(models, current, careerIndex);

    for (const index of indices) {
      current[index] = featureVector[index];
      const nextScore = scoreCareer(models, current, careerIndex);
      contributions[index] += nextScore - prevScore;
      prevScore = nextScore;
    }
  }

  for (let i = 0; i < contributions.length; i += 1) {
    contributions[i] /= permutations;
  }

  const reconstructed = baseScore + contributions.reduce((sum, value) => sum + value, 0);
  const error = Math.abs(reconstructed - predictedScore);
  const fidelity = clamp01(1 - error / 0.08);

  return {
    contributions,
    baseScore,
    predictedScore,
    reconstructedScore: reconstructed,
    fidelity,
    runtimeMs: Date.now() - start,
  };
}

function explainWithLime(
  models: TrainedEnsembleModels,
  featureVector: number[],
  careerIndex: number
) {
  const start = Date.now();
  const rng = new SeededRng(20260317 + careerIndex);
  const featureCount = featureVector.length;
  const means = models.featureStats?.means ?? Array.from({ length: featureCount }, () => 0.5);
  const stds = models.featureStats?.stds ?? Array.from({ length: featureCount }, () => 0.2);

  const sampleCount = 280;
  const kernelWidth = 0.9;
  const lambda = 1e-3;

  const samples: number[][] = [];
  const targets: number[] = [];
  const weights: number[] = [];

  for (let i = 0; i < sampleCount; i += 1) {
    const sample = featureVector.map((value, featureIndex) => {
      if (i === 0) return value;
      const keepOriginal = rng.next() > 0.18;
      if (!keepOriginal) {
        return means[featureIndex];
      }

      const noise = (rng.next() - 0.5) * 1.2 * (stds[featureIndex] || 0.2);
      return clamp01(value + noise);
    });

    const distance = Math.sqrt(
      sample.reduce((sum, value, featureIndex) => {
        const denom = Math.max(stds[featureIndex] || 0.2, 1e-3);
        const delta = (value - featureVector[featureIndex]) / denom;
        return sum + delta * delta;
      }, 0) / Math.max(1, featureCount)
    );
    const weight = Math.exp(-(distance * distance) / (kernelWidth * kernelWidth));

    samples.push(sample);
    targets.push(scoreCareer(models, sample, careerIndex));
    weights.push(weight);
  }

  const dim = featureCount + 1;
  const a = Array.from({ length: dim }, () => Array.from({ length: dim }, () => 0));
  const b = Array.from({ length: dim }, () => 0);

  for (let row = 0; row < samples.length; row += 1) {
    const x = [1, ...samples[row]];
    const y = targets[row];
    const w = weights[row];

    for (let i = 0; i < dim; i += 1) {
      b[i] += w * x[i] * y;
      for (let j = 0; j < dim; j += 1) {
        a[i][j] += w * x[i] * x[j];
      }
    }
  }

  for (let i = 0; i < dim; i += 1) {
    a[i][i] += lambda;
  }

  const beta = solveLinearSystem(a, b);
  const intercept = beta[0] ?? 0;
  const coefs = beta.slice(1);

  const baseScore = scoreCareer(models, means, careerIndex);
  const contributions = coefs.map(
    (coef, featureIndex) => coef * (featureVector[featureIndex] - means[featureIndex])
  );
  const predictedScore = scoreCareer(models, featureVector, careerIndex);
  const reconstructedScore = intercept + coefs.reduce((sum, coef, index) => sum + coef * featureVector[index], 0);

  const weightedTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
  const weightedMeanY =
    targets.reduce((sum, value, index) => sum + value * weights[index], 0) / weightedTotal;
  const sse = targets.reduce((sum, value, index) => {
    const predicted =
      intercept + coefs.reduce((acc, coef, featureIndex) => acc + coef * samples[index][featureIndex], 0);
    const err = value - predicted;
    return sum + weights[index] * err * err;
  }, 0);
  const sst = targets.reduce((sum, value, index) => {
    const err = value - weightedMeanY;
    return sum + weights[index] * err * err;
  }, 0);
  const fidelity = sst > 1e-12 ? clamp01(1 - sse / sst) : 0.5;

  const centeredContrib = contributions;
  const reconstructedFromCentered = baseScore + centeredContrib.reduce((sum, value) => sum + value, 0);

  return {
    contributions: centeredContrib,
    baseScore,
    predictedScore,
    reconstructedScore: reconstructedFromCentered || reconstructedScore,
    fidelity,
    runtimeMs: Date.now() - start,
  };
}

export function buildCareerExplainability({
  models,
  featureVector,
  featureKeys,
  labels,
  careerIndex,
  careerName,
  pathKey,
  methodPreference = "auto",
  additionalFactors = [],
}: ExplainerInput): RecommendationExplainability {
  const shap = explainWithShap(models, featureVector, careerIndex);
  const lime = explainWithLime(models, featureVector, careerIndex);

  const shapReport = createMethodReport({
    method: "shap",
    careerName,
    pathKey,
    featureVector,
    keys: featureKeys,
    labels,
    contributions: shap.contributions,
    baseScore: shap.baseScore,
    predictedScore: shap.predictedScore,
    reconstructedScore: shap.reconstructedScore,
    fidelity: shap.fidelity,
    runtimeMs: shap.runtimeMs,
    additionalFactors: additionalFactors ?? [],
  });
  const limeReport = createMethodReport({
    method: "lime",
    careerName,
    pathKey,
    featureVector,
    keys: featureKeys,
    labels,
    contributions: lime.contributions,
    baseScore: lime.baseScore,
    predictedScore: lime.predictedScore,
    reconstructedScore: lime.reconstructedScore,
    fidelity: lime.fidelity,
    runtimeMs: lime.runtimeMs,
    additionalFactors: additionalFactors ?? [],
  });

  const shapScore = shapReport.quality.fidelity - shapReport.quality.runtimeMs / 15000;
  const limeScore = limeReport.quality.fidelity - limeReport.quality.runtimeMs / 15000;

  let selectedMethod: "shap" | "lime";
  if (methodPreference === "shap" || methodPreference === "lime") {
    selectedMethod = methodPreference;
  } else {
    selectedMethod = shapScore >= limeScore - 0.01 ? "shap" : "lime";
  }

  const reason =
    selectedMethod === "shap"
      ? "SHAP was selected because it provides additive, more stable contributions while keeping comparable or better fidelity."
      : "LIME was selected because it achieved higher local surrogate fidelity for this prediction.";

  return {
    selectedMethod,
    reason,
    topCareer: selectedMethod === "shap" ? shapReport : limeReport,
    comparison: {
      shap: shapReport,
      lime: limeReport,
    },
  };
}
