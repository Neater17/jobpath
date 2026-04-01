import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  checkPasswordStrength,
  resetRecoveredPassword,
  startPasswordRecovery,
  type PasswordStrengthResult,
  verifyPasswordRecovery,
} from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function RecoverPasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState("");
  const [birthdayError, setBirthdayError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult | null>(null);
  const [passwordStrengthError, setPasswordStrengthError] = useState("");
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"email" | "birthday" | "password">("email");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError("");
    setBirthdayError("");
    setPasswordError("");
    setPasswordStrengthError("");

    try {
      setIsSubmitting(true);

      if (step === "email") {
        const response = await startPasswordRecovery({ email });
        setConfirmedEmail(response.email);
        setEmail(response.email);
        setBirthday("");
        setStep("birthday");
        setToastMessage(response.message);
        return;
      }

      if (step === "birthday") {
        const response = await verifyPasswordRecovery({
          email: confirmedEmail,
          birthday,
        });
        setRecoveryToken(response.recoveryToken || "");
        setStep("password");
        setPassword("");
        setConfirmPassword("");
        setPasswordStrength(null);
        setToastMessage(response.message);
        return;
      }

      if (!passwordStrength?.isStrong) {
        setPasswordStrengthError("Please choose a stronger password before continuing.");
        setToastMessage(null);
        return;
      }

      if (password !== confirmPassword) {
        setPasswordError("Passwords do not match.");
        setToastMessage(null);
        return;
      }

      const response = await resetRecoveredPassword({
        recoveryToken,
        password,
      });
      navigate("/login", {
        replace: true,
        state: {
          recoveredEmail: response.email,
          recoveryMessage: response.message,
        },
      });
      return;
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : "Failed to recover password.";

      if (step === "email") {
        setEmailError(message);
      } else if (step === "birthday") {
        setBirthdayError(message);
      } else {
        setPasswordError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!password || step !== "password") {
      setPasswordStrength(null);
      setPasswordStrengthError("");
      setIsCheckingPassword(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsCheckingPassword(true);
        const result = await checkPasswordStrength(password);
        setPasswordStrength(result);
        setPasswordStrengthError("");
      } catch (error) {
        setPasswordStrength(null);
        setPasswordStrengthError("Password checker is unavailable right now.");
      } finally {
        setIsCheckingPassword(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [password, step]);

  useEffect(() => {
    if (step !== "password" || !confirmPassword) {
      setPasswordError("");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordError("");
  }, [password, confirmPassword, step]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  if (!hydrated) {
    return <div className="py-8 text-center text-white/80">Checking session...</div>;
  }

  if (user) {
    return <Navigate to="/account" replace />;
  }

  return (
    <div className="flex items-center justify-center py-8 md:py-16">
      {toastMessage ? (
        <div className="fixed left-1/2 top-6 z-[100] w-[min(92vw,32rem)] -translate-x-1/2 rounded-3xl border border-cyan-300/40 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 p-[1px] shadow-[0_20px_60px_rgba(37,99,235,0.4)]">
          <div className="flex items-start gap-3 rounded-[calc(1.5rem-1px)] bg-slate-950/90 px-5 py-4 text-white backdrop-blur-md">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-lg text-cyan-200">
              !
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Notice
              </div>
              <div className="mt-1 text-base font-semibold leading-6 text-white">
                {toastMessage}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-auto rounded-full px-2 py-1 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              X
            </button>
          </div>
        </div>
      ) : null}

      <div className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-2xl md:p-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Recover Password
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Verify your account details
          </h1>
          <p className="mt-3 text-slate-600">
            {step === "email"
              ? "Enter the email address you used during sign-up to start account recovery."
              : step === "birthday"
                ? "We found a matching email. Confirm your birthday to continue recovery."
                : "Your identity is verified. Set a new password for your account."}
          </p>
        </div>

        <form
          className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-6"
          onSubmit={handleSubmit}
        >
          <div>
            <label htmlFor="recoverEmail" className="mb-2 block text-sm font-medium text-slate-700">
              Email address <span className="text-red-500">*</span>
            </label>
            <input
              id="recoverEmail"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              readOnly={step !== "email"}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError("");
              }}
              className={`w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                emailError ? "border border-red-400 focus:ring-red-100" : "border border-slate-200"
              } ${step !== "email" ? "cursor-not-allowed bg-slate-100 text-slate-600" : ""}`}
            />
            {emailError ? (
              <p className="mt-2 text-sm text-red-600">{emailError}</p>
            ) : null}
          </div>

          {step === "birthday" ? (
            <div>
              <label htmlFor="recoverBirthday" className="mb-2 block text-sm font-medium text-slate-700">
                Birthday <span className="text-red-500">*</span>
              </label>
              <input
                id="recoverBirthday"
                type="date"
                required
                value={birthday}
                onChange={(event) => {
                  setBirthday(event.target.value);
                  setBirthdayError("");
                }}
                className={`w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                  birthdayError ? "border border-red-400 focus:ring-red-100" : "border border-slate-200"
                }`}
              />
              {birthdayError ? (
                <p className="mt-2 text-sm text-red-600">{birthdayError}</p>
              ) : null}
            </div>
          ) : null}

          {step === "password" ? (
            <>
              <div>
                <label htmlFor="recoverPassword" className="mb-2 block text-sm font-medium text-slate-700">
                  New password <span className="text-red-500">*</span>
                </label>
                <input
                  id="recoverPassword"
                  type="password"
                  placeholder="Enter a new password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setPasswordError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                {isCheckingPassword ? (
                  <p className="mt-2 text-sm text-slate-500">Checking password strength...</p>
                ) : null}
                {passwordStrength ? (
                  <div className="mt-2 space-y-1">
                    <p
                      className={`text-sm font-medium ${
                        passwordStrength.isStrong ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      Strength: {passwordStrength.strength}
                    </p>
                    <p className="text-xs text-slate-500">
                      {passwordStrength.feedback.length > 0
                        ? passwordStrength.feedback.join(" ")
                        : "This password meets the strength requirements."}
                    </p>
                  </div>
                ) : null}
                {passwordStrengthError ? (
                  <p className="mt-2 text-sm text-red-600">{passwordStrengthError}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="recoverConfirmPassword" className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm new password <span className="text-red-500">*</span>
                </label>
                <input
                  id="recoverConfirmPassword"
                  type="password"
                  placeholder="Enter your new password again"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={`w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                    passwordError ? "border border-red-400 focus:ring-red-100" : "border border-slate-200"
                  }`}
                />
                {passwordError ? (
                  <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                ) : null}
              </div>
            </>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            {isSubmitting
              ? "Checking..."
              : step === "email"
                ? "Continue"
                : step === "birthday"
                  ? "Verify Birthday"
                  : "Change Password"}
          </button>

          {step !== "email" ? (
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setConfirmedEmail("");
                setRecoveryToken("");
                setBirthday("");
                setPassword("");
                setConfirmPassword("");
                setBirthdayError("");
                setPasswordError("");
                setPasswordStrength(null);
                setPasswordStrengthError("");
                setToastMessage(null);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Use a different email
            </button>
          ) : null}
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Need to go back?{" "}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Return to login
          </Link>
        </p>
      </div>
    </div>
  );
}
