import { Request, Response } from "express";
import EnablingSkill from "../models/EnablingSkill.js";

export async function listEnablingSkills(req: Request, res: Response) {
  try {
    const skills = await EnablingSkill.find().sort({ enablingSkillId: 1 });
    res.status(200).json(skills);
  } catch (error) {
    console.error("Error fetching enabling skills:", error);
    res.status(500).json({ message: "Failed to fetch enabling skills" });
  }
}

export async function getEnablingSkillById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const skill = await EnablingSkill.findOne({ enablingSkillId: id });
    if (!skill) {
      res.status(404).json({ message: "Enabling skill not found" });
      return;
    }
    res.status(200).json(skill);
  } catch (error) {
    console.error("Error fetching enabling skill:", error);
    res.status(500).json({ message: "Failed to fetch enabling skill" });
  }
}
