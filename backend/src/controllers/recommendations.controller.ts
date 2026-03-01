import type { Request, Response } from "express";
import type { RecommendationFeedbackRequest, RecommendationRequest } from "../recommendation/types.js";
import { recommendationService } from "../recommendation/service.js";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function isRecommendationRequest(value: unknown): value is RecommendationRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<RecommendationRequest>;
  const explainabilityMethodValid =
    payload.explainabilityMethod === undefined ||
    payload.explainabilityMethod === "auto" ||
    payload.explainabilityMethod === "shap" ||
    payload.explainabilityMethod === "lime";

  return (
    Array.isArray(payload.iHave) &&
    Array.isArray(payload.iHaveNot) &&
    Array.isArray(payload.questions) &&
    explainabilityMethodValid
  );
}

function isRecommendationFeedbackRequest(value: unknown): value is RecommendationFeedbackRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<RecommendationFeedbackRequest>;
  return (
    typeof payload.recommendedPathKey === "string" &&
    typeof payload.recommendedCareerName === "string" &&
    typeof payload.accepted === "boolean"
  );
}

export async function createRecommendations(req: Request, res: Response) {
  try {
    if (!isRecommendationRequest(req.body)) {
      res.status(400).json({ message: "Invalid recommendation request payload" });
      return;
    }

    const response = recommendationService.recommend(req.body);
    res.status(200).json(response);
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("required") || message.includes("Invalid") ? 400 : 500;
    console.error("Error generating recommendations:", error);
    res.status(status).json({ message });
  }
}

export async function getRecommendationModelInfo(_req: Request, res: Response) {
  try {
    const model = recommendationService.getModelInfo();
    res.status(200).json({ model });
  } catch (error) {
    console.error("Error fetching recommendation model info:", error);
    res.status(500).json({ message: errorMessage(error) });
  }
}

export async function retrainRecommendations(req: Request, res: Response) {
  try {
    const datasetPath =
      req.body && typeof req.body.datasetPath === "string"
        ? req.body.datasetPath
        : process.env.RECOMMENDER_DATASET_PATH;
    const model = await recommendationService.retrain(datasetPath);
    res.status(200).json({ message: "Recommendation model retrained", model });
  } catch (error) {
    console.error("Error retraining recommendation model:", error);
    res.status(500).json({ message: errorMessage(error) });
  }
}

export async function submitRecommendationFeedback(req: Request, res: Response) {
  try {
    if (!isRecommendationFeedbackRequest(req.body)) {
      res.status(400).json({ message: "Invalid feedback payload" });
      return;
    }

    const response = await recommendationService.recordFeedback({
      selectedPathKey:
        typeof req.body.selectedPathKey === "string" ? req.body.selectedPathKey : null,
      selectedCareerName:
        typeof req.body.selectedCareerName === "string" ? req.body.selectedCareerName : null,
      recommendedPathKey: req.body.recommendedPathKey,
      recommendedCareerName: req.body.recommendedCareerName,
      accepted: req.body.accepted,
      notes: typeof req.body.notes === "string" ? req.body.notes : null,
    });
    res.status(200).json(response);
  } catch (error) {
    console.error("Error saving recommendation feedback:", error);
    res.status(500).json({ message: errorMessage(error) });
  }
}
