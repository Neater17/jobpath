import { Router } from 'express';
import {
  getPqfLevels,
  getPqfLevelById,
} from '../controllers/pqfLevels.controller.js';

const router = Router();

// Get all PQF Levels
router.get('/', getPqfLevels);

// Get PQF Level by ID
router.get('/:id', getPqfLevelById);

export default router;
