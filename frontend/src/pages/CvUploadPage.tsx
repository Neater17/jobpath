import axios from "axios";
import React, { useMemo, useState } from "react";
import { analyzeCv, submitRecommendationFeedback, type CvAnalysisResponse } from "../services/api";
import { careerPaths, type CareerPathKey } from "../data/careerData";
import type { CompetencyKey } from "../data/assessmentData";
import { parseResumeFile } from "../utils/resumeFileParser";

type LearningLink = { label: string; href: string };

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function badgeTone(category: string) {
  switch (category) {
    case "certification":
      return "border-amber-300/60 bg-amber-400/20 text-amber-50";
    case "tool":
      return "border-cyan-300/60 bg-cyan-400/20 text-cyan-50";
    case "workflow":
      return "border-emerald-300/60 bg-emerald-400/20 text-emerald-50";
    case "role":
      return "border-fuchsia-300/60 bg-fuchsia-400/20 text-fuchsia-50";
    default:
      return "border-white/30 bg-white/15 text-white";
  }
}

function inputKindLabel(kind: "resume" | "skills_profile" | "unknown") {
  if (kind === "resume") return "Resume / CV";
  if (kind === "skills_profile") return "Pasted Skills Profile";
  return "Unknown Input";
}

const gapCopy: Record<CompetencyKey, { whyNeeded: string; examples: string }> = {
  business_strategy: {
    whyNeeded: "This helps turn technical work into measurable business outcomes.",
    examples: "It shows up in KPI planning, prioritization, and decision support.",
  },
  sql_data_access: {
    whyNeeded: "This supports direct querying, validation, and exploration of data.",
    examples: "It shows up in joins, filters, checks, and report-building queries.",
  },
  data_visualization: {
    whyNeeded: "This helps findings land clearly with decision-makers.",
    examples: "It shows up in dashboards, reports, and insight storytelling.",
  },
  data_quality_governance: {
    whyNeeded: "This keeps data trustworthy, compliant, and reusable.",
    examples: "It shows up in standards, quality checks, stewardship, and access control.",
  },
  data_engineering: {
    whyNeeded: "This supports the movement and preparation of reliable data.",
    examples: "It shows up in pipelines, orchestration, storage design, and data flows.",
  },
  statistics_experimentation: {
    whyNeeded: "This is needed for evidence-based testing and decision-making.",
    examples: "It shows up in experiment design, forecasting, and statistical analysis.",
  },
  machine_learning: {
    whyNeeded: "This matters when the path expects predictive modeling work.",
    examples: "It shows up in feature engineering, training, tuning, and evaluation.",
  },
  mlops_deployment: {
    whyNeeded: "This becomes important when models must run reliably in production.",
    examples: "It shows up in deployment, monitoring, and lifecycle management.",
  },
  research_innovation: {
    whyNeeded: "This helps investigate problems deeply and justify solutions.",
    examples: "It shows up in benchmarking, experimentation, and prototyping.",
  },
  communication_storytelling: {
    whyNeeded: "This helps technical insight connect with non-technical audiences.",
    examples: "It shows up in presentations, reports, and executive summaries.",
  },
  responsible_ai: {
    whyNeeded: "This matters when fairness, privacy, safety, and governance are required.",
    examples: "It shows up in risk review, bias checks, and safe AI practices.",
  },
  collaboration_delivery: {
    whyNeeded: "This helps strong individual work become shipped team outcomes.",
    examples: "It shows up in coordination, alignment, planning, and delivery.",
  },
  leadership_execution: {
    whyNeeded: "This grows in importance as the role expects more ownership and scope.",
    examples: "It shows up in prioritization, mentoring, and initiative leadership.",
  },
  role_mastery: {
    whyNeeded: "This reflects hands-on depth in the target role’s daily work.",
    examples: "It shows up in repeated delivery, ownership, and execution quality.",
  },
};

function importanceBadge(importance: number) {
  if (importance >= 0.85) return "Core skill for this role";
  if (importance >= 0.65) return "Important for this role";
  return "Helpful for growth";
}

function buildGapWhyNeeded(key: CompetencyKey, careerName: string, pathName: string, importance: number) {
  const details = gapCopy[key];
  const prefix =
    importance >= 0.85
      ? `${careerName} strongly depends on this competency.`
      : importance >= 0.65
        ? `${careerName} uses this competency regularly.`
        : `${pathName} becomes stronger when this competency is present.`;
  return `${prefix} ${details.whyNeeded} ${details.examples}`;
}

function buildGapWhyFlagged(readiness: number, evidence: string[], careerName: string) {
  if (evidence.length === 0) {
    return `The scan did not find strong direct evidence of this skill yet, so it remains a development area for ${careerName}.`;
  }
  const preview = evidence.slice(0, 2).join(", ");
  if (readiness >= 0.4) {
    return `The scan found some related signals such as ${preview}, but the evidence still looks lighter than expected.`;
  }
  return `The scan only found limited signals such as ${preview}, so the system marked this as a skill that still needs stronger proof.`;
}

function learningLinksForGap(label: string, recommendation: string): LearningLink[] {
  const query = encodeURIComponent(`${label} ${recommendation}`);
  const links = [
    { label: "Find Course", href: `https://www.coursera.org/search?query=${query}` },
    { label: "Watch Tutorials", href: `https://www.youtube.com/results?search_query=${query}` },
  ];
  if (/(data|machine learning|statistics|visualization|sql|mlops)/i.test(`${label} ${recommendation}`)) {
    links.push({ label: "Practice Labs", href: "https://www.kaggle.com/learn" });
  }
  return links;
}

export default function CvUploadPage() {
  const [cvText, setCvText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CvAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileReading, setFileReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPredictionDetails, setShowPredictionDetails] = useState(false);
  const [showJobPath, setShowJobPath] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<"accepted" | "declined" | null>(null);

  const topPositiveFactors = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.result.explainability.topCareer.factors]
      .filter((factor) => factor.direction === "positive")
      .sort((left, right) => right.impactPct - left.impactPct)
      .slice(0, 4);
  }, [analysis]);

  const alignedSkills = useMemo(() => {
    if (!analysis) return [];
    const factorKeys = new Set(topPositiveFactors.map((factor) => String(factor.key)));
    const base = analysis.cvAnalysis.matchedSkills.filter((skill) => factorKeys.has(skill.competencyKey));
    return (base.length > 0 ? base : analysis.cvAnalysis.matchedSkills).slice(0, 6);
  }, [analysis, topPositiveFactors]);

  const missingSkills = useMemo(() => analysis?.result.priorityGaps.slice(0, 6) ?? [], [analysis]);

  const explainedMissingSkills = useMemo(() => {
    if (!analysis) return [];
    const signalsByKey = new Map(analysis.cvAnalysis.competencySignals.map((signal) => [signal.key, signal]));
    return missingSkills.map((gap) => {
      const signal = signalsByKey.get(gap.key);
      return {
        ...gap,
        whyNeeded: buildGapWhyNeeded(
          gap.key,
          analysis.result.topCareer.careerName,
          analysis.result.topCareer.pathName,
          gap.importance
        ),
        whyFlagged: buildGapWhyFlagged(
          gap.currentReadiness,
          signal?.evidence ?? [],
          analysis.result.topCareer.careerName
        ),
        rolePriorityLabel: importanceBadge(gap.importance),
      };
    });
  }, [analysis, missingSkills]);

  const topJobPathSteps = useMemo(() => {
    if (!analysis) return [];
    const path = careerPaths[analysis.result.topCareer.pathKey as CareerPathKey];
    if (!path) return [];
    const orderedRoles = [...path.careers].sort((left, right) => left.level - right.level);
    const targetIndex = orderedRoles.findIndex((role) => role.name === analysis.result.topCareer.careerName);
    if (targetIndex === -1) return [];

    return orderedRoles.slice(0, targetIndex + 1).map((role, index) => ({
      role,
      stage: index === 0 ? "Starting Role" : index === targetIndex ? "Target Role" : "Progression Role",
      focusItems: missingSkills.slice(index, index + 2),
    }));
  }, [analysis, missingSkills]);

  async function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setAnalysis(null);
    setShowPredictionDetails(false);
    setShowJobPath(false);
    setFeedbackSent(null);
    setUploadedFileName(file.name);
    setFileReading(true);

    try {
      const parsed = await parseResumeFile(file);
      if (!parsed.text.trim()) {
        setError("I could not extract readable resume text from that file. Try another file or paste the CV content instead.");
        return;
      }
      setCvText(parsed.text);
    } catch (parseError) {
      setCvText("");
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
    setShowPredictionDetails(false);
    setShowJobPath(false);
    setFeedbackSent(null);

    try {
      const response = await analyzeCv({ cvText, fileName: uploadedFileName });
      setAnalysis(response);
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

  async function handleFeedback(accepted: boolean) {
    if (!analysis || feedbackSent) return;
    await submitRecommendationFeedback({
      selectedPathKey: null,
      selectedCareerName: null,
      recommendedPathKey: analysis.result.topCareer.pathKey,
      recommendedCareerName: analysis.result.topCareer.careerName,
      accepted,
      source: "cv_upload",
      inputKind: analysis.cvAnalysis.summary.inputKind,
      uploadedFileName: analysis.cvAnalysis.summary.uploadedFileName,
      candidateName: analysis.cvAnalysis.summary.candidateName,
      detectedTitle: analysis.cvAnalysis.summary.detectedTitle,
      suggestedLevel: analysis.cvAnalysis.summary.suggestedLevel,
      confidence: analysis.result.summary.confidence,
    });
    setFeedbackSent(accepted ? "accepted" : "declined");
  }

  const invalidResume = Boolean(analysis?.cvAnalysis.summary.rejectionReason);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg md:p-10">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-cyan-300/15 to-transparent" />
        <div className="relative max-w-3xl">
          <div className="mb-3 inline-flex items-center rounded-full border border-cyan-200/50 bg-cyan-300/15 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-cyan-50">
            CV/RESUME READER
          </div>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">Upload or paste your CV, or just write your skills</h2>
          <p className="max-w-2xl text-lg text-white/85">
            This flow scans the skills, experience, certifications, and role signals inside a resume or pasted profile, then returns a JobPath recommendation.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-7 shadow-xl backdrop-blur-lg">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white">CV/RESUME Reader</h3>
              <p className="mt-2 text-white/75">
                Upload a PDF, DOCX, or text resume, or paste your CV content and skills summary below.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
              Choose File
              <input type="file" accept=".pdf,.docx,.txt,.md,.text" className="hidden" onChange={handleFileSelection} />
            </label>
          </div>

          <div className="mb-4 rounded-2xl border border-dashed border-white/30 bg-slate-950/20 p-4 text-sm text-white/70">
            {fileReading
              ? "Reading file and extracting resume text..."
              : uploadedFileName
                ? `Selected file: ${uploadedFileName}`
                : "No file selected yet. Supported: PDF, DOCX, TXT."}
          </div>

          <textarea
            value={cvText}
            onChange={(event) => setCvText(event.target.value)}
            placeholder="Paste the CV text here, or type a skills summary like: SQL, Python, Tableau, dashboarding, data pipelines, 3 years as data analyst, machine learning, Power BI, certifications..."
            className="min-h-[20rem] w-full rounded-[1.75rem] border border-white/20 bg-slate-950/35 p-5 text-sm leading-7 text-white placeholder:text-white/40 focus:border-cyan-300/60 focus:outline-none focus:ring-4 focus:ring-cyan-400/15"
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || fileReading}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 font-bold text-slate-950 shadow-lg transition hover:from-cyan-300 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {fileReading ? "Preparing file..." : loading ? "Scanning CV..." : "Scan CV and Show JobPath"}
            </button>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-300/50 bg-rose-500/15 p-4 text-sm text-rose-50">{error}</div>
          ) : null}
        </div>

        {analysis ? (
          <div className="rounded-[2rem] border border-cyan-300/30 bg-cyan-400/10 p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Detected Person</p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              {analysis.cvAnalysis.summary.candidateName ?? "Name not confidently detected"}
            </h3>
            <div className="mt-4 grid gap-3 text-sm text-white/75">
              <p>Input type: {inputKindLabel(analysis.cvAnalysis.summary.inputKind)}</p>
              <p>Document: {analysis.cvAnalysis.summary.uploadedFileName ?? "Pasted CV text"}</p>
              <p>Recommended JobPath: {analysis.result.topCareer.pathName} - {analysis.result.topCareer.careerName}</p>
              <p>Matched signals: {analysis.cvAnalysis.summary.matchedSkillCount}</p>
              <p>Resume confidence: {pct(analysis.cvAnalysis.summary.resumeConfidence)}</p>
            </div>
          </div>
        ) : null}
      </section>

      {analysis ? (
        invalidResume ? (
          <section className="rounded-[2rem] border border-rose-300/50 bg-rose-500/15 p-7 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-100/80">Resume Check</p>
            <h3 className="mt-2 text-3xl font-bold text-white">This upload does not look like a CV or resume yet</h3>
            <p className="mt-4 max-w-3xl text-white/80">{analysis.cvAnalysis.summary.rejectionReason}</p>
          </section>
        ) : (
          <>
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-emerald-300/30 bg-gradient-to-br from-emerald-400/15 to-cyan-400/10 p-7 shadow-xl">
                <h3 className="mb-3 text-2xl font-bold text-white">Best Career Recommendation</h3>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Top Match</p>
                      <h4 className="mt-2 text-3xl font-bold text-white">{analysis.result.topCareer.careerName}</h4>
                      <p className="mt-1 text-white/70">{analysis.result.topCareer.pathName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Confidence</p>
                      <p className="mt-2 text-3xl font-bold text-cyan-100">{pct(analysis.result.summary.confidence)}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-white/80">
                    {analysis.result.explainability.topCareer.narrative || "The recommendation engine found the strongest overall signal alignment for this role and path."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setShowJobPath((value) => !value)}
                      className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      {showJobPath ? "Hide JobPath Steps" : "Show JobPath Steps"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPredictionDetails((value) => !value)}
                      className="rounded-xl border border-cyan-300/35 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-400/25"
                    >
                      {showPredictionDetails ? "Hide Technical View" : "Show Technical View"}
                    </button>
                  </div>
                </div>

                {showJobPath ? (
                  <div className="mt-4 rounded-2xl border border-cyan-200/25 bg-slate-950/20 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Suggested JobPath</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {topJobPathSteps.map((step, index) => (
                        <div key={`${step.role.name}-${step.role.level}`} className="rounded-xl border border-white/20 bg-white/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">Step {index + 1}</p>
                              <p className="mt-1 text-lg font-bold text-white">{step.role.name}</p>
                              <p className="mt-1 text-xs text-white/70">{step.stage}</p>
                            </div>
                            <span className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/80">
                              L{step.role.level}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {step.focusItems.map((item) => (
                              <span key={`${step.role.name}-${item.key}`} className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/85">
                                {item.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {showPredictionDetails ? (
                  <div className="mt-4 rounded-2xl border border-cyan-200/25 bg-slate-950/20 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Technical Prediction View</p>
                    <div className="mt-5 space-y-4">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">1. CV Extraction</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {alignedSkills.slice(0, 5).map((skill) => (
                            <span key={`${skill.label}-${skill.competencyKey}`} className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-50">
                              {skill.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">2. Path Ranking</p>
                        <div className="mt-3 space-y-3">
                          {analysis.result.pathScores.slice(0, 4).map((pathScore, index) => (
                            <div key={pathScore.pathKey}>
                              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                                <span className="font-semibold text-white">{index + 1}. {pathScore.pathName}</span>
                                <span className="text-cyan-100">{pct(pathScore.score)}</span>
                              </div>
                              <div className="h-2 rounded-full bg-white/10">
                                <div className="h-2 rounded-full bg-gradient-to-r from-emerald-300 to-cyan-400" style={{ width: pct(pathScore.score) }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">3. Final Decision Drivers</p>
                        <div className="mt-3 space-y-2">
                          {topPositiveFactors.map((factor) => (
                            <div key={`${factor.key}-${factor.label}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/20 px-3 py-2">
                              <span className="text-sm font-semibold text-white">{factor.label}</span>
                              <span className="text-xs font-semibold text-cyan-100">{Math.round(factor.impactPct)}% influence</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-[2rem] border border-white/20 bg-white/10 p-7 shadow-xl backdrop-blur-lg">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Matched Skills For This JobPath</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {alignedSkills.map((skill) => (
                      <div key={`${skill.label}-${skill.competencyKey}`} className={`rounded-2xl border px-4 py-3 text-sm ${badgeTone(skill.category)}`}>
                        <p className="font-semibold">{skill.label}</p>
                        <p className="mt-1 text-xs opacity-80">{skill.competencyLabel}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/20 bg-white/10 p-7 shadow-xl backdrop-blur-lg">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Other Strong Paths</p>
                  <div className="mt-4 space-y-4">
                    {analysis.result.pathScores.slice(0, 4).map((pathScore) => (
                      <div key={pathScore.pathKey} className="rounded-2xl border border-white/15 bg-slate-950/25 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-white">{pathScore.pathName}</p>
                            <p className="text-sm text-white/65">Best role: {pathScore.bestCareer}</p>
                          </div>
                          <p className="text-lg font-bold text-cyan-100">{pct(pathScore.score)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-white/20 bg-white/10 p-7 shadow-xl backdrop-blur-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Skills Still Needed For This JobPath</p>
                <div className="mt-4 space-y-3">
                  {explainedMissingSkills.map((gap) => (
                    <div key={`${gap.key}-${gap.label}`} className="rounded-xl border border-white/10 bg-slate-950/20 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{gap.label}</p>
                          <span className="mt-2 inline-flex rounded-full border border-amber-200/30 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-50">
                            {gap.rolePriorityLabel}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-amber-100">Current readiness {pct(gap.currentReadiness)}</p>
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-white/78">
                        <p>{gap.whyNeeded}</p>
                        <p>{gap.whyFlagged}</p>
                        <p>{gap.recommendation}</p>
                        <div className="flex flex-wrap gap-2">
                          {learningLinksForGap(gap.label, gap.recommendation).map((link) => (
                            <a key={`${gap.key}-${link.label}`} href={link.href} target="_blank" rel="noreferrer" className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-500/30">
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[2rem] border border-white/20 bg-white/10 p-7 shadow-xl backdrop-blur-lg">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Why This Recommendation Fits</p>
                  <div className="mt-5 space-y-4">
                    {analysis.cvAnalysis.competencySignals.slice(0, 6).map((signal) => (
                      <div key={signal.key}>
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <p className="font-semibold text-white">{signal.label}</p>
                          <p className="text-sm text-cyan-100">{pct(signal.score)}</p>
                        </div>
                        <div className="h-3 rounded-full bg-white/10">
                          <div className="h-3 rounded-full bg-gradient-to-r from-cyan-300 to-blue-500" style={{ width: pct(signal.score) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/20 bg-white/10 p-7 shadow-xl backdrop-blur-lg">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Was This Useful?</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={() => void handleFeedback(true)} disabled={feedbackSent !== null} className="rounded-xl bg-emerald-500/80 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                      Yes, this fits
                    </button>
                    <button type="button" onClick={() => void handleFeedback(false)} disabled={feedbackSent !== null} className="rounded-xl bg-rose-500/80 px-5 py-3 font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60">
                      Not really
                    </button>
                  </div>
                  {feedbackSent ? (
                    <p className="mt-4 text-sm text-white/75">
                      Feedback saved: {feedbackSent === "accepted" ? "marked as useful" : "marked as not useful"}.
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        )
      ) : null}
    </div>
  );
}
