import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { runRecommendationEngine, type RecommendationResult } from "../analytics/recommendationEngine";
import { careerPaths } from "../data/careerData";
import { getQuestionsForCareer } from "../data/assessmentData";
import { fetchRecommendations, type RecommendationModelInfo } from "../services/api";
import { clearAssessment, loadAssessment, saveAssessment, type AssessmentState } from "../state/storage";

export default function ReviewResultsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<AssessmentState>(() => loadAssessment());
  const [showResults, setShowResults] = useState<boolean>(true);
  const [showTechnicalResults, setShowTechnicalResults] = useState<boolean>(false);

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

  const weightedTopScore = useMemo(
    () =>
      Math.round(
        (analysis.topCareer.logistic * ensembleWeights.logistic +
          analysis.topCareer.randomForest * ensembleWeights.randomForest +
          analysis.topCareer.gradientBoosting * ensembleWeights.gradientBoosting) *
          100
      ),
    [analysis.topCareer, ensembleWeights]
  );

  const weightedSelectedScore = useMemo(() => {
    if (!analysis.selectedCareerScore) return null;
    return Math.round(
      (analysis.selectedCareerScore.logistic * ensembleWeights.logistic +
        analysis.selectedCareerScore.randomForest * ensembleWeights.randomForest +
        analysis.selectedCareerScore.gradientBoosting * ensembleWeights.gradientBoosting) *
        100
    );
  }, [analysis.selectedCareerScore, ensembleWeights]);

  const topSignalSummary = useMemo(() => {
    const signals = analysis.explainability.topCareer.factors
      .filter((factor) => factor.direction === "positive")
      .slice(0, 3)
      .map((factor) => `${factor.label} (${Math.round(factor.impactPct)}%)`);

    if (signals.length === 0) {
      return "No dominant positive signal was detected in this run.";
    }
    if (signals.length === 1) return signals[0];
    if (signals.length === 2) return `${signals[0]} and ${signals[1]}`;
    return `${signals[0]}, ${signals[1]}, and ${signals[2]}`;
  }, [analysis.explainability.topCareer.factors]);

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
              <span className="px-3 py-1 rounded-full text-xs bg-white/20 text-white/90 border border-white/30">
                Method: {analysis.explainability.selectedMethod.toUpperCase()}
              </span>
            </div>
            <p className="text-white/90 mb-2">{analysis.explainability.topCareer.narrative}</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[980px]">
                <thead>
                  <tr className="text-white/80 border-b border-white/20">
                    <th className="py-3 px-2">Signal</th>
                    <th className="py-3 px-2">Why This Recommendation</th>
                    <th className="py-3 px-2">Priority Gap</th>
                    <th className="py-3 px-2">Development Action</th>
                  </tr>
                </thead>
                <tbody>
                  {explanationRows.length === 0 ? (
                    <tr className="border-b border-white/10">
                      <td colSpan={4} className="py-4 px-2 text-white/70">
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
                          <td className="py-3 px-2 text-white/90 text-sm">{row.recommendation}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <MetricBadge title="Top Relative Fit" value="100%" large />
            <MetricBadge title="Selected Relative Fit" value={`${selectedRelativeFit}%`} large />
            <MetricBadge title="User Strength (I Have)" value={`${Math.round(analysis.summary.haveRate * 100)}%`} large />
            <MetricBadge title="Assessment Completion" value={`${Math.round(analysis.summary.completionRate * 100)}%`} large />
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

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowTechnicalResults((prev) => !prev)}
                className="px-3 py-1.5 text-xs bg-cyan-500/25 text-cyan-50 rounded-lg border border-cyan-300/40 hover:bg-cyan-500/35 transition"
              >
                {showTechnicalResults ? "Hide Technical Results" : "Technical Results"}
              </button>
            </div>

            {showTechnicalResults ? (
              <div className="mt-5 space-y-5">
                <div className="bg-white/5 rounded-xl border border-white/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h4 className="text-white font-semibold">How Your Results Were Calculated</h4>
                    <span className="px-2.5 py-1 rounded-full text-[11px] bg-white/20 text-white/90 border border-white/30">
                      Transparent Scoring
                    </span>
                  </div>
                  <p className="text-white/80 text-sm mb-3">
                    Your answers are converted into competency scores, evaluated by three models, and then combined into a final ensemble score used to rank careers.
                  </p>
                  <p className="text-white/70 text-xs mb-4">
                    Formula: Ensemble = (Logistic × {Math.round(ensembleWeights.logistic * 100)}%) + (Random Forest × {Math.round(ensembleWeights.randomForest * 100)}%) + (Gradient Boosting × {Math.round(ensembleWeights.gradientBoosting * 100)}%).
                  </p>

                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white/10 rounded-lg border border-white/20 p-3">
                      <p className="text-white/70 text-[11px] uppercase tracking-wide">Logistic Regression</p>
                      <p className="text-white font-bold text-xl mt-1">{Math.round(analysis.topCareer.logistic * 100)}%</p>
                      <p className="text-white/70 text-[11px] mt-1">Weight: {Math.round(ensembleWeights.logistic * 100)}%</p>
                      <p className="text-white/70 text-[11px] mt-2">Linear alignment between competencies and career profiles.</p>
                    </div>
                    <div className="bg-white/10 rounded-lg border border-white/20 p-3">
                      <p className="text-white/70 text-[11px] uppercase tracking-wide">Random Forest</p>
                      <p className="text-white font-bold text-xl mt-1">{Math.round(analysis.topCareer.randomForest * 100)}%</p>
                      <p className="text-white/70 text-[11px] mt-1">Weight: {Math.round(ensembleWeights.randomForest * 100)}%</p>
                      <p className="text-white/70 text-[11px] mt-2">Captures non-linear interactions across competencies.</p>
                    </div>
                    <div className="bg-white/10 rounded-lg border border-white/20 p-3">
                      <p className="text-white/70 text-[11px] uppercase tracking-wide">Gradient Boosting</p>
                      <p className="text-white font-bold text-xl mt-1">{Math.round(analysis.topCareer.gradientBoosting * 100)}%</p>
                      <p className="text-white/70 text-[11px] mt-1">Weight: {Math.round(ensembleWeights.gradientBoosting * 100)}%</p>
                      <p className="text-white/70 text-[11px] mt-2">Refines errors from earlier model learners.</p>
                    </div>
                    <div className="bg-white/10 rounded-lg border border-white/20 p-3">
                      <p className="text-white/70 text-[11px] uppercase tracking-wide">Final Ensemble</p>
                      <p className="text-white font-bold text-xl mt-1">{Math.round(analysis.topCareer.ensemble * 100)}%</p>
                      <p className="text-white/70 text-[11px] mt-1">Weighted output: {weightedTopScore}%</p>
                      <p className="text-white/70 text-[11px] mt-2">
                        {weightedSelectedScore !== null
                          ? `Selected weighted output: ${weightedSelectedScore}%.`
                          : "Selected weighted output unavailable."}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-lg border border-white/20 p-3">
                    <p className="text-white font-semibold text-sm mb-1">Explanation Layer (XAI)</p>
                    <p className="text-white/80 text-xs">
                      Method used: {analysis.explainability.selectedMethod.toUpperCase()}.
                    </p>
                    <p className="text-white/80 text-xs mt-1">Top supporting signals: {topSignalSummary}</p>
                    <p className="text-white/80 text-xs mt-1">{analysis.explainability.topCareer.narrative}</p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl border border-white/20 p-4">
                  <h4 className="text-white font-semibold mb-2">Detailed Algorithm Results</h4>
                  <p className="text-white/70 text-sm mb-3">
                    This table shows the per-model scores for the top career and selected career, plus each model's contribution weight.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[860px]">
                      <thead>
                        <tr className="text-white/80 border-b border-white/20">
                          <th className="py-3 px-2">Algorithm</th>
                          <th className="py-3 px-2">Top Career Score</th>
                          <th className="py-3 px-2">Selected Career Score</th>
                          <th className="py-3 px-2">Ensemble Weight</th>
                          <th className="py-3 px-2">How It Was Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-white/10">
                          <td className="py-3 px-2 text-white">Logistic Regression</td>
                          <td className="py-3 px-2 text-white/90">{Math.round(analysis.topCareer.logistic * 100)}%</td>
                          <td className="py-3 px-2 text-white/80">
                            {analysis.selectedCareerScore
                              ? `${Math.round(analysis.selectedCareerScore.logistic * 100)}%`
                              : "—"}
                          </td>
                          <td className="py-3 px-2 text-white/80">{Math.round(ensembleWeights.logistic * 100)}%</td>
                          <td className="py-3 px-2 text-white/70 text-sm">
                            Baseline linear model for broad competency-to-role alignment.
                          </td>
                        </tr>
                        <tr className="border-b border-white/10">
                          <td className="py-3 px-2 text-white">Random Forest</td>
                          <td className="py-3 px-2 text-white/90">{Math.round(analysis.topCareer.randomForest * 100)}%</td>
                          <td className="py-3 px-2 text-white/80">
                            {analysis.selectedCareerScore
                              ? `${Math.round(analysis.selectedCareerScore.randomForest * 100)}%`
                              : "—"}
                          </td>
                          <td className="py-3 px-2 text-white/80">{Math.round(ensembleWeights.randomForest * 100)}%</td>
                          <td className="py-3 px-2 text-white/70 text-sm">
                            Captures non-linear patterns and interactions among competencies.
                          </td>
                        </tr>
                        <tr className="border-b border-white/10">
                          <td className="py-3 px-2 text-white">Gradient Boosting</td>
                          <td className="py-3 px-2 text-white/90">{Math.round(analysis.topCareer.gradientBoosting * 100)}%</td>
                          <td className="py-3 px-2 text-white/80">
                            {analysis.selectedCareerScore
                              ? `${Math.round(analysis.selectedCareerScore.gradientBoosting * 100)}%`
                              : "—"}
                          </td>
                          <td className="py-3 px-2 text-white/80">{Math.round(ensembleWeights.gradientBoosting * 100)}%</td>
                          <td className="py-3 px-2 text-white/70 text-sm">
                            Refines predictions by correcting residual errors from prior learners.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-2 text-white font-semibold">Final Ensemble</td>
                          <td className="py-3 px-2 text-white font-semibold">{Math.round(analysis.topCareer.ensemble * 100)}%</td>
                          <td className="py-3 px-2 text-white/90 font-semibold">
                            {analysis.selectedCareerScore
                              ? `${Math.round(analysis.selectedCareerScore.ensemble * 100)}%`
                              : "—"}
                          </td>
                          <td className="py-3 px-2 text-white/80">100%</td>
                          <td className="py-3 px-2 text-white/70 text-sm">
                            Weighted combination used as the final ranking score.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl border border-white/20 p-4">
                  <h4 className="text-white font-semibold mb-3">Competency Analytics Table</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[720px]">
                      <thead>
                        <tr className="text-white/80 border-b border-white/20">
                          <th className="py-3 px-2">Competency</th>
                          <th className="py-3 px-2">Readiness</th>
                          <th className="py-3 px-2">Coverage</th>
                          <th className="py-3 px-2">Feature Score</th>
                          <th className="py-3 px-2">Answered / Tagged</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.competencyScores.map((item) => (
                          <tr key={item.key} className="border-b border-white/10">
                            <td className="py-3 px-2 text-white">{item.label}</td>
                            <td className="py-3 px-2 text-white/80">{Math.round(item.haveRate * 100)}%</td>
                            <td className="py-3 px-2 text-white/80">{Math.round(item.coverageRate * 100)}%</td>
                            <td className="py-3 px-2 text-white font-semibold">{Math.round(item.featureScore * 100)}%</td>
                            <td className="py-3 px-2 text-white/80">
                              {item.answeredCount}/{item.totalTaggedQuestions}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl border border-white/20 p-4">
                  <h4 className="text-white font-semibold mb-3">Model Feature Importance</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[760px]">
                      <thead>
                        <tr className="text-white/80 border-b border-white/20">
                          <th className="py-3 px-2">Competency</th>
                          <th className="py-3 px-2">Ensemble</th>
                          <th className="py-3 px-2">Logistic</th>
                          <th className="py-3 px-2">Random Forest</th>
                          <th className="py-3 px-2">Gradient Boosting</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.featureImportances.slice(0, 10).map((item) => (
                          <tr key={item.key} className="border-b border-white/10">
                            <td className="py-3 px-2 text-white">{item.label}</td>
                            <td className="py-3 px-2 text-white font-bold">{Math.round(item.ensemble * 100)}%</td>
                            <td className="py-3 px-2 text-white/80">{Math.round(item.logistic * 100)}%</td>
                            <td className="py-3 px-2 text-white/80">{Math.round(item.randomForest * 100)}%</td>
                            <td className="py-3 px-2 text-white/80">{Math.round(item.gradientBoosting * 100)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
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
