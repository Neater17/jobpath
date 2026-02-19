import mongoose, { Schema } from "mongoose";

interface ProficiencyLevel {
  proficiencyLevelId: string;
  level: string;
  description: string | null;
  knowledge: string[] | null;
  abilities: string[] | null;
}

const FunctioningSkillSchema = new Schema<{
  functionalSkillId: string;
  skillName: string;
  category: string;
  relatedCategory: string;
  description: string;
  rangeOfApplication: string | null;
  proficiencyLevels: ProficiencyLevel[];
}>(
  {
    functionalSkillId: { type: String, required: true, trim: true },
    skillName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    relatedCategory: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    rangeOfApplication: { type: String, required: false, default: null, trim: true },
    proficiencyLevels: [
      {
        proficiencyLevelId: { type: String, required: true, trim: true },
        level: { type: String, required: true, trim: true },
        description: { type: String, required: false, default: null, trim: true },
        knowledge: [{ type: String, required: false, trim: true }],
        abilities: [{ type: String, required: false, trim: true }],
      },
    ],
  }
);

export type FunctioningSkillDocument = mongoose.InferSchemaType<typeof FunctioningSkillSchema>;

export default mongoose.model<FunctioningSkillDocument>(
  "FunctioningSkill",
  FunctioningSkillSchema,
  "functionalSkills"
);
