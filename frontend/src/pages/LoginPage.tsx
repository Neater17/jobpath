import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const location = useLocation();
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

  useEffect(() => {
    const navigationState = location.state as
      | { recoveredEmail?: string; recoveryMessage?: string }
      | null;

    if (!navigationState) {
      return;
    }

    if (navigationState.recoveredEmail) {
      setEmail(navigationState.recoveredEmail);
    }

    if (navigationState.recoveryMessage) {
      setToastMessage(navigationState.recoveryMessage);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

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

      <div className="auth-shell grid w-full max-w-5xl md:grid-cols-[1.1fr_0.9fr]">
        <section className="bg-gradient-to-br from-deep-bg via-navy-bg to-card-bg p-8 text-light-text md:p-12">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-light-text/10 bg-card-bg/55 text-2xl font-bold shadow-lg backdrop-blur">
            JP
          </div>
          <h2 className="mt-8 text-4xl font-bold leading-tight">Welcome back to JOB-PATH</h2>
          <p className="mt-4 max-w-md text-base text-light-text/88">
            Sign in to continue exploring career maps, skill assessments, and personalized pathways in
            data and technology.
          </p>

          <div className="mt-10 space-y-4">
            <div className="rounded-2xl border border-light-text/15 bg-card-bg/40 p-4 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-light-text">Discover</p>
              <p className="mt-2 text-light-text/88">
                Review curated career tracks and compare roles with confidence.
              </p>
            </div>
            <div className="rounded-2xl border border-light-text/15 bg-card-bg/40 p-4 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-light-text">Assess</p>
              <p className="mt-2 text-light-text/88">
                Check your current skills and spot the next steps for growth.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,#071854_0%,#010c34_100%)] p-8 md:p-12">
          <div className="mx-auto max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-soft-lavender-blue">Login</p>
            <h1 className="mt-3 text-3xl font-bold text-light-text">Sign in to your account</h1>
            <p className="mt-3 text-light-text/70">
              Use your email and password to access your JOB-PATH dashboard.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-light-text/90">
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
                  className={`w-full rounded-xl border bg-light-text px-4 py-3 text-slate-900 outline-none transition focus:border-primary-blue focus:ring-4 focus:ring-light-accent-blue/20 ${
                    emailError ? "border-red-400 focus:ring-red-100" : "border-light-text/20"
                  }`}
                />
                {emailError ? <p className="mt-2 text-sm text-red-600">{emailError}</p> : null}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-light-text/90">
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
                  className={`w-full rounded-xl border bg-light-text px-4 py-3 text-slate-900 outline-none transition focus:border-primary-blue focus:ring-4 focus:ring-light-accent-blue/20 ${
                    passwordError ? "border-red-400 focus:ring-red-100" : "border-light-text/20"
                  }`}
                />
                {passwordError ? <p className="mt-2 text-sm text-red-600">{passwordError}</p> : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl border border-light-accent-blue/35 bg-primary-blue px-4 py-3 font-semibold text-light-text shadow-[0_14px_30px_rgba(25,82,215,0.3)] transition hover:bg-accent-blue"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <Link
              to="/create-account"
              className="mt-5 block w-full rounded-xl border border-light-text/20 bg-card-bg/65 px-4 py-3 text-center font-semibold text-light-text transition hover:border-light-accent-blue hover:bg-card-bg/90 hover:text-light-text"
            >
              Create New Account
            </Link>

            <p className="mt-5 text-center text-sm text-light-text/70">
              Forgot your password?{" "}
              <Link to="/recover-password" className="font-semibold text-primary-blue hover:text-accent-blue">
                Recover password
              </Link>
            </p>

            <p className="mt-6 text-center text-sm text-light-text/70">
              Need to go back?{" "}
              <Link to="/" className="font-semibold text-primary-blue hover:text-accent-blue">
                Return to home
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
