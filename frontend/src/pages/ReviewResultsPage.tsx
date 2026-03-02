import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  runRecommendationEngine,
  type CareerAlgorithmScores,
  type RecommendationResult,
} from "../analytics/recommendationEngine";
import { careerPaths } from "../data/careerData";
import { getQuestionsForCareer } from "../data/assessmentData";
import { fetchRecommendations, type RecommendationModelInfo } from "../services/api";
import { clearAssessment, loadAssessment, saveAssessment, type AssessmentState } from "../state/storage";

type ComparisonModeKey =
  | "ensemble"
  | "logistic"
  | "random_forest"
  | "gradient_boosting"
  | "logistic_random_forest"
  | "logistic_gradient_boosting"
  | "random_forest_gradient_boosting";

type ComparisonMode = {
  key: ComparisonModeKey;
  label: string;
  weights: { logistic: number; randomForest: number; gradientBoosting: number };
};

type ComparisonModeRow = {
  key: ComparisonModeKey;
  label: string;
  targetCareerName: string;
  targetPathName: string;
  targetScore: number;
  targetRank: number | null;
  weights: ComparisonMode["weights"];
  modelScores: {
    logistic: number;
    randomForest: number;
    gradientBoosting: number;
  };
  status: "best" | "comparison";
};

type LearningLink = {
  label: string;
  href: string;
};

function scoreByMode(career: CareerAlgorithmScores, mode: ComparisonMode) {
  const weightTotal = mode.weights.logistic + mode.weights.randomForest + mode.weights.gradientBoosting;
  if (weightTotal <= 0) return 0;

  const weightedSum =
    career.logistic * mode.weights.logistic +
    career.randomForest * mode.weights.randomForest +
    career.gradientBoosting * mode.weights.gradientBoosting;

  return weightedSum / weightTotal;
}

export default function ReviewResultsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<AssessmentState>(() => loadAssessment());
  const [showResults, setShowResults] = useState<boolean>(true);
  const [showBestCareerDetails, setShowBestCareerDetails] = useState<boolean>(false);
  const [showJobPath, setShowJobPath] = useState<boolean>(false);
  const [expandedComparisonMode, setExpandedComparisonMode] = useState<ComparisonModeKey | null>(null);
  const [showAdvancedExplanation, setShowAdvancedExplanation] = useState<boolean>(false);

  const questions = useMemo(
    () => getQuestionsForCareer(state.selectedPathKey, state.selectedCareerName),
    [state.selectedPathKey, state.selectedCareerName]
  );

  const qText = useMemo(() => {
    const m = new Map<string, string>();
    questions.forEach((q) => m.set(q.id, q.text));
    return m;
  }, [questions]);

  useEffect(() => {
    const validIds = new Set(questions.map((q) => q.id));
    setState((prev) => {
      const nextIHave = prev.iHave.filter((id) => validIds.has(id));
      const nextIHaveNot = prev.iHaveNot.filter((id) => validIds.has(id));
      if (nextIHave.length === prev.iHave.length && nextIHaveNot.length === prev.iHaveNot.length) {
        return prev;
      }
      const next = { ...prev, iHave: nextIHave, iHaveNot: nextIHaveNot };
      saveAssessment(next);
      return next;
    });
  }, [questions]);

  const localAnalysis = useMemo(() => runRecommendationEngine(state, questions), [state, questions]);
  const [analysis, setAnalysis] = useState<RecommendationResult>(localAnalysis);
  const [modelInfo, setModelInfo] = useState<RecommendationModelInfo | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    setAnalysis(localAnalysis);
  }, [localAnalysis]);

  useEffect(() => {
    let active = true;

    const payload = {
      selectedPathKey: state.selectedPathKey,
      selectedCareerName: state.selectedCareerName,
      iHave: state.iHave,
      iHaveNot: state.iHaveNot,
      questions: questions.map((question) => ({
        id: question.id,
        text: question.text,
        competencies: question.competencies,
      })),
      explainabilityMethod: "auto" as const,
    };

    async function loadBackendRecommendation() {
      setAnalysisLoading(true);
      setAnalysisError(null);
      try {
        const response = await fetchRecommendations(payload);
        if (!active) return;
        setAnalysis(response.result);
        setModelInfo(response.model);
      } catch (_error) {
        if (!active) return;
        setAnalysis(localAnalysis);
        setModelInfo(null);
        setAnalysisError("Backend recommendation API unavailable. Showing local fallback scoring.");
      } finally {
        if (active) {
          setAnalysisLoading(false);
        }
      }
    }

    loadBackendRecommendation();
    return () => {
      active = false;
    };
  }, [
    localAnalysis,
    questions,
    state.iHave,
    state.iHaveNot,
    state.selectedCareerName,
    state.selectedPathKey,
  ]);

  const selectedPathName = state.selectedPathKey ? careerPaths[state.selectedPathKey].name : "—";
  const selectedCareerName = state.selectedCareerName ?? "—";

  const selectedProbabilityScore = useMemo(() => {
    if (analysis.selectedCareerScore) {
      return Math.round(analysis.selectedCareerScore.ensemble * 100);
    }
    return Math.round((state.iHave.length / (questions.length || 1)) * 100);
  }, [analysis.selectedCareerScore, questions.length, state.iHave.length]);

  const selectedRelativeFit = useMemo(() => {
    if (!analysis.selectedCareerScore || !analysis.topCareer) {
      return selectedProbabilityScore;
    }

    const denom = Math.max(analysis.topCareer.ensemble, 1e-9);
    return Math.round((analysis.selectedCareerScore.ensemble / denom) * 100);
  }, [analysis.selectedCareerScore, analysis.topCareer, selectedProbabilityScore]);

  const topAlternatives = useMemo(() => analysis.allCareerScores.slice(1, 4), [analysis.allCareerScores]);

  const ensembleWeights = useMemo(
    () =>
      modelInfo?.ensembleWeights ?? {
        logistic: 0.35,
        randomForest: 0.45,
        gradientBoosting: 0.2,
      },
    [modelInfo]
  );

  const comparisonModes = useMemo<ComparisonMode[]>(
    () => [
      {
        key: "ensemble",
        label: "Ensemble (LR + RF + GB)",
        weights: {
          logistic: ensembleWeights.logistic,
          randomForest: ensembleWeights.randomForest,
          gradientBoosting: ensembleWeights.gradientBoosting,
        },
      },
      {
        key: "logistic",
        label: "Logistic Regression only",
        weights: { logistic: 1, randomForest: 0, gradientBoosting: 0 },
      },
      {
        key: "random_forest",
        label: "Random Forest only",
        weights: { logistic: 0, randomForest: 1, gradientBoosting: 0 },
      },
      {
        key: "gradient_boosting",
        label: "Gradient Boosting only",
        weights: { logistic: 0, randomForest: 0, gradientBoosting: 1 },
      },
      {
        key: "logistic_random_forest",
        label: "Logistic + Random Forest",
        weights: {
          logistic: ensembleWeights.logistic,
          randomForest: ensembleWeights.randomForest,
          gradientBoosting: 0,
        },
      },
      {
        key: "logistic_gradient_boosting",
        label: "Logistic + Gradient Boosting",
        weights: {
          logistic: ensembleWeights.logistic,
          randomForest: 0,
          gradientBoosting: ensembleWeights.gradientBoosting,
        },
      },
      {
        key: "random_forest_gradient_boosting",
        label: "Random Forest + Gradient Boosting",
        weights: {
          logistic: 0,
          randomForest: ensembleWeights.randomForest,
          gradientBoosting: ensembleWeights.gradientBoosting,
        },
      },
    ],
    [ensembleWeights]
  );

  const modelComparisonRows = useMemo<ComparisonModeRow[]>(() => {
    if (!analysis.topCareer || analysis.allCareerScores.length === 0) return [];
    const targetCareer = analysis.topCareer;

    return comparisonModes.map((mode) => {
      const ranked = analysis.allCareerScores
        .map((career) => ({ ...career, modeScore: scoreByMode(career, mode) }))
        .sort((a, b) => b.modeScore - a.modeScore);

      const target =
        ranked.find(
          (career) =>
            career.pathKey === targetCareer.pathKey && career.careerName === targetCareer.careerName
        ) ?? null;

      return {
        key: mode.key,
        label: mode.label,
        targetCareerName: targetCareer.careerName,
        targetPathName: targetCareer.pathName,
        targetScore: target?.modeScore ?? 0,
        targetRank: target
          ? ranked.findIndex(
              (career) =>
                career.pathKey === target.pathKey && career.careerName === target.careerName
            ) + 1
          : null,
        weights: mode.weights,
        modelScores: {
          logistic: target?.logistic ?? targetCareer.logistic,
          randomForest: target?.randomForest ?? targetCareer.randomForest,
          gradientBoosting: target?.gradientBoosting ?? targetCareer.gradientBoosting,
        },
        status: mode.key === "ensemble" ? "best" : "comparison",
      };
    });
  }, [analysis.allCareerScores, analysis.topCareer, comparisonModes]);

  const explainabilityByKey = useMemo(
    () =>
      new Map(
        analysis.explainability.topCareer.factors.map((factor) => [String(factor.key), factor])
      ),
    [analysis.explainability.topCareer.factors]
  );

  const priorityGapByKey = useMemo(
    () => new Map(analysis.priorityGaps.map((gap) => [String(gap.key), gap])),
    [analysis.priorityGaps]
  );

  type ExplanationRow = {
    key: string;
    label: string;
    source: string;
    impactPct: number | null;
    contributionPts: number | null;
    direction: "positive" | "negative" | null;
    gapScore: number | null;
    currentReadiness: number | null;
    importance: number | null;
    recommendation: string;
  };

  const explanationRows = useMemo(() => {
    const rows: ExplanationRow[] = analysis.explainability.topCareer.factors
      .slice(0, 8)
      .map((factor) => {
      const gap = priorityGapByKey.get(String(factor.key));
      return {
        key: String(factor.key),
        label: factor.label,
        source: factor.source === "certification" ? "Certification Signal" : "Competency Signal",
        impactPct: Math.round(factor.impactPct),
        contributionPts: Number((factor.contribution * 100).toFixed(1)),
        direction: factor.direction,
        gapScore: gap ? Math.round(gap.gapScore * 100) : null,
        currentReadiness: gap ? Math.round(gap.currentReadiness * 100) : null,
        importance: gap ? Math.round(gap.importance * 100) : null,
        recommendation: gap
          ? gap.recommendation
          : "No urgent development gap detected. Maintain this strength.",
      };
    });

    analysis.priorityGaps.forEach((gap) => {
      if (rows.some((row) => row.key === String(gap.key))) return;
      const factor = explainabilityByKey.get(String(gap.key));
      rows.push({
        key: String(gap.key),
        label: gap.label,
        source: factor?.source === "certification" ? "Certification Signal" : "Competency Signal",
        impactPct: factor ? Math.round(factor.impactPct) : null,
        contributionPts: factor ? Number((factor.contribution * 100).toFixed(1)) : null,
        direction: factor?.direction ?? null,
        gapScore: Math.round(gap.gapScore * 100),
        currentReadiness: Math.round(gap.currentReadiness * 100),
        importance: Math.round(gap.importance * 100),
        recommendation: gap.recommendation,
      });
    });

    return rows.sort((left, right) => {
      const leftGap = left.gapScore ?? -1;
      const rightGap = right.gapScore ?? -1;
      if (leftGap !== rightGap) return rightGap - leftGap;
      return (right.impactPct ?? -1) - (left.impactPct ?? -1);
    });
  }, [analysis.explainability.topCareer.factors, analysis.priorityGaps, explainabilityByKey, priorityGapByKey]);

  const learningLinksForRow = useMemo(() => {
    return (row: ExplanationRow): LearningLink[] => {
      const query = encodeURIComponent(`${row.label} ${row.recommendation}`);
      const links: LearningLink[] = [
        {
          label: "Find Course",
          href: `https://www.coursera.org/search?query=${query}`,
        },
        {
          label: "Watch Tutorials",
          href: `https://www.youtube.com/results?search_query=${query}`,
        },
      ];

      const dataFocused = /(data|machine learning|statistics|visualization|sql|mlops)/i.test(
        `${row.label} ${row.recommendation}`
      );
      if (dataFocused) {
        links.push({
          label: "Practice Labs",
          href: "https://www.kaggle.com/learn",
        });
      }

      return links;
    };
  }, []);

  const jobPathSteps = useMemo(() => {
    const path = careerPaths[analysis.topCareer.pathKey];
    if (!path) return [];

    const orderedRoles = [...path.careers].sort((left, right) => left.level - right.level);
    const targetIndex = orderedRoles.findIndex((role) => role.name === analysis.topCareer.careerName);
    if (targetIndex === -1) return [];

    const rolesToTarget = orderedRoles.slice(0, targetIndex + 1);
    const developmentRows = explanationRows.filter(
      (row) => !/no urgent development gap detected/i.test(row.recommendation)
    );
    const fallbackRows = explanationRows.slice(0, 2);

    return rolesToTarget.map((role, index) => {
      const focusRows =
        developmentRows.slice(index, index + 2).length > 0
          ? developmentRows.slice(index, index + 2)
          : fallbackRows;

      const stage =
        index === 0 ? "Starting Role" : index === rolesToTarget.length - 1 ? "Target Role" : "Progression Role";

      return {
        role,
        stage,
        focusRows,
      };
    });
  }, [analysis.topCareer.careerName, analysis.topCareer.pathKey, explanationRows]);

  function toggleMove(qid: string) {
    setState((s) => {
      const inHave = s.iHave.includes(qid);
      const inHaveNot = s.iHaveNot.includes(qid);

      let iHave = s.iHave.filter((x) => x !== qid);
      let iHaveNot = s.iHaveNot.filter((x) => x !== qid);

      if (inHave) iHaveNot = [...iHaveNot, qid];
      else if (inHaveNot) iHave = [...iHave, qid];
      else iHave = [...iHave, qid];

      const next = { ...s, iHave, iHaveNot };
      saveAssessment(next);
      return next;
    });
  }

  function goBack() {
    navigate("/career-select");
  }

  function submitAssessment() {
    setShowResults(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startNew() {
    clearAssessment();
    navigate("/");
  }

  return (
    <div>
      {!showResults ? (
        <div id="reviewPage">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">Review Your Answers</h2>
            <p className="text-white/80">Double-check your responses before submitting</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
            <div className="mb-8 p-6 bg-blue-500/30 rounded-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-white/80 text-sm mb-1">Selected Career Path</p>
                  <p className="text-white font-bold text-2xl">{selectedPathName}</p>
                  <p className="text-white/80 text-sm mb-1 mt-3">Selected Career</p>
                  <p className="text-white font-bold text-xl">{selectedCareerName}</p>
                </div>
                <button
                  type="button"
                  onClick={goBack}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-semibold hover:bg-white/30 transition border border-white/50"
                >
                  Edit Selection
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <ReviewColumn
                title="I Have"
                variant="green"
                items={state.iHave.filter((id) => qText.has(id))}
                getText={(id) => qText.get(id) ?? ""}
                onMove={toggleMove}
              />
              <ReviewColumn
                title="I Have Not"
                variant="red"
                items={state.iHaveNot.filter((id) => qText.has(id))}
                getText={(id) => qText.get(id) ?? ""}
                onMove={toggleMove}
              />
            </div>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={goBack}
                className="px-8 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition border-2 border-white/50"
              >
                ← Back to Assessment
              </button>
              <button
                type="button"
                onClick={submitAssessment}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition shadow-xl"
              >
                Submit Assessment
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div id="resultsPage">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">Your Career Assessment Results</h2>
            <p className="text-white/80">Ensemble scoring, ranked career fit, and competency gap analytics</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs bg-white/20 text-white/90 border border-white/30">
                Source: {analysis.summary.source === "backend" ? "Backend API" : "Frontend Fallback"}
              </span>
              {modelInfo ? (
                <span className="px-3 py-1 rounded-full text-xs bg-white/20 text-white/90 border border-white/30">
                  Dataset: {modelInfo.dataSource}
                </span>
              ) : null}
              {analysisLoading ? (
                <span className="px-3 py-1 rounded-full text-xs bg-cyan-500/30 text-cyan-50 border border-cyan-300/40">
                  Refreshing backend scores...
                </span>
              ) : null}
              {analysisError ? (
                <span className="px-3 py-1 rounded-full text-xs bg-amber-500/30 text-amber-50 border border-amber-300/40">
                  {analysisError}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-white/70 text-sm">
              Relative Fit compares careers against your top result (top = 100%).
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-white font-bold text-2xl">Review Answers</h3>
                <p className="text-white/80 text-sm">
                  Quick snapshot of your responses used for this recommendation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResults(false)}
                className="px-6 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition border-2 border-white/50"
              >
                Edit Answers
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <ReviewColumn
                title={`I Have (${state.iHave.filter((id) => qText.has(id)).length})`}
                variant="green"
                items={state.iHave.filter((id) => qText.has(id))}
                getText={(id) => qText.get(id) ?? ""}
                compact
              />
              <ReviewColumn
                title={`I Have Not (${state.iHaveNot.filter((id) => qText.has(id)).length})`}
                variant="red"
                items={state.iHaveNot.filter((id) => qText.has(id))}
                getText={(id) => qText.get(id) ?? ""}
                compact
              />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-white font-bold text-2xl mb-3">Best Career Recommendation</h3>
                <div className="bg-white/10 rounded-2xl p-5 border border-white/20">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-bold text-2xl">{analysis.topCareer.careerName}</p>
                      <p className="text-white/80">{analysis.topCareer.pathName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-white leading-none">#1</p>
                      <p className="text-white/80 text-sm mt-1">Top Match</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setShowBestCareerDetails((prev) => {
                          const next = !prev;
                          if (!next) setExpandedComparisonMode(null);
                          return next;
                        })
                      }
                      className="px-3 py-1.5 text-xs bg-cyan-500/25 text-cyan-50 rounded-lg border border-cyan-300/40 hover:bg-cyan-500/35 transition"
                    >
                      {showBestCareerDetails ? "Hide details" : "Show details"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowJobPath((prev) => !prev)}
                      className="px-3 py-1.5 text-xs bg-emerald-500/25 text-emerald-50 rounded-lg border border-emerald-300/40 hover:bg-emerald-500/35 transition"
                    >
                      {showJobPath ? "Hide JobPath" : "Show JobPath"}
                    </button>
                  </div>
                </div>
                {showBestCareerDetails ? (
                  <div className="mt-4 bg-white/10 rounded-2xl p-5 border border-white/20">
                    <p className="text-white font-semibold">
                      Model Comparison for {analysis.topCareer.careerName}
                    </p>
                    <p className="text-white/80 text-sm mt-1">
                      Ensemble is the primary final-result mode. Single and pair models are shown for
                      comparison.
                    </p>
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-left min-w-[980px]">
                        <thead>
                          <tr className="text-white/80 border-b border-white/20">
                            <th className="py-3 px-2">Mode</th>
                            <th className="py-3 px-2">Career</th>
                            <th className="py-3 px-2">Path</th>
                            <th className="py-3 px-2">Score</th>
                            <th className="py-3 px-2">Rank</th>
                            <th className="py-3 px-2">Result</th>
                            <th className="py-3 px-2">Computation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modelComparisonRows.map((row) => {
                            const isExpanded = expandedComparisonMode === row.key;
                            const weightTotal =
                              row.weights.logistic + row.weights.randomForest + row.weights.gradientBoosting;
                            const logisticContribution =
                              weightTotal > 0
                                ? (row.modelScores.logistic * row.weights.logistic) / weightTotal
                                : 0;
                            const randomForestContribution =
                              weightTotal > 0
                                ? (row.modelScores.randomForest * row.weights.randomForest) / weightTotal
                                : 0;
                            const gradientBoostingContribution =
                              weightTotal > 0
                                ? (row.modelScores.gradientBoosting * row.weights.gradientBoosting) / weightTotal
                                : 0;
                            const reconstructedScore =
                              logisticContribution + randomForestContribution + gradientBoostingContribution;

                            return (
                              <React.Fragment key={row.key}>
                                <tr
                                  className={`border-b border-white/10 ${
                                    row.status === "best" ? "bg-emerald-500/15" : "bg-white/0"
                                  }`}
                                >
                                  <td className="py-3 px-2 text-white font-semibold">{row.label}</td>
                                  <td className="py-3 px-2 text-white">{row.targetCareerName}</td>
                                  <td className="py-3 px-2 text-white/80">{row.targetPathName}</td>
                                  <td className="py-3 px-2 text-white font-bold">
                                    {Math.round(row.targetScore * 100)}%
                                  </td>
                                  <td className="py-3 px-2 text-white/80">
                                    {row.targetRank ? `#${row.targetRank}` : "—"}
                                  </td>
                                  <td className="py-3 px-2">
                                    {row.status === "best" ? (
                                      <span className="px-2 py-1 text-xs rounded bg-emerald-500/30 text-emerald-50 border border-emerald-300/40">
                                        Best Result
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 text-xs rounded bg-white/10 text-white/80 border border-white/20">
                                        Comparison
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedComparisonMode((prev) =>
                                          prev === row.key ? null : row.key
                                        )
                                      }
                                      className="px-2.5 py-1 text-xs bg-white/10 text-white/90 rounded border border-white/25 hover:bg-white/20 transition"
                                    >
                                      {isExpanded ? "Hide computation" : "View computation"}
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded ? (
                                  <tr className="border-b border-white/10 bg-white/5">
                                    <td colSpan={7} className="px-3 py-4">
                                      <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                                        <p className="text-white font-semibold text-sm">Computation Details</p>
                                        <p className="text-white/80 text-xs mt-1">
                                          Score = (LR x wLR + RF x wRF + GB x wGB) / (wLR + wRF + wGB)
                                        </p>
                                        <p className="text-white/70 text-xs mt-1">
                                          Inputs: LR {Math.round(row.modelScores.logistic * 100)}%, RF{" "}
                                          {Math.round(row.modelScores.randomForest * 100)}%, GB{" "}
                                          {Math.round(row.modelScores.gradientBoosting * 100)}%
                                        </p>
                                        <p className="text-white/70 text-xs">
                                          Weights: wLR {Math.round(row.weights.logistic * 100)}%, wRF{" "}
                                          {Math.round(row.weights.randomForest * 100)}%, wGB{" "}
                                          {Math.round(row.weights.gradientBoosting * 100)}%
                                        </p>
                                        <div className="grid md:grid-cols-3 gap-2 mt-3 text-xs">
                                          <p className="text-white/80">
                                            LR contribution: {(logisticContribution * 100).toFixed(1)}%
                                          </p>
                                          <p className="text-white/80">
                                            RF contribution: {(randomForestContribution * 100).toFixed(1)}%
                                          </p>
                                          <p className="text-white/80">
                                            GB contribution: {(gradientBoostingContribution * 100).toFixed(1)}%
                                          </p>
                                        </div>
                                        <p className="text-white font-semibold text-sm mt-3">
                                          Final computed score: {(reconstructedScore * 100).toFixed(1)}%
                                        </p>
                                        {row.key === "logistic" ? (
                                          <p className="text-white/70 text-xs mt-1">
                                            Logistic-only mode sets wLR to 100%, so this row equals the Logistic
                                            Regression output.
                                          </p>
                                        ) : null}
                                      </div>
                                    </td>
                                  </tr>
                                ) : null}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
                {showJobPath ? (
                  <div className="mt-4 bg-white/10 rounded-2xl p-5 border border-white/20">
                    <p className="text-white font-semibold">
                      Suggested JobPath to {analysis.topCareer.careerName}
                    </p>
                    <p className="text-white/80 text-sm mt-1">
                      This role may not be an immediate entry-level job. Follow this path through foundational roles and
                      skill-building steps.
                    </p>
                    <div className="mt-4 md:hidden space-y-3">
                      {jobPathSteps.map((step, index) => (
                        <div
                          key={`mobile-${step.role.name}-${step.role.level}`}
                          className="bg-white/10 rounded-xl border border-white/20 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-white font-semibold">Step {index + 1}: {step.role.name}</p>
                              <p className="text-white/70 text-xs">{step.stage}</p>
                            </div>
                            <span className="px-2 py-1 text-xs rounded bg-white/10 text-white/80 border border-white/20">
                              Level {step.role.level}
                            </span>
                          </div>
                          <div className="mt-3">
                            <p className="text-white/80 text-xs uppercase tracking-wide">Skill Focus</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {step.focusRows.map((row) => (
                                <span
                                  key={`mobile-${step.role.name}-${row.key}`}
                                  className="px-2 py-1 text-xs rounded bg-white/10 text-white/85 border border-white/20"
                                >
                                  {row.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-white/80 text-xs uppercase tracking-wide">Learning Resources</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {step.focusRows.map((row) => (
                                <a
                                  key={`mobile-${step.role.name}-${row.key}-link`}
                                  href={`https://www.coursera.org/search?query=${encodeURIComponent(`${step.role.name} ${row.label} ${row.recommendation}`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 text-xs rounded bg-cyan-500/20 text-cyan-50 border border-cyan-300/40 hover:bg-cyan-500/30 transition"
                                >
                                  Learn {row.label}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 hidden md:block">
                      <div className="overflow-x-auto pb-2">
                        <div className="flex items-start gap-3 min-w-max">
                          {jobPathSteps.map((step, index) => (
                            <React.Fragment key={`desktop-${step.role.name}-${step.role.level}`}>
                              <div className="w-[300px] bg-white/10 rounded-xl border border-white/20 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-white font-semibold">Step {index + 1}</p>
                                    <p className="text-white text-lg font-bold mt-1">{step.role.name}</p>
                                    <p className="text-white/70 text-xs mt-1">{step.stage}</p>
                                  </div>
                                  <span className="px-2 py-1 text-xs rounded bg-white/10 text-white/80 border border-white/20">
                                    L{step.role.level}
                                  </span>
                                </div>
                                <div className="mt-3">
                                  <p className="text-white/80 text-[11px] uppercase tracking-wide">Skill Focus</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {step.focusRows.map((row) => (
                                      <span
                                        key={`desktop-${step.role.name}-${row.key}`}
                                        className="px-2 py-1 text-xs rounded bg-white/10 text-white/85 border border-white/20"
                                      >
                                        {row.label}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <p className="text-white/80 text-[11px] uppercase tracking-wide">Learning</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {step.focusRows.map((row) => (
                                      <a
                                        key={`desktop-${step.role.name}-${row.key}-link`}
                                        href={`https://www.coursera.org/search?query=${encodeURIComponent(`${step.role.name} ${row.label} ${row.recommendation}`)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-1 text-xs rounded bg-cyan-500/20 text-cyan-50 border border-cyan-300/40 hover:bg-cyan-500/30 transition"
                                      >
                                        Learn {row.label}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              {index < jobPathSteps.length - 1 ? (
                                <div className="pt-16 text-cyan-100 text-2xl font-bold select-none">→</div>
                              ) : null}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <h3 className="text-white font-bold text-4xl mb-5">Selected Career Performance</h3>
                <div className="bg-white/10 rounded-2xl p-8 border border-white/20 min-h-[360px]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-bold text-3xl">{selectedCareerName}</p>
                      <p className="text-white/80 text-lg">{selectedPathName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-5xl font-bold text-white">{selectedRelativeFit}%</p>
                      <p className="text-white/80 text-base">Relative Fit</p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <MetricBadge
                      title="Rank"
                      value={analysis.selectedCareerRank ? `#${analysis.selectedCareerRank}` : "—"}
                    />
                    <MetricBadge
                      title="Answered"
                      value={`${analysis.summary.answeredCount}/${analysis.summary.totalQuestions}`}
                    />
                  </div>

                  <div className="mt-8">
                    <p className="text-white/80 text-sm mb-3">Top Alternatives</p>
                    <div className="space-y-3">
                      {topAlternatives.map((career, index) => (
                        <div
                          key={`${career.pathKey}-${career.careerName}`}
                          className="bg-white/10 rounded-lg px-4 py-3 border border-white/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-white text-sm font-semibold">
                                #{index + 2} {career.careerName}
                              </p>
                              <p className="text-white/70 text-xs">{career.pathName}</p>
                            </div>
                            <p className="text-white font-bold">
                              {Math.round((career.ensemble / Math.max(analysis.topCareer.ensemble, 1e-9)) * 100)}%
                            </p>
                          </div>
                          <div className="mt-2 w-full bg-white/20 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full"
                              style={{
                                width: `${Math.round(
                                  (career.ensemble / Math.max(analysis.topCareer.ensemble, 1e-9)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-white font-bold text-2xl">Why This Recommendation</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedExplanation((prev) => !prev)}
                  className="px-3 py-1.5 text-xs bg-cyan-500/25 text-cyan-50 rounded-lg border border-cyan-300/40 hover:bg-cyan-500/35 transition"
                >
                  {showAdvancedExplanation ? "Show Less" : "Show More"}
                </button>
                <span className="px-3 py-1 rounded-full text-xs bg-white/20 text-white/90 border border-white/30">
                  Method: {analysis.explainability.selectedMethod.toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-white/90 mb-2">{analysis.explainability.topCareer.narrative}</p>

            <div className="overflow-x-auto">
              <table className={`w-full text-left ${showAdvancedExplanation ? "min-w-[980px]" : "min-w-[680px]"}`}>
                <thead>
                  <tr className="text-white/80 border-b border-white/20">
                    <th className="py-3 px-2">Signal</th>
                    {showAdvancedExplanation ? <th className="py-3 px-2">Why This Recommendation</th> : null}
                    {showAdvancedExplanation ? <th className="py-3 px-2">Priority Gap</th> : null}
                    <th className="py-3 px-2">Development Action</th>
                  </tr>
                </thead>
                <tbody>
                  {explanationRows.length === 0 ? (
                    <tr className="border-b border-white/10">
                      <td colSpan={showAdvancedExplanation ? 4 : 2} className="py-4 px-2 text-white/70">
                        No explainability rows available for this result.
                      </td>
                    </tr>
                  ) : (
                    explanationRows.map((row) => {
                      const certificationSignal = analysis.certificationSignals.find(
                        (signal) => signal.key === row.key && signal.value > 0
                      );

                      return (
                        <tr key={row.key} className="border-b border-white/10 align-top">
                          <td className="py-3 px-2">
                            <p className="text-white font-semibold">{row.label}</p>
                            <p className="text-white/70 text-xs">{row.source}</p>
                            {certificationSignal ? (
                              <p className="text-cyan-100 text-xs mt-1">
                                Certification score: {Math.round(certificationSignal.value * 100)}%
                              </p>
                            ) : null}
                          </td>
                          {showAdvancedExplanation ? (
                            <td className="py-3 px-2 text-white/90">
                              {row.impactPct !== null ? (
                                <div>
                                  <p className="font-semibold">{row.impactPct}% impact share</p>
                                  <p className="text-white/70 text-xs">
                                    {row.direction === "positive" ? "+" : "-"}
                                    {Math.abs(row.contributionPts ?? 0).toFixed(1)} pts (
                                    {analysis.explainability.selectedMethod.toUpperCase()})
                                  </p>
                                </div>
                              ) : (
                                <p className="text-white/70 text-sm">Not in top XAI factors for this run.</p>
                              )}
                            </td>
                          ) : null}
                          {showAdvancedExplanation ? (
                            <td className="py-3 px-2 text-white/90">
                              {row.gapScore !== null ? (
                                <div>
                                  <p className="font-semibold">{row.gapScore}% gap priority</p>
                                  <p className="text-white/70 text-xs">
                                    Readiness {row.currentReadiness}% | Importance {row.importance}%
                                  </p>
                                </div>
                              ) : (
                                <p className="text-emerald-100 text-sm">No urgent gap detected.</p>
                              )}
                            </td>
                          ) : null}
                          <td className="py-3 px-2 text-white/90 text-sm">
                            <p>{row.recommendation}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {learningLinksForRow(row).map((link) => (
                                <a
                                  key={`${row.key}-${link.label}`}
                                  href={link.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 text-xs rounded bg-cyan-500/20 text-cyan-50 border border-cyan-300/40 hover:bg-cyan-500/30 transition"
                                >
                                  {link.label}
                                </a>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
            <h3 className="text-white font-bold text-2xl mb-4">Career Ranking Table</h3>
            <p className="text-white/80 text-sm mb-4">
              You may also consider these aligned career options as strong alternatives based on your current profile and assessment responses.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[520px]">
                <thead>
                  <tr className="text-white/80 border-b border-white/20">
                    <th className="py-3 px-2">Rank</th>
                    <th className="py-3 px-2">Career</th>
                    <th className="py-3 px-2">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.allCareerScores.slice(0, 10).map((score, idx) => (
                    <tr
                      key={`${score.pathKey}-${score.careerName}`}
                      className={`border-b border-white/10 ${
                        idx === 0 ? "bg-green-500/10" : "bg-white/0"
                      }`}
                    >
                      <td className="py-3 px-2 text-white font-semibold">#{idx + 1}</td>
                      <td className="py-3 px-2 text-white">{score.careerName}</td>
                      <td className="py-3 px-2 text-white/80">{score.pathName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowResults(false)}
              className="px-8 py-4 bg-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/30 transition border-2 border-white/50 mr-4"
            >
              Edit Answers
            </button>
            <button
              type="button"
              onClick={() => alert("Full assessment report would be downloaded as PDF")}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition shadow-xl mr-4"
            >
              Download Full Report
            </button>
            <button
              type="button"
              onClick={startNew}
              className="px-8 py-4 bg-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/30 transition border-2 border-white/50"
            >
              Start New Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBadge(props: { title: string; value: string; large?: boolean }) {
  return (
    <div className="bg-white/10 rounded-xl border border-white/20 p-4">
      <p className="text-white/80 text-xs uppercase tracking-wide">{props.title}</p>
      <p className={`text-white font-bold ${props.large ? "text-3xl mt-2" : "text-2xl mt-1"}`}>{props.value}</p>
    </div>
  );
}

function ReviewColumn(props: {
  title: string;
  variant: "green" | "red";
  items: string[];
  getText: (id: string) => string;
  onMove?: (id: string) => void;
  compact?: boolean;
}) {
  const base =
    props.variant === "green"
      ? "from-green-500/20 to-green-600/20 border-green-400/50"
      : "from-red-500/20 to-red-600/20 border-red-400/50";

  const icon =
    props.variant === "green" ? (
      <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );

  return (
    <div className={`bg-gradient-to-br ${base} rounded-2xl p-6 border-2`}>
      <h3 className="text-white font-bold text-2xl mb-4 flex items-center">
        {icon}
        {props.title}
      </h3>

      <div className={props.compact ? "space-y-3 max-h-[320px] overflow-y-auto pr-1" : "space-y-3"}>
        {props.items.length === 0 ? (
          <div className="bg-white/10 rounded-lg p-4 text-white/80 text-sm">No items yet.</div>
        ) : (
          props.items.map((id) => (
            <div key={id} className="bg-white rounded-lg p-4 shadow">
              <p className="text-gray-800 font-medium text-sm">{props.getText(id)}</p>
              {props.onMove ? (
                <button
                  type="button"
                  onClick={() => props.onMove?.(id)}
                  className="mt-2 px-4 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Move
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
