import bcrypt from "bcrypt";
import { Request, Response } from "express";
import mongoose from "mongoose";
import User, { emailPattern, normalizeEmail } from "../models/User.js";
import {
  clearAuthCookie,
  getAuthTokenFromRequest,
  setAuthCookie,
  signAuthToken,
  verifyAuthToken,
} from "../utils/auth.js";

const SALT_ROUNDS = 12;

type RegisterBody = {
  firstName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  password?: string;
};

type LoginBody = {
  email?: string;
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
  email: string;
  createdAt?: Date;
}) => ({
  id: String(user._id),
  firstName: user.firstName,
  lastName: user.lastName,
  gender: user.gender,
  email: user.email,
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

    if (!firstName) {
      res.status(400).json({ message: "First name is required." });
      return;
    }

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
