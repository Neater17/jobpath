import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCareerStore } from "../store/careerStore";
import { fetchCareerById, Career } from "../services/api";
// import { api } from "../services/api";
import { defaultQuestions, Question } from "../data/assessmentData";

export default function SkillAssessmentPage() {
    const navigate = useNavigate();
    const { selectedCareerPath, selectedCareerId, setAssessmentResults, assessmentResults, clearAssessmentResults } = useCareerStore();
    const [careerData, setCareerData] = useState<Career | null>(null);
    const [loading, setLoading] = useState(true);
    const [iHaveList, setIHaveList] = useState<Question[]>([]);
    const [iHaveNotList, setIHaveNotList] = useState<Question[]>([]);
    const [remainingQuestions, setRemainingQuestions] = useState<Question[]>(defaultQuestions);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [draggedFrom, setDraggedFrom] = useState<"center" | "have" | "haveNot" | null>(null);
    // const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function loadCareerData() {
            if (selectedCareerId) {
                try {
                    const data = await fetchCareerById(selectedCareerId);
                    setCareerData(data);
                } catch (error) {
                    console.error("Failed to fetch career data:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }
        loadCareerData();
    }, [selectedCareerId]);

    useEffect(() => {
        if (assessmentResults.iHave.length > 0 || assessmentResults.iHaveNot.length > 0) {
            setIHaveList(assessmentResults.iHave);
            setIHaveNotList(assessmentResults.iHaveNot);
            const placedIds = new Set([
                ...assessmentResults.iHave.map((q) => q.id),
                ...assessmentResults.iHaveNot.map((q) => q.id),
            ]);
            setRemainingQuestions(defaultQuestions.filter((q) => !placedIds.has(q.id)));
        }
    }, [assessmentResults]);

    useEffect(() => {
        clearAssessmentResults();
    }, [selectedCareerId]);

    const handleIHave = (question: Question) => {
        setIHaveList([...iHaveList, question]);
        setRemainingQuestions(remainingQuestions.filter(q => q.id !== question.id));
    };

    const handleIHaveNot = (question: Question) => {
        setIHaveNotList([...iHaveNotList, question]);
        setRemainingQuestions(remainingQuestions.filter(q => q.id !== question.id));
    };

    const handleDragStart = (qid: string, from: "center" | "have" | "haveNot") => {
        setDraggedId(qid);
        setDraggedFrom(from);
    };

    const handleDrop = (target: "have" | "haveNot") => {
        if (!draggedId) return;
        const question = remainingQuestions.find((q) => q.id === draggedId);
        if (!question) {
            setDraggedId(null);
            setDraggedFrom(null);
            return;
        }
        if (target === "have") {
            setIHaveList([...iHaveList, question]);
        } else {
            setIHaveNotList([...iHaveNotList, question]);
        }
        setRemainingQuestions(remainingQuestions.filter((q) => q.id !== draggedId));
        setDraggedId(null);
        setDraggedFrom(null);
    };

    const handleDropToCenter = () => {
        if (!draggedId || !draggedFrom || draggedFrom === "center") return;
        if (draggedFrom === "have") {
            const question = iHaveList.find((q) => q.id === draggedId);
            if (!question) return;
            setIHaveList(iHaveList.filter((q) => q.id !== draggedId));
            setRemainingQuestions([...remainingQuestions, question]);
        }
        if (draggedFrom === "haveNot") {
            const question = iHaveNotList.find((q) => q.id === draggedId);
            if (!question) return;
            setIHaveNotList(iHaveNotList.filter((q) => q.id !== draggedId));
            setRemainingQuestions([...remainingQuestions, question]);
        }
        setDraggedId(null);
        setDraggedFrom(null);
    };

    const moveHaveToHaveNot = (question: Question) => {
        setIHaveList(iHaveList.filter((q) => q.id !== question.id));
        setIHaveNotList([...iHaveNotList, question]);
    };

    const moveHaveNotToHave = (question: Question) => {
        setIHaveNotList(iHaveNotList.filter((q) => q.id !== question.id));
        setIHaveList([...iHaveList, question]);
    };

    const handleGoBack = () => {
        if (iHaveList.length > 0 || iHaveNotList.length > 0) {
            const confirmed = window.confirm(
                "You have unsaved changes. Are you sure you want to go back? Your changes will not be saved."
            );
            if (!confirmed) return;
        }
        clearAssessmentResults();
        navigate("/career-select");
    };

    /*
    const submitSkillAssessmentToPythonApi = async () => {
        const payload = {
            selectedCareerId,
            selectedCareerPath,
            iHave: iHaveList.map((question) => ({
                id: question.id,
                text: question.text,
            })),
            iHaveNot: iHaveNotList.map((question) => ({
                id: question.id,
                text: question.text,
            })),
            submittedAt: new Date().toISOString(),
        };

        // Placeholder endpoint for Python backend integration.
        await api.post("/api/python/skill-assessment", payload);
    };

    const handleReview = async () => {
        if (remainingQuestions.length > 0 || submitting) return;

        setSubmitting(true);
        try {
            await submitSkillAssessmentToPythonApi();
        } catch (error) {
            console.warn("Python API placeholder is not available yet:", error);
        } finally {
            setAssessmentResults(iHaveList, iHaveNotList);
            setSubmitting(false);
            navigate("/careers/review-assessment");
        }
    };
    */

    const progress = ((iHaveList.length + iHaveNotList.length) / defaultQuestions.length) * 100;
    return (
        <>
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                        Skills Assessment
                    </h2>
                    <p className="text-white/80 mt-1">
                        Drag questions to "I have" or "I have not" based on your current skills. 
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleGoBack}
                    className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white/90 shadow-md transition hover:bg-white/25 hover:text-white flex-shrink-0"
                >
                    <span className="text-lg">←</span>
                    Back
                </button>
            </div>
        
            <div className="bg-white/5 rounded-3xl p-6 sm:p-8 mb-6">
                <div className="mb-4">
                    <p className="text-white/80 text-sm mb-1">Selected Career Path</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                        {loading ? "Loading..." : selectedCareerPath || "No career path selected"}
                    </h3>
                </div>
                <div>
                    <p className="text-white/80 text-sm mb-1">Selected Career</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                        {loading ? "Loading..." : careerData?.careerTitle || "No career selected"}
                    </h3>
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-400/30 border-2 border-blue-300/50 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">i</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold mb-1">Instructions</h3>
                        <p className="text-white/90 text-sm">
                            Drag cards into either side, or use the buttons on each question. Progress updates automatically.
                        </p>
                    </div>
                </div>
            </div>

            {/* Three Column Layout */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
                {/* Left Column - I Have */}
                <div
                    className="bg-gradient-to-br from-green-500/30 to-green-600/30 rounded-2xl p-6 border-2 border-green-400/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        handleDrop("have");
                    }}
                >
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <h3 className="text-white font-bold text-2xl text-center mb-4">I Have</h3>
                    <div className="bg-white/10 rounded-xl p-4 min-h-[300px] border-2 border-dashed border-white/30 space-y-3">
                        {iHaveList.map((question) => (
                            <div
                                key={question.id}
                                className="bg-white/20 rounded-lg p-3 text-white text-sm"
                                draggable
                                onDragStart={() => handleDragStart(question.id, "have")}
                            >
                                <p className="mb-2">{question.text}</p>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => moveHaveToHaveNot(question)}
                                        className="w-1/3 px-3 py-2 bg-red-500 text-white rounded text-[10px] font-semibold hover:bg-red-600"
                                    >
                                        I Have Not →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Middle Column - Assessment Questions */}
                <div
                    className="bg-white/20 rounded-2xl p-6 border-2 border-white/30 flex flex-col"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        handleDropToCenter();
                    }}
                >
                    <h3 className="text-white font-bold text-xl text-center mb-4">Assessment Questions</h3>
                    
                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between text-white/80 text-sm mb-2">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Review Button */}
                    <div className="mb-6 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setAssessmentResults(iHaveList, iHaveNotList);
                                navigate("/careers/review-assessment");
                            }}
                            disabled={remainingQuestions.length > 0}
                            className={`px-8 py-3 rounded-xl font-semibold transition border-2 w-full ${
                                remainingQuestions.length > 0
                                    ? "bg-white/10 text-white/50 border-white/30 cursor-not-allowed"
                                    : "bg-white/20 text-white border-white/50 hover:bg-white/30"
                            }`}
                        >
                            Review →
                        </button>
                    </div>

                    {/* Questions List */}
                    <div className="flex-1 overflow-y-auto pr-2">
                        {remainingQuestions.length > 0 ? (
                            <div
                                key={remainingQuestions[0].id}
                                className="bg-white rounded-lg p-6 shadow-lg h-[400px] flex flex-col justify-between"
                                draggable
                                onDragStart={() => handleDragStart(remainingQuestions[0].id, "center")}
                            >
                                <p className="text-gray-800 font-medium text-base">
                                    <span className="font-bold text-blue-600">Question:</span>
                                    <br />
                                    {remainingQuestions[0].text}
                                </p>
                                <div>
                                    <p className="text-gray-500 text-sm mb-4 text-center">
                                        {iHaveList.length + iHaveNotList.length + 1} of {defaultQuestions.length}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleIHave(remainingQuestions[0])}
                                            className="flex-1 px-3 py-3 bg-green-500 text-white rounded text-sm font-semibold hover:bg-green-600"
                                        >
                                            ← I Have
                                        </button>
                                        <button
                                            onClick={() => handleIHaveNot(remainingQuestions[0])}
                                            className="flex-1 px-3 py-3 bg-red-500 text-white rounded text-sm font-semibold hover:bg-red-600"
                                        >
                                            I Have not →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-white/70 py-8">
                                <p className="text-xl font-semibold mb-2">All questions answered!</p>
                                <p className="text-sm">You have completed the assessment.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - I Have Not */}
                <div
                    className="bg-gradient-to-br from-red-500/30 to-red-600/30 rounded-2xl p-6 border-2 border-red-400/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        handleDrop("haveNot");
                    }}
                >
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    </div>
                    <h3 className="text-white font-bold text-2xl text-center mb-4">I Have Not</h3>
                    <div className="bg-white/10 rounded-xl p-4 min-h-[300px] border-2 border-dashed border-white/30 space-y-3">
                        {iHaveNotList.map((question) => (
                            <div
                                key={question.id}
                                className="bg-white/20 rounded-lg p-3 text-white text-sm"
                                draggable
                                onDragStart={() => handleDragStart(question.id, "haveNot")}
                            >
                                <p className="mb-2">{question.text}</p>
                                <div className="flex justify-start">
                                    <button
                                        type="button"
                                        onClick={() => moveHaveNotToHave(question)}
                                        className="w-1/3 px-3 py-2 bg-green-500 text-white rounded text-[10px] font-semibold hover:bg-green-600"
                                    >
                                        ← I Have
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </>
    );
}
