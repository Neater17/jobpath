import mongoose, { Schema } from "mongoose";
import {
  SECURITY_QUESTIONS,
  type SecurityQuestionKey,
} from "../constants/securityQuestions.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeSecurityAnswer = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const UserSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required."],
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
      default: null,
    },
    gender: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      trim: true,
      lowercase: true,
      set: normalizeEmail,
      validate: {
        validator: (value: string) => emailPattern.test(value),
        message: "Email format is invalid.",
      },
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    securityQuestionKey: {
      type: String,
      enum: SECURITY_QUESTIONS.map((question) => question.key),
      default: null,
    },
    securityAnswerHash: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ email: 1 }, { unique: true });

export type UserDocument = mongoose.InferSchemaType<typeof UserSchema>;
export type UserSecurityQuestionKey = SecurityQuestionKey;
export { emailPattern, normalizeEmail, normalizeSecurityAnswer };
export default mongoose.model<UserDocument>("User", UserSchema);
