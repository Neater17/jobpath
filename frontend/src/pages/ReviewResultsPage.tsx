import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { careerPaths } from "../data/careerData";
import { defaultQuestions } from "../data/assessmentData";
import { clearAssessment, loadAssessment, saveAssessment, type AssessmentState } from "../state/storage";

export default function ReviewResultsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<AssessmentState>(() => loadAssessment());
  const [showResults, setShowResults] = useState<boolean>(true);

  const qText = useMemo(() => {
    const m = new Map<string, string>();
    defaultQuestions.forEach((q) => m.set(q.id, q.text));
    return m;
  }, []);

  const selectedPathName = state.selectedPathKey ? careerPaths[state.selectedPathKey].name : "—";
  const selectedCareerName = state.selectedCareerName ?? "—";

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

  const matchScore = useMemo(() => {
    const total = defaultQuestions.length || 1;
    const have = state.iHave.length;
    return Math.round((have / total) * 100);
  }, [state.iHave.length]);

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
                items={state.iHave}
                getText={(id) => qText.get(id) ?? ""}
                onMove={toggleMove}
              />
              <ReviewColumn
                title="I Have Not"
                variant="red"
                items={state.iHaveNot}
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
            <p className="text-white/80">Comprehensive analysis of your skills and career fit</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
            <div className="text-center mb-8">
              <h3 className="text-white font-bold text-3xl mb-4">Selected Career Match</h3>
              <div className="inline-block bg-gradient-to-br from-blue-400 to-blue-600 rounded-full p-8 shadow-2xl">
                <div className="text-white">
                  <p className="text-6xl font-bold">{matchScore}%</p>
                  <p className="text-xl font-semibold mt-2">Match Score</p>
                </div>
              </div>
              <p className="text-white font-bold text-2xl mt-4">{selectedCareerName}</p>
              <p className="text-white/80">{selectedPathName}</p>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowResults(false)}
                  className="px-6 py-3 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition border-2 border-white/50"
                >
                  Review Answers
                </button>
              </div>
            </div>
          </div>

          <div className="text-center">
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
