import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import AssessmentResult from "../models/AssessmentResult.js";
import {
  createAssessmentResult,
  deleteMyAssessmentResultById,
  getMyAssessmentResults,
  getMyLatestAssessmentResult,
} from "./assessmentResults.controller.js";
import { signAuthToken } from "../utils/auth.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";

type MockResponse = {
  statusCode?: number;
  jsonBody?: unknown;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
};

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    jsonBody: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.jsonBody = body;
      return this;
    },
  } satisfies MockResponse;

  return response;
};

const asResponse = (response: MockResponse) => response as unknown as import("express").Response;
const createRequest = <TBody>(
  body: TBody,
  cookieHeader?: string
) => ({ body, headers: cookieHeader ? { cookie: cookieHeader } : {}, params: {} }) as Request;

const validPayload = {
  assessmentType: "career_assessment",
  selectedCareer: {
    pathKey: "business_intelligence",
    pathName: "Business Intelligence",
    careerName: "BI Analyst",
    careerId: "career-1",
  },
  answers: {
    iHave: ["q1", "q2"],
    iHaveNot: ["q3"],
    answeredCount: 3,
    totalQuestions: 5,
  },
  recommendation: {
    topCareer: {
      pathKey: "business_intelligence",
      pathName: "Business Intelligence",
      careerName: "BI Analyst",
      level: 3,
      profileKey: "bi_analyst",
      recommendationConfidence: 0.82,
    },
    selectedCareerMatch: {
      recommendationConfidence: 0.71,
      rank: 2,
      isTopRecommendation: false,
    },
    topAlternatives: [
      {
        careerName: "Data Analyst",
        pathNames: ["Business Intelligence"],
        recommendationConfidence: 0.75,
        profileKey: "data_analyst",
      },
    ],
    recommendedPriorityGaps: [
      {
        key: "business_strategy",
        label: "Business Strategy",
        gapScore: 0.32,
        currentReadiness: 0.48,
        importance: 0.8,
        recommendation: "Build stronger business strategy skills.",
      },
    ],
    selectedCareerPriorityGaps: [
      {
        key: "data_storytelling",
        label: "Data Storytelling",
        gapScore: 0.28,
        currentReadiness: 0.55,
        importance: 0.76,
        recommendation: "Strengthen communication of insights.",
      },
    ],
    recommendedJobPathSteps: [
      {
        roleName: "Associate Data Analyst",
        roleLevel: 1,
        stage: "Starting Role",
        focusSkills: [
          {
            key: "business_strategy",
            label: "Business Strategy",
            gapScore: 0.32,
            currentReadiness: 0.48,
            importance: 0.8,
            recommendation: "Build stronger business strategy skills.",
          },
        ],
      },
      {
        roleName: "BI Analyst",
        roleLevel: 3,
        stage: "Target Role",
        focusSkills: [
          {
            key: "data_storytelling",
            label: "Data Storytelling",
            gapScore: 0.28,
            currentReadiness: 0.55,
            importance: 0.76,
            recommendation: "Strengthen communication of insights.",
          },
        ],
      },
    ],
    selectedCareerJobPathSteps: [
      {
        roleName: "Associate Data Analyst",
        roleLevel: 1,
        stage: "Starting Role",
        focusSkills: [
          {
            key: "data_storytelling",
            label: "Data Storytelling",
            gapScore: 0.28,
            currentReadiness: 0.55,
            importance: 0.76,
            recommendation: "Strengthen communication of insights.",
          },
        ],
      },
      {
        roleName: "BI Analyst",
        roleLevel: 3,
        stage: "Target Role",
        focusSkills: [
          {
            key: "business_strategy",
            label: "Business Strategy",
            gapScore: 0.32,
            currentReadiness: 0.48,
            importance: 0.8,
            recommendation: "Build stronger business strategy skills.",
          },
        ],
      },
    ],
    summary: {
      completionRate: 0.6,
      haveRate: 0.67,
      confidence: 0.79,
      source: "backend" as const,
    },
    explainabilitySummary: {
      method: "shap" as const,
      narrative: "Your current strengths align best with BI Analyst.",
    },
  },
  modelMeta: {
    trainedAt: "2026-04-24T00:00:00.000Z",
    modelVersion: 3,
  },
};

test("createAssessmentResult saves a valid payload for an authenticated user", async (t) => {
  const response = createMockResponse();
  const token = signAuthToken({ userId: "507f1f77bcf86cd799439011" });

  t.mock.method(AssessmentResult, "create", async (payload: Record<string, unknown>) => ({
    _id: "assessment-1",
    ...payload,
    createdAt: new Date("2026-04-24T12:00:00.000Z"),
    updatedAt: new Date("2026-04-24T12:00:00.000Z"),
  }));

  await createAssessmentResult(
    createRequest(validPayload, `jobpath_token=${token}`),
    asResponse(response)
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.jsonBody, {
    message: "Assessment saved successfully.",
    assessment: {
      id: "assessment-1",
      assessmentType: "career_assessment",
      selectedCareer: validPayload.selectedCareer,
      answers: validPayload.answers,
      recommendation: validPayload.recommendation,
      feedback: null,
      modelMeta: validPayload.modelMeta,
      createdAt: new Date("2026-04-24T12:00:00.000Z"),
      updatedAt: new Date("2026-04-24T12:00:00.000Z"),
    },
  });
});

test("createAssessmentResult rejects unauthenticated requests", async () => {
  const response = createMockResponse();

  await createAssessmentResult(createRequest(validPayload), asResponse(response));

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.jsonBody, { message: "Not authenticated." });
});

test("createAssessmentResult rejects malformed payloads", async () => {
  const response = createMockResponse();
  const token = signAuthToken({ userId: "507f1f77bcf86cd799439011" });

  await createAssessmentResult(
    createRequest(
      {
        selectedCareer: { pathKey: "business_intelligence" },
      } as unknown,
      `jobpath_token=${token}`
    ),
    asResponse(response)
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.jsonBody, { message: "Invalid saved assessment payload" });
});

test("getMyAssessmentResults returns only the authenticated user's assessments newest first", async (t) => {
  const response = createMockResponse();
  const token = signAuthToken({ userId: "507f1f77bcf86cd799439011" });

  t.mock.method(AssessmentResult, "find", () => ({
    sort: async () => [
      {
        _id: "assessment-2",
        userId: "507f1f77bcf86cd799439011",
        assessmentType: "career_assessment",
        selectedCareer: validPayload.selectedCareer,
        answers: validPayload.answers,
        recommendation: validPayload.recommendation,
        createdAt: "2026-04-25T12:00:00.000Z",
        updatedAt: "2026-04-25T12:00:00.000Z",
      },
      {
        _id: "assessment-1",
        userId: "507f1f77bcf86cd799439011",
        assessmentType: "career_assessment",
        selectedCareer: validPayload.selectedCareer,
        answers: validPayload.answers,
        recommendation: validPayload.recommendation,
        createdAt: "2026-04-24T12:00:00.000Z",
        updatedAt: "2026-04-24T12:00:00.000Z",
      },
    ],
  }) as never);

  await getMyAssessmentResults(
    createRequest({}, `jobpath_token=${token}`),
    asResponse(response)
  );

  const jsonBody = response.jsonBody as unknown as { assessments: Array<{ id: string }> };
  assert.equal(response.statusCode, 200);
  assert.deepEqual(jsonBody.assessments.map((item) => item.id), ["assessment-2", "assessment-1"]);
});

test("getMyLatestAssessmentResult returns the newest assessment or null", async (t) => {
  const response = createMockResponse();
  const token = signAuthToken({ userId: "507f1f77bcf86cd799439011" });

  t.mock.method(AssessmentResult, "findOne", () => ({
    sort: async () => ({
      _id: "assessment-2",
      userId: "507f1f77bcf86cd799439011",
      assessmentType: "career_assessment",
      selectedCareer: validPayload.selectedCareer,
      answers: validPayload.answers,
      recommendation: validPayload.recommendation,
      createdAt: "2026-04-25T12:00:00.000Z",
      updatedAt: "2026-04-25T12:00:00.000Z",
    }),
  }) as never);

  await getMyLatestAssessmentResult(
    createRequest({}, `jobpath_token=${token}`),
    asResponse(response)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.jsonBody, {
    assessment: {
      id: "assessment-2",
      assessmentType: "career_assessment",
      selectedCareer: validPayload.selectedCareer,
      answers: validPayload.answers,
      recommendation: validPayload.recommendation,
      feedback: null,
      modelMeta: null,
      createdAt: "2026-04-25T12:00:00.000Z",
      updatedAt: "2026-04-25T12:00:00.000Z",
    },
  });
});

test("deleteMyAssessmentResultById removes one assessment for the authenticated user", async (t) => {
  const response = createMockResponse();
  const token = signAuthToken({ userId: "507f1f77bcf86cd799439011" });

  t.mock.method(AssessmentResult, "findOneAndDelete", async () => ({
    _id: "507f1f77bcf86cd799439012",
  }) as never);

  await deleteMyAssessmentResultById(
    ({
      ...createRequest({}, `jobpath_token=${token}`),
      params: { assessmentId: "507f1f77bcf86cd799439012" },
    } as unknown) as Request,
    asResponse(response)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.jsonBody, {
    message: "Assessment deleted successfully.",
    deletedId: "507f1f77bcf86cd799439012",
  });
});

test("deleteMyAssessmentResultById rejects invalid assessment ids", async () => {
  const response = createMockResponse();
  const token = signAuthToken({ userId: "507f1f77bcf86cd799439011" });

  await deleteMyAssessmentResultById(
    ({
      ...createRequest({}, `jobpath_token=${token}`),
      params: { assessmentId: "not-a-valid-id" },
    } as unknown) as Request,
    asResponse(response)
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.jsonBody, {
    message: "Invalid assessment id.",
  });
});

test("deleteMyAssessmentResultById returns 404 when the assessment is not found", async (t) => {
  const response = createMockResponse();
  const token = signAuthToken({ userId: "507f1f77bcf86cd799439011" });

  t.mock.method(AssessmentResult, "findOneAndDelete", async () => null as never);

  await deleteMyAssessmentResultById(
    ({
      ...createRequest({}, `jobpath_token=${token}`),
      params: { assessmentId: "507f1f77bcf86cd799439012" },
    } as unknown) as Request,
    asResponse(response)
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.jsonBody, {
    message: "Saved assessment not found.",
  });
});
