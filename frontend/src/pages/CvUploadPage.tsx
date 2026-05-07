import axios from "axios";
import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { analyzeCv } from "../services/api";
import { useCvStore } from "../store/cvStore";
import { parseResumeFile } from "../utils/resumeFileParser";

export default function CvUploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cvText = useCvStore((state) => state.cvText);
  const uploadedFileName = useCvStore((state) => state.uploadedFileName);
  const setDraft = useCvStore((state) => state.setDraft);
  const setAnalysis = useCvStore((state) => state.setAnalysis);
  const [loading, setLoading] = useState(false);
  const [fileReading, setFileReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setAnalysis(null);
    setDraft(cvText, file.name);
    setFileReading(true);

    try {
      const parsed = await parseResumeFile(file);
      if (!parsed.text.trim()) {
        setError("I could not extract readable resume text from that file. Try another file or paste the CV content instead.");
        return;
      }
      setDraft(parsed.text, file.name);
    } catch (parseError) {
      setDraft("", file.name);
      setError(parseError instanceof Error ? parseError.message : "I could not read that file.");
    } finally {
      setFileReading(false);
    }
  }

  async function handleAnalyze() {
    if (!cvText.trim()) {
      setError("Upload a resume file or paste the CV text first.");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await analyzeCv({ cvText, fileName: uploadedFileName });
      setAnalysis(response);
      navigate("/cv-upload/results");
    } catch (requestError) {
      setAnalysis(null);
      if (axios.isAxiosError(requestError)) {
        setError(
          typeof requestError.response?.data?.message === "string"
            ? requestError.response.data.message
            : "The CV could not be analyzed right now. Please check the text and try again."
        );
      } else {
        setError("The CV could not be analyzed right now. Please check the text and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleClearText() {
    setDraft("", null);
    setAnalysis(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-light-text/20 bg-card-bg/40 p-8 shadow-2xl backdrop-blur-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
          <h2 className="text-4xl font-bold text-light-text">Upload Your CV</h2>
          <p className="mt-3 max-w-3xl text-light-text/80">
            Add your resume or paste your experience summary, and we&apos;ll scan it for skill signals before generating a dedicated recommendation results page.
          </p>
          </div>
        <Link
          to="/"
          className="back-button"
        >
          <span className="text-lg">
            <svg className= "w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
          </span>
          Back to Home
        </Link>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-light-text/20 bg-card-bg/40 p-8 shadow-2xl backdrop-blur-lg">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-3xl font-bold text-light-text">CV / Resume Reader</h3>
              <p className="mt-2 text-light-text/75">
                Upload a PDF, DOCX, or text file, or paste your profile below. We&apos;ll analyze it and open a separate results page.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center rounded-xl border border-light-text/30 bg-card-bg/40 px-4 py-3 text-sm font-semibold text-light-text transition hover:border-light-accent-blue/50 hover:bg-primary-blue/30">
              Choose File
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.text"
                className="hidden"
                onChange={handleFileSelection}
              />
            </label>
          </div>

          <div className="mb-4 rounded-2xl border border-dashed border-light-text/30 bg-navy-bg/20 p-4 text-sm text-light-text/70">
            {fileReading
              ? "Reading file and extracting resume text..."
              : uploadedFileName
                ? `Selected file: ${uploadedFileName}`
                : "No file selected yet. Supported: PDF, DOCX, TXT."}
          </div>

          <textarea
            value={cvText}
            onChange={(event) => setDraft(event.target.value, uploadedFileName)}
            placeholder="Paste the CV text here, or type a skills summary like: SQL, Python, Tableau, dashboarding, data pipelines, 3 years as data analyst, machine learning, Power BI, certifications..."
            className="min-h-[20rem] w-full rounded-[1.75rem] border border-light-text/20 bg-navy-bg/35 p-5 text-sm leading-7 text-light-text placeholder:text-light-text/40 focus:border-cyan-300/60 focus:outline-none focus:ring-4 focus:ring-cyan-400/15"
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || fileReading}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 font-bold text-slate-950 shadow-lg transition hover:from-cyan-300 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {fileReading ? "Preparing file..." : loading ? "Scanning CV..." : "Analyze CV"}
            </button>
            <button
              type="button"
              onClick={handleClearText}
              disabled={loading || fileReading || (!cvText && !uploadedFileName)}
              className="rounded-xl border border-light-text/25 bg-card-bg/40 px-6 py-3 font-semibold text-light-text transition hover:border-light-accent-blue/50 hover:bg-primary-blue/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset
            </button>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-300/50 bg-rose-500/15 p-4 text-sm text-rose-50">{error}</div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-emerald-300/30 bg-gradient-to-br from-emerald-400/15 to-cyan-400/10 p-8 shadow-2xl">
            <h3 className="text-3xl font-bold text-light-text">How this step works</h3>
            <p className="mt-3 text-light-text/80">
              The upload page is now focused on input only. After scanning, you&apos;ll land on a separate results screen that matches the review-results layout.
            </p>
            <div className="mt-6 space-y-3 text-sm text-light-text/80">
              <div className="rounded-xl border border-light-text/15 bg-card-bg/40 px-4 py-3">1. Upload or paste your CV content</div>
              <div className="rounded-xl border border-light-text/15 bg-card-bg/40 px-4 py-3">2. We extract role and skill signals</div>
              <div className="rounded-xl border border-light-text/15 bg-card-bg/40 px-4 py-3">3. Results open in a dedicated recommendation page</div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-light-text/20 bg-card-bg/40 p-8 shadow-2xl backdrop-blur-lg">
            <h3 className="text-2xl font-bold text-light-text">Best for</h3>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-light-text/20 bg-card-bg/40 px-3 py-1.5 text-xs font-semibold text-light-text/85">
                Existing resume owners
              </span>
              <span className="rounded-full border border-light-text/20 bg-card-bg/40 px-3 py-1.5 text-xs font-semibold text-light-text/85">
                Quick JobPath recommendation
              </span>
              <span className="rounded-full border border-light-text/20 bg-card-bg/40 px-3 py-1.5 text-xs font-semibold text-light-text/85">
                Skill-gap overview
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

