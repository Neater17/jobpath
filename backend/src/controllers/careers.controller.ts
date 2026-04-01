import { Request, Response } from "express";
import Career from "../models/Career.js";
import { getOrSetCache, setSharedCacheHeaders } from "../utils/dataCache.js";

export async function getCareerSummaries(req: Request, res: Response) {
  try {
    const careers = await getOrSetCache("careers:summary", async () =>
      Career.find(
        {},
        {
          careerId: 1,
          careerPath: 1,
          careerTitle: 1,
          careerLevel: 1,
          description: 1,
          educationalLevel: 1,
        }
      ).lean()
    );
    setSharedCacheHeaders(res);
    res.status(200).json(careers);
  } catch (error) {
    console.error("Error fetching career summaries:", error);
    res.status(500).json({ message: "Failed to fetch career summaries" });
  }
}

// Get all careers from the careerMap collection
export async function getAllCareers(req: Request, res: Response) {
  try {
    const careers = await getOrSetCache("careers:all", async () =>
      Career.find().lean()
    );
    setSharedCacheHeaders(res);
    res.status(200).json(careers);
  } catch (error) {
    console.error("Error fetching careers:", error);
    res.status(500).json({ message: "Failed to fetch careers" });
  }
}

// Get a specific career by careerId
export async function getCareerById(req: Request, res: Response) {
  try {
    const career = await getOrSetCache(`careers:${req.params.id}`, async () =>
      Career.findOne({ careerId: req.params.id }).lean()
    );
    
    if (!career) {
      res.status(404).json({ message: "Career not found" });
      return;
    }
    
    setSharedCacheHeaders(res);
    res.status(200).json(career);
  } catch (error) {
    console.error("Error fetching career:", error);
    res.status(500).json({ message: "Failed to fetch career" });
  }
}
