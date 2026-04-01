import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCareerStore } from "../store/careerStore";
import { fetchCareerById, Career } from "../services/api";
import { Question } from "../data/assessmentData";

export default function ReviewAssessmentPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [careerData, setCareerData] = useState<Career | null>(null);
    const [iHaveList, setIHaveList] = useState<Question[]>([]);
    const [iHaveNotList, setIHaveNotList] = useState<Question[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [draggedFrom, setDraggedFrom] = useState<"have" | "haveNot" | null>(null);
    const { selectedCareerPath, selectedCareerId, assessmentResults, setAssessmentResults } = useCareerStore();

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
        setIHaveList(assessmentResults.iHave);
        setIHaveNotList(assessmentResults.iHaveNot);
    }, [assessmentResults]);

    const handleDragStart = (qid: string, from: "have" | "haveNot") => {
        setDraggedId(qid);
        setDraggedFrom(from);
    };

    const handleDrop = (target: "have" | "haveNot") => {
        if (!draggedId || !draggedFrom) return;

        if (draggedFrom === target) {
            setDraggedId(null);
            setDraggedFrom(null);
            return;
        }

        if (draggedFrom === "have") {
            const question = iHaveList.find((q) => q.id === draggedId);
            if (!question) return;
            const updatedIHave = iHaveList.filter((q) => q.id !== draggedId);
            const updatedIHaveNot = [...iHaveNotList, question];
            setIHaveList(updatedIHave);
            setIHaveNotList(updatedIHaveNot);
            setAssessmentResults(updatedIHave, updatedIHaveNot);
        } else {
            const question = iHaveNotList.find((q) => q.id === draggedId);
            if (!question) return;
            const updatedIHaveNot = iHaveNotList.filter((q) => q.id !== draggedId);
            const updatedIHave = [...iHaveList, question];
            setIHaveList(updatedIHave);
            setIHaveNotList(updatedIHaveNot);
            setAssessmentResults(updatedIHave, updatedIHaveNot);
        }

        setDraggedId(null);
        setDraggedFrom(null);
    };

    return (
        <>
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                        Review Skills Assessment
                    </h2>
                    <p className="text-white/80 mt-1">
                        Review the skills you have or return to assessment to change.
                    </p>
                </div>
            </div>

            <div className="bg-white/5 rounded-3xl p-6 sm:p-8 mb-6">
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Column - Career Info */}
                    <div>
                        <div className="mb-4">
                            <p className="text-white/80 text-sm mb-1">Selected Career Path</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-white">
                                {loading ? "Loading..." : selectedCareerPath || "No career path selected"}
                            </h3>
                        </div>
                        <div className="mb-4">
                            <p className="text-white/80 text-sm mb-1">Selected Career</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-white">
                                {loading ? "Loading..." : careerData?.careerTitle || "No career selected"}
                            </h3>
                        </div>
                    </div>

                    {/* Right Column - Tip */}
                    <div className="bg-blue-400/30 border-2 border-blue-300/50 rounded-2xl p-4 flex items-start">
                        <div className="flex items-start gap-3 w-full">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-sm">i</span>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">Tip</h3>
                                <p className="text-white/90 text-sm">
                                    You can drag and drop the questions to update your assessment. Changes are saved automatically.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            
            {/* Action Buttons Grid */}
            <div className="grid md:grid-cols-4 gap-6">
                <div></div>
                <button
                    onClick={() => navigate("/careers/skills-assessment")}
                    className="px-8 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition border-2 border-white/50"
                >
                    ← Back to Assessment
                </button>
                <button
                    onClick={() => navigate("/review-results")}
                    className="px-8 py-3 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-blue-700 transition"
                >
                    Submit Skill Assessment →
                </button>
                <div></div>
            </div>

            {/* Two Column Layout */}
            <div className="mt-6 grid md:grid-cols-2 gap-6 mb-6">
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
                    <div className="space-y-3">
                        {iHaveList.length > 0 ? (
                            iHaveList.map((question) => (
                                <div
                                    key={question.id}
                                    className="bg-white/20 rounded-lg p-4 text-white text-sm border-l-4 border-green-400 cursor-move hover:bg-white/30 transition"
                                    draggable
                                    onDragStart={() => handleDragStart(question.id, "have")}
                                >
                                    <p className="font-medium">{question.text}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-white/60 text-center py-4">No skills marked as "I Have"</p>
                        )}
                    </div>
                    <p className="text-white/80 text-sm mt-4 text-center font-semibold">
                        {iHaveList.length} skill{iHaveList.length !== 1 ? 's' : ''}
                    </p>
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
                    <div className="space-y-3">
                        {iHaveNotList.length > 0 ? (
                            iHaveNotList.map((question) => (
                                <div
                                    key={question.id}
                                    className="bg-white/20 rounded-lg p-4 text-white text-sm border-l-4 border-red-400 cursor-move hover:bg-white/30 transition"
                                    draggable
                                    onDragStart={() => handleDragStart(question.id, "haveNot")}
                                >
                                    <p className="font-medium">{question.text}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-white/60 text-center py-4">No skills marked as "I Have Not"</p>
                        )}
                    </div>
                    <p className="text-white/80 text-sm mt-4 text-center font-semibold">
                        {iHaveNotList.length} skill{iHaveNotList.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

        </>
    );
}
