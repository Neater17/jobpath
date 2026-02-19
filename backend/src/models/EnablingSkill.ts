import mongoose, { Schema } from "mongoose";

interface ProficiencyLevel {
  proficiencyLevelId: string;
  level: string;
  description: string;
  knowledge: string[];
  Abilities: string[];
}

const EnablingSkillSchema = new Schema<{
  enablingSkillId: string;
  skillName: string;
  category: string;
  relatedCategory: string;
  description: string;
  rangeOfApplication: string | null;
  proficiencyLevels: ProficiencyLevel[];
}>(
  {
    enablingSkillId: { type: String, required: true, trim: true },
    skillName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    relatedCategory: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    rangeOfApplication: { type: String, required: false, default: null, trim: true },
    proficiencyLevels: [
      {
        proficiencyLevelId: { type: String, required: true, trim: true },
        level: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        knowledge: [{ type: String, required: true, trim: true }],
        abilities: [{ type: String, required: true, trim: true }],
      },
    ],
  }
);

export type EnablingSkillDocument = mongoose.InferSchemaType<typeof EnablingSkillSchema>;

export default mongoose.model<EnablingSkillDocument>(
  "EnablingSkill",
  EnablingSkillSchema,
  "enablingSkills"
);
