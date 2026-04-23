import mongoose, { Schema } from "mongoose";

const AssessmentResultSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assessmentType: {
      type: String,
      required: true,
      default: "career_assessment",
      trim: true,
    },
    selectedCareer: {
      pathKey: { type: String, default: null, trim: true },
      pathName: { type: String, default: null, trim: true },
      careerName: { type: String, default: null, trim: true },
      careerId: { type: String, default: null, trim: true },
    },
    answers: {
      iHave: [{ type: String, required: true, trim: true }],
      iHaveNot: [{ type: String, required: true, trim: true }],
      answeredCount: { type: Number, required: true, min: 0 },
      totalQuestions: { type: Number, required: true, min: 0 },
    },
    recommendation: {
      topCareer: {
        pathKey: { type: String, required: true, trim: true },
        pathName: { type: String, required: true, trim: true },
        careerName: { type: String, required: true, trim: true },
        level: { type: Number, required: true, min: 0 },
        profileKey: { type: String, default: null, trim: true },
        recommendationConfidence: { type: Number, required: true, min: 0, max: 1 },
      },
      selectedCareerMatch: {
        recommendationConfidence: { type: Number, default: null, min: 0, max: 1 },
        rank: { type: Number, default: null, min: 1 },
        isTopRecommendation: { type: Boolean, required: true },
      },
      topAlternatives: [
        {
          careerName: { type: String, required: true, trim: true },
          pathNames: [{ type: String, required: true, trim: true }],
          recommendationConfidence: { type: Number, required: true, min: 0, max: 1 },
          profileKey: { type: String, default: null, trim: true },
        },
      ],
      recommendedPriorityGaps: [
        {
          key: { type: String, required: true, trim: true },
          label: { type: String, required: true, trim: true },
          gapScore: { type: Number, required: true, min: 0, max: 1 },
          currentReadiness: { type: Number, min: 0, max: 1 },
          importance: { type: Number, min: 0, max: 1 },
          recommendation: { type: String, required: true, trim: true },
        },
      ],
      selectedCareerPriorityGaps: [
        {
          key: { type: String, required: true, trim: true },
          label: { type: String, required: true, trim: true },
          gapScore: { type: Number, required: true, min: 0, max: 1 },
          currentReadiness: { type: Number, min: 0, max: 1 },
          importance: { type: Number, min: 0, max: 1 },
          recommendation: { type: String, required: true, trim: true },
        },
      ],
      priorityGaps: [
        {
          key: { type: String, required: true, trim: true },
          label: { type: String, required: true, trim: true },
          gapScore: { type: Number, required: true, min: 0, max: 1 },
          currentReadiness: { type: Number, min: 0, max: 1 },
          importance: { type: Number, min: 0, max: 1 },
          recommendation: { type: String, required: true, trim: true },
        },
      ],
      summary: {
        completionRate: { type: Number, required: true, min: 0, max: 1 },
        haveRate: { type: Number, required: true, min: 0, max: 1 },
        confidence: { type: Number, required: true, min: 0, max: 1 },
        source: { type: String, required: true, trim: true },
      },
      explainabilitySummary: {
        method: { type: String, default: null, trim: true },
        narrative: { type: String, default: null, trim: true },
      },
    },
    feedback: {
      accepted: { type: Boolean, default: undefined },
      submittedAt: { type: Date, default: undefined },
    },
    modelMeta: {
      trainedAt: { type: String, default: null, trim: true },
      modelVersion: { type: Number, default: undefined },
    },
  },
  {
    timestamps: true,
  }
);

AssessmentResultSchema.index({ userId: 1, createdAt: -1 });

export type AssessmentResultDocument = mongoose.InferSchemaType<typeof AssessmentResultSchema>;

export default mongoose.model<AssessmentResultDocument>(
  "AssessmentResult",
  AssessmentResultSchema
);
