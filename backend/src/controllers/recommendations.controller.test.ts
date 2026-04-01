import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import {
  analyzeCvRecommendations,
  createRecommendations,
  getRecommendationModelInfo,
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
