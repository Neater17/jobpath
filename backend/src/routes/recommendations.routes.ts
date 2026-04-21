import { Router } from "express";
import {
  analyzeCvRecommendations,
  createRecommendationExplainabilityStreamSession,
  createRecommendations,
  getCareerGaps,
  getRecommendationExplainability,
  getRecommendationModelInfo,
  streamRecommendationExplainability,
  submitRecommendationFeedback,
} from "../controllers/recommendations.controller.js";

const router = Router();

router.get("/model-info", getRecommendationModelInfo);
router.get("/explainability/stream", streamRecommendationExplainability);
router.post("/explainability/stream-session", createRecommendationExplainabilityStreamSession);
router.post("/analyze-cv", analyzeCvRecommendations);
router.post("/career-gaps", getCareerGaps);
router.post("/explainability", getRecommendationExplainability);
router.post("/feedback", submitRecommendationFeedback);
router.post("/", createRecommendations);

export default router;
