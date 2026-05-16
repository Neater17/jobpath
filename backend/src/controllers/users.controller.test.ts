import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcrypt";
import type { Request } from "express";
import User from "../models/User.js";
import {
  getCurrentUser,
  listSecurityQuestions,
  loginUser,
  logoutUser,
  registerUser,
  resetPasswordAfterRecovery,
  startPasswordRecovery,
  updateSecurityQuestion,
  verifyPasswordRecovery,
} from "./users.controller.js";
import { signAuthToken, signRecoveryToken } from "../utils/auth.js";
import { SECURITY_QUESTIONS } from "../constants/securityQuestions.js";

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
  const hashMock = t.mock.method(bcrypt, "hash", async (value: string) =>
    value === "StrongPass123!" ? "hashed-password" : "hashed-answer"
  );
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
      securityQuestionKey: "first_pet",
      securityAnswer: "  Pepper ",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 201);
  assert.equal(response.cookiesSet.length, 1);
  assert.equal(response.cookiesSet[0]?.name, "jobpath_token");
  assert.equal(hashMock.mock.calls.length, 2);
  assert.deepEqual(response.jsonBody, {
    message: "Account created successfully.",
    user: {
      id: "user-1",
      firstName: "Jamie",
      lastName: "Velasco",
      gender: "Female",
      email: "jamie@example.com",
      securityQuestionKey: "first_pet",
      securityQuestionLabel: "What was the name of your first pet?",
      securityQuestionConfigured: true,
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
      securityQuestionKey: "first_pet",
      securityAnswer: "Pepper",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.jsonBody, {
    message: "An account with this email already exists.",
  });
});

test("registerUser requires a security question answer", async () => {
  const response = createMockResponse();

  await registerUser(
    createRequest({
      firstName: "Jamie",
      email: "jamie@example.com",
      password: "StrongPass123!",
      securityQuestionKey: "first_pet",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.jsonBody, {
    message: "Security answer is required.",
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
      securityQuestionKey: "first_pet",
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
      securityQuestionKey: "first_pet",
      securityQuestionLabel: "What was the name of your first pet?",
      securityQuestionConfigured: true,
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
      securityQuestionKey: "first_pet",
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

test("startPasswordRecovery returns the configured security question", async (t) => {
  const response = createMockResponse();

  t.mock.method(User, "findOne", async () => ({
    _id: "user-1",
    email: "jamie@example.com",
    securityQuestionKey: "first_pet",
  }));

  await startPasswordRecovery(
    createRequest({
      email: " Jamie@example.com ",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.jsonBody, {
    message: "Email found. Please answer your recovery question.",
    email: "jamie@example.com",
    securityQuestionKey: "first_pet",
    securityQuestionLabel: "What was the name of your first pet?",
  });
});

test("startPasswordRecovery rejects an unknown email", async (t) => {
  const response = createMockResponse();

  t.mock.method(User, "findOne", async () => null);

  await startPasswordRecovery(
    createRequest({
      email: "jamie@example.com",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.jsonBody, {
    message: "No account found for that email address.",
  });
});

test("startPasswordRecovery blocks legacy users without a security question", async (t) => {
  const response = createMockResponse();

  t.mock.method(User, "findOne", async () => ({
    _id: "legacy-user",
    email: "jamie@example.com",
    securityQuestionKey: null,
  }));

  await startPasswordRecovery(
    createRequest({
      email: "jamie@example.com",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.jsonBody, {
    message:
      "This account still needs a recovery question. Please sign in and set one from your account page.",
  });
});

test("verifyPasswordRecovery verifies a matching email and security answer", async (t) => {
  const response = createMockResponse();

  t.mock.method(User, "findOne", () => ({
    select: async () => ({
      _id: "user-1",
      email: "jamie@example.com",
      securityQuestionKey: "first_pet",
      securityAnswerHash: "stored-answer-hash",
    }),
  }) as never);
  t.mock.method(bcrypt, "compare", async () => true);

  await verifyPasswordRecovery(
    createRequest({
      email: "Jamie@example.com",
      securityAnswer: "Pepper",
    }),
    asResponse(response)
  );

  const jsonBody = response.jsonBody as Record<string, unknown> | undefined;

  assert.equal(response.statusCode, 200);
  assert.equal(typeof jsonBody?.recoveryToken, "string");
  assert.deepEqual(
    {
      ...jsonBody,
      recoveryToken: "<token>",
    },
    {
      message: "Identity verified. You can now set a new password.",
      email: "jamie@example.com",
      recoveryToken: "<token>",
    }
  );
});

test("verifyPasswordRecovery rejects a wrong security answer", async (t) => {
  const response = createMockResponse();

  t.mock.method(User, "findOne", () => ({
    select: async () => ({
      _id: "user-1",
      email: "jamie@example.com",
      securityQuestionKey: "first_pet",
      securityAnswerHash: "stored-answer-hash",
    }),
  }) as never);
  t.mock.method(bcrypt, "compare", async () => false);

  await verifyPasswordRecovery(
    createRequest({
      email: "jamie@example.com",
      securityAnswer: "Wrong",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.jsonBody, {
    message: "Security answer does not match our records.",
  });
});

test("resetPasswordAfterRecovery updates the password for a verified recovery session", async (t) => {
  const response = createMockResponse();
  const recoveryToken = signRecoveryToken({
    userId: "user-1",
    email: "jamie@example.com",
    purpose: "password-recovery",
  });

  t.mock.method(bcrypt, "hash", async () => "new-hash");
  t.mock.method(User, "findOneAndUpdate", async () => ({
    _id: "user-1",
    email: "jamie@example.com",
  }));

  await resetPasswordAfterRecovery(
    createRequest({
      recoveryToken,
      password: "NewStrongPass123!",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.jsonBody, {
    message: "Password updated successfully. You can now sign in.",
    email: "jamie@example.com",
  });
});

test("resetPasswordAfterRecovery rejects an invalid recovery token", async () => {
  const response = createMockResponse();

  await resetPasswordAfterRecovery(
    createRequest({
      recoveryToken: "invalid-token",
      password: "NewStrongPass123!",
    }),
    asResponse(response)
  );

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.jsonBody, {
    message: "Recovery session is invalid or expired.",
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
      securityQuestionKey: "first_pet",
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
      securityQuestionKey: "first_pet",
      securityQuestionLabel: "What was the name of your first pet?",
      securityQuestionConfigured: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });
});

test("updateSecurityQuestion saves a recovery question for an authenticated user", async (t) => {
  const response = createMockResponse();
  const token = signAuthToken({ userId: "user-1" });

  t.mock.method(bcrypt, "hash", async () => "new-answer-hash");
  t.mock.method(User, "findByIdAndUpdate", async () => ({
    _id: "user-1",
    firstName: "Jamie",
    lastName: "Velasco",
    gender: "Female",
    email: "jamie@example.com",
    securityQuestionKey: "favorite_childhood_book",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  }));

  await updateSecurityQuestion(
    createRequest(
      {
        securityQuestionKey: "favorite_childhood_book",
        securityAnswer: "The Little Prince",
      },
      `jobpath_token=${token}`
    ),
    asResponse(response)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.jsonBody, {
    message: "Recovery question updated successfully.",
    user: {
      id: "user-1",
      firstName: "Jamie",
      lastName: "Velasco",
      gender: "Female",
      email: "jamie@example.com",
      securityQuestionKey: "favorite_childhood_book",
      securityQuestionLabel: "What is the title of your favorite childhood book?",
      securityQuestionConfigured: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });
});

test("listSecurityQuestions returns the supported recovery questions", async () => {
  const response = createMockResponse();

  listSecurityQuestions(createRequest({}), asResponse(response));

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.jsonBody, {
    questions: SECURITY_QUESTIONS,
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
