import { Request, Response } from "express";
import FunctioningSkill from "../models/FunctioningSkill.js";

export async function listFunctionalSkills(req: Request, res: Response) {
  try {
    const skills = await FunctioningSkill.find().sort({ functionalSkillId: 1 });
    res.status(200).json(skills);
  } catch (error) {
    console.error("Error fetching functional skills:", error);
    res.status(500).json({ message: "Failed to fetch functional skills" });
  }
}

export async function getFunctionalSkillById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const skill = await FunctioningSkill.findOne({ functionalSkillId: id });
    if (!skill) {
      res.status(404).json({ message: "Functional skill not found" });
      return;
    }
    res.status(200).json(skill);
  } catch (error) {
    console.error("Error fetching functional skill:", error);
    res.status(500).json({ message: "Failed to fetch functional skill" });
  }
}
