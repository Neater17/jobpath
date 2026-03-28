import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcrypt";
import type { Request } from "express";
import User from "../models/User.js";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "./users.controller.js";
import { signAuthToken } from "../utils/auth.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";

type MockResponse = {
  statusCode?: number;
  jsonBody?: unknown;
  cookiesSet: Array<{ name: string; value: string; options: unknown }>;
  clearedCookies: Array<{ name: string; options: unknown }>;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  cookie: (name: string, value: string, options: unknown) => MockResponse;
  clearCookie: (name: string, options: unknown) => MockResponse;
};

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    jsonBody: undefined,
    cookiesSet: [] as Array<{ name: string; value: string; options: unknown }>,
    clearedCookies: [] as Array<{ name: string; options: unknown }>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.jsonBody = body;
      return this;
    },
    cookie(name: string, value: string, options: unknown) {
      this.cookiesSet.push({ name, value, options });
      return this;
    },
    clearCookie(name: string, options: unknown) {
      this.clearedCookies.push({ name, options });
      return this;
    },
  } satisfies MockResponse;

  return response;
};

const asResponse = (response: MockResponse) => response as unknown as import("express").Response;

const createRequest = <TBody>(
  body: TBody,
  cookieHeader?: string
) => ({ body, headers: cookieHeader ? { cookie: cookieHeader } : {} }) as Request;

test("registerUser creates a user, normalizes email, and hashes the password", async (t) => {
  const response = createMockResponse();

  t.mock.method(User, "exists", async () => null);
  t.mock.method(bcrypt, "hash", async () => "hashed-password");
  t.mock.method(User, "create", async (payload: Record<string, unknown>) => ({
    _id: "user-1",
    ...payload,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  }));

  await registerUser(
    createRequest({
      firstName: " Jamie ",
      lastName: "Velasco",
      gender: "Female",
      email: "  Jamie@example.COM ",
      password: "StrongPass123!",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 201);
  assert.equal(response.cookiesSet.length, 1);
  assert.equal(response.cookiesSet[0]?.name, "jobpath_token");
  assert.deepEqual(response.jsonBody, {
    message: "Account created successfully.",
    user: {
      id: "user-1",
      firstName: "Jamie",
      lastName: "Velasco",
      gender: "Female",
      email: "jamie@example.com",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });
});

test("registerUser rejects duplicate email addresses", async (t) => {
  const response = createMockResponse();

  t.mock.method(User, "exists", async () => ({ _id: "existing-user" }));

  await registerUser(
    createRequest({
      firstName: "Jamie",
      email: "jamie@example.com",
      password: "StrongPass123!",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.jsonBody, {
    message: "An account with this email already exists.",
  });
});

test("loginUser authenticates valid credentials and sets the auth cookie", async (t) => {
  const response = createMockResponse();

  t.mock.method(User, "findOne", () => ({
    select: async () => ({
      _id: "user-1",
      firstName: "Jamie",
      lastName: "Velasco",
      gender: "Female",
      email: "jamie@example.com",
      passwordHash: "stored-hash",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    }),
  }) as never);
  t.mock.method(bcrypt, "compare", async () => true);

  await loginUser(
    createRequest({
      email: "Jamie@example.com",
      password: "StrongPass123!",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.cookiesSet.length, 1);
  assert.equal(response.cookiesSet[0]?.name, "jobpath_token");
  assert.deepEqual(response.jsonBody, {
    message: "Login successful.",
    user: {
      id: "user-1",
      firstName: "Jamie",
      lastName: "Velasco",
      gender: "Female",
      email: "jamie@example.com",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });
});

test("loginUser rejects an invalid password", async (t) => {
  const response = createMockResponse();

  t.mock.method(User, "findOne", () => ({
    select: async () => ({
      _id: "user-1",
      firstName: "Jamie",
      lastName: "Velasco",
      gender: "Female",
      email: "jamie@example.com",
      passwordHash: "stored-hash",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    }),
  }) as never);
  t.mock.method(bcrypt, "compare", async () => false);

  await loginUser(
    createRequest({
      email: "jamie@example.com",
      password: "WrongPassword!",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.jsonBody, {
    message: "Invalid email or password.",
  });
});

test("getCurrentUser returns the authenticated user from the cookie token", async (t) => {
  const response = createMockResponse();
  const token = signAuthToken({ userId: "user-1" });

  t.mock.method(User, "findById", async () => ({
    _id: "user-1",
    firstName: "Jamie",
    lastName: "Velasco",
    gender: "Female",
    email: "jamie@example.com",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  }));

  await getCurrentUser(
    createRequest({}, `jobpath_token=${token}`),
    asResponse(response)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.jsonBody, {
    message: "Current user fetched successfully.",
    user: {
      id: "user-1",
      firstName: "Jamie",
      lastName: "Velasco",
      gender: "Female",
      email: "jamie@example.com",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });
});

test("logoutUser clears the auth cookie", async () => {
  const response = createMockResponse();

  logoutUser(createRequest({}), asResponse(response));

  assert.equal(response.statusCode, 200);
  assert.equal(response.clearedCookies.length, 1);
  assert.equal(response.clearedCookies[0]?.name, "jobpath_token");
  assert.deepEqual(response.jsonBody, { message: "Logout successful." });
});
