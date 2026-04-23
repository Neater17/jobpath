import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { fetchCurrentUser } from "../services/api";
import { useAuthStore } from "../store/authStore";

type Props = { children: React.ReactNode };

export default function Layout({ children }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const [userLabel, setUserLabel] = useState("User");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const syncAuthState = async () => {
      try {
        const response = await fetchCurrentUser();
        setUser(response.user);
      } catch {
        setUser(null);
      } finally {
        setHydrated(true);
      }
    };

    if (!hydrated) {
      void syncAuthState();
    }
  }, [hydrated, setHydrated, setUser]);

  useEffect(() => {
    const nextLabel = user?.firstName?.trim() || user?.email?.trim() || "User";
    setUserLabel(nextLabel);
  }, [user]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  function handleNotImplementedClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setToastMessage("Function not yet implemented");
  }

  return (
    <>
      {toastMessage ? (
        <div className="fixed left-1/2 top-6 z-[100] w-[min(92vw,28rem)] -translate-x-1/2 rounded-3xl border border-cyan-300/40 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 p-[1px] shadow-[0_20px_60px_rgba(37,99,235,0.4)]">
          <div className="rounded-[calc(1.5rem-1px)] bg-slate-950/90 px-5 py-4 text-white backdrop-blur-md">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Notice
            </div>
            <p className="mt-2 text-base font-semibold text-white">{toastMessage}</p>
          </div>
        </div>
      ) : null}

      <header className="bg-white/10 shadow-lg backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <span className="text-xl font-bold text-blue-600">JP</span>
              </div>
              <h1 className="text-2xl font-bold text-white">JOB-PATH</h1>
            </Link>

            <nav className="hidden flex-1 justify-center space-x-6 md:flex">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive
                    ? "rounded-lg bg-white/20 px-4 py-2 font-semibold text-white"
                    : "rounded-lg px-4 py-2 text-white transition hover:bg-white/10"
                }
              >
                HOME
              </NavLink>
              <NavLink
                to="/how-it-works"
                className={({ isActive }) =>
                  isActive
                    ? "rounded-lg bg-white/20 px-4 py-2 font-semibold text-white"
                    : "rounded-lg px-4 py-2 text-white transition hover:bg-white/10"
                }
              >
                How It Works
              </NavLink>
              <Link
                to="/about-us"
                className="rounded-lg px-4 py-2 text-white transition hover:bg-white/10"
              >
                About Us
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white/90">{userLabel}</span>
              <button
                type="button"
                onClick={() => navigate(user ? "/account" : "/login")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white transition hover:bg-blue-100"
                aria-label={user ? "Open account page" : "Open login page"}
              >
                <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">{children}</main>

      <footer className="mt-16 bg-white/10 backdrop-blur-md">
        <div className="container mx-auto px-6 py-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h4 className="mb-4 text-lg font-bold text-white">About JOB-PATH</h4>
              <p className="text-sm text-white/70">
                Empowering professionals to discover and navigate their ideal
                career paths in data and technology.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-lg font-bold text-white">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-sm text-white/70 transition hover:text-white">
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about-us"
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/career-map"
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    Career Map
                  </Link>
                </li>
                <li>
                  <Link
                    to="/skill-map"
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    Skills Map
                  </Link>
                </li>
                <li>
                  <Link
                    to="/career-select"
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    Skill Assessment
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cv-upload"
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    CV Upload
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-lg font-bold text-white">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    onClick={handleNotImplementedClick}
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    Career Guides
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={handleNotImplementedClick}
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    Skill Development
                  </a>
                </li>
                <li>
                  <Link
                    to="/how-it-works"
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={handleNotImplementedClick}
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    Support
                  </a>
                </li>
                <li>
                  <a
                    href="https://bit.ly/psf-aai?r=qr"
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    PSF-AAI
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-lg font-bold text-white">Contact Us</h4>
              <ul className="space-y-2">
                <li className="text-sm text-white/70">Email: info@jobpath.com</li>
                <li className="text-sm text-white/70">Phone: +1 234 567 8900</li>
                <li className="text-sm text-white/70">Location: Tech Hub, Innovation St.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-white/20 pt-6 text-center">
            <p className="text-sm text-white/60">Copyright 2026 JOB-PATH. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
