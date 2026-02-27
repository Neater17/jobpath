import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { tracks, levelOrder } from "../data/careerData";
import { fetchCareers, Career } from "../services/api";
import { useCareerStore } from "../store/careerStore";

export default function CareerSelectPage() {
    const navigate = useNavigate();
    const { setSelectedCareerPath, setSelectedCareerId } = useCareerStore();
    const [careerPath, setCareerPath] = useState("");
    const [career, setCareer] = useState("");
    const [sortByLevel, setSortByLevel] = useState(true);
    const [allCareers, setAllCareers] = useState<Career[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCareers() {
            try {
                const data = await fetchCareers();
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
                    <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                        Select Your Career Path
                    </h2>
                    <p className="text-white/80 mt-1">
                        Choose a career track and specific role to begin your assessment
                    </p>
                </div>
                <Link
                    to="/"
                    className="self-start inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white/90 shadow-md transition hover:bg-white/25 hover:text-white"
                >
                    <span className="text-lg">←</span>
                    Back to Home
                </Link>
            </div>

            <div className="bg-white/5 rounded-3xl p-6 sm:p-8">
                <div className="bg-blue-500/30 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
                <div className="mb-6">
                    <label className="block text-white font-semibold mb-3">
                        Select Career Path
                    </label>
                    <select
                        value={careerPath}
                        onChange={(e) => {
                            const newPath = e.target.value;
                            setCareerPath(newPath);
                            setCareer(""); // Reset career selection when path changes
                        }}
                        className="w-full bg-white text-gray-800 rounded-lg px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                        <label className="block text-white font-semibold">
                            Select Career
                        </label>
                        <button
                            onClick={() => setSortByLevel(!sortByLevel)}
                            className="text-white/70 text-sm hover:text-white flex items-center gap-1"
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
                        className="w-full bg-white text-gray-800 rounded-lg px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                                navigate('/careers/skills-assessment');
                            }
                        }}
                        disabled={!careerPath || !career}
                        className="block text-center w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-blue-600"
                    >
                        Start Self-Assessment
                    </button>
                </div>
            </div>
        </div>
        </>
    );
}