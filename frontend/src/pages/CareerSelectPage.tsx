import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { careerPaths, type CareerPathKey } from "../data/careerData";
import { getQuestionsForCareer, type Question } from "../data/assessmentData";
import { loadAssessment, saveAssessment, type AssessmentState } from "../state/storage";

type Zone = "center" | "have" | "haveNot";

function pct(n: number) {
  return `${Math.max(0, Math.min(100, n))}%`;
}

export default function CareerSelectPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"select" | "assessment">("select");

  const [state, setState] = useState<AssessmentState>(() => loadAssessment());
  const [pathKey, setPathKey] = useState<CareerPathKey | "">(
    (state.selectedPathKey ?? "") as CareerPathKey | ""
  );
  const [careerName, setCareerName] = useState<string>(state.selectedCareerName ?? "");

  const draggedIdRef = useRef<string | null>(null);

  const activePathKey = (pathKey || state.selectedPathKey || null) as CareerPathKey | null;
  const activeCareerName = careerName || state.selectedCareerName || null;

  const questions = useMemo(
    () => getQuestionsForCareer(activePathKey, activeCareerName),
    [activePathKey, activeCareerName]
  );

  const questionsById = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of questions) map.set(q.id, q);
    return map;
  }, [questions]);

  const centerIds = useMemo(() => {
    const decided = new Set([...state.iHave, ...state.iHaveNot]);
    return questions.map((q) => q.id).filter((id) => !decided.has(id));
  }, [questions, state.iHave, state.iHaveNot]);

  const total = questions.length;
  const answered = state.iHave.length + state.iHaveNot.length;
  const progress = total === 0 ? 0 : Math.round((answered / total) * 100);

  useEffect(() => {
    saveAssessment(state);
  }, [state]);

  useEffect(() => {
    const validIds = new Set(questions.map((q) => q.id));
    setState((prev) => {
      const nextIHave = prev.iHave.filter((id) => validIds.has(id));
      const nextIHaveNot = prev.iHaveNot.filter((id) => validIds.has(id));
      if (nextIHave.length === prev.iHave.length && nextIHaveNot.length === prev.iHaveNot.length) {
        return prev;
      }
      return { ...prev, iHave: nextIHave, iHaveNot: nextIHaveNot };
    });
  }, [questions]);

  const canStart = Boolean(pathKey && careerName);

  function startAssessment() {
    if (!pathKey || !careerName) return;
    setState(() => ({
      selectedPathKey: pathKey,
      selectedCareerName: careerName,
      iHave: [],
      iHaveNot: [],
    }));
    setMode("assessment");
  }

  function setZone(qid: string, to: Zone) {
    setState((s) => {
      const iHave = s.iHave.filter((x) => x !== qid);
      const iHaveNot = s.iHaveNot.filter((x) => x !== qid);
      if (to === "have") iHave.push(qid);
      if (to === "haveNot") iHaveNot.push(qid);
      return { ...s, iHave, iHaveNot };
    });
  }

  function onDragStart(qid: string) {
    draggedIdRef.current = qid;
  }

  function onDrop(to: Zone) {
    const qid = draggedIdRef.current;
    draggedIdRef.current = null;
    if (!qid) return;
    if (to === "center") return; // center is implicit (unanswered)
    setZone(qid, to);
  }

  function review() {
    navigate("/review-results");
  }

  const selectedPathName = activePathKey ? careerPaths[activePathKey].name : "Career Path Selected";

  return (
    <div>
      {mode === "select" ? (
        <>
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">Select Your Career Path</h2>
            <p className="text-white/80">Choose a career track and specific role to begin your assessment</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
            <div className="mb-8">
              <label className="block text-white font-bold text-xl mb-4">Select Career Path</label>
              <select
                value={pathKey}
                onChange={(e) => {
                  const v = e.target.value as CareerPathKey | "";
                  setPathKey(v);
                  setCareerName("");
                }}
                className="w-full md:w-2/3 px-6 py-4 bg-white rounded-xl text-gray-800 font-semibold text-lg focus:ring-4 focus:ring-blue-400 outline-none"
              >
                <option value="">-- Select Career Path --</option>
                <option value="business_intelligence">Business Intelligence & Strategy</option>
                <option value="data_stewardship">Data Stewardship</option>
                <option value="data_engineering">Data Engineering</option>
                <option value="data_science">Data Science</option>
                <option value="ai_engineering">AI Engineering</option>
                <option value="applied_research">Applied Research</option>
              </select>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-white font-bold text-xl">Select Career</label>
                <span className="flex items-center text-white/80 text-sm">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Sorted by Level
                </span>
              </div>

              <select
                value={careerName}
                onChange={(e) => setCareerName(e.target.value)}
                disabled={!pathKey}
                className="w-full md:w-2/3 px-6 py-4 bg-white rounded-xl text-gray-800 font-semibold text-lg focus:ring-4 focus:ring-blue-400 outline-none disabled:opacity-70"
              >
                {!pathKey ? (
                  <option value="">-- First select a career path --</option>
                ) : (
                  <>
                    <option value="">-- Select Career --</option>
                    {careerPaths[pathKey].careers.map((c) => (
                      <option key={c.name} value={c.name}>
                        {`Level ${c.level}: ${c.name}`}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={startAssessment}
                disabled={!canStart}
                className="px-12 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Self-Assessment
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-bold text-white mb-2">Self Assessment</h2>
                <p className="text-white/80">Drag questions to "I Have" or "I Have Not" based on your skills</p>
              </div>
              <button
                type="button"
                onClick={review}
                className="px-6 py-3 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition border-2 border-white/50"
              >
                Review →
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
            <div className="mb-6 p-4 bg-blue-500/30 rounded-xl">
              <p className="text-white/80 text-sm mb-1">Selected Career Path</p>
              <p className="text-white font-bold text-xl">{selectedPathName}</p>
              <p className="text-white/80 text-sm mb-1 mt-2">Selected Career</p>
              <p className="text-white font-bold text-lg">{careerName || "Career Path"}</p>
            </div>

            <div className="mb-8 p-6 bg-white/10 rounded-xl border-2 border-white/20">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-white mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-white font-bold text-lg mb-2">Instructions</h3>
                  <p className="text-white/90 text-sm">
                    Drag cards into either side, or use the buttons on each question. Progress updates automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <DropZone
                title="I Have"
                variant="green"
                onDrop={() => onDrop("have")}
              >
                {state.iHave.filter((qid) => questionsById.has(qid)).map((qid) => (
                  <QuestionCard
                    key={qid}
                    qid={qid}
                    q={questionsById.get(qid)!}
                    onDragStart={onDragStart}
                    onHave={() => setZone(qid, "have")}
                    onHaveNot={() => setZone(qid, "haveNot")}
                  />
                ))}
              </DropZone>

              <div className="bg-white/20 rounded-2xl p-6 border-2 border-white/30">
                <h3 className="text-white font-bold text-xl text-center mb-4">Assessment Questions</h3>

                <div className="mb-6">
                  <div className="flex justify-between text-white/80 text-sm mb-2">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: pct(progress) }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {centerIds.map((qid, idx) => (
                    <QuestionCard
                      key={qid}
                      qid={qid}
                      q={questionsById.get(qid)!}
                      number={idx + 1}
                      onDragStart={onDragStart}
                      onHave={() => setZone(qid, "have")}
                      onHaveNot={() => setZone(qid, "haveNot")}
                    />
                  ))}
                </div>
              </div>

              <DropZone
                title="I Have Not"
                variant="red"
                onDrop={() => onDrop("haveNot")}
              >
                {state.iHaveNot.filter((qid) => questionsById.has(qid)).map((qid) => (
                  <QuestionCard
                    key={qid}
                    qid={qid}
                    q={questionsById.get(qid)!}
                    onDragStart={onDragStart}
                    onHave={() => setZone(qid, "have")}
                    onHaveNot={() => setZone(qid, "haveNot")}
                  />
                ))}
              </DropZone>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={review}
                className="px-8 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition border-2 border-white/50"
              >
                Review →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DropZone(props: {
  title: string;
  variant: "green" | "red";
  children: React.ReactNode;
  onDrop: () => void;
}) {
  const base =
    props.variant === "green"
      ? "bg-gradient-to-br from-green-500/30 to-green-600/30 border-green-400/50"
      : "bg-gradient-to-br from-red-500/30 to-red-600/30 border-red-400/50";

  const icon =
    props.variant === "green" ? (
      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );

  return (
    <div
      className={`${base} rounded-2xl p-6 border-2`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        props.onDrop();
      }}
    >
      <div className="flex items-center justify-center mb-4">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">{icon}</div>
      </div>
      <h3 className="text-white font-bold text-2xl text-center mb-4">{props.title}</h3>
      <div className="bg-white/10 rounded-xl p-4 min-h-[300px] border-2 border-dashed border-white/30 space-y-3">
        {props.children}
      </div>
    </div>
  );
}

function QuestionCard(props: {
  qid: string;
  q: { id: string; text: string };
  number?: number;
  onDragStart: (qid: string) => void;
  onHave: () => void;
  onHaveNot: () => void;
}) {
  return (
    <div
      className="draggable bg-white rounded-lg p-4 shadow-lg"
      draggable
      onDragStart={() => props.onDragStart(props.qid)}
    >
      <p className="text-gray-800 font-medium text-sm">
        <span className="font-bold text-blue-600">
          {props.number ? `Question ${props.number}:` : "Question:"}
        </span>
        <br />
        {props.q.text}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={props.onHave}
          className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600"
        >
          ← I Have
        </button>
        <button
          type="button"
          onClick={props.onHaveNot}
          className="flex-1 px-3 py-2 bg-red-500 text-white rounded text-xs font-semibold hover:bg-red-600"
        >
          I Have not →
        </button>
      </div>
    </div>
  );
}
