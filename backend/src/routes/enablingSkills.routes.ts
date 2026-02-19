import { Router } from "express";
import {
  getEnablingSkillById,
  listEnablingSkills,
} from "../controllers/enablingSkills.controller.js";

const router = Router();

router.get("/", listEnablingSkills);
router.get("/:id", getEnablingSkillById);

export default router;
