import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "jobpath_token";
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const AUTH_TOKEN_EXPIRES_IN = "1d";
const RECOVERY_TOKEN_EXPIRES_IN = "10m";

type AuthTokenPayload = {
  userId: string;
};

type RecoveryTokenPayload = {
  userId: string;
  email: string;
  purpose: "password-recovery";
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
};

export const parseCookies = (cookieHeader?: string) => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (!rawName) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(rawValueParts.join("="));
    return cookies;
  }, {});
};

export const signAuthToken = (payload: AuthTokenPayload) =>
  jwt.sign(payload, getJwtSecret(), { expiresIn: AUTH_TOKEN_EXPIRES_IN });

export const verifyAuthToken = (token: string) =>
  jwt.verify(token, getJwtSecret()) as AuthTokenPayload;

export const signRecoveryToken = (payload: RecoveryTokenPayload) =>
  jwt.sign(payload, getJwtSecret(), { expiresIn: RECOVERY_TOKEN_EXPIRES_IN });

export const verifyRecoveryToken = (token: string) =>
  jwt.verify(token, getJwtSecret()) as RecoveryTokenPayload;

export const setAuthCookie = (res: Response, token: string) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: ONE_DAY_IN_MS,
    path: "/",
  });
};

export const clearAuthCookie = (res: Response) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
  });
};

export const getAuthTokenFromRequest = (req: Request) => {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME];
};
