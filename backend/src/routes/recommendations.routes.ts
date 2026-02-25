import { Router } from "express";
import {
  createRecommendations,
  getRecommendationModelInfo,
  retrainRecommendations,
} from "../controllers/recommendations.controller.js";

const router = Router();

router.get("/model-info", getRecommendationModelInfo);
router.post("/retrain", retrainRecommendations);
router.post("/", createRecommendations);

export default router;
