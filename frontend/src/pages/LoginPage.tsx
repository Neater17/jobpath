import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { loginUser } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError("");
    setPasswordError("");

    try {
      setIsSubmitting(true);
      const response = await loginUser({ email, password });
      setUser(response.user);
      setHydrated(true);
      setToastMessage("Login successful");
      setEmail("");
      setPassword("");
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
          : "Failed to log in.";

      if (message.toLowerCase().includes("email")) {
        setEmailError(message);
      } else if (message.toLowerCase().includes("password")) {
        setPasswordError(message);
      } else {
        setPasswordError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
    return <Navigate to="/" replace />;
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

      <div className="w-full max-w-5xl grid overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-[1.1fr_0.9fr]">
        <section className="bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-500 p-8 text-white md:p-12">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur">
            JP
          </div>
          <h2 className="mt-8 text-4xl font-bold leading-tight">
            Welcome back to JOB-PATH
          </h2>
          <p className="mt-4 max-w-md text-base text-white/85">
            Sign in to continue exploring career maps, skill assessments, and
            personalized pathways in data and technology.
          </p>

          <div className="mt-10 space-y-4">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
                Discover
              </p>
              <p className="mt-2 text-white/85">
                Review curated career tracks and compare roles with confidence.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
                Assess
              </p>
              <p className="mt-2 text-white/85">
                Check your current skills and spot the next steps for growth.
              </p>
            </div>
          </div>
        </section>

        <section className="p-8 md:p-12">
          <div className="mx-auto max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Login
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Sign in to your account
            </h1>
            <p className="mt-3 text-slate-600">
              Use your email and password to access your JOB-PATH dashboard.
            </p>

            <form
              className="mt-8 space-y-5"
              onSubmit={handleSubmit}
            >
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError("");
                  }}
                  className={`w-full rounded-xl px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                    emailError ? "border border-red-400 focus:ring-red-100" : "border border-slate-200"
                  }`}
                />
                {emailError ? (
                  <p className="mt-2 text-sm text-red-600">{emailError}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setPasswordError("");
                  }}
                  className={`w-full rounded-xl px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                    passwordError ? "border border-red-400 focus:ring-red-100" : "border border-slate-200"
                  }`}
                />
                {passwordError ? (
                  <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-semibold text-white shadow-lg transition hover:from-blue-700 hover:to-cyan-600"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <Link
              to="/create-account"
              className="mt-5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Create New Account
            </Link>

            <p className="mt-6 text-center text-sm text-slate-600">
              Need to go back?{" "}
              <Link to="/" className="font-semibold text-blue-600 hover:text-blue-700">
                Return to home
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
