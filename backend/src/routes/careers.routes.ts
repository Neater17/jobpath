import { Router } from "express";
import { 
  getCareerSummaries,
  getAllCareers, 
  getCareerById, 
} from "../controllers/careers.controller.js";

const router = Router();

// Get all careers
router.get("/", getAllCareers);
router.get("/summary", getCareerSummaries);

// Get career by careerId (must be last to avoid conflicts)
router.get("/:id", getCareerById); 

export default router;
