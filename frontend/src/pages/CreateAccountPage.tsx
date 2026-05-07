import React, { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  checkPasswordStrength,
  registerUser,
  type PasswordStrengthResult,
} from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function CreateAccountPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult | null>(null);
  const [passwordStrengthError, setPasswordStrengthError] = useState("");
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

    setEmailError("");
    setPasswordError("");
    setPasswordStrengthError("");

    try {
      setIsSubmitting(true);
      const response = await registerUser({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        gender: gender || undefined,
        birthday,
        email,
        password,
      });

      setUser(response.user);
      setHydrated(true);
      setToastMessage("Account created");
      setFirstName("");
      setLastName("");
      setGender("");
      setBirthday("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPasswordStrength(null);
      navigate("/");
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
          : "Failed to create account.";

      if (message.toLowerCase().includes("email")) {
        setEmailError(message);
      } else {
        setToastMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!password) {
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
  }, [password]);

  useEffect(() => {
    if (!confirmPassword) {
      setPasswordError("");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordError("");
  }, [password, confirmPassword]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const strengthToneClass = passwordStrength?.isStrong ? "text-emerald-700" : "text-amber-700";

  if (!hydrated) {
    return <div className="py-8 text-center text-light-text/80">Checking session...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex items-center justify-center py-8 md:py-16">
      {toastMessage ? (
        <div className="fixed left-1/2 top-6 z-[100] w-[min(92vw,32rem)] -translate-x-1/2 rounded-3xl border border-light-accent-blue/40 bg-gradient-to-r from-primary-blue via-accent-blue to-primary-blue p-[1px] shadow-[0_20px_60px_rgba(37,99,235,0.4)]">
          <div className="flex items-start gap-3 rounded-[calc(1.5rem-1px)] bg-navy-bg/90 px-5 py-4 text-light-text backdrop-blur-md">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-light-accent-blue/20 text-lg text-light-accent-blue">
              !
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-light-accent-blue">
                Notice
              </div>
              <div className="mt-1 text-base font-semibold leading-6 text-light-text">{toastMessage}</div>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-auto rounded-full px-2 py-1 text-sm font-semibold text-light-text/70 transition hover:bg-card-bg/40 hover:text-light-text"
              aria-label="Dismiss notification"
            >
              X
            </button>
          </div>
        </div>
      ) : null}

      <div className="w-full max-w-3xl rounded-3xl border border-light-text/15 bg-deep-bg p-8 shadow-[0_32px_90px_rgba(1,12,52,0.44)] md:p-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-light-accent-blue">Create Account</p>
          <h1 className="mt-3 text-3xl font-bold text-light-text">Get started on JOB-PATH</h1>
          <p className="mt-3 text-light-text/70">
            Create an account to save assessments, track progress, and explore career paths that match your
            goals.
          </p>
        </div>

        <form
          className="mt-8 space-y-5 rounded-2xl border border-light-text/15 bg-navy-bg/88 p-6"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-light-text/90">
                First name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="First name"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full rounded-xl border border-light-text/20 bg-light-text px-4 py-3 text-slate-900 outline-none transition focus:border-primary-blue focus:ring-4 focus:ring-light-accent-blue/20"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-light-text/90">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full rounded-xl border border-light-text/20 bg-light-text px-4 py-3 text-slate-900 outline-none transition focus:border-primary-blue focus:ring-4 focus:ring-light-accent-blue/20"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="gender" className="mb-2 block text-sm font-medium text-light-text/90">
                Gender
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                className="w-full rounded-xl border border-light-text/20 bg-light-text px-4 py-3 text-slate-700 outline-none transition focus:border-primary-blue focus:ring-4 focus:ring-light-accent-blue/20"
              >
                <option value="">Select your gender</option>
                <option>Female</option>
                <option>Male</option>
                <option>Non-binary</option>
                <option>Prefer not to say</option>
              </select>
            </div>

            <div>
              <label htmlFor="birthday" className="mb-2 flex items-center gap-2 text-sm font-medium text-light-text/90">
                <span>
                  Birthday <span className="text-red-500">*</span>
                </span>
                <span className="group relative inline-flex">
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label="Why birthday is required"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-light-text/55 transition hover:text-primary-blue focus:text-primary-blue focus:outline-none"
                  >
                    <Info size={14} />
                  </button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-56 -translate-x-1/2 rounded-xl bg-deep-bg px-3 py-2 text-xs font-medium leading-5 text-light-text shadow-xl group-hover:block group-focus-within:block">
                    Birthday is required for forgotten password cases.
                  </span>
                </span>
              </label>
              <input
                id="birthday"
                type="date"
                required
                value={birthday}
                onChange={(event) => setBirthday(event.target.value)}
                className="w-full rounded-xl border border-light-text/20 bg-light-text px-4 py-3 text-slate-900 outline-none transition focus:border-primary-blue focus:ring-4 focus:ring-light-accent-blue/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact" className="mb-2 block text-sm font-medium text-light-text/90">
              Email address <span className="text-red-500">*</span>
            </label>
            <input
              id="contact"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError("");
              }}
              className={`w-full rounded-xl border bg-light-text px-4 py-3 text-slate-900 outline-none transition focus:border-primary-blue focus:ring-4 focus:ring-light-accent-blue/20 ${
                emailError ? "border-red-400 focus:ring-red-100" : "border-light-text/20"
              }`}
            />
            <p className="mt-2 text-xs text-light-text/60">
              We will use your email for account security and important updates.
            </p>
            {emailError ? <p className="mt-2 text-sm text-red-600">{emailError}</p> : null}
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-2 block text-sm font-medium text-light-text/90">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="newPassword"
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError("");
              }}
              className="w-full rounded-xl border border-light-text/20 bg-light-text px-4 py-3 text-slate-900 outline-none transition focus:border-primary-blue focus:ring-4 focus:ring-light-accent-blue/20"
            />
            {isCheckingPassword ? <p className="mt-2 text-sm text-light-text/60">Checking password strength...</p> : null}
            {passwordStrength ? (
              <div className="mt-2 space-y-1">
                <p className={`text-sm font-medium ${strengthToneClass}`}>Strength: {passwordStrength.strength}</p>
                {passwordStrength.feedback.length > 0 ? (
                  <p className="text-xs text-light-text/60">{passwordStrength.feedback.join(" ")}</p>
                ) : (
                  <p className="text-xs text-light-text/60">This password meets the strength requirements.</p>
                )}
              </div>
            ) : null}
            {passwordStrengthError ? <p className="mt-2 text-sm text-red-600">{passwordStrengthError}</p> : null}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-light-text/90">
              Confirm password <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Enter your password again"
              required
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
              }}
              className={`w-full rounded-xl border bg-light-text px-4 py-3 text-slate-900 outline-none transition focus:border-primary-blue focus:ring-4 focus:ring-light-accent-blue/20 ${
                passwordError ? "border-red-400 focus:ring-red-100" : "border-light-text/20"
              }`}
            />
            {passwordError ? <p className="mt-2 text-sm text-red-600">{passwordError}</p> : null}
          </div>

          <p className="text-xs leading-5 text-light-text/60">
            By clicking Submit, you agree to create an account and accept the JOB-PATH terms, privacy
            policy, and cookie policy.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary-blue px-4 py-3 font-semibold text-light-text transition hover:bg-accent-blue"
          >
            {isSubmitting ? "Creating account..." : "Submit"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-light-text/70">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary-blue hover:text-accent-blue">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
