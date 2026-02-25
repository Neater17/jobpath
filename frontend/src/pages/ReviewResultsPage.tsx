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
        competencies: question.competencies,
      })),
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

  const selectedMatchScore = useMemo(() => {
    if (analysis.selectedCareerScore) {
      return Math.round(analysis.selectedCareerScore.ensemble * 100);
    }
    return Math.round((state.iHave.length / (questions.length || 1)) * 100);
  }, [analysis.selectedCareerScore, questions.length, state.iHave.length]);

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
              <p className="text-white/80 text-sm mb-1">Selected Career Path</p>
              <p className="text-white font-bold text-2xl">{selectedPathName}</p>
              <p className="text-white/80 text-sm mb-1 mt-3">Selected Career</p>
              <p className="text-white font-bold text-xl">{selectedCareerName}</p>
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
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-white font-bold text-3xl mb-4">Best Career Recommendation</h3>
                <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-bold text-2xl">{analysis.topCareer.careerName}</p>
                      <p className="text-white/80">{analysis.topCareer.pathName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-white">{Math.round(analysis.topCareer.ensemble * 100)}%</p>
                      <p className="text-white/80 text-sm">Ensemble Match</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <ScoreBar label="Logistic Regression" value={analysis.topCareer.logistic} />
                    <ScoreBar label="Random Forest" value={analysis.topCareer.randomForest} />
                    <ScoreBar label="Gradient Boosting" value={analysis.topCareer.gradientBoosting} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white font-bold text-3xl mb-4">Selected Career Performance</h3>
                <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-bold text-2xl">{selectedCareerName}</p>
                      <p className="text-white/80">{selectedPathName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-white">{selectedMatchScore}%</p>
                      <p className="text-white/80 text-sm">Selected Match</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <MetricBadge
                      title="Confidence"
                      value={`${Math.round(analysis.summary.confidence * 100)}%`}
                    />
                    <MetricBadge
                      title="Rank"
                      value={analysis.selectedCareerRank ? `#${analysis.selectedCareerRank}` : "—"}
                    />
                    <MetricBadge
                      title="Completion"
                      value={`${Math.round(analysis.summary.completionRate * 100)}%`}
                    />
                    <MetricBadge
                      title="Answered"
                      value={`${analysis.summary.answeredCount}/${analysis.summary.totalQuestions}`}
                    />
                  </div>

                  <div className="mt-6">
                    <p className="text-white/80 text-sm mb-2">Top Alternatives</p>
                    <div className="space-y-2">
                      {analysis.alternativeCareers.map((career) => (
                        <div
                          key={`${career.pathKey}-${career.careerName}`}
                          className="bg-white/10 rounded-lg px-3 py-2 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-white text-sm font-semibold">{career.careerName}</p>
                            <p className="text-white/70 text-xs">{career.pathName}</p>
                          </div>
                          <span className="text-white font-bold">{Math.round(career.ensemble * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <MetricBadge title="Best Fit Score" value={`${Math.round(analysis.topCareer.ensemble * 100)}%`} large />
            <MetricBadge title="User Strength (I Have)" value={`${Math.round(analysis.summary.haveRate * 100)}%`} large />
            <MetricBadge title="Assessment Completion" value={`${Math.round(analysis.summary.completionRate * 100)}%`} large />
            <MetricBadge title="Model Confidence" value={`${Math.round(analysis.summary.confidence * 100)}%`} large />
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
            <h3 className="text-white font-bold text-2xl mb-4">Career Ranking Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="text-white/80 border-b border-white/20">
                    <th className="py-3 px-2">Rank</th>
                    <th className="py-3 px-2">Career</th>
                    <th className="py-3 px-2">Path</th>
                    <th className="py-3 px-2">Ensemble</th>
                    <th className="py-3 px-2">Logistic</th>
                    <th className="py-3 px-2">Random Forest</th>
                    <th className="py-3 px-2">Gradient Boosting</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.allCareerScores.slice(0, 8).map((score, idx) => (
                    <tr
                      key={`${score.pathKey}-${score.careerName}`}
                      className={`border-b border-white/10 ${
                        idx === 0 ? "bg-green-500/10" : "bg-white/0"
                      }`}
                    >
                      <td className="py-3 px-2 text-white font-semibold">#{idx + 1}</td>
                      <td className="py-3 px-2 text-white">{score.careerName}</td>
                      <td className="py-3 px-2 text-white/80">{score.pathName}</td>
                      <td className="py-3 px-2 text-white font-bold">{Math.round(score.ensemble * 100)}%</td>
                      <td className="py-3 px-2 text-white/80">{Math.round(score.logistic * 100)}%</td>
                      <td className="py-3 px-2 text-white/80">{Math.round(score.randomForest * 100)}%</td>
                      <td className="py-3 px-2 text-white/80">{Math.round(score.gradientBoosting * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
              <h3 className="text-white font-bold text-2xl mb-5">Career Path Fit</h3>
              <div className="space-y-4">
                {analysis.pathScores.map((path) => (
                  <div key={path.pathKey}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-semibold">{path.pathName}</p>
                      <p className="text-white text-sm">{Math.round(path.score * 100)}%</p>
                    </div>
                    <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full"
                        style={{ width: `${Math.round(path.score * 100)}%` }}
                      />
                    </div>
                    <p className="text-white/70 text-xs mt-1">Top role in path: {path.bestCareer}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
              <h3 className="text-white font-bold text-2xl mb-5">Priority Development Gaps</h3>
              {analysis.priorityGaps.length === 0 ? (
                <div className="bg-emerald-500/20 border border-emerald-300/30 rounded-xl p-4">
                  <p className="text-emerald-50 font-semibold">No high-priority gaps detected.</p>
                  <p className="text-emerald-100/90 text-sm mt-1">
                    Your responses indicate strong alignment for the recommended role.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analysis.priorityGaps.map((gap) => (
                    <div key={gap.key} className="bg-white/10 rounded-xl p-4 border border-white/20">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-white font-semibold">{gap.label}</p>
                        <p className="text-white font-bold">{Math.round(gap.gapScore * 100)}%</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <p className="text-white/70">Current readiness: {Math.round(gap.currentReadiness * 100)}%</p>
                        <p className="text-white/70 text-right">Importance: {Math.round(gap.importance * 100)}%</p>
                      </div>
                      <p className="text-white/80 text-sm">{gap.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
            <h3 className="text-white font-bold text-2xl mb-5">Competency Analytics Table</h3>
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

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
            <h3 className="text-white font-bold text-2xl mb-5">Model Feature Importance</h3>
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

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowResults(false)}
              className="px-8 py-4 bg-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/30 transition border-2 border-white/50 mr-4"
            >
              Review Answers
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

function ScoreBar(props: { label: string; value: number }) {
  const percent = Math.round(props.value * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-white/80">{props.label}</span>
        <span className="text-white font-semibold">{percent}%</span>
      </div>
      <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full rounded-full" style={{ width: `${percent}%` }} />
      </div>
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
  onMove: (id: string) => void;
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

      <div className="space-y-3">
        {props.items.length === 0 ? (
          <div className="bg-white/10 rounded-lg p-4 text-white/80 text-sm">No items yet.</div>
        ) : (
          props.items.map((id) => (
            <div key={id} className="bg-white rounded-lg p-4 shadow">
              <p className="text-gray-800 font-medium text-sm">{props.getText(id)}</p>
              <button
                type="button"
                onClick={() => props.onMove(id)}
                className="mt-2 px-4 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Move
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
