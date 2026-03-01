import { Router } from "express";
import {
  createRecommendations,
  getRecommendationModelInfo,
  retrainRecommendations,
  submitRecommendationFeedback,
} from "../controllers/recommendations.controller.js";

const router = Router();

router.get("/model-info", getRecommendationModelInfo);
router.post("/retrain", retrainRecommendations);
router.post("/feedback", submitRecommendationFeedback);
router.post("/", createRecommendations);

export default router;
