import { Router } from 'express';
import {
  getProficiencyLevels,
  getProficiencyLevelById,
} from '../controllers/proficiencyLevels.controller.js';

const router = Router();

// Get all Proficiency Levels
router.get('/', getProficiencyLevels);

// Get Proficiency Level by ID
router.get('/:id', getProficiencyLevelById);

export default router;
