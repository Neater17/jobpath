import type { Request, Response } from "express";
import type {
  CareerGapRequest,
  CvAnalysisRequest,
  RecommendationFeedbackRequest,
  RecommendationRequest,
} from "../recommendation/types.js";
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

function isRecommendationFeedbackRequest(
  value: unknown
): value is RecommendationFeedbackRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<RecommendationFeedbackRequest>;
  return (
    typeof payload.recommendedPathKey === "string" &&
    typeof payload.recommendedCareerName === "string" &&
    typeof payload.accepted === "boolean"
  );
}

function isCvAnalysisRequest(value: unknown): value is CvAnalysisRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<CvAnalysisRequest>;
  return typeof payload.cvText === "string";
}

function isCareerGapRequest(value: unknown): value is CareerGapRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<CareerGapRequest>;
  return (
    typeof payload.pathKey === "string" &&
    typeof payload.careerName === "string" &&
    Array.isArray(payload.featureVector)
  );
}

export async function createRecommendations(req: Request, res: Response) {
  try {
    if (!isRecommendationRequest(req.body)) {
      res.status(400).json({ message: "Invalid recommendation request payload" });
      return;
    }

    const response = await recommendationService.recommend(req.body);
    res.status(200).json(response);
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("required") || message.includes("Invalid") ? 400 : 503;
    res.status(status).json({ message });
  }
}

export async function getRecommendationExplainability(req: Request, res: Response) {
  try {
    if (!isRecommendationRequest(req.body)) {
      res.status(400).json({ message: "Invalid recommendation request payload" });
      return;
    }

    const response = await recommendationService.getExplainability(req.body);
    res.status(200).json(response);
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("required") || message.includes("Invalid") ? 400 : 503;
    res.status(status).json({ message });
  }
}

export async function streamRecommendationExplainability(req: Request, res: Response) {
  try {
    const payload =
      typeof req.query.payload === "string" && req.query.payload.trim().length > 0
        ? req.query.payload
        : null;

    if (!payload) {
      res.status(400).json({ message: "Missing explainability stream payload" });
      return;
    }

    const upstream = await recommendationService.openMlEventStream(
      `/explainability/stream?payload=${encodeURIComponent(payload)}`
    );

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      res.status(upstream.status).json({
        message: text || "Unable to open explainability stream",
      });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          res.write(Buffer.from(value));
        }
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(503).json({ message: errorMessage(error) });
      return;
    }
    res.write(`event: failed\ndata: ${JSON.stringify({ message: errorMessage(error) })}\n\n`);
    res.end();
  }
}

export async function analyzeCvRecommendations(req: Request, res: Response) {
  try {
    if (!isCvAnalysisRequest(req.body)) {
      res.status(400).json({ message: "Invalid CV analysis payload" });
      return;
    }

    const response = await recommendationService.recommendFromCv(req.body);
    res.status(200).json(response);
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("short") || message.includes("Invalid") ? 400 : 503;
    res.status(status).json({ message });
  }
}

export async function getCareerGaps(req: Request, res: Response) {
  try {
    if (!isCareerGapRequest(req.body)) {
      res.status(400).json({ message: "Invalid career gap payload" });
      return;
    }

    const response = await recommendationService.getCareerGaps(req.body);
    res.status(200).json(response);
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("Invalid") || message.includes("not found") ? 400 : 503;
    res.status(status).json({ message });
  }
}

export async function getRecommendationModelInfo(_req: Request, res: Response) {
  try {
    const model = recommendationService.getModelInfo();
    res.status(200).json({ model, degraded: false });
  } catch (error) {
    res.status(503).json({
      message: errorMessage(error),
      degraded: true,
    });
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
      source: req.body.source,
      inputKind: req.body.inputKind,
      uploadedFileName: req.body.uploadedFileName,
      candidateName: req.body.candidateName,
      detectedTitle: req.body.detectedTitle,
      suggestedLevel: req.body.suggestedLevel,
      confidence: req.body.confidence,
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
}
