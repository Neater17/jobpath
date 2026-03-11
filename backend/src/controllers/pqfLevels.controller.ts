import { Request, Response } from 'express';
import { PqfLevel } from '../models/PqfLevel.js';

// Get all PQF Levels
export const getPqfLevels = async (req: Request, res: Response) => {
  try {
    const pqfLevels = await PqfLevel.find();
    res.json(pqfLevels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching PQF Levels', error });
  }
};

// Get PQF Level by ID
export const getPqfLevelById = async (req: Request, res: Response) => {
  try {
    const pqfLevel = await PqfLevel.findById(req.params.id);
    if (!pqfLevel) {
      return res.status(404).json({ message: 'PQF Level not found' });
    }
    res.json(pqfLevel);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching PQF Level', error });
  }
};


