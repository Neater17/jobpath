import mongoose, { Schema } from "mongoose";

interface KeyTask {
  workFunctionId: string;
  workFunctionName: string;
  keyTasks: string[];
}

interface FunctionalSkill {
  functionalSkillId: string;
  skillName: string;
  proficiencyLevel: string;
}

interface EnablingSkill {
  enablingSkillId: string;
  skillName: string;
  proficiencyLevel: string;
}

const CareerSchema = new Schema<{
  careerId: string;
  careerPath: string | string[];
  careerTitle: string;
  careerLevel: string;
  description?: string;
  criticalWorkFunctionsandKeyTasks: KeyTask[];
  performanceExpectations: string;
  functionalSkillsandCompetencies: FunctionalSkill[];
  enablingSkillsandCompetencies: EnablingSkill[];
}
>
({
  careerId: { type: String, required: true, trim: true },
  careerPath: { type: Schema.Types.Mixed, required: true },
  careerTitle: { type: String, required: true, trim: true },
  careerLevel: { type: String, required: true, trim: true },
  description: { type: String, required: false, trim: true },
  criticalWorkFunctionsandKeyTasks: [
    {
      workFunctionId: { type: String, required: true, trim: true },
      workFunctionName: { type: String, required: true, trim: true },
      keyTasks: [{ type: String, required: true, trim: true }],
    },
  ],
  performanceExpectations: { type: String, required: true, trim: true },
  functionalSkillsandCompetencies: [
    {
      functionalSkillId: { type: String, required: true, trim: true },
      skillName: { type: String, required: true, trim: true },
      proficiencyLevel: { type: String, required: true, trim: true },
    },
  ],
  enablingSkillsandCompetencies: [
    {
      enablingSkillId: { type: String, required: true, trim: true },
      skillName: { type: String, required: true, trim: true },
      proficiencyLevel: { type: String, required: true, trim: true },
    },
  ],
});

export type CareerDocument = mongoose.InferSchemaType<typeof CareerSchema>;
export default mongoose.model<CareerDocument>("Career", CareerSchema, "careerMap");
