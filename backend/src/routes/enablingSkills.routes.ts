import { Router } from "express";
import {
  getEnablingSkillById,
  listEnablingSkillSummaries,
  listEnablingSkills,
} from "../controllers/enablingSkills.controller.js";

const router = Router();

router.get("/", listEnablingSkills);
router.get("/summary", listEnablingSkillSummaries);
router.get("/:id", getEnablingSkillById);

export default router;
