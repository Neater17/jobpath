import bcrypt from "bcrypt";
import { Request, Response } from "express";
import mongoose from "mongoose";
import User, { emailPattern, normalizeEmail } from "../models/User.js";
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
  birthday?: string;
  email?: string;
  password?: string;
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
  birthday?: string;
};

type ResetPasswordBody = {
  recoveryToken?: string;
  password?: string;
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
  birthday?: string | null;
  email: string;
  createdAt?: Date;
}) => ({
  id: String(user._id),
  firstName: user.firstName,
  lastName: user.lastName,
  gender: user.gender,
  birthday: user.birthday,
  email: user.email,
  createdAt: user.createdAt,
});

export async function registerUser(
  req: Request<unknown, unknown, RegisterBody>,
  res: Response
) {
  try {
    const firstName = normalizeOptionalString(req.body.firstName);
    const birthday = normalizeOptionalString(req.body.birthday);
    const rawEmail = req.body.email;
    const password = req.body.password;

    if (!firstName) {
      res.status(400).json({ message: "First name is required." });
      return;
    }

    if (typeof rawEmail !== "string" || rawEmail.trim().length === 0) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    if (!birthday) {
      res.status(400).json({ message: "Birthday is required." });
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

    const user = await User.create({
      firstName,
      lastName: normalizeOptionalString(req.body.lastName),
      gender: normalizeOptionalString(req.body.gender),
      birthday,
      email: normalizedEmail,
      passwordHash,
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

    const existingUser = await User.exists({ email: normalizedEmail });

    if (!existingUser) {
      res.status(404).json({ message: "No account found for that email address." });
      return;
    }

    res.status(200).json({
      message: "Email found. Please confirm your birthday.",
      email: normalizedEmail,
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
    const birthday = normalizeOptionalString(req.body.birthday);

    if (typeof rawEmail !== "string" || rawEmail.trim().length === 0) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    if (!birthday) {
      res.status(400).json({ message: "Birthday is required." });
      return;
    }

    const normalizedEmail = normalizeEmail(rawEmail);

    if (!emailPattern.test(normalizedEmail)) {
      res.status(400).json({ message: "Email format is invalid." });
      return;
    }

    const user = await User.findOne({
      email: normalizedEmail,
      birthday,
    });

    if (!user) {
      res.status(401).json({ message: "Birthday does not match our records." });
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

export function logoutUser(req: Request, res: Response) {
  clearAuthCookie(res);
  res.status(200).json({ message: "Logout successful." });
}
