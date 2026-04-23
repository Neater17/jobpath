import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getQuestionsForCareer } from "../data/assessmentData";
import {
  careerPaths,
  getCareerPathKeyFromTrack,
  resolveRecommendationCareerName,
} from "../data/careerData";
import {
  buildRecommendationExplainabilityStreamUrl,
  createRecommendationExplainabilityStreamSession,
  fetchCareerById,
  fetchCareerGaps,
  fetchEnablingSkills,
  fetchFunctionalSkills,
  fetchRecommendations,
  fetchRecommendationModelInfo,
  saveAssessmentResult,
  submitRecommendationFeedback,
  type Career,
  type GroupedCareerScore,
  type PriorityGap,
  type RecommendationExplainability,
  type RecommendationResult,
  type SaveAssessmentPayload,
} from "../services/api";
import { useCareerStore } from "../store/careerStore";

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

type GroupedCareerRank = {
  careerName: string;
  confidenceLabel: string;
  pathNames: string[];
  rankLabel: string;
  highlight: boolean;
};

function buildRankLabel(positions: number[]) {
  if (positions.length <= 1) {
    return `#${positions[0]}`;
  }
  const isContiguous = positions.every((position, index) => index === 0 || position === positions[index - 1] + 1);
  if (isContiguous) {
    return `#${positions[0]}-#${positions[positions.length - 1]}`;
  }
  return positions.map((position) => `#${position}`).join(", ");
}

function groupCareerRankRows(
  scores: RecommendationResult["allCareerScores"],
  groupedScores: RecommendationResult["groupedCareerScores"] | undefined,
  limit = 10
): GroupedCareerRank[] {
  if (groupedScores && groupedScores.length > 0) {
    return groupedScores.slice(0, limit).map((group, index) => ({
      careerName: group.careerName,
      confidenceLabel: pct(group.recommendationConfidence),
      pathNames: group.pathNames,
      rankLabel: `#${index + 1}`,
      highlight: index === 0,
    }));
  }

  const grouped = new Map<string, GroupedCareerRank & { positions: number[] }>();

  scores.slice(0, limit).forEach((score, index) => {
    const confidenceLabel = pct(score.recommendationConfidence);
    const key = `${score.careerName}::${confidenceLabel}`;
    const existing = grouped.get(key);

    if (existing) {
      if (!existing.pathNames.includes(score.pathName)) {
        existing.pathNames.push(score.pathName);
      }
      existing.positions.push(index + 1);
      return;
    }

    grouped.set(key, {
      careerName: score.careerName,
      confidenceLabel,
      pathNames: [score.pathName],
      positions: [index + 1],
      rankLabel: `#${index + 1}`,
      highlight: index === 0,
    });
  });

  return Array.from(grouped.values()).map(({ positions, ...group }) => ({
    ...group,
    rankLabel: buildRankLabel(positions),
  }));
}

function learningLinksForGap(label: string, recommendation: string) {
  const query = encodeURIComponent(`${label} ${recommendation}`);
  const links = [
    {
      label: "Find Course",
      href: `https://www.coursera.org/search?query=${query}`,
    },
    {
      label: "Watch Tutorials",
      href: `https://www.youtube.com/results?search_query=${query}`,
    },
  ];

  if (/(data|machine learning|statistics|visualization|sql|mlops)/i.test(`${label} ${recommendation}`)) {
    links.push({
      label: "Practice Labs",
      href: "https://www.kaggle.com/learn",
    });
  }

  return links;
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
  const [functionalSkills, setFunctionalSkills] = useState<import("../services/api").FunctionalSkill[]>([]);
  const [enablingSkills, setEnablingSkills] = useState<import("../services/api").EnablingSkill[]>([]);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [explainability, setExplainability] = useState<RecommendationExplainability | null>(null);
  const [chosenCareerPriorityGaps, setChosenCareerPriorityGaps] = useState<PriorityGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [explainabilityLoading, setExplainabilityLoading] = useState(false);
  const [explainabilityError, setExplainabilityError] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"accepted" | "declined" | null>(null);
  const [recommendedDetailTab, setRecommendedDetailTab] = useState<"jobpath" | "skills" | null>(null);
  const [showRecommendedMoreInfo, setShowRecommendedMoreInfo] = useState(false);
  const [showAllRecommendedSkills, setShowAllRecommendedSkills] = useState(false);
  const [showAllChosenSkills, setShowAllChosenSkills] = useState(false);
  const [showAllRecommendedTopSkills, setShowAllRecommendedTopSkills] = useState(false);
  const [showAllChosenTopSkills, setShowAllChosenTopSkills] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const groupedCareerRanks = useMemo(
    () => (result ? groupCareerRankRows(result.allCareerScores, result.groupedCareerScores, 10) : []),
    [result]
  );

  useEffect(() => {
    let active = true;

    async function loadSelectedCareer() {
      if (!selectedCareerId) {
        if (active) {
          setSelectedCareer(null);
          setFunctionalSkills([]);
          setEnablingSkills([]);
        }
        return;
      }

      try {
        const [response, functionalCatalog, enablingCatalog] = await Promise.all([
          fetchCareerById(selectedCareerId),
          fetchFunctionalSkills(),
          fetchEnablingSkills(),
        ]);
        if (active) {
          setSelectedCareer(response);
          setFunctionalSkills(functionalCatalog ?? []);
          setEnablingSkills(enablingCatalog ?? []);
        }
      } catch {
        if (active) {
          setSelectedCareer(null);
          setFunctionalSkills([]);
          setEnablingSkills([]);
        }
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
    () =>
      resolveRecommendationCareerName(
        selectedPathKey,
        selectedCareer?.careerTitle,
        selectedCareer?.careerLevel
      ),
    [selectedCareer?.careerLevel, selectedCareer?.careerTitle, selectedPathKey]
  );

  const questions = useMemo(
    () =>
      getQuestionsForCareer(selectedPathKey, selectedCareerName, selectedCareer, {
        functionalSkills,
        enablingSkills,
      }),
    [enablingSkills, functionalSkills, selectedCareer, selectedCareerName, selectedPathKey]
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
      setSaveStatus("idle");
      setSaveError(null);
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
    let sessionPromise: Promise<void> | null = null;

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

    sessionPromise = (async () => {
      try {
        const { sessionId } = await createRecommendationExplainabilityStreamSession(eventPayload);
        if (!active) {
          return;
        }

        eventSource = new EventSource(buildRecommendationExplainabilityStreamUrl(sessionId));

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
      } catch (error) {
        if (!active) return;
        setExplainabilityError(
          error instanceof Error ? error.message : "Explainability session could not be created."
        );
        setExplainabilityLoading(false);
      }
    })();

    return () => {
      active = false;
      void sessionPromise;
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

  async function handleSaveAssessment() {
    if (!result) return;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      let model: Awaited<ReturnType<typeof fetchRecommendationModelInfo>> | null = null;
      try {
        model = await fetchRecommendationModelInfo();
      } catch {
        model = null;
      }

      const payload: SaveAssessmentPayload = {
        assessmentType: "career_assessment",
        selectedCareer: {
          pathKey: selectedPathKey,
          pathName: selectedPathName,
          careerName: selectedCareer?.careerTitle ?? selectedCareerName ?? null,
          careerId: selectedCareerId || null,
        },
        answers: {
          iHave: payloadIds(assessmentResults.iHave),
          iHaveNot: payloadIds(assessmentResults.iHaveNot),
          answeredCount: result.summary.answeredCount,
          totalQuestions: result.summary.totalQuestions,
        },
        recommendation: {
          topCareer: {
            pathKey: result.topCareer.pathKey,
            pathName: result.topCareer.pathName,
            careerName: result.topCareer.careerName,
            level: result.topCareer.level,
            profileKey: result.topCareer.profileKey ?? null,
            recommendationConfidence: result.topCareer.recommendationConfidence,
          },
          selectedCareerMatch: {
            recommendationConfidence: result.selectedCareerScore?.recommendationConfidence ?? null,
            rank: result.selectedCareerRank,
            isTopRecommendation: chosenCareerMatchesRecommendation,
          },
          topAlternatives: topAlternatives.slice(0, 3).map((career) => ({
            careerName: career.careerName,
            pathNames: career.pathNames,
            recommendationConfidence: career.recommendationConfidence,
            profileKey: career.profileKey ?? null,
          })),
          recommendedPriorityGaps: result.priorityGaps.slice(0, 5).map((gap) => ({
            key: gap.key,
            label: gap.label,
            gapScore: gap.gapScore,
            currentReadiness: gap.currentReadiness,
            importance: gap.importance,
            recommendation: gap.recommendation,
          })),
          selectedCareerPriorityGaps: (
            chosenCareerPriorityGaps.length > 0 ? chosenCareerPriorityGaps : result.priorityGaps
          )
            .slice(0, 5)
            .map((gap) => ({
              key: gap.key,
              label: gap.label,
              gapScore: gap.gapScore,
              currentReadiness: gap.currentReadiness,
              importance: gap.importance,
              recommendation: gap.recommendation,
            })),
          summary: {
            completionRate: result.summary.completionRate,
            haveRate: result.summary.haveRate,
            confidence: result.summary.confidence,
            source: result.summary.source,
          },
          explainabilitySummary: displayedExplainability?.topCareer?.narrative
            ? {
                method: displayedExplainability.selectedMethod,
                narrative: displayedExplainability.topCareer.narrative,
              }
            : undefined,
        },
        feedback:
          feedbackStatus !== null
            ? {
                accepted: feedbackStatus === "accepted",
                submittedAt: new Date().toISOString(),
              }
            : undefined,
        modelMeta: {
          trainedAt: model?.trainedAt,
          modelVersion: model?.modelVersion,
        },
      };

      await saveAssessmentResult(payload);
      setSaveStatus("saved");
      clearAssessmentResults();
      navigate("/account");
    } catch (error) {
      setSaveStatus("idle");
      setSaveError(
        error instanceof Error ? error.message : "We couldn't save this assessment right now."
      );
    }
  }

  function handleDisplayMoreInfo() {
    setShowRecommendedMoreInfo((current) => !current);
    setRecommendedDetailTab(null);
  }

  const displayedExplainability = explainability ?? result?.explainability ?? null;
  const selectedPathName = selectedPathKey
    ? careerPaths[selectedPathKey].name
    : selectedCareerPath || "Selected track";

  function payloadIds(questionsToSave: typeof assessmentResults.iHave) {
    return questionsToSave.map((question) => question.id);
  }

  const strongestAlignmentRows = useMemo(
    () =>
      (displayedExplainability?.topCareer?.factors ?? [])
        .filter((factor) => factor.direction !== "negative")
        .sort((left, right) => right.impactPct - left.impactPct)
        .slice(0, 6),
    [displayedExplainability]
  );

  const topAlternatives = useMemo<GroupedCareerScore[]>(
    () =>
      result?.groupedCareerScores?.slice(1, 4) ??
      (result?.alternativeCareers.slice(0, 3).map((career) => ({
        profileKey: career.profileKey,
        careerName: career.careerName,
        recommendationConfidence: career.recommendationConfidence,
        ensemble: career.ensemble,
        pathKeys: [career.pathKey],
        pathNames: [career.pathName],
        entries: [
          {
            pathKey: career.pathKey,
            pathName: career.pathName,
            careerName: career.careerName,
            level: career.level,
          },
        ],
      })) ?? []),
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
    <>
    <div className="space-y-8 print:hidden">
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
              <h3 className="text-4xl font-bold text-white">Best Career Recommendation</h3>
              <p className="mt-2 text-white/80">
                The model found this path to be your strongest overall match right now.
              </p>
            </div>
            <MetricBadge title="Recommendation Confidence" value={pct(result.topCareer.recommendationConfidence)} large />
          </div>

          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-6">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/65">Recommended Career</p>
                <h4 className="mt-2 text-4xl font-bold text-white">{result.topCareer.careerName}</h4>
                <p className="mt-1 text-cyan-100">{result.topCareer.pathName}</p>
                <p className="mt-5 leading-7 text-white/85">
                  {displayedExplainability?.topCareer?.narrative ||
                    "Explanation text is still loading..."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-slate-950/20 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-white/65">Recommendation Snapshot</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <MetricBadge title="Answered" value={`${result.summary.answeredCount}`} />
                  <MetricBadge title="Completion" value={pct(result.summary.completionRate)} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      {
                        setShowRecommendedMoreInfo(false);
                        setRecommendedDetailTab((current) =>
                          current === "jobpath" ? null : "jobpath"
                        );
                      }
                    }
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      recommendedDetailTab === "jobpath"
                        ? "border-cyan-300/40 bg-cyan-400/20 text-cyan-50"
                        : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                    } w-full`}
                  >
                    Show Recommended JobPath
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      {
                        setShowRecommendedMoreInfo(false);
                        setRecommendedDetailTab((current) =>
                          current === "skills" ? null : "skills"
                        );
                      }
                    }
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      recommendedDetailTab === "skills"
                        ? "border-cyan-300/40 bg-cyan-400/20 text-cyan-50"
                        : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                    } w-full`}
                  >
                    Skills To Focus On
                  </button>
                  <button
                    type="button"
                    onClick={handleDisplayMoreInfo}
                    className="w-full rounded-xl border border-amber-300/35 bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-400/25"
                  >
                    {showRecommendedMoreInfo ? "Hide More Info" : "Show Both"}
                  </button>
                </div>
              </div>
            </div>

            {recommendedDetailTab === "jobpath" || showRecommendedMoreInfo ? (
              <div className="mt-6">
                <p className="text-s text-white/75">
                  This is a possible role progression toward the recommended career based on the current path structure.
                </p>
                <div className="mt-4 overflow-x-auto pb-2">
                  <div className="flex min-w-max items-start gap-3">
                    {recommendedJobPathSteps.map((step, index) => (
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
                            {step.focusRows.map((gap) => (
                              <span key={`${step.role.name}-${gap.key}`} className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/85">
                                {gap.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        {index < recommendedJobPathSteps.length - 1 ? (
                          <div className="select-none pt-16 text-2xl font-bold text-cyan-100">-&gt;</div>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {recommendedDetailTab === "skills" || showRecommendedMoreInfo ? (
              <div className="mt-6">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-s text-white/75">
                    These are the main skills to strengthen next for the recommended path.
                  </p>
                  {result.priorityGaps.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllRecommendedTopSkills((value) => !value)}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/20"
                    >
                      {showAllRecommendedTopSkills
                        ? "Show Less"
                        : `Show All (${result.priorityGaps.length})`}
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-4">
                  {(showAllRecommendedTopSkills
                    ? result.priorityGaps
                    : result.priorityGaps.slice(0, 3)).map((gap) => (
                    <ActionCard key={`recommended-inline-${gap.key}`} gap={gap} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm text-white/80">Other Top-Ranked Careers</p>
            <div className="space-y-3">
              {topAlternatives.map((career, index) => (
                <div key={`${career.profileKey ?? career.careerName}-${index}`} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg border border-cyan-300/30 bg-cyan-500/15 px-3 py-2 text-left">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/75">Overall Rank</p>
                        <p className="text-lg font-bold text-cyan-50">#{index + 2}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{career.careerName}</p>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-white/70">
                          {career.pathNames.map((pathName) => (
                            <span key={`${career.careerName}-${pathName}`}>{pathName}</span>
                          ))}
                        </div>
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
              </div>
            </div>

            <div className="mt-6">
              <p className="text-s text-white/75">
                This shows the progression roles for your chosen path and the skills the model sees as most important to build next.
              </p>
              <div className="mt-4 overflow-x-auto pb-2">
                <div className="flex min-w-max items-start gap-3">
                  {chosenJobPathSteps.map((step, index) => (
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
                          {step.focusRows.map((gap) => (
                            <span key={`${step.role.name}-${gap.key}`} className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/85">
                              {gap.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      {index < chosenJobPathSteps.length - 1 ? (
                        <div className="select-none pt-16 text-2xl font-bold text-cyan-100">-&gt;</div>
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-start justify-between gap-4">
                <p className="text-s text-white/75">
                  These are the main skills to strengthen next for your chosen path.
                </p>
                {(chosenCareerPriorityGaps.length > 0 ? chosenCareerPriorityGaps : result.priorityGaps).length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllChosenTopSkills((value) => !value)}
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/20"
                  >
                    {showAllChosenTopSkills
                      ? "Show Less"
                      : `Show All (${(chosenCareerPriorityGaps.length > 0 ? chosenCareerPriorityGaps : result.priorityGaps).length})`}
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3">
                {(showAllChosenTopSkills
                  ? (chosenCareerPriorityGaps.length > 0 ? chosenCareerPriorityGaps : result.priorityGaps)
                  : (chosenCareerPriorityGaps.length > 0 ? chosenCareerPriorityGaps : result.priorityGaps).slice(0, 3)
                ).map((gap) => (
                  <ActionCard key={gap.key} gap={gap} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>


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
              {groupedCareerRanks.map((group) => (
                <tr
                  key={`${group.careerName}-${group.confidenceLabel}`}
                  className={`border-b border-white/10 ${group.highlight ? "bg-emerald-500/10" : ""}`}
                >
                  <td className="px-2 py-3 font-semibold text-white">{group.rankLabel}</td>
                  <td className="px-2 py-3 text-white">
                    <p className="font-semibold">{group.careerName}</p>
                    <p className="mt-1 text-xs text-white/60">{group.confidenceLabel} confidence</p>
                  </td>
                  <td className="px-2 py-3 text-white/80">
                    <div className="flex flex-col gap-1">
                      {group.pathNames.map((pathName) => (
                        <span key={`${group.careerName}-${pathName}`} className="text-sm">
                          {pathName}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-lg">
        <div className="mx-auto max-w-xl">
          <h3 className="text-2xl font-bold text-white">Was this recommendation helpful?</h3>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
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
        </div>
      </section>

      <div className="text-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="mr-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl transition hover:from-blue-600 hover:to-blue-700"
        >
          Download PDF
        </button>
        <button
          type="button"
          onClick={() => void handleSaveAssessment()}
          disabled={saveStatus === "saving"}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl transition hover:from-blue-600 hover:to-blue-700"
        >
          {saveStatus === "saving" ? "Saving..." : "Save Assessment"}
        </button>
        {saveError ? <p className="mt-4 text-sm text-amber-100">{saveError}</p> : null}
      </div>
    </div>

    <div className="hidden print:block print:bg-white print:text-black">
      <PrintReportPage
        title="Best Career Recommendation"
        subtitle="Recommended by the JOB-PATH assessment model"
        careerName={result.topCareer.careerName}
        pathName={result.topCareer.pathName}
        confidenceLabel={pct(result.topCareer.recommendationConfidence)}
        summaryText={
          displayedExplainability?.topCareer?.narrative ||
          "Your strongest answer pattern aligned most closely with this role."
        }
        skills={(result.priorityGaps ?? []).slice(0, 6)}
        footerLabel="Page 1 of 3"
      />

      <PrintReportPage
        title="Your Chosen Career"
        subtitle="Comparison against the role you selected"
        careerName={selectedCareer?.careerTitle ?? selectedCareerName ?? "Selected career"}
        pathName={selectedPathName}
        confidenceLabel={
          result.selectedCareerScore ? pct(result.selectedCareerScore.recommendationConfidence) : "N/A"
        }
        summaryText={
          chosenCareerMatchesRecommendation
            ? "Your chosen career is also the top recommendation, so your current direction is strongly aligned with the model result."
            : "Your chosen career remains a valid path, but the model found another role that currently aligns more strongly with your answers."
        }
        skills={(chosenCareerPriorityGaps.length > 0 ? chosenCareerPriorityGaps : result.priorityGaps).slice(0, 6)}
        footerLabel="Page 2 of 3"
      />

      <section className="min-h-screen break-after-page bg-white px-10 py-12 text-black">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">JOB-PATH Report</p>
          <h1 className="mt-3 text-4xl font-bold">Other Career Options</h1>
          <p className="mt-3 text-base text-slate-700">
            Additional strong alternatives based on your current assessment profile.
          </p>

          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Rank</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Career</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Path</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {groupedCareerRanks.map((group) => (
                  <tr key={`${group.careerName}-${group.confidenceLabel}`} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-sm">{group.rankLabel}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{group.careerName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex flex-col gap-1">
                        {group.pathNames.map((pathName) => (
                          <span key={`${group.careerName}-print-${pathName}`}>{pathName}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{group.confidenceLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-10 text-right text-sm text-slate-500">Page 3 of 3</p>
        </div>
      </section>
    </div>
    </>
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
          <div className="mt-3 flex flex-wrap gap-2">
            {learningLinksForGap(gap.label, gap.recommendation).map((link) => (
              <a
                key={`${gap.key}-${link.label}`}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-500/30"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <p className="text-sm font-semibold text-amber-100">{Math.round(gap.gapScore * 100)}% gap</p>
      </div>
    </div>
  );
}

function PrintReportPage(props: {
  title: string;
  subtitle: string;
  careerName: string;
  pathName: string;
  confidenceLabel: string;
  summaryText: string;
  skills: PriorityGap[];
  footerLabel: string;
}) {
  return (
    <section className="min-h-screen break-after-page bg-white px-10 py-12 text-black">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">JOB-PATH Report</p>
        <h1 className="mt-3 text-4xl font-bold">{props.title}</h1>
        <p className="mt-3 text-base text-slate-700">{props.subtitle}</p>

        <div className="mt-8 rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Career</p>
              <h2 className="mt-2 text-3xl font-bold">{props.careerName}</h2>
              <p className="mt-1 text-lg text-slate-700">{props.pathName}</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Confidence</p>
              <p className="mt-2 text-3xl font-bold">{props.confidenceLabel}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Summary</p>
            <p className="mt-3 leading-7 text-slate-800">{props.summaryText}</p>
          </div>

          <div className="mt-6">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Skills To Focus On</p>
            <div className="mt-4 space-y-3">
              {props.skills.map((gap) => (
                <div key={`${props.title}-${gap.key}`} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{gap.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{gap.recommendation}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-600">{Math.round(gap.gapScore * 100)}% gap</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-10 text-right text-sm text-slate-500">{props.footerLabel}</p>
      </div>
    </section>
  );
}
