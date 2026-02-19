import { Router } from "express";
import {
  getFunctionalSkillById,
  listFunctionalSkills,
} from "../controllers/functionalSkills.controller.js";

const router = Router();

router.get("/", listFunctionalSkills);
router.get("/:id", getFunctionalSkillById);

export default router;
