import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CompetencyKey } from "../data/assessmentData";
import { careerPaths, type CareerPathKey } from "../data/careerData";
import { submitRecommendationFeedback } from "../services/api";
import { useCvStore } from "../store/cvStore";

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
    whyNeeded: "This reflects hands-on depth in the target role's daily work.",
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

export default function CvUploadResultsPage() {
  const navigate = useNavigate();
  const analysis = useCvStore((state) => state.analysis);
  const clearCvSession = useCvStore((state) => state.clearCvSession);
  const [feedbackSent, setFeedbackSent] = useState<"accepted" | "declined" | null>(null);
  const [showTechnicalView, setShowTechnicalView] = useState(false);
  const [showJobPath, setShowJobPath] = useState(false);
  const [showSkills, setShowSkills] = useState(false);

  const topPositiveFactors = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.result.explainability.topCareer.factors]
      .filter((factor) => factor.direction === "positive")
      .sort((left, right) => right.impactPct - left.impactPct)
      .slice(0, 6);
  }, [analysis]);

  const alignedSkills = useMemo(() => {
    if (!analysis) return [];
    const factorKeys = new Set(topPositiveFactors.map((factor) => String(factor.key)));
    const base = analysis.cvAnalysis.matchedSkills.filter((skill) => factorKeys.has(skill.competencyKey));
    return (base.length > 0 ? base : analysis.cvAnalysis.matchedSkills).slice(0, 8);
  }, [analysis, topPositiveFactors]);

  const explainedMissingSkills = useMemo(() => {
    if (!analysis) return [];
    const signalsByKey = new Map(analysis.cvAnalysis.competencySignals.map((signal) => [signal.key, signal]));
    return analysis.result.priorityGaps.map((gap) => {
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
  }, [analysis]);

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
      focusItems: analysis.result.priorityGaps.slice(index, index + 2),
    }));
  }, [analysis]);

  if (!analysis) {
    return (
      <div className="space-y-4">
        <p className="text-amber-100">No CV analysis is available yet. Upload a CV first so we can generate results.</p>
        <button
          type="button"
          onClick={() => navigate("/cv-upload")}
          className="rounded-xl bg-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/30"
        >
          Go to CV Upload
        </button>
      </div>
    );
  }

  const resultAnalysis = analysis;
  const invalidResume = Boolean(resultAnalysis.cvAnalysis.summary.rejectionReason);

  async function handleFeedback(accepted: boolean) {
    if (feedbackSent) return;
    await submitRecommendationFeedback({
      selectedPathKey: null,
      selectedCareerName: null,
      recommendedPathKey: resultAnalysis.result.topCareer.pathKey,
      recommendedCareerName: resultAnalysis.result.topCareer.careerName,
      accepted,
      source: "cv_upload",
      inputKind: resultAnalysis.cvAnalysis.summary.inputKind,
      uploadedFileName: resultAnalysis.cvAnalysis.summary.uploadedFileName,
      candidateName: resultAnalysis.cvAnalysis.summary.candidateName,
      detectedTitle: resultAnalysis.cvAnalysis.summary.detectedTitle,
      suggestedLevel: resultAnalysis.cvAnalysis.summary.suggestedLevel,
      confidence: resultAnalysis.result.summary.confidence,
    });
    setFeedbackSent(accepted ? "accepted" : "declined");
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <h2 className="text-4xl font-bold text-white">Your CV Recommendation Results</h2>
        <p className="mt-3 max-w-3xl text-white/80">
          We compared your uploaded resume or pasted profile against the recommendation model and laid out the same style of results used in the review results page.
        </p>
      </section>

      <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/65">Detected Candidate</p>
            <h3 className="mt-2 text-4xl font-bold text-white">
              {analysis.cvAnalysis.summary.candidateName ?? "Name not confidently detected"}
            </h3>
            <p className="mt-2 text-white/80">{analysis.cvAnalysis.summary.detectedTitle ?? "No detected title yet"}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-slate-950/20 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/65">CV Snapshot</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <MetricBadge title="Input Type" value={inputKindLabel(analysis.cvAnalysis.summary.inputKind)} compact />
              <MetricBadge title="Matched Signals" value={`${analysis.cvAnalysis.summary.matchedSkillCount}`} />
              <MetricBadge title="Resume Confidence" value={pct(analysis.cvAnalysis.summary.resumeConfidence)} />
              <MetricBadge title="Suggested Level" value={`L${analysis.cvAnalysis.summary.suggestedLevel}`} />
            </div>
            <p className="mt-4 text-sm text-white/70">
              Source: {analysis.cvAnalysis.summary.uploadedFileName ?? "Pasted CV text"}
            </p>
          </div>
        </div>
      </section>

      {invalidResume ? (
        <section className="rounded-[2rem] border border-rose-300/50 bg-rose-500/15 p-8 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-100/80">Resume Check</p>
          <h3 className="mt-2 text-3xl font-bold text-white">This upload does not look like a CV or resume yet</h3>
          <p className="mt-4 max-w-3xl text-white/80">{analysis.cvAnalysis.summary.rejectionReason}</p>
        </section>
      ) : (
        <>
          <section className="rounded-[2rem] border border-emerald-300/30 bg-gradient-to-br from-emerald-400/15 to-cyan-400/10 p-8 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-4xl font-bold text-white">Best Career Recommendation</h3>
                <p className="mt-2 text-white/80">The scanner found this role and path to be your strongest overall match right now.</p>
              </div>
              <MetricBadge title="Recommendation Confidence" value={pct(analysis.result.summary.confidence)} large />
            </div>

            <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-6">
              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/65">Recommended Career</p>
                  <h4 className="mt-2 text-4xl font-bold text-white">{analysis.result.topCareer.careerName}</h4>
                  <p className="mt-1 text-cyan-100">{analysis.result.topCareer.pathName}</p>
                  <p className="mt-5 leading-7 text-white/85">
                    {analysis.result.explainability.topCareer.narrative ||
                      "The recommendation engine found the strongest overall signal alignment for this role and path."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-slate-950/20 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/65">Recommendation Snapshot</p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <MetricBadge title="Input Length" value={`${analysis.cvAnalysis.summary.textLength}`} />
                    <MetricBadge
                      title="Years Found"
                      value={
                        analysis.cvAnalysis.summary.detectedYearsExperience !== null
                          ? `${analysis.cvAnalysis.summary.detectedYearsExperience}`
                          : "N/A"
                      }
                    />
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setShowJobPath((value) => !value)}
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      {showJobPath ? "Hide JobPath" : "Show JobPath"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSkills((value) => !value)}
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      {showSkills ? "Hide Skills" : "Skills To Focus On"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTechnicalView((value) => !value)}
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      {showTechnicalView ? "Hide Technical View" : "Show Technical View"}
                    </button>
                  </div>
                </div>
              </div>

              {showJobPath ? (
                <div className="mt-6 overflow-x-auto pb-2">
                  <div className="flex min-w-max items-start gap-3">
                    {topJobPathSteps.map((step, index) => (
                      <React.Fragment key={`${step.role.name}-${step.role.level}`}>
                        <div className="w-[280px] rounded-xl border border-white/20 bg-white/10 p-4">
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
                        {index < topJobPathSteps.length - 1 ? (
                          <div className="select-none pt-16 text-2xl font-bold text-cyan-100">-&gt;</div>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ) : null}

              {showSkills ? (
                <div className="mt-6 grid gap-4">
                  {explainedMissingSkills.map((gap) => (
                    <DetailedActionCard key={gap.key} gap={gap} />
                  ))}
                </div>
              ) : null}

              {showTechnicalView ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">CV Extraction</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {alignedSkills.slice(0, 6).map((skill) => (
                        <span key={`${skill.label}-${skill.competencyKey}`} className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-50">
                          {skill.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">Path Ranking</p>
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
                    <p className="text-sm font-semibold text-white">Decision Drivers</p>
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
              ) : null}
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-bold text-white">Matched Skills</h3>
                  <p className="mt-2 text-white/80">These are the strongest signals from your CV that support the recommendation.</p>
                </div>
                <MetricBadge title="Skills Found" value={`${alignedSkills.length}`} />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {alignedSkills.map((skill) => (
                  <div key={`${skill.label}-${skill.competencyKey}`} className={`rounded-2xl border px-4 py-3 text-sm ${badgeTone(skill.category)}`}>
                    <p className="font-semibold">{skill.label}</p>
                    <p className="mt-1 text-xs opacity-80">{skill.competencyLabel}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-bold text-white">Why This Fits</h3>
                  <p className="mt-2 text-white/80">These competency scores summarize how strongly your CV aligned with the target role.</p>
                </div>
                <MetricBadge title="Signals" value={`${analysis.cvAnalysis.competencySignals.length}`} />
              </div>
              <div className="mt-6 space-y-4">
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
          </section>


        </>
      )}

      <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-lg">
        <div className="mx-auto max-w-xl">
          <h3 className="text-2xl font-bold text-white">Was this recommendation helpful?</h3>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <button type="button" onClick={() => void handleFeedback(true)} disabled={feedbackSent !== null} className="rounded-xl bg-emerald-500/80 px-6 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
              Yes, this fits
            </button>
            <button type="button" onClick={() => void handleFeedback(false)} disabled={feedbackSent !== null} className="rounded-xl bg-rose-500/80 px-6 py-3 font-semibold text-white hover:bg-rose-500 disabled:opacity-60">
              Not really
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={() => {
            clearCvSession();
            navigate("/");
          }}
          className="rounded-xl border border-white/25 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20"
        >
          Submit CV Scan
        </button>
      </div>
    </div>
  );
}

function MetricBadge({ title, value, large = false, compact = false }: { title: string; value: string; large?: boolean; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-4">
      <p className="text-xs uppercase tracking-wide text-white/80">{title}</p>
      <p className={`font-bold text-white ${large ? "mt-2 text-3xl" : compact ? "mt-1 text-lg" : "mt-1 text-2xl"}`}>{value}</p>
    </div>
  );
}

function DetailedActionCard({
  gap,
}: {
  gap: {
    key: string;
    label: string;
    recommendation: string;
    whyNeeded: string;
    whyFlagged: string;
    rolePriorityLabel: string;
    currentReadiness: number;
  };
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/20 px-4 py-4">
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
  );
}
