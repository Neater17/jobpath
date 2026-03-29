import { Router } from "express";
import {
  getFunctionalSkillById,
  listFunctionalSkillSummaries,
  listFunctionalSkills,
} from "../controllers/functionalSkills.controller.js";

const router = Router();

router.get("/", listFunctionalSkills);
router.get("/summary", listFunctionalSkillSummaries);
router.get("/:id", getFunctionalSkillById);

export default router;
