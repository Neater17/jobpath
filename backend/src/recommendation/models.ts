import type { TrainingSample } from "./dataset.js";
import { clamp01, mean, sigmoid, softmax, squaredError, SeededRng } from "./utils.js";

export type EnsembleWeights = {
  logistic: number;
  randomForest: number;
  gradientBoosting: number;
};

type LogisticModel = {
  weights: number[][];
  bias: number[];
  featureImportance: number[];
};

type TreeNode = {
  probs: number[];
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
};

type RandomForestModel = {
  trees: TreeNode[];
  featureImportance: number[];
};

type GradientBoostingStump = {
  feature: number;
  threshold: number;
  leftValue: number;
  rightValue: number;
  gain: number;
};

type GradientBoostingModel = {
  classStumps: GradientBoostingStump[][];
  learningRate: number;
  featureImportance: number[];
};

export type EvaluationMetrics = {
  sampleCount: number;
  top1: number;
  top3: number;
  logLoss: number;
  brier: number;
  ece: number;
};

export type ConfidenceCalibrationBin = {
  min: number;
  max: number;
  count: number;
  accuracy: number;
  avgConfidence: number;
};

export type ConfidenceCalibration = {
  binCount: number;
  fallbackAccuracy: number;
  bins: ConfidenceCalibrationBin[];
};

export type TrainingDiagnostics = {
  split: {
    train: number;
    validation: number;
    test: number;
  };
  metrics: {
    logistic: EvaluationMetrics;
    randomForest: EvaluationMetrics;
    gradientBoosting: EvaluationMetrics;
    ensemble: EvaluationMetrics;
  };
};

export type TrainedEnsembleModels = {
  logistic: LogisticModel;
  randomForest: RandomForestModel;
  gradientBoosting: GradientBoostingModel;
  featureStats: {
    means: number[];
    stds: number[];
  };
  ensembleWeights: EnsembleWeights;
  confidenceCalibration: ConfidenceCalibration;
  diagnostics: TrainingDiagnostics;
  featureImportance: {
    logistic: number[];
    randomForest: number[];
    gradientBoosting: number[];
    ensemble: number[];
  };
};

const DEFAULT_ENSEMBLE_WEIGHTS: EnsembleWeights = {
  logistic: 0.35,
  randomForest: 0.45,
  gradientBoosting: 0.2,
};

function normalizeImportance(values: number[]) {
  const max = Math.max(...values, 0);
  if (max <= 0) {
    return values.map(() => 0);
  }
  return values.map((value) => value / max);
}

function dot(left: number[], right: number[]) {
  let total = 0;
  for (let i = 0; i < left.length; i += 1) {
    total += left[i] * right[i];
  }
  return total;
}

function ensureDistribution(values: number[]) {
  const bounded = values.map((value) => (Number.isFinite(value) ? Math.max(0, value) : 0));
  const total = bounded.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    const equal = 1 / bounded.length;
    return bounded.map(() => equal);
  }
  return bounded.map((value) => value / total);
}

function trainLogisticOneVsRest(
  samples: TrainingSample[],
  numClasses: number,
  numFeatures: number
): LogisticModel {
  const rng = new SeededRng(880301);
  const weights: number[][] = Array.from({ length: numClasses }, () =>
    Array.from({ length: numFeatures }, () => (rng.next() - 0.5) * 0.03)
  );
  const bias = Array.from({ length: numClasses }, () => 0);
  const featureImportance = Array.from({ length: numFeatures }, () => 0);

  for (let classIndex = 0; classIndex < numClasses; classIndex += 1) {
    const w = weights[classIndex];
    let b = bias[classIndex];
    let learningRate = 0.22;
    const l2 = 0.002;
    const epochs = 260;

    for (let epoch = 0; epoch < epochs; epoch += 1) {
      const gradW = Array.from({ length: numFeatures }, () => 0);
      let gradB = 0;

      for (const sample of samples) {
        const y = sample.label === classIndex ? 1 : 0;
        const z = dot(w, sample.features) + b;
        const p = sigmoid(z);
        const err = p - y;

        for (let featureIndex = 0; featureIndex < numFeatures; featureIndex += 1) {
          gradW[featureIndex] += err * sample.features[featureIndex];
        }
        gradB += err;
      }

      const scale = 1 / samples.length;
      for (let featureIndex = 0; featureIndex < numFeatures; featureIndex += 1) {
        w[featureIndex] -= learningRate * (gradW[featureIndex] * scale + l2 * w[featureIndex]);
      }
      b -= learningRate * gradB * scale;
      learningRate *= 0.995;
    }

    bias[classIndex] = b;
    for (let featureIndex = 0; featureIndex < numFeatures; featureIndex += 1) {
      featureImportance[featureIndex] += Math.abs(w[featureIndex]);
    }
  }

  return {
    weights,
    bias,
    featureImportance: normalizeImportance(featureImportance),
  };
}

function sampleFeatureSubset(numFeatures: number, desiredCount: number, rng: SeededRng) {
  const all = Array.from({ length: numFeatures }, (_, index) => index);
  rng.shuffle(all);
  return all.slice(0, Math.max(1, Math.min(desiredCount, numFeatures)));
}

function classCounts(indices: number[], samples: TrainingSample[], numClasses: number) {
  const counts = Array.from({ length: numClasses }, () => 0);
  for (const index of indices) {
    counts[samples[index].label] += 1;
  }
  return counts;
}

function giniFromCounts(counts: number[]) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return 0;
  let squared = 0;
  for (const count of counts) {
    const p = count / total;
    squared += p * p;
  }
  return 1 - squared;
}

function distributionFromCounts(counts: number[]) {
  const total = counts.reduce((sum, count) => sum + count, 0) || 1;
  return counts.map((count) => count / total);
}

function trainRandomForest(
  samples: TrainingSample[],
  numClasses: number,
  numFeatures: number
): RandomForestModel {
  const rng = new SeededRng(227901);
  const trees: TreeNode[] = [];
  const featureImportance = Array.from({ length: numFeatures }, () => 0);
  const treeCount = 85;
  const maxDepth = 5;
  const minSamplesSplit = 14;
  const thresholdCandidates = 10;
  const mtry = Math.max(3, Math.floor(Math.sqrt(numFeatures)));

  const buildTree = (indices: number[], depth: number): TreeNode => {
    const counts = classCounts(indices, samples, numClasses);
    const probs = distributionFromCounts(counts);
    const total = indices.length;
    const nonZeroClasses = counts.filter((count) => count > 0).length;

    if (depth >= maxDepth || total < minSamplesSplit || nonZeroClasses <= 1) {
      return { probs };
    }

    const parentGini = giniFromCounts(counts);
    const candidateFeatures = sampleFeatureSubset(numFeatures, mtry, rng);

    let bestFeature = -1;
    let bestThreshold = 0;
    let bestGain = 0;
    let bestLeft: number[] = [];
    let bestRight: number[] = [];

    for (const feature of candidateFeatures) {
      let minValue = Number.POSITIVE_INFINITY;
      let maxValue = Number.NEGATIVE_INFINITY;

      for (const index of indices) {
        const value = samples[index].features[feature];
        if (value < minValue) minValue = value;
        if (value > maxValue) maxValue = value;
      }

      if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || maxValue - minValue < 1e-6) {
        continue;
      }

      for (let t = 1; t <= thresholdCandidates; t += 1) {
        const threshold = minValue + ((maxValue - minValue) * t) / (thresholdCandidates + 1);
        const left: number[] = [];
        const right: number[] = [];

        for (const index of indices) {
          const value = samples[index].features[feature];
          if (value <= threshold) left.push(index);
          else right.push(index);
        }

        if (left.length === 0 || right.length === 0) continue;

        const leftGini = giniFromCounts(classCounts(left, samples, numClasses));
        const rightGini = giniFromCounts(classCounts(right, samples, numClasses));
        const weightedChildGini = (left.length / total) * leftGini + (right.length / total) * rightGini;
        const gain = parentGini - weightedChildGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = feature;
          bestThreshold = threshold;
          bestLeft = left;
          bestRight = right;
        }
      }
    }

    if (bestFeature < 0 || bestGain < 1e-5) {
      return { probs };
    }

    featureImportance[bestFeature] += bestGain * total;

    return {
      probs,
      feature: bestFeature,
      threshold: bestThreshold,
      left: buildTree(bestLeft, depth + 1),
      right: buildTree(bestRight, depth + 1),
    };
  };

  for (let treeIndex = 0; treeIndex < treeCount; treeIndex += 1) {
    const bootstrap: number[] = [];
    for (let i = 0; i < samples.length; i += 1) {
      bootstrap.push(rng.int(samples.length));
    }
    trees.push(buildTree(bootstrap, 0));
  }

  return {
    trees,
    featureImportance: normalizeImportance(featureImportance),
  };
}

function predictTree(tree: TreeNode, features: number[]): number[] {
  if (tree.feature === undefined || tree.threshold === undefined || !tree.left || !tree.right) {
    return tree.probs;
  }
  if (features[tree.feature] <= tree.threshold) {
    return predictTree(tree.left, features);
  }
  return predictTree(tree.right, features);
}

function fitRegressionStump(
  samples: TrainingSample[],
  residuals: number[],
  numFeatures: number
): GradientBoostingStump {
  const parentMean = mean(residuals);
  const parentSse = squaredError(residuals, parentMean);
  const thresholdCandidates = 11;

  let best: GradientBoostingStump | null = null;

  for (let feature = 0; feature < numFeatures; feature += 1) {
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;

    for (const sample of samples) {
      const value = sample.features[feature];
      if (value < minValue) minValue = value;
      if (value > maxValue) maxValue = value;
    }

    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || maxValue - minValue < 1e-6) {
      continue;
    }

    for (let t = 1; t <= thresholdCandidates; t += 1) {
      const threshold = minValue + ((maxValue - minValue) * t) / (thresholdCandidates + 1);
      const leftResiduals: number[] = [];
      const rightResiduals: number[] = [];

      for (let i = 0; i < samples.length; i += 1) {
        if (samples[i].features[feature] <= threshold) leftResiduals.push(residuals[i]);
        else rightResiduals.push(residuals[i]);
      }

      if (leftResiduals.length < 2 || rightResiduals.length < 2) continue;

      const leftMean = mean(leftResiduals);
      const rightMean = mean(rightResiduals);
      const childSse = squaredError(leftResiduals, leftMean) + squaredError(rightResiduals, rightMean);
      const gain = parentSse - childSse;

      if (!best || gain > best.gain) {
        best = {
          feature,
          threshold,
          leftValue: leftMean,
          rightValue: rightMean,
          gain,
        };
      }
    }
  }

  if (!best) {
    return {
      feature: 0,
      threshold: 0.5,
      leftValue: parentMean,
      rightValue: parentMean,
      gain: 0,
    };
  }

  return best;
}

function trainGradientBoosting(
  samples: TrainingSample[],
  numClasses: number,
  numFeatures: number
): GradientBoostingModel {
  const rounds = 46;
  const learningRate = 0.17;
  const classStumps: GradientBoostingStump[][] = Array.from({ length: numClasses }, () => []);
  const featureImportance = Array.from({ length: numFeatures }, () => 0);
  const scoreMatrix = Array.from({ length: samples.length }, () =>
    Array.from({ length: numClasses }, () => 0)
  );

  for (let round = 0; round < rounds; round += 1) {
    const probabilityMatrix = scoreMatrix.map((scores) => softmax(scores));

    for (let classIndex = 0; classIndex < numClasses; classIndex += 1) {
      const residuals = samples.map((sample, index) => {
        const y = sample.label === classIndex ? 1 : 0;
        const p = probabilityMatrix[index][classIndex];
        return y - p;
      });

      const stump = fitRegressionStump(samples, residuals, numFeatures);
      classStumps[classIndex].push(stump);
      featureImportance[stump.feature] += Math.max(0, stump.gain);

      for (let index = 0; index < samples.length; index += 1) {
        const value =
          samples[index].features[stump.feature] <= stump.threshold
            ? stump.leftValue
            : stump.rightValue;
        scoreMatrix[index][classIndex] += learningRate * value;
      }
    }
  }

  return {
    classStumps,
    learningRate,
    featureImportance: normalizeImportance(featureImportance),
  };
}

function predictLogistic(model: LogisticModel, features: number[]): number[] {
  const raw = model.weights.map((weights, classIndex) =>
    sigmoid(dot(weights, features) + model.bias[classIndex])
  );
  return ensureDistribution(raw);
}

function predictRandomForest(model: RandomForestModel, features: number[]): number[] {
  const aggregate = Array.from({ length: model.trees[0]?.probs.length ?? 1 }, () => 0);
  for (const tree of model.trees) {
    const probs = predictTree(tree, features);
    for (let classIndex = 0; classIndex < probs.length; classIndex += 1) {
      aggregate[classIndex] += probs[classIndex];
    }
  }
  const averaged = aggregate.map((value) => value / Math.max(1, model.trees.length));
  return ensureDistribution(averaged);
}

function predictGradientBoosting(model: GradientBoostingModel, features: number[]): number[] {
  const scores = model.classStumps.map((stumps) =>
    stumps.reduce((acc, stump) => {
      const leafValue = features[stump.feature] <= stump.threshold ? stump.leftValue : stump.rightValue;
      return acc + model.learningRate * leafValue;
    }, 0)
  );
  return ensureDistribution(softmax(scores));
}

function splitSamples(samples: TrainingSample[]) {
  const shuffled = [...samples];
  const rng = new SeededRng(20260301);
  rng.shuffle(shuffled);

  if (shuffled.length < 12) {
    return {
      train: shuffled,
      validation: shuffled,
      test: shuffled,
    };
  }

  const total = shuffled.length;
  let testCount = Math.max(1, Math.floor(total * 0.1));
  let validationCount = Math.max(1, Math.floor(total * 0.1));
  let trainCount = total - validationCount - testCount;

  while (trainCount < 1 && (validationCount > 1 || testCount > 1)) {
    if (validationCount > testCount && validationCount > 1) validationCount -= 1;
    else if (testCount > 1) testCount -= 1;
    trainCount = total - validationCount - testCount;
  }

  const train = shuffled.slice(0, trainCount);
  const validation = shuffled.slice(trainCount, trainCount + validationCount);
  const test = shuffled.slice(trainCount + validationCount);

  return {
    train: train.length > 0 ? train : shuffled,
    validation: validation.length > 0 ? validation : shuffled,
    test: test.length > 0 ? test : shuffled,
  };
}

function computeFeatureStats(samples: TrainingSample[], numFeatures: number) {
  if (samples.length === 0) {
    return {
      means: Array.from({ length: numFeatures }, () => 0.5),
      stds: Array.from({ length: numFeatures }, () => 0.2),
    };
  }

  const means = Array.from({ length: numFeatures }, (_, featureIndex) =>
    samples.reduce((sum, sample) => sum + (sample.features[featureIndex] ?? 0), 0) / samples.length
  );

  const stds = Array.from({ length: numFeatures }, (_, featureIndex) => {
    const variance =
      samples.reduce((sum, sample) => {
        const delta = (sample.features[featureIndex] ?? 0) - means[featureIndex];
        return sum + delta * delta;
      }, 0) / samples.length;
    return Math.max(0.04, Math.sqrt(variance));
  });

  return { means, stds };
}

function evaluateProbabilities(
  probabilities: number[][],
  labels: number[],
  numClasses: number,
  bins = 10
): EvaluationMetrics {
  const sampleCount = Math.max(1, probabilities.length);
  let top1Hits = 0;
  let top3Hits = 0;
  let logLossSum = 0;
  let brierSum = 0;

  const binStats = Array.from({ length: bins }, () => ({
    count: 0,
    confidenceSum: 0,
    correctSum: 0,
  }));

  for (let i = 0; i < probabilities.length; i += 1) {
    const probs = ensureDistribution(probabilities[i]);
    const label = labels[i] ?? 0;

    let bestIndex = 0;
    let bestValue = probs[0] ?? 0;
    for (let j = 1; j < probs.length; j += 1) {
      if (probs[j] > bestValue) {
        bestValue = probs[j];
        bestIndex = j;
      }
    }

    if (bestIndex === label) top1Hits += 1;

    const topIndices = probs
      .map((value, index) => ({ value, index }))
      .sort((left, right) => right.value - left.value)
      .slice(0, Math.min(3, probs.length))
      .map((entry) => entry.index);
    if (topIndices.includes(label)) top3Hits += 1;

    const pTrue = Math.max(1e-12, probs[label] ?? 0);
    logLossSum += -Math.log(pTrue);

    for (let classIndex = 0; classIndex < numClasses; classIndex += 1) {
      const target = classIndex === label ? 1 : 0;
      const diff = (probs[classIndex] ?? 0) - target;
      brierSum += diff * diff;
    }

    const confidence = clamp01(bestValue);
    const binIndex = Math.min(bins - 1, Math.floor(confidence * bins));
    binStats[binIndex].count += 1;
    binStats[binIndex].confidenceSum += confidence;
    binStats[binIndex].correctSum += bestIndex === label ? 1 : 0;
  }

  let ece = 0;
  binStats.forEach((bin) => {
    if (bin.count <= 0) return;
    const accuracy = bin.correctSum / bin.count;
    const avgConfidence = bin.confidenceSum / bin.count;
    ece += Math.abs(accuracy - avgConfidence) * (bin.count / sampleCount);
  });

  return {
    sampleCount: probabilities.length,
    top1: top1Hits / sampleCount,
    top3: top3Hits / sampleCount,
    logLoss: logLossSum / sampleCount,
    brier: brierSum / sampleCount,
    ece,
  };
}

function combineProbabilities(
  logistic: number[],
  randomForest: number[],
  gradientBoosting: number[],
  weights: EnsembleWeights
) {
  const raw = logistic.map(
    (value, index) =>
      value * weights.logistic +
      randomForest[index] * weights.randomForest +
      gradientBoosting[index] * weights.gradientBoosting
  );
  return ensureDistribution(raw);
}

function tuneEnsembleWeights(
  logistic: number[][],
  randomForest: number[][],
  gradientBoosting: number[][],
  labels: number[],
  numClasses: number
): EnsembleWeights {
  const steps = 20;
  let bestWeights = DEFAULT_ENSEMBLE_WEIGHTS;
  let bestMetrics = evaluateProbabilities(
    logistic.map((probs, index) =>
      combineProbabilities(probs, randomForest[index], gradientBoosting[index], bestWeights)
    ),
    labels,
    numClasses
  );

  for (let l = 0; l <= steps; l += 1) {
    for (let rf = 0; rf <= steps - l; rf += 1) {
      const gb = steps - l - rf;
      const candidate: EnsembleWeights = {
        logistic: l / steps,
        randomForest: rf / steps,
        gradientBoosting: gb / steps,
      };
      const metrics = evaluateProbabilities(
        logistic.map((probs, index) =>
          combineProbabilities(probs, randomForest[index], gradientBoosting[index], candidate)
        ),
        labels,
        numClasses
      );

      if (
        metrics.logLoss < bestMetrics.logLoss - 1e-8 ||
        (Math.abs(metrics.logLoss - bestMetrics.logLoss) <= 1e-8 && metrics.top1 > bestMetrics.top1)
      ) {
        bestWeights = candidate;
        bestMetrics = metrics;
      }
    }
  }

  return bestWeights;
}

function collectProbabilities(
  logisticModel: LogisticModel,
  randomForestModel: RandomForestModel,
  gradientBoostingModel: GradientBoostingModel,
  samples: TrainingSample[]
) {
  const logistic = samples.map((sample) => predictLogistic(logisticModel, sample.features));
  const randomForest = samples.map((sample) => predictRandomForest(randomForestModel, sample.features));
  const gradientBoosting = samples.map((sample) =>
    predictGradientBoosting(gradientBoostingModel, sample.features)
  );

  return {
    logistic,
    randomForest,
    gradientBoosting,
  };
}

function buildConfidenceCalibration(
  probabilities: number[][],
  labels: number[],
  binCount = 12
): ConfidenceCalibration {
  const bins = Array.from({ length: binCount }, (_, index) => ({
    min: index / binCount,
    max: (index + 1) / binCount,
    count: 0,
    confidenceSum: 0,
    correctSum: 0,
  }));

  let totalCorrect = 0;

  for (let i = 0; i < probabilities.length; i += 1) {
    const probs = ensureDistribution(probabilities[i]);
    const label = labels[i] ?? 0;

    let bestIndex = 0;
    let bestValue = probs[0] ?? 0;
    for (let j = 1; j < probs.length; j += 1) {
      if (probs[j] > bestValue) {
        bestValue = probs[j];
        bestIndex = j;
      }
    }

    const confidence = clamp01(bestValue);
    const binIndex = Math.min(binCount - 1, Math.floor(confidence * binCount));
    const bin = bins[binIndex];
    bin.count += 1;
    bin.confidenceSum += confidence;

    if (bestIndex === label) {
      bin.correctSum += 1;
      totalCorrect += 1;
    }
  }

  return {
    binCount,
    fallbackAccuracy: probabilities.length > 0 ? totalCorrect / probabilities.length : 0.5,
    bins: bins.map((bin) => ({
      min: bin.min,
      max: bin.max,
      count: bin.count,
      accuracy: bin.count > 0 ? bin.correctSum / bin.count : 0,
      avgConfidence: bin.count > 0 ? bin.confidenceSum / bin.count : 0,
    })),
  };
}

export function calibrateConfidence(calibration: ConfidenceCalibration, rawConfidence: number) {
  const bounded = clamp01(rawConfidence);
  const matched = calibration.bins.find(
    (bin) => bounded >= bin.min && (bounded < bin.max || bin.max >= 1)
  );
  if (!matched || matched.count <= 0) {
    return clamp01(calibration.fallbackAccuracy);
  }
  return clamp01(matched.accuracy);
}

export function trainEnsembleModels(
  samples: TrainingSample[],
  numClasses: number,
  numFeatures: number
): TrainedEnsembleModels {
  const split = splitSamples(samples);
  const trainSamples = split.train;
  const validationSamples = split.validation;
  const testSamples = split.test;

  const logistic = trainLogisticOneVsRest(trainSamples, numClasses, numFeatures);
  const randomForest = trainRandomForest(trainSamples, numClasses, numFeatures);
  const gradientBoosting = trainGradientBoosting(trainSamples, numClasses, numFeatures);
  const featureStats = computeFeatureStats(trainSamples, numFeatures);

  const validationProbs = collectProbabilities(logistic, randomForest, gradientBoosting, validationSamples);
  const validationLabels = validationSamples.map((sample) => sample.label);

  const tunedWeights = tuneEnsembleWeights(
    validationProbs.logistic,
    validationProbs.randomForest,
    validationProbs.gradientBoosting,
    validationLabels,
    numClasses
  );

  const logisticImportance = normalizeImportance(logistic.featureImportance);
  const randomForestImportance = normalizeImportance(randomForest.featureImportance);
  const gradientBoostingImportance = normalizeImportance(gradientBoosting.featureImportance);
  const ensembleImportance = normalizeImportance(
    logisticImportance.map(
      (value, index) =>
        value * tunedWeights.logistic +
        randomForestImportance[index] * tunedWeights.randomForest +
        gradientBoostingImportance[index] * tunedWeights.gradientBoosting
    )
  );

  const testProbs = collectProbabilities(logistic, randomForest, gradientBoosting, testSamples);
  const testLabels = testSamples.map((sample) => sample.label);

  const ensembleTestProbs = testProbs.logistic.map((probs, index) =>
    combineProbabilities(probs, testProbs.randomForest[index], testProbs.gradientBoosting[index], tunedWeights)
  );

  const validationEnsembleProbs = validationProbs.logistic.map((probs, index) =>
    combineProbabilities(
      probs,
      validationProbs.randomForest[index],
      validationProbs.gradientBoosting[index],
      tunedWeights
    )
  );

  return {
    logistic,
    randomForest,
    gradientBoosting,
    featureStats,
    ensembleWeights: tunedWeights,
    confidenceCalibration: buildConfidenceCalibration(validationEnsembleProbs, validationLabels),
    diagnostics: {
      split: {
        train: trainSamples.length,
        validation: validationSamples.length,
        test: testSamples.length,
      },
      metrics: {
        logistic: evaluateProbabilities(testProbs.logistic, testLabels, numClasses),
        randomForest: evaluateProbabilities(testProbs.randomForest, testLabels, numClasses),
        gradientBoosting: evaluateProbabilities(testProbs.gradientBoosting, testLabels, numClasses),
        ensemble: evaluateProbabilities(ensembleTestProbs, testLabels, numClasses),
      },
    },
    featureImportance: {
      logistic: logisticImportance,
      randomForest: randomForestImportance,
      gradientBoosting: gradientBoostingImportance,
      ensemble: ensembleImportance,
    },
  };
}

export function predictEnsembleProbabilities(models: TrainedEnsembleModels, features: number[]) {
  const logistic = predictLogistic(models.logistic, features);
  const randomForest = predictRandomForest(models.randomForest, features);
  const gradientBoosting = predictGradientBoosting(models.gradientBoosting, features);

  const ensemble = combineProbabilities(
    logistic,
    randomForest,
    gradientBoosting,
    models.ensembleWeights ?? DEFAULT_ENSEMBLE_WEIGHTS
  );

  return {
    logistic,
    randomForest,
    gradientBoosting,
    ensemble,
  };
}
