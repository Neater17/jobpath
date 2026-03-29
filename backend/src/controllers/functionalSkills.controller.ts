import { Request, Response } from "express";
import FunctioningSkill from "../models/FunctioningSkill.js";
import { getOrSetCache, setSharedCacheHeaders } from "../utils/dataCache.js";

export async function listFunctionalSkillSummaries(req: Request, res: Response) {
  try {
    const skills = await getOrSetCache("functional-skills:summary", async () =>
      FunctioningSkill.find(
        {},
        {
          functionalSkillId: 1,
          title: 1,
          category: 1,
          relatedCategory: 1,
          description: 1,
          proficiencyLevels: 1,
        }
      )
        .sort({ functionalSkillId: 1 })
        .lean()
    );

    const summaries = skills.map((skill) => ({
      functionalSkillId: skill.functionalSkillId,
      title: skill.title,
      category: skill.category,
      relatedCategory: skill.relatedCategory,
      description: skill.description,
      proficiencyLevels: (skill.proficiencyLevels || []).map((level) => ({
        proficiencyLevelId: level.proficiencyLevelId,
        level: level.level,
      })),
    }));

    setSharedCacheHeaders(res);
    res.status(200).json(summaries);
  } catch (error) {
    console.error("Error fetching functional skill summaries:", error);
    res.status(500).json({ message: "Failed to fetch functional skill summaries" });
  }
}

export async function listFunctionalSkills(req: Request, res: Response) {
  try {
    const skills = await getOrSetCache("functional-skills:all", async () =>
      FunctioningSkill.find().sort({ functionalSkillId: 1 }).lean()
    );
    setSharedCacheHeaders(res);
    res.status(200).json(skills);
  } catch (error) {
    console.error("Error fetching functional skills:", error);
    res.status(500).json({ message: "Failed to fetch functional skills" });
  }
}

export async function getFunctionalSkillById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const skill = await getOrSetCache(`functional-skills:${id}`, async () =>
      FunctioningSkill.findOne({ functionalSkillId: id }).lean()
    );
    if (!skill) {
      res.status(404).json({ message: "Functional skill not found" });
      return;
    }
    setSharedCacheHeaders(res);
    res.status(200).json(skill);
  } catch (error) {
    console.error("Error fetching functional skill:", error);
    res.status(500).json({ message: "Failed to fetch functional skill" });
  }
}
