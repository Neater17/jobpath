import mongoose, { Schema } from "mongoose";

interface PqfLevelItem {
  descriptor: string[];
  pqf_level: string | null;
  psf_level: number;
  qualification: string;
}

const pqfLevelItemSchema = new Schema<PqfLevelItem>({
  descriptor: { type: [String], required: true },
  pqf_level: { type: String, default: null },
  psf_level: { type: Number, required: true },
  qualification: { type: String, required: true },
});

const pqfLevelSchema = new Schema<{
  pqf_levels: PqfLevelItem[];
}>
({
  pqf_levels: { type: [pqfLevelItemSchema], required: true },
}, { timestamps: true });

export type PqfLevelDocument = mongoose.InferSchemaType<typeof pqfLevelSchema>;
export const PqfLevel = mongoose.model<PqfLevelDocument>(
  "PqfLevel", 
  pqfLevelSchema,
  "pqfLevelDescriptors");
export type { PqfLevelItem };
