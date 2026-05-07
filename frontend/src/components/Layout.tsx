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
        <div className="fixed left-1/2 top-6 z-[100] w-[min(92vw,28rem)] -translate-x-1/2 rounded-3xl border border-light-accent-blue/40 bg-gradient-to-r from-primary-blue via-accent-blue to-light-accent-blue p-[1px] shadow-[0_20px_60px_rgba(25,82,215,0.35)]">
          <div className="rounded-[calc(1.5rem-1px)] bg-deep-bg/95 px-5 py-4 text-light-text backdrop-blur-md">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-soft-lavender-blue">
              Notice
            </div>
            <p className="mt-2 text-base font-semibold text-light-text">{toastMessage}</p>
          </div>
        </div>
      ) : null}

      <header className="border-b border-light-text/10 bg-navy-bg/70 shadow-lg backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-light-text shadow-[0_0_24px_rgba(102,149,227,0.3)]">
                <span className="text-xl font-bold text-primary-blue">JP</span>
              </div>
              <h1 className="text-2xl font-bold text-light-text">JOB-PATH</h1>
            </Link>

            <nav className="hidden flex-1 justify-center space-x-6 md:flex">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive
                    ? "rounded-lg bg-card-bg/60 px-4 py-2 font-semibold text-light-text"
                    : "rounded-lg px-4 py-2 text-light-text/85 transition hover:bg-light-accent-blue/20 hover:text-light-text"
                }
              >
                HOME
              </NavLink>
              <NavLink
                to="/how-it-works"
                className={({ isActive }) =>
                  isActive
                    ? "rounded-lg bg-card-bg/60 px-4 py-2 font-semibold text-light-text"
                    : "rounded-lg px-4 py-2 text-light-text/85 transition hover:bg-light-accent-blue/20 hover:text-light-text"
                }
              >
                How It Works
              </NavLink>
              <Link
                to="/about-us"
                className="rounded-lg px-4 py-2 text-light-text/85 transition hover:bg-light-accent-blue/20 hover:text-light-text"
              >
                About Us
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-light-text/90">{userLabel}</span>
              <button
                type="button"
                onClick={() => navigate(user ? "/account" : "/login")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-light-text shadow-[0_10px_24px_rgba(1,12,52,0.2)] transition hover:bg-[#d7e5ff]"
                aria-label={user ? "Open account page" : "Open login page"}
              >
                <svg className="h-6 w-6 text-primary-blue" fill="currentColor" viewBox="0 0 20 20">
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

      <footer className="mt-16 border-t border-light-text/10 bg-navy-bg/70 backdrop-blur-md">
        <div className="container mx-auto px-6 py-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h4 className="mb-4 text-lg font-bold text-light-text">About JOB-PATH</h4>
              <p className="text-sm text-muted-gray-blue">
                Empowering professionals to discover and navigate their ideal
                career paths in data and technology.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-lg font-bold text-light-text">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-sm text-muted-gray-blue transition hover:text-light-text">
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about-us"
                    className="text-sm text-muted-gray-blue transition hover:text-light-text"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/career-map"
                    className="text-sm text-muted-gray-blue transition hover:text-light-text"
                  >
                    Career Map
                  </Link>
                </li>
                <li>
                  <Link
                    to="/skill-map"
                    className="text-sm text-muted-gray-blue transition hover:text-light-text"
                  >
                    Skills Map
                  </Link>
                </li>
                <li>
                  <Link
                    to="/career-select"
                    className="text-sm text-muted-gray-blue transition hover:text-light-text"
                  >
                    Skill Assessment
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cv-upload"
                    className="text-sm text-muted-gray-blue transition hover:text-light-text"
                  >
                    CV Upload
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-lg font-bold text-light-text">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    onClick={handleNotImplementedClick}
                    className="text-sm text-muted-gray-blue transition hover:text-light-text"
                  >
                    Career Guides
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={handleNotImplementedClick}
                    className="text-sm text-muted-gray-blue transition hover:text-light-text"
                  >
                    Skill Development
                  </a>
                </li>
                <li>
                  <Link
                    to="/how-it-works"
                    className="text-sm text-muted-gray-blue transition hover:text-light-text"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={handleNotImplementedClick}
                    className="text-sm text-muted-gray-blue transition hover:text-light-text"
                  >
                    Support
                  </a>
                </li>
                <li>
                  <a
                    href="https://bit.ly/psf-aai?r=qr"
                    className="text-sm text-muted-gray-blue transition hover:text-light-text"
                  >
                    PSF-AAI
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-lg font-bold text-light-text">Contact Us</h4>
              <ul className="space-y-2">
                <li className="text-sm text-muted-gray-blue">Email: jvvelasco@fit.edu.ph</li>
                <li className="text-sm text-muted-gray-blue">Phone: +1 234 567 8900</li>
                <li className="text-sm text-muted-gray-blue">Location: Tech Hub, Innovation St.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-light-text/10 pt-6 text-center">
            <p className="text-sm text-muted-gray-blue">Copyright 2026 JOB-PATH. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
