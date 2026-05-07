import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { levels, tracks } from "../data/careerData";
import { fetchCareerSummaries, type CareerSummary } from "../services/api";
import { useCareerStore } from "../store/careerStore";

export default function CareerOverview() {
    const trackOptions = useMemo(() => [...tracks], []);
    
    const activeTrack = useCareerStore((state) => state.activeTrack);
    const setActiveTrack = useCareerStore((state) => state.setActiveTrack);
    
    const [careers, setCareers] = useState<CareerSummary[]>([]);
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
                const data = await fetchCareerSummaries();
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
        const grouped = new Map<string, CareerSummary[]>();
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
                    <span className="text-lg">
                        <svg className= "w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                        </svg>
                    </span>
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
                <div className="grid gap-5 lg:grid-cols-2">
                    {mergedLevels.map((level) => (
                        <div
                            key={level}
                            className="relative overflow-hidden rounded-[28px] border border-blue-200/15 bg-blue-900/22 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.22)]"
                        >
                            <div className="relative -mx-5 -mt-5 mb-4 flex items-start justify-between gap-4 rounded-t-[28px] bg-blue-950/55 px-5 py-4">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/70">
                                        Career Level
                                    </div>
                                    <div className="mt-2 text-xl font-semibold text-white">
                                        {level}
                                    </div>
                                </div>
                                <div className="shrink-0 rounded-full border border-blue-200/20 bg-blue-200/15 px-3 py-1 text-xs font-semibold text-blue-100">
                                    {loading ? "..." : `${careersByLevel.get(level)?.length ?? 0} roles`}
                                </div>
                            </div>
                            <div className="mt-3 text-sm text-white/70">
                                {loading
                                    ? "Loading careers..."
                                    : careersByLevel.get(level)?.length
                                        ? null
                                        : "No careers available for this level."}
                            </div>
                            {careersByLevel.get(level)?.length ? (
                                <div className="mt-4 grid gap-3">
                                    {careersByLevel.get(level)?.map((career) => (
                                        <Link
                                            key={career._id}
                                            to={`/careers?careerId=${encodeURIComponent(career.careerId)}`}
                                            className="group block rounded-2xl border border-blue-200/10 bg-blue-950/20 px-4 py-4 transition hover:border-blue-200/30 hover:bg-blue-900/30 hover:shadow-[0_16px_35px_rgba(14,165,233,0.16)]"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="text-sm font-semibold text-white transition group-hover:text-blue-100">
                                                    {career.careerTitle}
                                                </div>
                                                <div className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 transition group-hover:bg-blue-200/15 group-hover:text-blue-100">
                                                    Open
                                                </div>
                                            </div>
                                            <div className="mt-2 line-clamp-3 text-sm leading-6 text-white/75">
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
