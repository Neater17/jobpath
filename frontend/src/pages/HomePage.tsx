import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [toastMessage, setToastMessage] = useState<string[] | null>(null);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const handleGetStarted = () => {
    if (!hydrated) {
      return;
    }

    if (!user) {
      setToastMessage([
        "Please log in first to access the self-assessment feature and continue with career selection.",
        "Click the profile button in the top right corner to sign in or create an account.",
      ]);
      return;
    }

    navigate("/career-select");
  };

  const handleCvUpload = () => {
    if (!hydrated) {
      return;
    }

    if (!user) {
      setToastMessage([
        "Please log in first to access the self-assessment feature and continue with career selection.",
        "Click the profile button in the top right corner to sign in or create an account.",
      ]);
      return;
    }

    navigate("/cv-upload");
  };

  return (
    <div className="py-4">
      {toastMessage ? (
        <div className="fixed left-1/2 top-6 z-[100] w-[min(92vw,32rem)] -translate-x-1/2 rounded-3xl border border-light-accent-blue/40 bg-gradient-to-r from-primary-blue via-accent-blue to-light-accent-blue p-[1px] shadow-[0_20px_60px_rgba(25,82,215,0.35)]">
          <div className="flex items-start gap-3 rounded-[calc(1.5rem-1px)] bg-deep-bg/95 px-5 py-4 text-light-text backdrop-blur-md">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-light-accent-blue/20 text-lg text-light-accent-blue">
              !
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-soft-lavender-blue">
                Notice
              </div>
              <div className="mt-1 space-y-2 text-base font-semibold leading-6 text-light-text">
                {toastMessage.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-auto rounded-full px-2 py-1 text-sm font-semibold text-light-text/70 transition hover:bg-light-text/10 hover:text-light-text"
              aria-label="Dismiss notification"
            >
              X
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-8 rounded-[2rem] border border-slate-500 bg-[linear-gradient(135deg,rgba(7,24,84,0.88),rgba(11,41,152,0.68))] p-8 shadow-2xl backdrop-blur-lg md:p-12 transition ">
        <div className="max-w-2xl">
          <h2 className="mb-4 text-4xl font-bold text-light-text md:text-5xl">
            Discover Your Career Path
          </h2>
          <p className="mb-8 text-lg text-light-text/90">
            Navigate your professional journey with personalized career insights and skill assessments. Let us help you map out your future in the data and technology field.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handleGetStarted}
              className="rounded-xl bg-gradient-to-r from-primary-blue to-accent-blue px-8 py-4 text-lg font-bold text-light-text shadow-lg transition hover:from-accent-blue hover:to-primary-blue"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => navigate("/how-it-works")}
              className="rounded-xl border border-light-accent-blue/35 bg-navy-bg/70 px-8 py-4 text-lg font-bold text-light-text transition hover:bg-card-bg/60"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>

      <div className="relative mb-8 rounded-[2rem] border border-slate-500 bg-[linear-gradient(135deg,rgba(7,24,84,0.88),rgba(11,41,152,0.68))] p-8 shadow-2xl backdrop-blur-lg md:p-12 transition hover:bg-[#A1A6DB]">
        <div className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-light-accent-blue/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-primary-blue/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-light-text/25 bg-light-text/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-light-text">
              <span className="inline-block h-2 w-2 rounded-full bg-[#E8EDF8]" />
              New Feature
            </div>
            <h3 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-light-text md:text-4xl">
              Upload your CV and get a recommended JobPath without going through the full questionnaire
            </h3>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-light-text/20 bg-light-text/10 px-3 py-1.5 text-xs font-semibold text-light-text/85">
                PDF, DOCX, or pasted text
              </span>
              <span className="rounded-full border border-light-text/20 bg-light-text/10 px-3 py-1.5 text-xs font-semibold text-light-text/85">
                Instant recommendation
              </span>
              <span className="rounded-full border border-light-text/20 bg-light-text/10 px-3 py-1.5 text-xs font-semibold text-light-text/85">
                Strengths and skill gaps
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3">
            <button
              type="button"
              onClick={handleCvUpload}
              className="rounded-2xl bg-[#d9e6ff] px-7 py-4 text-left font-bold text-[#162e7e] shadow-xl transition hover:-translate-y-0.5 hover:bg-[#0B2998] hover:text-slate-100"
            >
              Upload CV / Resume
              <span className="mt-1 block text-sm font-semibold text-accent-blue">
                Skip straight to the CV scanner
              </span>
            </button>
            <p className="text-sm text-light-text/70">
              Best for users who already have resume or a written skills profile.
            </p>
          </div>
        </div>
      </div>

      <div className="relative mb-8 rounded-[2rem] border border-slate-500 bg-[linear-gradient(135deg,rgba(7,24,84,0.88),rgba(11,41,152,0.68))] p-8 shadow-2xl backdrop-blur-lg md:p-12 transition hover:bg-[#A1A6DB]">
        <div className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-light-accent-blue/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-primary-blue/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-light-text/25 bg-light-text/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-light-text">
              <span className="inline-block h-2 w-2 rounded-full bg-[#E8EDF8]" />
              New Information
            </div>
            <h3 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-light-text md:text-4xl">
              Develop a Program or Curriculum Outline from Skills Framework
            </h3>
          </div>
          <div className="flex shrink-0 flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate("/curriculum-development")}
              className="rounded-2xl bg-[#d9e6ff] px-7 py-4 text-left font-bold text-[#162e7e] shadow-xl transition hover:-translate-y-0.5 hover:bg-[#0B2998] hover:text-slate-100"
            >
              Develop Curriculum
              <span className="mt-1 block text-sm font-semibold text-accent-blue">
                Create a Curriculum Outline from the Skills Framework
              </span>
            </button>
          </div>
        </div>
      </div>


      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-500 bg-[linear-gradient(135deg,rgba(7,24,84,0.88),rgba(11,41,152,0.68))] p-6 shadow-xl backdrop-blur-lg transition hover:bg-[#A1A6DB]">
          <div className="mb-4 flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-light-accent-blue/25">
              <svg className="h-6 w-6 text-light-text" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-light-text">Career Map</h3>
          </div>
          <p className="mb-6 text-light-text/80">
            Explore different career paths and progression levels in the data and technology industry.
          </p>
          <Link
            to="/career-map"
            className="block w-full rounded-lg border border-light-accent-blue/30 bg-primary-blue px-6 py-3 text-center font-semibold text-light-text shadow-lg transition hover:bg-[#1952D7]"
          >
            View
          </Link>
        </div>

        <div className="rounded-[2rem] border border-slate-500 bg-[linear-gradient(135deg,rgba(7,24,84,0.88),rgba(11,41,152,0.68))] p-6 shadow-xl backdrop-blur-lg transition hover:bg-[#A1A6DB]">
          <div className="mb-4 flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-light-accent-blue/25">
              <svg className="h-6 w-6 text-light-text" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-light-text">Careers Overview</h3>
          </div>
          <p className="mb-6 text-light-text/80">
            Explore different careers and their definitions in the data and technology industry.
          </p>
          <Link
            to="/careers-overview"
            className="block w-full rounded-lg border border-light-accent-blue/30 bg-primary-blue px-6 py-3 text-center font-semibold text-light-text shadow-lg transition hover:bg-[#1952D7]"
          >
            View
          </Link>
        </div>

        <div className="rounded-[2rem] border border-slate-500 bg-[linear-gradient(135deg,rgba(7,24,84,0.88),rgba(11,41,152,0.68))] p-6 shadow-xl backdrop-blur-lg transition hover:bg-[#A1A6DB]">
          <div className="mb-4 flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-light-accent-blue/25">
              <svg className="h-6 w-6 text-light-text" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-light-text">PQF Level Descriptions</h3>
          </div>
          <p className="mb-6 text-light-text/80">
            Explore the PQF level descriptions and understand the expectations for each level.
          </p>
          <Link
            to="/PQFLevelDescription"
            className="block w-full rounded-lg border border-light-accent-blue/30 bg-primary-blue px-6 py-3 text-center font-semibold text-light-text shadow-lg transition hover:bg-[#1952D7]"
          >
            View
          </Link>
        </div>
      </div>


      <div className="grid gap-6 pt-6 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-500 bg-[linear-gradient(135deg,rgba(7,24,84,0.88),rgba(11,41,152,0.68))] p-6 shadow-xl backdrop-blur-lg transition hover:bg-[#A1A6DB]">
          <div className="mb-4 flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-light-accent-blue/25">
              <svg className="h-6 w-6 text-light-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-light-text">Skills Map</h3>
          </div>
          <p className="mb-6 text-light-text/80">
            Discover the essential skills required for each career path and assess your proficiency.
          </p>
          <Link
            to="/skill-map"
            className="block w-full rounded-lg border border-light-accent-blue/30 bg-primary-blue px-6 py-3 text-center font-semibold text-light-text shadow-lg transition hover:bg-[#1952D7]"
          >
            View
          </Link>
        </div>


        <div className="rounded-[2rem] border border-slate-500   bg-[linear-gradient(135deg,rgba(7,24,84,0.88),rgba(11,41,152,0.68))] p-6 shadow-xl backdrop-blur-lg transition hover:bg-[#A1A6DB]">
          <div className="mb-4 flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-light-accent-blue/25">
              <svg className="h-6 w-6 text-light-text" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-light-text">Skills Overview</h3>
          </div>
          <p className="mb-6 text-light-text/80">
            Discover the different skills and their levels across various career paths.
          </p>
          <Link
            to="/skills-overview"
            className="block w-full rounded-lg border border-light-accent-blue/30 bg-primary-blue px-6 py-3 text-center font-semibold text-light-text shadow-lg transition hover:bg-[#1952D7]"
          >
            View
          </Link>
        </div>

        <div className="rounded-[2rem] border border-slate-500 bg-[linear-gradient(135deg,rgba(7,24,84,0.88),rgba(11,41,152,0.68))] p-6 shadow-xl backdrop-blur-lg transition hover:bg-[#A1A6DB]">
          <div className="mb-4 flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-light-accent-blue/25">
              <svg className="h-6 w-6 text-light-text" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-light-text">PSF Level Descriptions</h3>
          </div>
          <p className="mb-6 text-light-text/80">
            Explore the PSF level descriptions and understand the expectations for each level.
          </p>
          <Link
            to="/FSCProficiencyLevelDescriptions"
            className="block w-full rounded-lg border border-light-accent-blue/30 bg-primary-blue px-6 py-3 text-center font-semibold text-light-text shadow-lg transition hover:bg-[#1952D7]"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
