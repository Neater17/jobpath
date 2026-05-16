import bcrypt from "bcrypt";
import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  SECURITY_QUESTION_LABELS,
  SECURITY_QUESTIONS,
  isSecurityQuestionKey,
} from "../constants/securityQuestions.js";
import User, {
  emailPattern,
  normalizeEmail,
  normalizeSecurityAnswer,
} from "../models/User.js";
import {
  clearAuthCookie,
  getAuthTokenFromRequest,
  signRecoveryToken,
  setAuthCookie,
  signAuthToken,
  verifyAuthToken,
  verifyRecoveryToken,
} from "../utils/auth.js";

const SALT_ROUNDS = 12;

type RegisterBody = {
  firstName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  password?: string;
  securityQuestionKey?: string;
  securityAnswer?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

type RecoverEmailBody = {
  email?: string;
};

type RecoverPasswordBody = {
  email?: string;
  securityAnswer?: string;
};

type ResetPasswordBody = {
  recoveryToken?: string;
  password?: string;
};

type UpdateSecurityQuestionBody = {
  securityQuestionKey?: string;
  securityAnswer?: string;
};

const normalizeOptionalString = (value?: string) => {
  if (typeof value !== "string") return undefined;
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const toSafeUser = (user: {
  _id: unknown;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  email: string;
  securityQuestionKey?: string | null;
  createdAt?: Date;
}) => ({
  id: String(user._id),
  firstName: user.firstName,
  lastName: user.lastName,
  gender: user.gender,
  email: user.email,
  securityQuestionKey: user.securityQuestionKey ?? null,
  securityQuestionLabel:
    user.securityQuestionKey && isSecurityQuestionKey(user.securityQuestionKey)
      ? SECURITY_QUESTION_LABELS[user.securityQuestionKey]
      : null,
  securityQuestionConfigured: Boolean(user.securityQuestionKey),
  createdAt: user.createdAt,
});

export async function registerUser(
  req: Request<unknown, unknown, RegisterBody>,
  res: Response
) {
  try {
    const firstName = normalizeOptionalString(req.body.firstName);
    const rawEmail = req.body.email;
    const password = req.body.password;
    const securityQuestionKey = normalizeOptionalString(req.body.securityQuestionKey);
    const securityAnswer = normalizeOptionalString(req.body.securityAnswer);

    if (!firstName) {
      res.status(400).json({ message: "First name is required." });
      return;
    }

    if (typeof rawEmail !== "string" || rawEmail.trim().length === 0) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    if (!securityQuestionKey || !isSecurityQuestionKey(securityQuestionKey)) {
      res.status(400).json({ message: "A valid security question is required." });
      return;
    }

    if (!securityAnswer) {
      res.status(400).json({ message: "Security answer is required." });
      return;
    }

    if (typeof password !== "string" || password.length === 0) {
      res.status(400).json({ message: "Password is required." });
      return;
    }

    const normalizedEmail = normalizeEmail(rawEmail);

    if (!emailPattern.test(normalizedEmail)) {
      res.status(400).json({ message: "Email format is invalid." });
      return;
    }

    const existingUser = await User.exists({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const securityAnswerHash = await bcrypt.hash(
      normalizeSecurityAnswer(securityAnswer),
      SALT_ROUNDS
    );

    const user = await User.create({
      firstName,
      lastName: normalizeOptionalString(req.body.lastName),
      gender: normalizeOptionalString(req.body.gender),
      email: normalizedEmail,
      passwordHash,
      securityQuestionKey,
      securityAnswerHash,
    });

    const token = signAuthToken({ userId: String(user._id) });
    setAuthCookie(res, token);

    res.status(201).json({
      message: "Account created successfully.",
      user: toSafeUser(user),
    });
  } catch (error) {
    if (
      error instanceof mongoose.Error.ValidationError ||
      (error instanceof mongoose.Error.CastError)
    ) {
      res.status(400).json({ message: error.message });
      return;
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    console.error("Error registering user:", error);
    res.status(500).json({ message: "Failed to create account." });
  }
}

export async function loginUser(
  req: Request<unknown, unknown, LoginBody>,
  res: Response
) {
  try {
    const rawEmail = req.body.email;
    const password = req.body.password;

    if (typeof rawEmail !== "string" || rawEmail.trim().length === 0) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    if (typeof password !== "string" || password.length === 0) {
      res.status(400).json({ message: "Password is required." });
      return;
    }

    const normalizedEmail = normalizeEmail(rawEmail);

    if (!emailPattern.test(normalizedEmail)) {
      res.status(400).json({ message: "Email format is invalid." });
      return;
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+passwordHash"
    );

    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const token = signAuthToken({ userId: String(user._id) });
    setAuthCookie(res, token);

    res.status(200).json({
      message: "Login successful.",
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Failed to log in." });
  }
}

export async function startPasswordRecovery(
  req: Request<unknown, unknown, RecoverEmailBody>,
  res: Response
) {
  try {
    const rawEmail = req.body.email;

    if (typeof rawEmail !== "string" || rawEmail.trim().length === 0) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    const normalizedEmail = normalizeEmail(rawEmail);

    if (!emailPattern.test(normalizedEmail)) {
      res.status(400).json({ message: "Email format is invalid." });
      return;
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(404).json({ message: "No account found for that email address." });
      return;
    }

    if (!user.securityQuestionKey || !isSecurityQuestionKey(user.securityQuestionKey)) {
      res.status(409).json({
        message:
          "This account still needs a recovery question. Please sign in and set one from your account page.",
      });
      return;
    }

    res.status(200).json({
      message: "Email found. Please answer your recovery question.",
      email: normalizedEmail,
      securityQuestionKey: user.securityQuestionKey,
      securityQuestionLabel: SECURITY_QUESTION_LABELS[user.securityQuestionKey],
    });
  } catch (error) {
    console.error("Error starting password recovery:", error);
    res.status(500).json({ message: "Failed to start password recovery." });
  }
}

export async function verifyPasswordRecovery(
  req: Request<unknown, unknown, RecoverPasswordBody>,
  res: Response
) {
  try {
    const rawEmail = req.body.email;
    const securityAnswer = normalizeOptionalString(req.body.securityAnswer);

    if (typeof rawEmail !== "string" || rawEmail.trim().length === 0) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    if (!securityAnswer) {
      res.status(400).json({ message: "Security answer is required." });
      return;
    }

    const normalizedEmail = normalizeEmail(rawEmail);

    if (!emailPattern.test(normalizedEmail)) {
      res.status(400).json({ message: "Email format is invalid." });
      return;
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+securityAnswerHash"
    );

    if (!user || !user.securityQuestionKey || !user.securityAnswerHash) {
      res.status(401).json({ message: "Security answer does not match our records." });
      return;
    }

    const answerMatches = await bcrypt.compare(
      normalizeSecurityAnswer(securityAnswer),
      user.securityAnswerHash
    );

    if (!answerMatches) {
      res.status(401).json({ message: "Security answer does not match our records." });
      return;
    }

    const recoveryToken = signRecoveryToken({
      userId: String(user._id),
      email: normalizedEmail,
      purpose: "password-recovery",
    });

    res.status(200).json({
      message: "Identity verified. You can now set a new password.",
      email: normalizedEmail,
      recoveryToken,
    });
  } catch (error) {
    console.error("Error verifying password recovery:", error);
    res.status(500).json({ message: "Failed to verify password recovery." });
  }
}

export async function resetPasswordAfterRecovery(
  req: Request<unknown, unknown, ResetPasswordBody>,
  res: Response
) {
  try {
    const recoveryToken = normalizeOptionalString(req.body.recoveryToken);
    const password = req.body.password;

    if (!recoveryToken) {
      res.status(400).json({ message: "Recovery session is required." });
      return;
    }

    if (typeof password !== "string" || password.length === 0) {
      res.status(400).json({ message: "Password is required." });
      return;
    }

    const payload = verifyRecoveryToken(recoveryToken);

    if (payload.purpose !== "password-recovery") {
      res.status(401).json({ message: "Recovery session is invalid." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const updatedUser = await User.findOneAndUpdate(
      { _id: payload.userId, email: payload.email },
      { passwordHash },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({ message: "Account could not be updated." });
      return;
    }

    res.status(200).json({
      message: "Password updated successfully. You can now sign in.",
      email: updatedUser.email,
    });
  } catch (error) {
    console.error("Error resetting password after recovery:", error);
    res.status(401).json({ message: "Recovery session is invalid or expired." });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    const token = getAuthTokenFromRequest(req);

    if (!token) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      clearAuthCookie(res);
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    res.status(200).json({
      message: "Current user fetched successfully.",
      user: toSafeUser(user),
    });
  } catch (error) {
    clearAuthCookie(res);
    res.status(401).json({ message: "Not authenticated." });
  }
}

export async function updateSecurityQuestion(
  req: Request,
  res: Response
) {
  try {
    const token = getAuthTokenFromRequest(req);

    if (!token) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    const payload = verifyAuthToken(token);
    const body = req.body as UpdateSecurityQuestionBody;
    const securityQuestionKey = normalizeOptionalString(body.securityQuestionKey);
    const securityAnswer = normalizeOptionalString(body.securityAnswer);

    if (!securityQuestionKey || !isSecurityQuestionKey(securityQuestionKey)) {
      res.status(400).json({ message: "A valid security question is required." });
      return;
    }

    if (!securityAnswer) {
      res.status(400).json({ message: "Security answer is required." });
      return;
    }

    const securityAnswerHash = await bcrypt.hash(
      normalizeSecurityAnswer(securityAnswer),
      SALT_ROUNDS
    );
    const user = await User.findByIdAndUpdate(
      payload.userId,
      {
        securityQuestionKey,
        securityAnswerHash,
      },
      { new: true }
    );

    if (!user) {
      clearAuthCookie(res);
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    res.status(200).json({
      message: "Recovery question updated successfully.",
      user: toSafeUser(user),
    });
  } catch (error) {
    clearAuthCookie(res);
    res.status(401).json({ message: "Not authenticated." });
  }
}

export function logoutUser(req: Request, res: Response) {
  clearAuthCookie(res);
  res.status(200).json({ message: "Logout successful." });
}

export function listSecurityQuestions(req: Request, res: Response) {
  res.status(200).json({
    questions: SECURITY_QUESTIONS,
  });
}
