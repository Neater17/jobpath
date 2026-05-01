import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import {
  analyzeCvRecommendations,
  createRecommendations,
  getRecommendationModelInfo,
  getRecommendationModelSnapshot,
  submitRecommendationFeedback,
} from "./recommendations.controller.js";
import { recommendationService } from "../recommendation/service.js";

type MockResponse = {
  statusCode?: number;
  jsonBody?: unknown;
  headersSent?: boolean;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
};

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    jsonBody: undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.jsonBody = body;
      this.headersSent = true;
      return this;
    },
  } satisfies MockResponse;

  return response;
};

const asResponse = (response: MockResponse) => response as unknown as import("express").Response;
const createRequest = <TBody>(body: TBody) => ({ body, query: {} }) as Request;

test("createRecommendations returns recommendation data for a valid payload", async (t) => {
  const response = createMockResponse();

  t.mock.method(recommendationService, "recommend", async () => ({
    result: { topCareer: { careerName: "BI Analyst" } },
    model: { sampleCount: 100 },
  }) as never);

  await createRecommendations(
    createRequest({
      selectedPathKey: "business_intelligence",
      selectedCareerName: "BI Analyst",
      iHave: ["q1"],
      iHaveNot: ["q2"],
      questions: [{ id: "q1", competencies: ["business_strategy"] }],
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.jsonBody, {
    result: { topCareer: { careerName: "BI Analyst" } },
    model: { sampleCount: 100 },
  });
});

test("createRecommendations rejects invalid payloads", async () => {
  const response = createMockResponse();

  await createRecommendations(
    createRequest({
      selectedPathKey: "business_intelligence",
      selectedCareerName: "BI Analyst",
      iHave: "bad",
    } as unknown),
    asResponse(response)
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.jsonBody, {
    message: "Invalid recommendation request payload",
  });
});

test("getRecommendationModelInfo returns a degraded response when model info is unavailable", async (t) => {
  const response = createMockResponse();

  t.mock.method(recommendationService, "getModelInfo", () => {
    throw new Error("Recommendation model is unavailable: ML service offline");
  });

  await getRecommendationModelInfo(createRequest({}), asResponse(response));

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.jsonBody, {
    message: "Recommendation model is unavailable: ML service offline",
    degraded: true,
  });
});

test("getRecommendationModelSnapshot returns snapshot data", async (t) => {
  const response = createMockResponse();

  t.mock.method(recommendationService, "getModelSnapshot", async () => ({
    model: {
      trainedAt: "2026-04-20T12:13:33Z",
      sampleCount: 9800,
      featureCount: 94,
      classCount: 31,
      ladderEntryCount: 42,
      dataSource: "synthetic-profile-bootstrap-level-aware:9800",
      modelVersion: 3,
    },
    split: {
      train: 7840,
      validation: 980,
      hardValidation: 539,
      test: 980,
    },
    ensembleWeights: {
      logistic: 0.11,
      randomForest: 0.11,
      gradientBoosting: 0.78,
    },
    evaluation: {
      logistic: { sampleCount: 980, top1: 0.99, top3: 1, logLoss: 0.16, brier: 0.05, ece: 0.12 },
      randomForest: { sampleCount: 980, top1: 0.99, top3: 1, logLoss: 0.13, brier: 0.05, ece: 0.1 },
      gradientBoosting: { sampleCount: 980, top1: 0.98, top3: 1, logLoss: 0.05, brier: 0.02, ece: 0.01 },
      ensemble: { sampleCount: 980, top1: 0.99, top3: 1, logLoss: 0.06, brier: 0.02, ece: 0.03 },
    },
    validationComparison: {
      baseline: {
        logistic: { sampleCount: 980, top1: 0.99, top3: 1, logLoss: 0.16, brier: 0.05, ece: 0.12 },
        randomForest: { sampleCount: 980, top1: 0.99, top3: 1, logLoss: 0.14, brier: 0.05, ece: 0.1 },
        gradientBoosting: { sampleCount: 980, top1: 0.98, top3: 1, logLoss: 0.06, brier: 0.03, ece: 0.01 },
        ensemble: { sampleCount: 980, top1: 0.98, top3: 1, logLoss: 0.07, brier: 0.02, ece: 0.03 },
      },
      hard: {
        logistic: { sampleCount: 539, top1: 0.98, top3: 1, logLoss: 0.19, brier: 0.07, ece: 0.13 },
        randomForest: { sampleCount: 539, top1: 0.98, top3: 1, logLoss: 0.21, brier: 0.08, ece: 0.14 },
        gradientBoosting: { sampleCount: 539, top1: 0.97, top3: 1, logLoss: 0.1, brier: 0.04, ece: 0.01 },
        ensemble: { sampleCount: 539, top1: 0.97, top3: 1, logLoss: 0.11, brier: 0.04, ece: 0.04 },
      },
    },
    confidenceCalibration: {
      binCount: 12,
      fallbackAccuracy: 0.98,
      bins: [],
    },
    hardValidation: {
      source: "validation",
      selectedCount: 539,
      availableCount: 980,
      selectionMode: "hardness-ranked",
      avgHardness: 8.48,
      maxHardness: 11.12,
      minHardness: 6.64,
      tagCounts: {
        mixed_signal: 442,
      },
    },
    topFeatureImportances: [],
  }) as never);

  await getRecommendationModelSnapshot(createRequest({}), asResponse(response));

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.jsonBody, {
    snapshot: {
      model: {
        trainedAt: "2026-04-20T12:13:33Z",
        sampleCount: 9800,
        featureCount: 94,
        classCount: 31,
        ladderEntryCount: 42,
        dataSource: "synthetic-profile-bootstrap-level-aware:9800",
        modelVersion: 3,
      },
      split: {
        train: 7840,
        validation: 980,
        hardValidation: 539,
        test: 980,
      },
      ensembleWeights: {
        logistic: 0.11,
        randomForest: 0.11,
        gradientBoosting: 0.78,
      },
      evaluation: {
        logistic: { sampleCount: 980, top1: 0.99, top3: 1, logLoss: 0.16, brier: 0.05, ece: 0.12 },
        randomForest: { sampleCount: 980, top1: 0.99, top3: 1, logLoss: 0.13, brier: 0.05, ece: 0.1 },
        gradientBoosting: { sampleCount: 980, top1: 0.98, top3: 1, logLoss: 0.05, brier: 0.02, ece: 0.01 },
        ensemble: { sampleCount: 980, top1: 0.99, top3: 1, logLoss: 0.06, brier: 0.02, ece: 0.03 },
      },
      validationComparison: {
        baseline: {
          logistic: { sampleCount: 980, top1: 0.99, top3: 1, logLoss: 0.16, brier: 0.05, ece: 0.12 },
          randomForest: { sampleCount: 980, top1: 0.99, top3: 1, logLoss: 0.14, brier: 0.05, ece: 0.1 },
          gradientBoosting: { sampleCount: 980, top1: 0.98, top3: 1, logLoss: 0.06, brier: 0.03, ece: 0.01 },
          ensemble: { sampleCount: 980, top1: 0.98, top3: 1, logLoss: 0.07, brier: 0.02, ece: 0.03 },
        },
        hard: {
          logistic: { sampleCount: 539, top1: 0.98, top3: 1, logLoss: 0.19, brier: 0.07, ece: 0.13 },
          randomForest: { sampleCount: 539, top1: 0.98, top3: 1, logLoss: 0.21, brier: 0.08, ece: 0.14 },
          gradientBoosting: { sampleCount: 539, top1: 0.97, top3: 1, logLoss: 0.1, brier: 0.04, ece: 0.01 },
          ensemble: { sampleCount: 539, top1: 0.97, top3: 1, logLoss: 0.11, brier: 0.04, ece: 0.04 },
        },
      },
      confidenceCalibration: {
        binCount: 12,
        fallbackAccuracy: 0.98,
        bins: [],
      },
      hardValidation: {
        source: "validation",
        selectedCount: 539,
        availableCount: 980,
        selectionMode: "hardness-ranked",
        avgHardness: 8.48,
        maxHardness: 11.12,
        minHardness: 6.64,
        tagCounts: {
          mixed_signal: 442,
        },
      },
      topFeatureImportances: [],
    },
    degraded: false,
  });
});

test("submitRecommendationFeedback persists valid feedback", async (t) => {
  const response = createMockResponse();

  t.mock.method(recommendationService, "recordFeedback", async () => ({
    saved: true,
    filePath: "feedback.jsonl",
    createdAt: "2026-04-01T00:00:00.000Z",
  }));

  await submitRecommendationFeedback(
    createRequest({
      selectedPathKey: "business_intelligence",
      selectedCareerName: "BI Analyst",
      recommendedPathKey: "business_intelligence",
      recommendedCareerName: "BI Analyst",
      accepted: true,
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.jsonBody, {
    saved: true,
    filePath: "feedback.jsonl",
    createdAt: "2026-04-01T00:00:00.000Z",
  });
});

test("analyzeCvRecommendations returns a clean validation error when CV text is too short", async (t) => {
  const response = createMockResponse();

  t.mock.method(recommendationService, "recommendFromCv", async () => {
    throw new Error("CV text is too short to analyze");
  });

  await analyzeCvRecommendations(
    createRequest({
      cvText: "short cv text",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.jsonBody, {
    message: "CV text is too short to analyze",
  });
});
