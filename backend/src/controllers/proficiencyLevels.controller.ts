import { Request, Response } from 'express';
import { ProficiencyLevel } from '../models/ProficiencyLevel.js';

// Get all Proficiency Levels
export const getProficiencyLevels = async (req: Request, res: Response) => {
  try {
    const proficiencyLevels = await ProficiencyLevel.find();
    res.json(proficiencyLevels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Proficiency Levels', error });
  }
};

// Get Proficiency Level by ID
export const getProficiencyLevelById = async (req: Request, res: Response) => {
  try {
    const proficiencyLevel = await ProficiencyLevel.findById(req.params.id);
    if (!proficiencyLevel) {
      return res.status(404).json({ message: 'Proficiency Level not found' });
    }
    res.json(proficiencyLevel);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Proficiency Level', error });
  }
};
