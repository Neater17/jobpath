import { Request, Response } from 'express';
import { PqfLevel } from '../models/PqfLevel.js';
import { getOrSetCache, setSharedCacheHeaders } from '../utils/dataCache.js';

// Get all PQF Levels
export const getPqfLevels = async (req: Request, res: Response) => {
  try {
    const pqfLevels = await getOrSetCache("pqf-levels:all", async () =>
      PqfLevel.find().lean()
    );
    setSharedCacheHeaders(res);
    res.json(pqfLevels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching PQF Levels', error });
  }
};

// Get PQF Level by ID
export const getPqfLevelById = async (req: Request, res: Response) => {
  try {
    const pqfLevel = await getOrSetCache(`pqf-levels:${req.params.id}`, async () =>
      PqfLevel.findById(req.params.id).lean()
    );
    if (!pqfLevel) {
      return res.status(404).json({ message: 'PQF Level not found' });
    }
    setSharedCacheHeaders(res);
    res.json(pqfLevel);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching PQF Level', error });
  }
};


