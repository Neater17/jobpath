import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { levels, tracks } from "../data/careerData";
import { fetchCareers, type Career } from "../services/api";
import { useCareerStore } from "../store/careerStore";

export default function CareersList() {
    const trackOptions = useMemo(() => [...tracks], []);
    
    const activeTrack = useCareerStore((state) => state.activeTrack);
    const setActiveTrack = useCareerStore((state) => state.setActiveTrack);
    
    const [careers, setCareers] = useState<Career[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const mergedLevels = useMemo(() => {
        const merged: string[] = [];
        for (let i = 0; i < levels.length; i += 1) {
            const current = levels[i];
            const next = levels[i + 1];

            if (current === "Senior Director" && next === "Director") {
                merged.push("Senior Director / Director");
                i += 1;
                continue;
            }

            if (current === "Senior Manager" && next === "Manager") {
                merged.push("Senior Manager / Manager");
                i += 1;
                continue;
            }

            merged.push(current);
        }
        return merged;
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadCareers() {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchCareers();
                if (!cancelled) {
                    setCareers(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                if (!cancelled) {
                    setError("Failed to load careers.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadCareers();
        return () => {
            cancelled = true;
        };
    }, []);

    const levelLabelForCareer = useMemo(() => {
        const map = new Map<string, string>();
        map.set("Senior Director", "Senior Director / Director");
        map.set("Director", "Senior Director / Director");
        map.set("Senior Manager", "Senior Manager / Manager");
        map.set("Manager", "Senior Manager / Manager");
        return map;
    }, []);

    const careersByLevel = useMemo(() => {
        const grouped = new Map<string, Career[]>();
        mergedLevels.forEach((level) => grouped.set(level, []));

        careers.forEach((career) => {
            const rawLevel = career.careerLevel?.trim();
            if (!rawLevel) {
                return;
            }
            const normalizedLevel = levelLabelForCareer.get(rawLevel) ?? rawLevel;
            const levelKey = grouped.has(normalizedLevel) ? normalizedLevel : rawLevel;
            const existing = grouped.get(levelKey);
            if (!existing) {
                return;
            }

            const path = career.careerPath;
            const matchesTrack = Array.isArray(path)
                ? path.includes(activeTrack)
                : path === activeTrack;
            if (!matchesTrack) {
                return;
            }
            existing.push(career);
        });

        return grouped;
    }, [activeTrack, careers, levelLabelForCareer, mergedLevels]);

    function getFirstSentence(text?: string) {
        if (!text) {
            return "No description available.";
        }
        const match = text.match(/[^.!?]+[.!?]/);
        return match ? match[0].trim() : text.trim();
    }

    // page
    return (
        <div className="bg-white/5 rounded-3xl p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                        Careers
                    </h2>
                    <p className="text-white/80 mt-1">
                        Browse the careers in each careerpath and career level.
                    </p>
                    <p className="text-white/80 mt-1">
                        Select a track to view the careers available within that track.
                    </p>
                
                </div>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white/90 shadow-md transition hover:bg-white/25 hover:text-white"
                >
                    <span className="text-lg">←</span>
                    Back to Home
                </Link>
            </div>

            <div className="mb-6">
                <div className="flex w-full items-stretch gap-2 rounded-full border border-white/20 bg-white/10 p-1">
                    {trackOptions.map((track) => (
                        <button
                            key={track}
                            type="button"
                            onClick={() => setActiveTrack(track)}
                            className={`flex-1 px-4 py-2 text-sm font-semibold transition rounded-full text-center ${
                                activeTrack === track
                                    ? "bg-white text-blue-700"
                                    : "text-white hover:bg-white/20"
                            }`}
                        >
                            {track}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 text-white">
                {error ? <div className="text-red-200 mb-4">{error}</div> : null}
                <div className="flex flex-wrap justify-center gap-4">
                    {mergedLevels.map((level) => (
                        <div
                            key={level}
                            className="w-full sm:w-[calc(50%-0.5rem)] rounded-2xl border border-white/20 bg-white/5 p-4"
                        >
                            <div className="text-white font-semibold">{level}</div>
                            <div className="text-white/70 text-sm mt-1">
                                {loading
                                    ? "Loading careers..."
                                    : careersByLevel.get(level)?.length
                                        ? null
                                        : "No careers available for this level."}
                            </div>
                            {careersByLevel.get(level)?.length ? (
                                <div className="mt-3 grid gap-2">
                                    {careersByLevel.get(level)?.map((career) => (
                                        <Link
                                            key={career._id}
                                            to={`/careers?careerId=${encodeURIComponent(career.careerId)}`}
                                            className="block rounded-xl border border-white/10 bg-white/10 px-3 py-2 transition hover:bg-white/15"
                                        >
                                            <div className="text-white text-sm font-semibold">
                                                {career.careerTitle}
                                            </div>
                                            <div className="text-white/80 text-sm mt-1">
                                                {getFirstSentence(career.description)}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
