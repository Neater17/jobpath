import { Request, Response } from 'express';
import { ProficiencyLevel } from '../models/ProficiencyLevel.js';
import { getOrSetCache, setSharedCacheHeaders } from '../utils/dataCache.js';

// Get all Proficiency Levels
export const getProficiencyLevels = async (req: Request, res: Response) => {
  try {
    const proficiencyLevels = await getOrSetCache("proficiency-levels:all", async () =>
      ProficiencyLevel.find().lean()
    );
    setSharedCacheHeaders(res);
    res.json(proficiencyLevels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Proficiency Levels', error });
  }
};

// Get Proficiency Level by ID
export const getProficiencyLevelById = async (req: Request, res: Response) => {
  try {
    const proficiencyLevel = await getOrSetCache(`proficiency-levels:${req.params.id}`, async () =>
      ProficiencyLevel.findById(req.params.id).lean()
    );
    if (!proficiencyLevel) {
      return res.status(404).json({ message: 'Proficiency Level not found' });
    }
    setSharedCacheHeaders(res);
    res.json(proficiencyLevel);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Proficiency Level', error });
  }
};
