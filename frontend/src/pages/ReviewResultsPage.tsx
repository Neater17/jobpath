import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getQuestionsForCareer } from "../data/assessmentData";
import {
  careerPaths,
  getCareerPathKeyFromTrack,
  getRecommendationCareerForPathLevel,
} from "../data/careerData";
import {
  buildRecommendationExplainabilityStreamUrl,
  fetchCareerById,
  fetchCareerGaps,
  fetchRecommendations,
  submitRecommendationFeedback,
  type Career,
  type PriorityGap,
  type RecommendationExplainability,
  type RecommendationResult,
} from "../services/api";
import { useCareerStore } from "../store/careerStore";

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function mergeExplainability(
  current: RecommendationExplainability | null,
  patch: Omit<Partial<RecommendationExplainability>, "topCareer"> & {
    topCareer?: Partial<RecommendationExplainability["topCareer"]>;
  }
) {
  if (!current) {
    return patch as RecommendationExplainability;
  }

  return {
    ...current,
    ...patch,
    topCareer: {
      ...current.topCareer,
      ...((patch.topCareer ?? {}) as Partial<RecommendationExplainability["topCareer"]>),
    },
    comparison: {
      ...current.comparison,
      ...(patch.comparison ?? {}),
    } as RecommendationExplainability["comparison"],
  };
}

export default function ReviewResultsPage() {
  const navigate = useNavigate();
  const { selectedCareerPath, selectedCareerId, assessmentResults, clearAssessmentResults } =
    useCareerStore();

  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [explainability, setExplainability] = useState<RecommendationExplainability | null>(null);
  const [chosenCareerPriorityGaps, setChosenCareerPriorityGaps] = useState<PriorityGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [explainabilityLoading, setExplainabilityLoading] = useState(false);
  const [explainabilityError, setExplainabilityError] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"accepted" | "declined" | null>(null);
  const [showRecommendedJobPath, setShowRecommendedJobPath] = useState(false);
  const [showChosenJobPath, setShowChosenJobPath] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSelectedCareer() {
      if (!selectedCareerId) {
        if (active) setSelectedCareer(null);
        return;
      }

      try {
        const response = await fetchCareerById(selectedCareerId);
        if (active) setSelectedCareer(response);
      } catch {
        if (active) setSelectedCareer(null);
      }
    }

    void loadSelectedCareer();
    return () => {
      active = false;
    };
  }, [selectedCareerId]);

  const selectedPathKey = useMemo(
    () => getCareerPathKeyFromTrack(selectedCareerPath || null),
    [selectedCareerPath]
  );

  const selectedCareerName = useMemo(
    () => getRecommendationCareerForPathLevel(selectedPathKey, selectedCareer?.careerLevel),
    [selectedCareer?.careerLevel, selectedPathKey]
  );

  const questions = useMemo(
    () => getQuestionsForCareer(selectedPathKey, selectedCareerName),
    [selectedCareerName, selectedPathKey]
  );

  const payload = useMemo(
    () => ({
      selectedPathKey,
      selectedCareerName,
      iHave: assessmentResults.iHave.map((question) => question.id),
      iHaveNot: assessmentResults.iHaveNot.map((question) => question.id),
      questions: questions.map((question) => ({
        id: question.id,
        text: question.text,
        competencies: question.competencies,
      })),
      explainabilityMethod: "auto" as const,
      includeExplainability: false,
    }),
    [assessmentResults.iHave, assessmentResults.iHaveNot, questions, selectedCareerName, selectedPathKey]
  );

  useEffect(() => {
    let active = true;

    async function loadRecommendation() {
      if (assessmentResults.iHave.length === 0 && assessmentResults.iHaveNot.length === 0) {
        setError("Complete the assessment first so we can generate a recommendation.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setFeedbackStatus(null);
      setExplainability(null);
      setExplainabilityError(null);
      setChosenCareerPriorityGaps([]);

      try {
        const response = await fetchRecommendations(payload);
        if (!active) return;
        setResult(response.result);
      } catch (recommendationError) {
        if (!active) return;
        setResult(null);
        setError(
          recommendationError instanceof Error
            ? recommendationError.message
            : "Recommendation service is unavailable right now."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRecommendation();
    return () => {
      active = false;
    };
  }, [assessmentResults.iHave.length, assessmentResults.iHaveNot.length, payload]);

  useEffect(() => {
    let active = true;
    let eventSource: EventSource | null = null;

    if (!result) {
      return () => {
        active = false;
      };
    }

    setExplainabilityLoading(true);
    setExplainabilityError(null);

    const eventPayload = {
      ...payload,
      includeExplainability: true,
    };

    eventSource = new EventSource(buildRecommendationExplainabilityStreamUrl(eventPayload));

    eventSource.addEventListener("meta", (event) => {
      if (!active) return;
      const data = JSON.parse((event as MessageEvent).data) as Partial<RecommendationExplainability>;
      setExplainability((current) => mergeExplainability(current, data));
    });

    eventSource.addEventListener("narrative", (event) => {
      if (!active) return;
      const data = JSON.parse((event as MessageEvent).data) as { narrative?: string };
      setExplainability((current) =>
        mergeExplainability(current, {
          topCareer: {
            narrative: data.narrative ?? "",
          } as Partial<RecommendationExplainability["topCareer"]>,
        })
      );
    });

    eventSource.addEventListener("matches", (event) => {
      if (!active) return;
      const data = JSON.parse((event as MessageEvent).data) as {
        factors?: RecommendationExplainability["topCareer"]["factors"];
      };
      setExplainability((current) =>
        mergeExplainability(current, {
          topCareer: {
            factors: data.factors ?? [],
          } as Partial<RecommendationExplainability["topCareer"]>,
        })
      );
    });

    eventSource.addEventListener("done", () => {
      if (!active) return;
      setExplainabilityLoading(false);
      eventSource?.close();
      eventSource = null;
    });

    eventSource.addEventListener("failed", (event) => {
      if (!active) return;
      const data = JSON.parse((event as MessageEvent).data) as { message?: string };
      setExplainabilityError(data.message ?? "Explainability is unavailable right now.");
      setExplainabilityLoading(false);
      eventSource?.close();
      eventSource = null;
    });

    eventSource.onerror = () => {
      if (!active) return;
      setExplainabilityError("Explainability stream was interrupted. The recommendation result is still valid.");
      setExplainabilityLoading(false);
      eventSource?.close();
      eventSource = null;
    };

    return () => {
      active = false;
      if (eventSource) eventSource.close();
    };
  }, [payload, result]);

  useEffect(() => {
    let active = true;

    async function loadChosenCareerGaps() {
      if (
        !result ||
        !selectedPathKey ||
        !selectedCareerName ||
        (result.selectedCareerScore &&
          result.selectedCareerScore.pathKey === result.topCareer.pathKey &&
          result.selectedCareerScore.careerName === result.topCareer.careerName)
      ) {
        setChosenCareerPriorityGaps(result?.priorityGaps ?? []);
        return;
      }

      try {
        const response = await fetchCareerGaps({
          pathKey: selectedPathKey,
          careerName: selectedCareerName,
          featureVector: result.competencyScores.map((item) => item.featureScore),
        });
        if (active) setChosenCareerPriorityGaps(response.priorityGaps);
      } catch {
        if (active) setChosenCareerPriorityGaps([]);
      }
    }

    void loadChosenCareerGaps();
    return () => {
      active = false;
    };
  }, [result, selectedCareerName, selectedPathKey]);

  async function handleFeedback(accepted: boolean) {
    if (!result) return;
    await submitRecommendationFeedback({
      selectedPathKey,
      selectedCareerName,
      recommendedPathKey: result.topCareer.pathKey,
      recommendedCareerName: result.topCareer.careerName,
      accepted,
      source: "assessment",
      confidence: result.summary.confidence,
    });
    setFeedbackStatus(accepted ? "accepted" : "declined");
  }

  const displayedExplainability = explainability ?? result?.explainability ?? null;
  const selectedPathName = selectedPathKey
    ? careerPaths[selectedPathKey].name
    : selectedCareerPath || "Selected track";

  const strongestAlignmentRows = useMemo(
    () =>
      (displayedExplainability?.topCareer?.factors ?? [])
        .filter((factor) => factor.direction !== "negative")
        .sort((left, right) => right.impactPct - left.impactPct)
        .slice(0, 6),
    [displayedExplainability]
  );

  const topAlternatives = useMemo(
    () => result?.allCareerScores.slice(1, 4) ?? result?.alternativeCareers.slice(0, 3) ?? [],
    [result]
  );

  const chosenCareerMatchesRecommendation = Boolean(
    result &&
      result.selectedCareerScore &&
      result.selectedCareerScore.pathKey === result.topCareer.pathKey &&
      result.selectedCareerScore.careerName === result.topCareer.careerName
  );

  const recommendedJobPathSteps = useMemo(() => {
    if (!result) return [];
    const path = careerPaths[result.topCareer.pathKey];
    if (!path) return [];
    const orderedRoles = [...path.careers].sort((left, right) => left.level - right.level);
    const targetIndex = orderedRoles.findIndex((role) => role.name === result.topCareer.careerName);
    if (targetIndex === -1) return [];

    return orderedRoles.slice(0, targetIndex + 1).map((role, index) => ({
      role,
      stage: index === 0 ? "Starting Role" : index === targetIndex ? "Target Role" : "Progression Role",
      focusRows: result.priorityGaps.slice(index, index + 2),
    }));
  }, [result]);

  const chosenJobPathSteps = useMemo(() => {
    if (!selectedPathKey || !selectedCareerName) return [];
    const path = careerPaths[selectedPathKey];
    if (!path) return [];
    const orderedRoles = [...path.careers].sort((left, right) => left.level - right.level);
    const targetIndex = orderedRoles.findIndex((role) => role.name === selectedCareerName);
    if (targetIndex === -1) return [];

    return orderedRoles.slice(0, targetIndex + 1).map((role, index) => ({
      role,
      stage: index === 0 ? "Starting Role" : index === targetIndex ? "Target Role" : "Progression Role",
      focusRows: chosenCareerPriorityGaps.slice(index, index + 2),
    }));
  }, [chosenCareerPriorityGaps, selectedCareerName, selectedPathKey]);

  if (loading) {
    return <p className="text-white">Generating your recommendation...</p>;
  }

  if (error || !result) {
    return (
      <div className="space-y-4">
        <p className="text-amber-100">{error ?? "Recommendation result is unavailable."}</p>
        <button
          type="button"
          onClick={() => navigate("/career-select")}
          className="rounded-xl bg-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/30"
        >
          Back to Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <h2 className="text-4xl font-bold text-white">Your Recommendation Results</h2>
        <p className="mt-3 max-w-3xl text-white/80">
          We compared your answers against the recommendation model, then ranked the best-fit career path, strongest alternatives, and the main skills to build next.
        </p>
      </section>

      <div className="space-y-8">
        <section className="rounded-[2rem] border border-emerald-300/30 bg-gradient-to-br from-emerald-400/15 to-cyan-400/10 p-8 shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white">Best Career Recommendation</h3>
              <p className="mt-2 text-white/80">
                The model found this path to be your strongest overall match right now.
              </p>
            </div>
            <MetricBadge title="Confidence" value={pct(result.topCareer.recommendationConfidence)} large />
          </div>

          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-6">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/65">Recommended Career</p>
                <h4 className="mt-2 text-4xl font-bold text-white">{result.topCareer.careerName}</h4>
                <p className="mt-1 text-cyan-100">{result.topCareer.pathName}</p>
                <p className="mt-5 leading-7 text-white/85">
                  {displayedExplainability?.topCareer?.narrative ||
                    "Your strongest answer pattern aligned most closely with this role."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-slate-950/20 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-white/65">Recommendation Snapshot</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <MetricBadge title="Answered" value={`${result.summary.answeredCount}`} />
                  <MetricBadge title="Completion" value={pct(result.summary.completionRate)} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecommendedJobPath((value) => !value)}
                  className="mt-5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  {showRecommendedJobPath ? "Hide Recommended JobPath" : "Show Recommended JobPath"}
                </button>
              </div>
            </div>

            {showRecommendedJobPath ? (
              <div className="mt-6">
                <p className="text-sm text-white/75">
                  This is a possible role progression toward the recommended career based on the current path structure.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {recommendedJobPathSteps.map((step, index) => (
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
                        {step.focusRows.map((gap) => (
                          <span key={`${step.role.name}-${gap.key}`} className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/85">
                            {gap.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm text-white/80">Other Top-Ranked Careers</p>
            <div className="space-y-3">
              {topAlternatives.map((career, index) => (
                <div key={`${career.pathKey}-${career.careerName}`} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg border border-cyan-300/30 bg-cyan-500/15 px-3 py-2 text-left">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/75">Overall Rank</p>
                        <p className="text-lg font-bold text-cyan-50">#{index + 2}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{career.careerName}</p>
                        <p className="text-xs text-white/70">{career.pathName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">{pct(career.recommendationConfidence)}</p>
                      <p className="mt-1 text-xs text-white/70">Recommendation confidence</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-4xl font-bold text-white">Your Chosen Career</h3>
              <p className="mt-2 text-white/80">
                This section compares the role you picked against the role the model recommended.
              </p>
            </div>
            <MetricBadge
              title="Chosen Match"
              value={result.selectedCareerScore ? pct(result.selectedCareerScore.recommendationConfidence) : "N/A"}
              large
            />
          </div>

          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-6">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/65">Chosen Career</p>
                <h4 className="mt-2 text-4xl font-bold text-white">
                  {selectedCareer?.careerTitle ?? selectedCareerName ?? "Selected career"}
                </h4>
                <p className="mt-1 text-cyan-100">{selectedPathName}</p>
                <p className="mt-5 leading-7 text-white/85">
                  {chosenCareerMatchesRecommendation
                    ? "Your chosen career is also the top recommendation, so your current direction is strongly aligned with the model result."
                    : "Your chosen career remains a valid path, but the model found another role that currently aligns more strongly with your answers."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-slate-950/20 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-white/65">Chosen Career Snapshot</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <MetricBadge title="Current Rank" value={result.selectedCareerRank ? `#${result.selectedCareerRank}` : "N/A"} />
                  <MetricBadge title="Questions" value={`${result.summary.totalQuestions}`} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowChosenJobPath((value) => !value)}
                  className="mt-5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  {showChosenJobPath ? "Hide Chosen JobPath" : "Show Chosen JobPath"}
                </button>
              </div>
            </div>

            {showChosenJobPath ? (
              <div className="mt-6">
                <p className="text-sm text-white/75">
                  This shows the progression roles for your chosen path and the skills the model sees as most important to build next.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {chosenJobPathSteps.map((step, index) => (
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
                        {step.focusRows.map((gap) => (
                          <span key={`${step.role.name}-${gap.key}`} className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/85">
                            {gap.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-3">
              {(chosenCareerPriorityGaps.length > 0 ? chosenCareerPriorityGaps : result.priorityGaps)
                .slice(0, 3)
                .map((gap) => (
                  <ActionCard key={gap.key} gap={gap} />
                ))}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <div className="mb-5">
          <h3 className="text-2xl font-bold text-white">Explainable Results</h3>
          <p className="mt-1 text-sm text-white/80">
            A simple breakdown of why this recommendation fits your answers and what to strengthen next.
          </p>
          {explainabilityLoading ? (
            <p className="mt-3 text-sm text-cyan-100">Loading explainability details after your recommendation...</p>
          ) : null}
          {explainabilityError ? (
            <p className="mt-3 text-sm text-amber-100">{explainabilityError}</p>
          ) : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Why this fits</p>
            <p className="mt-4 leading-relaxed text-white/90">
              {displayedExplainability?.topCareer?.narrative ||
                "Your results indicate broad alignment with this recommended career and path."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Strongest matches</p>
            {strongestAlignmentRows.length === 0 ? (
              <p className="mt-4 text-sm text-white/70">
                We do not have enough strong signals yet to explain this result in more detail.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {strongestAlignmentRows.map((row) => (
                  <div key={`${row.key}-${row.label}`} className="rounded-xl border border-white/15 bg-white/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{row.label}</p>
                        <p className="mt-1 text-xs text-white/70">
                          {row.source === "certification" ? "Certification signal" : "Competency signal"}
                        </p>
                      </div>
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-50">
                        {Math.round(row.impactPct)}% match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
            <h4 className="text-xl font-semibold text-white">Next Skills To Build For Your Recommended Path</h4>
            <p className="mt-1 text-sm text-white/75">
              These next steps are for {result.topCareer.careerName} under {result.topCareer.pathName}.
            </p>
            <div className="mt-4 grid gap-4">
              {result.priorityGaps.slice(0, 4).map((gap) => (
                <ActionCard key={`recommended-${gap.key}`} gap={gap} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
            <h4 className="text-xl font-semibold text-white">Next Skills To Build For Your Chosen Career</h4>
            <p className="mt-1 text-sm text-white/75">
              These next steps are for {selectedCareer?.careerTitle ?? selectedCareerName} under {selectedPathName}.
            </p>
            <div className="mt-4 grid gap-4">
              {chosenCareerMatchesRecommendation ? (
                <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-5 text-sm text-emerald-50">
                  Your chosen career is the same as the recommended career, so the same next-skill guidance already applies.
                </div>
              ) : (
                (chosenCareerPriorityGaps.length > 0 ? chosenCareerPriorityGaps : result.priorityGaps)
                  .slice(0, 4)
                  .map((gap) => <ActionCard key={`chosen-${gap.key}`} gap={gap} />)
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <h3 className="mb-4 text-2xl font-bold text-white">Other Career Options You Also Fit</h3>
        <p className="mb-4 text-sm text-white/80">
          These are other strong alternatives based on your current assessment profile.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-[520px] w-full text-left">
            <thead>
              <tr className="border-b border-white/20 text-white/80">
                <th className="px-2 py-3">Rank</th>
                <th className="px-2 py-3">Career</th>
                <th className="px-2 py-3">Path</th>
              </tr>
            </thead>
            <tbody>
              {result.allCareerScores.slice(0, 10).map((score, idx) => (
                <tr
                  key={`${score.pathKey}-${score.careerName}`}
                  className={`border-b border-white/10 ${idx === 0 ? "bg-emerald-500/10" : ""}`}
                >
                  <td className="px-2 py-3 font-semibold text-white">#{idx + 1}</td>
                  <td className="px-2 py-3 text-white">{score.careerName}</td>
                  <td className="px-2 py-3 text-white/80">{score.pathName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <h3 className="text-2xl font-bold text-white">Was this recommendation helpful?</h3>
        <div className="mt-4 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => void handleFeedback(true)}
            disabled={feedbackStatus !== null}
            className="rounded-xl bg-emerald-500/80 px-6 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            Yes, this fits
          </button>
          <button
            type="button"
            onClick={() => void handleFeedback(false)}
            disabled={feedbackStatus !== null}
            className="rounded-xl bg-rose-500/80 px-6 py-3 font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
          >
            Not really
          </button>
        </div>
        {feedbackStatus ? (
          <p className="mt-4 text-sm text-white/80">
            Feedback saved: {feedbackStatus === "accepted" ? "marked as useful" : "marked as not useful"}.
          </p>
        ) : null}
      </section>

      <div className="text-center">
        <button
          type="button"
          onClick={() => navigate("/careers/review-assessment")}
          className="mr-4 rounded-xl border-2 border-white/50 bg-white/20 px-8 py-4 text-lg font-bold text-white transition hover:bg-white/30"
        >
          Edit Answers
        </button>
        <button
          type="button"
          onClick={() => {
            clearAssessmentResults();
            navigate("/");
          }}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl transition hover:from-blue-600 hover:to-blue-700"
        >
          Start New Assessment
        </button>
      </div>
    </div>
  );
}

function MetricBadge({ title, value, large = false }: { title: string; value: string; large?: boolean }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-4">
      <p className="text-xs uppercase tracking-wide text-white/80">{title}</p>
      <p className={`font-bold text-white ${large ? "mt-2 text-3xl" : "mt-1 text-2xl"}`}>{value}</p>
    </div>
  );
}

function ActionCard({ gap }: { gap: PriorityGap }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/20 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-white">{gap.label}</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{gap.recommendation}</p>
        </div>
        <p className="text-sm font-semibold text-amber-100">{Math.round(gap.gapScore * 100)}% gap</p>
      </div>
    </div>
  );
}
