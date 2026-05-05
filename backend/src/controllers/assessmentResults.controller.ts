import type { Request, Response } from "express";
import mongoose from "mongoose";
import AssessmentResult from "../models/AssessmentResult.js";
import { getAuthTokenFromRequest, verifyAuthToken } from "../utils/auth.js";

type SavedAssessmentRequest = {
  assessmentType?: string;
  selectedCareer?: {
    pathKey?: string | null;
    pathName?: string | null;
    careerName?: string | null;
    careerId?: string | null;
  };
  answers?: {
    iHave?: string[];
    iHaveNot?: string[];
    answeredCount?: number;
    totalQuestions?: number;
  };
  recommendation?: {
    topCareer?: {
      pathKey?: string;
      pathName?: string;
      careerName?: string;
      level?: number;
      profileKey?: string | null;
      recommendationConfidence?: number;
    };
    selectedCareerMatch?: {
      recommendationConfidence?: number | null;
      rank?: number | null;
      isTopRecommendation?: boolean;
    };
    topAlternatives?: Array<{
      careerName?: string;
      pathNames?: string[];
      recommendationConfidence?: number;
      profileKey?: string | null;
    }>;
    recommendedPriorityGaps?: Array<{
      key?: string;
      label?: string;
      gapScore?: number;
      currentReadiness?: number;
      importance?: number;
      recommendation?: string;
    }>;
    selectedCareerPriorityGaps?: Array<{
      key?: string;
      label?: string;
      gapScore?: number;
      currentReadiness?: number;
      importance?: number;
      recommendation?: string;
    }>;
    recommendedJobPathSteps?: Array<{
      roleName?: string;
      roleLevel?: number;
      stage?: string;
      focusSkills?: Array<{
        key?: string;
        label?: string;
        gapScore?: number;
        currentReadiness?: number;
        importance?: number;
        recommendation?: string;
      }>;
    }>;
    selectedCareerJobPathSteps?: Array<{
      roleName?: string;
      roleLevel?: number;
      stage?: string;
      focusSkills?: Array<{
        key?: string;
        label?: string;
        gapScore?: number;
        currentReadiness?: number;
        importance?: number;
        recommendation?: string;
      }>;
    }>;
    priorityGaps?: Array<{
      key?: string;
      label?: string;
      gapScore?: number;
      currentReadiness?: number;
      importance?: number;
      recommendation?: string;
    }>;
    summary?: {
      completionRate?: number;
      haveRate?: number;
      confidence?: number;
      source?: "frontend" | "backend";
    };
    explainabilitySummary?: {
      method?: "shap" | "lime" | null;
      narrative?: string | null;
    };
  };
  feedback?: {
    accepted?: boolean;
    submittedAt?: string;
  };
  modelMeta?: {
    trainedAt?: string | null;
    modelVersion?: number;
  };
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function arePriorityGapsValid(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (!item || typeof item !== "object") return false;
      const gap = item as {
        key?: unknown;
        label?: unknown;
        gapScore?: unknown;
        currentReadiness?: unknown;
        importance?: unknown;
        recommendation?: unknown;
      };

      return (
        typeof gap.key === "string" &&
        typeof gap.label === "string" &&
        isFiniteNumber(gap.gapScore) &&
        typeof gap.recommendation === "string" &&
        (gap.currentReadiness === undefined || isFiniteNumber(gap.currentReadiness)) &&
        (gap.importance === undefined || isFiniteNumber(gap.importance))
      );
    })
  );
}

function areJobPathStepsValid(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (!item || typeof item !== "object") return false;
      const step = item as {
        roleName?: unknown;
        roleLevel?: unknown;
        stage?: unknown;
        focusSkills?: unknown;
      };

      return (
        typeof step.roleName === "string" &&
        isFiniteNumber(step.roleLevel) &&
        typeof step.stage === "string" &&
        arePriorityGapsValid(step.focusSkills)
      );
    })
  );
}

function isOptionalNullableString(value: unknown) {
  return value === undefined || value === null || typeof value === "string";
}

function isSavedAssessmentRequest(value: unknown): value is SavedAssessmentRequest {
  if (!value || typeof value !== "object") return false;

  const payload = value as SavedAssessmentRequest;
  const topCareer = payload.recommendation?.topCareer;
  const selectedCareerMatch = payload.recommendation?.selectedCareerMatch;
  const summary = payload.recommendation?.summary;

  const topAlternativesValid =
    Array.isArray(payload.recommendation?.topAlternatives) &&
    payload.recommendation!.topAlternatives!.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.careerName === "string" &&
        isStringArray(item.pathNames) &&
        isFiniteNumber(item.recommendationConfidence) &&
        isOptionalNullableString(item.profileKey)
    );

  const recommendedPriorityGaps = payload.recommendation?.recommendedPriorityGaps;
  const selectedCareerPriorityGaps = payload.recommendation?.selectedCareerPriorityGaps;
  const recommendedJobPathSteps = payload.recommendation?.recommendedJobPathSteps;
  const selectedCareerJobPathSteps = payload.recommendation?.selectedCareerJobPathSteps;
  const legacyPriorityGaps = payload.recommendation?.priorityGaps;
  const recommendedPriorityGapsValid =
    arePriorityGapsValid(recommendedPriorityGaps ?? legacyPriorityGaps) &&
    (recommendedPriorityGaps ?? legacyPriorityGaps ?? []).length <= 5;
  const selectedCareerPriorityGapsValid =
    arePriorityGapsValid(selectedCareerPriorityGaps ?? []) &&
    (selectedCareerPriorityGaps ?? []).length <= 5;
  const recommendedJobPathStepsValid =
    recommendedJobPathSteps === undefined || areJobPathStepsValid(recommendedJobPathSteps);
  const selectedCareerJobPathStepsValid =
    selectedCareerJobPathSteps === undefined || areJobPathStepsValid(selectedCareerJobPathSteps);

  return (
    (payload.assessmentType === undefined || payload.assessmentType === "career_assessment") &&
    isOptionalNullableString(payload.selectedCareer?.pathKey) &&
    isOptionalNullableString(payload.selectedCareer?.pathName) &&
    isOptionalNullableString(payload.selectedCareer?.careerName) &&
    isOptionalNullableString(payload.selectedCareer?.careerId) &&
    isStringArray(payload.answers?.iHave) &&
    isStringArray(payload.answers?.iHaveNot) &&
    isFiniteNumber(payload.answers?.answeredCount) &&
    isFiniteNumber(payload.answers?.totalQuestions) &&
    typeof topCareer?.pathKey === "string" &&
    typeof topCareer?.pathName === "string" &&
    typeof topCareer?.careerName === "string" &&
    isFiniteNumber(topCareer?.level) &&
    isOptionalNullableString(topCareer?.profileKey) &&
    isFiniteNumber(topCareer?.recommendationConfidence) &&
    (selectedCareerMatch?.recommendationConfidence === null ||
      isFiniteNumber(selectedCareerMatch?.recommendationConfidence)) &&
    (selectedCareerMatch?.rank === null || isFiniteNumber(selectedCareerMatch?.rank)) &&
    typeof selectedCareerMatch?.isTopRecommendation === "boolean" &&
    topAlternativesValid &&
    payload.recommendation!.topAlternatives!.length <= 3 &&
    recommendedPriorityGapsValid &&
    selectedCareerPriorityGapsValid &&
    recommendedJobPathStepsValid &&
    selectedCareerJobPathStepsValid &&
    isFiniteNumber(summary?.completionRate) &&
    isFiniteNumber(summary?.haveRate) &&
    isFiniteNumber(summary?.confidence) &&
    (summary?.source === "frontend" || summary?.source === "backend") &&
    (payload.recommendation?.explainabilitySummary === undefined ||
      ((payload.recommendation.explainabilitySummary.method === undefined ||
        payload.recommendation.explainabilitySummary.method === null ||
        payload.recommendation.explainabilitySummary.method === "shap" ||
        payload.recommendation.explainabilitySummary.method === "lime") &&
        isOptionalNullableString(payload.recommendation.explainabilitySummary.narrative))) &&
    (payload.feedback === undefined ||
      (typeof payload.feedback.accepted === "boolean" &&
        typeof payload.feedback.submittedAt === "string")) &&
    (payload.modelMeta === undefined ||
      (isOptionalNullableString(payload.modelMeta.trainedAt) &&
        (payload.modelMeta.modelVersion === undefined ||
          isFiniteNumber(payload.modelMeta.modelVersion))))
  );
}

function getAuthenticatedUserId(req: Request) {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    return null;
  }

  try {
    const payload = verifyAuthToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}

function toSavedAssessmentResponse(document: {
  _id: unknown;
  assessmentType?: string | null;
  selectedCareer?: Record<string, unknown> | null;
  answers?: Record<string, unknown> | null;
  recommendation?: Record<string, unknown> | null;
  feedback?: Record<string, unknown> | null;
  modelMeta?: Record<string, unknown> | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}) {
  return {
    id: String(document._id),
    assessmentType: document.assessmentType ?? "career_assessment",
    selectedCareer: document.selectedCareer ?? {},
    answers: document.answers ?? {},
    recommendation: document.recommendation ?? {},
    feedback: document.feedback ?? null,
    modelMeta: document.modelMeta ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export async function createAssessmentResult(
  req: Request,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    if (!isSavedAssessmentRequest(req.body)) {
      res.status(400).json({ message: "Invalid saved assessment payload" });
      return;
    }

    const created = await AssessmentResult.create({
      userId,
      assessmentType: "career_assessment",
      selectedCareer: {
        pathKey: req.body.selectedCareer?.pathKey ?? null,
        pathName: req.body.selectedCareer?.pathName ?? null,
        careerName: req.body.selectedCareer?.careerName ?? null,
        careerId: req.body.selectedCareer?.careerId ?? null,
      },
      answers: req.body.answers,
      recommendation: {
        ...req.body.recommendation,
        topAlternatives: req.body.recommendation!.topAlternatives!.slice(0, 3),
        recommendedPriorityGaps: (
          req.body.recommendation!.recommendedPriorityGaps ?? req.body.recommendation!.priorityGaps ?? []
        ).slice(0, 5),
        selectedCareerPriorityGaps: (
          req.body.recommendation!.selectedCareerPriorityGaps ?? []
        ).slice(0, 5),
        recommendedJobPathSteps: req.body.recommendation!.recommendedJobPathSteps ?? [],
        selectedCareerJobPathSteps: req.body.recommendation!.selectedCareerJobPathSteps ?? [],
        priorityGaps: (
          req.body.recommendation!.recommendedPriorityGaps ?? req.body.recommendation!.priorityGaps ?? []
        ).slice(0, 5),
      },
      feedback: req.body.feedback
        ? {
            accepted: req.body.feedback.accepted,
            submittedAt: new Date(req.body.feedback.submittedAt ?? new Date().toISOString()),
          }
        : undefined,
      modelMeta: req.body.modelMeta,
    });

    res.status(201).json({
      message: "Assessment saved successfully.",
      assessment: toSavedAssessmentResponse(created),
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: errorMessage(error) });
  }
}

export async function getMyAssessmentResults(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    const assessments = await AssessmentResult.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({
      assessments: assessments.map(toSavedAssessmentResponse),
    });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
}

export async function getMyLatestAssessmentResult(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    const assessment = await AssessmentResult.findOne({ userId }).sort({ createdAt: -1 });
    res.status(200).json({
      assessment: assessment ? toSavedAssessmentResponse(assessment) : null,
    });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
}

export async function deleteMyAssessmentResultById(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    const assessmentId =
      typeof req.params.assessmentId === "string" ? req.params.assessmentId.trim() : "";

    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      res.status(400).json({ message: "Invalid assessment id." });
      return;
    }

    const deleted = await AssessmentResult.findOneAndDelete({
      _id: assessmentId,
      userId,
    });

    if (!deleted) {
      res.status(404).json({ message: "Saved assessment not found." });
      return;
    }

    res.status(200).json({
      message: "Assessment deleted successfully.",
      deletedId: assessmentId,
    });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
}
