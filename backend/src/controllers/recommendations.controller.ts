import type { Request, Response } from "express";
import type { RecommendationRequest } from "../recommendation/types.js";
import { recommendationService } from "../recommendation/service.js";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function isRecommendationRequest(value: unknown): value is RecommendationRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<RecommendationRequest>;
  return Array.isArray(payload.iHave) && Array.isArray(payload.iHaveNot) && Array.isArray(payload.questions);
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
