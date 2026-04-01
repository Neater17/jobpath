import mongoose, { Schema } from "mongoose";

interface ProficiencyLevelItem {
  autonomy_and_complexity: string;
  knowledge_and_abilities: string;
  level: number;
  responsibility: string;
}

const proficiencyLevelItemSchema = new Schema<ProficiencyLevelItem>({
  autonomy_and_complexity: { type: String, required: true },
  knowledge_and_abilities: { type: String, required: true },
  level: { type: Number, required: true },
  responsibility: { type: String, required: true },
});

const proficiencyLevelSchema = new Schema<{
  proficiency_levels: ProficiencyLevelItem[];
}>
({
  proficiency_levels: { type: [proficiencyLevelItemSchema], required: true },
}, { timestamps: true });

export type ProficiencyLevelDocument = mongoose.InferSchemaType<typeof proficiencyLevelSchema>;
export const ProficiencyLevel = mongoose.model<ProficiencyLevelDocument>(
  "ProficiencyLevel",
  proficiencyLevelSchema,
  "functionalSkillsLevelDescription"
);
export type { ProficiencyLevelItem };
