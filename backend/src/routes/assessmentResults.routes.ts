import { Router } from "express";
import {
  createAssessmentResult,
  deleteMyAssessmentResultById,
  getMyAssessmentResults,
  getMyLatestAssessmentResult,
} from "../controllers/assessmentResults.controller.js";

const router = Router();

router.post("/", createAssessmentResult);
router.get("/me", getMyAssessmentResults);
router.get("/me/latest", getMyLatestAssessmentResult);
router.delete("/me/:assessmentId", deleteMyAssessmentResultById);

export default router;
