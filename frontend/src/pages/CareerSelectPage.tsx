import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { tracks, levelOrder } from "../data/careerData";
import { fetchCareerSummaries, type CareerSummary } from "../services/api";
import { useCareerStore } from "../store/careerStore";

export default function CareerSelectPage() {
    const navigate = useNavigate();
    const { setSelectedCareerPath, setSelectedCareerId, clearAssessmentResults } = useCareerStore();
    const [careerPath, setCareerPath] = useState("");
    const [career, setCareer] = useState("");
    const [sortByLevel, setSortByLevel] = useState(true);
    const [allCareers, setAllCareers] = useState<CareerSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCareers() {
            try {
                const data = await fetchCareerSummaries();
                setAllCareers(data);
            } catch (error) {
                console.error("Failed to fetch careers:", error);
            } finally {
                setLoading(false);
            }
        }
        loadCareers();
    }, []);

    // Filter careers based on selected career path
    const filteredCareers = careerPath
        ? allCareers.filter((c) => {
              if (Array.isArray(c.careerPath)) {
                  return c.careerPath.includes(careerPath);
              }
              return c.careerPath === careerPath;
          })
        : [];

    // Sort careers by level if needed
    const sortedCareers = sortByLevel
        ? [...filteredCareers].sort((a, b) => {
              const levelA = levelOrder[a.careerLevel] || 0;
              const levelB = levelOrder[b.careerLevel] || 0;
              return levelA - levelB; // Lower level numbers first (Associate = 1 up to C-Level = 9)
          })
        : filteredCareers;

    return (
        <>
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-light-text">
                        Select Your Career Path
                    </h2>
                    <p className="text-light-text/80 mt-1">
                        Choose a career track and specific role to begin your assessment
                    </p>
                </div>
                <Link
                    to="/"
                    className="back-button"
                >
                    <span className="text-lg">
                        <svg className= "w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
                    </span>
                    Back to Home
                </Link>
            </div>

            <div className="rounded-3xl border border-light-text/10 bg-navy-bg/35 p-6 sm:p-8">
                <div className="rounded-3xl border border-light-text/10 bg-card-bg/35 p-8 shadow-2xl backdrop-blur-lg">
                <div className="mb-6">
                    <label className="block text-light-text font-semibold mb-3">
                        Select Career Path
                    </label>
                    <select
                        value={careerPath}
                        onChange={(e) => {
                            const newPath = e.target.value;
                            setCareerPath(newPath);
                            setCareer(""); // Reset career selection when path changes
                        }}
                        className="w-full rounded-lg bg-light-text/95 px-4 py-3 font-medium text-deep-bg focus:outline-none focus:ring-2 focus:ring-light-accent-blue"
                        style={{ color: careerPath === "" ? "#9CA3AF" : "#1F2937" }}
                        disabled={loading}
                    >
                        <option value="" disabled className="text-gray-400">
                            {loading ? "Loading..." : "--Select a career path--"}
                        </option>
                        {tracks.map((track) => (
                            <option key={track} value={track} style={{ color: "#1F2937" }}>
                                {track}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-light-text font-semibold">
                            Select Career
                        </label>
                        <button
                            onClick={() => setSortByLevel(!sortByLevel)}
                            className="flex items-center gap-1 text-sm text-soft-lavender-blue transition hover:text-light-text"
                        >
                            ◉ Sorted by Level
                        </button>
                    </div>
                    <select
                        value={career}
                        onChange={(e) => {
                            const newCareer = e.target.value;
                            setCareer(newCareer);
                        }}
                        className="w-full rounded-lg bg-light-text/95 px-4 py-3 font-medium text-deep-bg focus:outline-none focus:ring-2 focus:ring-light-accent-blue"
                        style={{ color: career === "" ? "#9CA3AF" : "#1F2937" }}
                        disabled={!careerPath || loading}
                    >
                        <option value="" disabled className="text-gray-400">
                            {!careerPath 
                                ? "--Select a career path first--" 
                                : sortedCareers.length === 0 
                                ? "No careers available" 
                                : "--Select a career--"}
                        </option>
                        {sortedCareers.map((c) => (
                            <option key={c.careerId} value={c.careerId} style={{ color: "#1F2937" }}>
                                {c.careerTitle}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-center">
                    <button 
                        onClick={() => {
                            if (careerPath && career) {
                                // Save to store only when button is clicked
                                setSelectedCareerPath(careerPath);
                                setSelectedCareerId(career);
                                clearAssessmentResults();
                                navigate('/careers/skills-assessment');
                            }
                        }}
                        disabled={!careerPath || !career}
                        className="block w-full border border-slate-500 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#3b82f6] px-6 py-3 text-center font-semibold text-light-text shadow-lg transition hover:from-accent-blue hover:to-primary-blue disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-accent-blue disabled:hover:to-accent-blue"
                    >
                        Start Self-Assessment
                    </button>
                </div>
            </div>
        </div>
        </>
    );
}

