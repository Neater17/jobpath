import { Request, Response } from "express";
import EnablingSkill from "../models/EnablingSkill.js";
import { getOrSetCache, setSharedCacheHeaders } from "../utils/dataCache.js";

export async function listEnablingSkillSummaries(req: Request, res: Response) {
  try {
    const skills = await getOrSetCache("enabling-skills:summary", async () =>
      EnablingSkill.find(
        {},
        {
          enablingSkillId: 1,
          title: 1,
          category: 1,
          relatedCategory: 1,
          description: 1,
          proficiencyLevels: 1,
        }
      )
        .sort({ enablingSkillId: 1 })
        .lean()
    );

    const summaries = skills.map((skill) => ({
      enablingSkillId: skill.enablingSkillId,
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
    console.error("Error fetching enabling skill summaries:", error);
    res.status(500).json({ message: "Failed to fetch enabling skill summaries" });
  }
}

export async function listEnablingSkills(req: Request, res: Response) {
  try {
    const skills = await getOrSetCache("enabling-skills:all", async () =>
      EnablingSkill.find().sort({ enablingSkillId: 1 }).lean()
    );
    setSharedCacheHeaders(res);
    res.status(200).json(skills);
  } catch (error) {
    console.error("Error fetching enabling skills:", error);
    res.status(500).json({ message: "Failed to fetch enabling skills" });
  }
}

export async function getEnablingSkillById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const skill = await getOrSetCache(`enabling-skills:${id}`, async () =>
      EnablingSkill.findOne({ enablingSkillId: id }).lean()
    );
    if (!skill) {
      res.status(404).json({ message: "Enabling skill not found" });
      return;
    }
    setSharedCacheHeaders(res);
    res.status(200).json(skill);
  } catch (error) {
    console.error("Error fetching enabling skill:", error);
    res.status(500).json({ message: "Failed to fetch enabling skill" });
  }
}
