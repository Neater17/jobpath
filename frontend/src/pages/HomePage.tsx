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
      setToastMessage(
        [
          "Please log in first to access the self-assessment feature and continue with career selection.",
          "Click the profile button in the top right corner to sign in or create an account.",
        ]
      );
      return;
    }

    navigate("/career-select");
  };

  return (
    <div className="py-4">
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
              <div className="mt-1 space-y-2 text-base font-semibold leading-6 text-white">
                {toastMessage.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
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

      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 mb-8">
        <div className="max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Discover Your Career Path
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Navigate your professional journey with personalized career insights and skill assessments. Let us help you map out your future in the data and technology field.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={handleGetStarted}
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition shadow-lg"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => navigate("/how-it-works")}
              className="px-8 py-4 bg-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/30 transition border-2 border-white/50"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* CV Upload */}
      <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-cyan-200/40 bg-gradient-to-br from-cyan-400/20 via-sky-500/15 to-blue-700/30 p-7 shadow-[0_24px_80px_rgba(34,211,238,0.18)] backdrop-blur-xl md:p-9">
        <div className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-blue-300/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-50">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-200" />
              New Feature
            </div>
            <h3 className="mt-4 max-w-2xl text-3xl font-bold leading-tight text-white md:text-4xl">
              Upload your CV and get a recommended JobPath without going through the full questionnaire
            </h3>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/85 md:text-lg">
              Let JobPath scan your resume, detect your strongest skills and experience signals, and show a suggested path, supporting strengths, and growth gaps in one flow.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85">
                PDF, DOCX, or pasted text
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85">
                Instant recommendation
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85">
                Strengths and skill gaps
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate("/cv-upload")}
              className="rounded-2xl bg-white px-7 py-4 text-left font-bold text-blue-700 shadow-xl transition hover:-translate-y-0.5 hover:bg-cyan-50"
            >
              Upload CV / Resume
              <span className="mt-1 block text-sm font-semibold text-blue-500">
                Skip straight to the CV scanner
              </span>
            </button>
            <p className="text-sm text-white/70">
              Best for users who already have a resume or a written skills profile.
            </p>
          </div>
        </div>
      </div>

      {/* Career Map */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:bg-white/15 transition">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-400/30 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white">Career Map</h3>
          </div>
          <p className="text-white/80 mb-6">
            Explore different career paths and progression levels in the data and technology industry.
          </p>
          <Link
            to="/career-map"
            className="block text-center w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            View
          </Link>
        </div>
        
        {/*Skills Map */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:bg-white/15 transition">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-400/30 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white">Skills Map</h3>
          </div>
          <p className="text-white/80 mb-6">
            Discover the essential skills required for each career path and assess your proficiency.
          </p>
          <Link
            to="/skill-map"
            className="block text-center w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            View
          </Link>
        </div>
      </div>

      {/* Careers Overview */}
      <div className="grid md:grid-cols-2 gap-6 pt-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:bg-white/15 transition">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-400/30 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white">Careers Overview</h3>
          </div>
          <p className="text-white/80 mb-6">
            Explore different careers and their definitions in the data and technology industry.
          </p>
          <Link
            to="/careers-overview"
            className="block text-center w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            View
          </Link>
        </div>
        
        {/*Skills Overview */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:bg-white/15 transition">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-400/30 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white">Skills Overview</h3>
          </div>
          <p className="text-white/80 mb-6">
            Discover skills and their levels across various career paths.
          </p>
          <Link
            to="/skills-overview"
            className="block text-center w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            View
          </Link>
        </div>
      </div>

      {/* PQF Level Descriptions */}
      <div className="grid md:grid-cols-2 gap-6 pt-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:bg-white/15 transition">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-400/30 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white">PQF Level Descriptions</h3>
          </div>
          <p className="text-white/80 mb-6">
            Explore the PQF level descriptions and understand the expectations for each level.
          </p>
          <Link
            to="/PQFLevelDescription"
            className="block text-center w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            View
          </Link>
        </div>
        
        {/*PSF Level Descriptions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:bg-white/15 transition">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-400/30 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white">PSF Level Descriptions</h3>
          </div>
          <p className="text-white/80 mb-6">
            Explore the PSF level descriptions and understand the expectations for each level.
          </p>
          <Link
            to="/FSCProficiencyLevelDescriptions"
            className="block text-center w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            View
          </Link>
        </div>
      </div>

    </div>
  );
}
