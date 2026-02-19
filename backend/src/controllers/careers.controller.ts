import { Request, Response } from "express";
import Career from "../models/Career.js";

// Get all careers from the careerMap collection
export async function getAllCareers(req: Request, res: Response) {
  try {
    const careers = await Career.find();
    res.status(200).json(careers);
  } catch (error) {
    console.error("Error fetching careers:", error);
    res.status(500).json({ message: "Failed to fetch careers" });
  }
}

// Get a specific career by careerId
export async function getCareerById(req: Request, res: Response) {
  try {
    const career = await Career.findOne({ careerId: req.params.id });
    
    if (!career) {
      res.status(404).json({ message: "Career not found" });
      return;
    }
    
    res.status(200).json(career);
  } catch (error) {
    console.error("Error fetching career:", error);
    res.status(500).json({ message: "Failed to fetch career" });
  }
}
