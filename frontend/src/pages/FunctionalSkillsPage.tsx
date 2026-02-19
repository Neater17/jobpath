import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    fetchFunctionalSkillById,
    type FunctionalSkill,
} from "../services/api";

export default function FunctionalSkillsPage() {
    const [searchParams] = useSearchParams();
    const [skill, setSkill] = useState<FunctionalSkill | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const skillId = searchParams.get("skillId");

    useEffect(() => {
        let cancelled = false;

        async function loadSkill() {
            if (!skillId) {
                setLoading(false);
                setError("Missing skillId.");
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const data = await fetchFunctionalSkillById(skillId);
                if (!cancelled) {
                    setSkill(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError("Failed to load functional skill.");
                    setSkill(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadSkill();
        return () => {
            cancelled = true;
        };
    }, [skillId]);

    const levelOrder = useMemo(() => ["1", "2", "3", "4", "5", "6"], []);
    const levels = useMemo(() => {
        const list = skill?.proficiencyLevels ?? [];
        return levelOrder.map((level) => list.find((item) => item.level === level) ?? null);
    }, [levelOrder, skill]);

    return (
        <div className="bg-white/5 rounded-3xl p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                        Functional Skills
                    </h2>
                    <p className="text-white/80 mt-1">
                        Detailed functional skill profile and proficiency matrix.
                    </p>
                </div>
                <a
                    href="/skills-list"
                    className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white/90 shadow-md transition hover:bg-white/25 hover:text-white"
                >
                    <span className="text-lg">←</span>
                    Back to Skills 
                </a>
            </div>

            {error ? <div className="text-red-200 mb-4">{error}</div> : null}

            <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-4 sm:p-6 text-white">
                <div className="overflow-x-auto">
                    <div className="min-w-[1100px]">
                        <div className="grid grid-cols-[220px_repeat(6,1fr)] border border-white/20 text-sm">
                            <div className="border-b border-white/20 px-4 py-3 font-semibold">Functional Skill</div>
                            <div className="border-b border-white/20 col-span-6 px-4 py-3">
                                {loading ? "Loading..." : skill ? `${skill.functionalSkillId} ${skill.skillName}` : ""}
                            </div>

                            <div className="border-b border-white/20 px-4 py-3 font-semibold">Category</div>
                            <div className="border-b border-white/20 col-span-6 px-4 py-3">
                                {loading ? "Loading..." : skill?.category ?? ""}
                            </div>

                            <div className="border-b border-white/20 px-4 py-3 font-semibold">Related Category</div>
                            <div className="border-b border-white/20 col-span-6 px-4 py-3">
                                {loading ? "Loading..." : skill?.relatedCategory ?? ""}
                            </div>

                            <div className="border-b border-white/20 px-4 py-3 font-semibold">Description</div>
                            <div className="border-b border-white/20 col-span-6 px-4 py-3">
                                {loading ? "Loading..." : skill?.description ?? ""}
                            </div>

                            <div className="border-b border-white/20 px-4 py-3 font-semibold">Proficiency Description</div>
                            <div className="border-b border-white/20 col-span-6 px-0">
                                <div className="grid grid-cols-6 text-center">
                                    {levelOrder.map((level) => (
                                        <div key={level} className="border-l border-white/20 px-2 py-2 font-semibold">
                                            {level}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-6 text-center text-xs">
                                    {levels.map((item, idx) => (
                                        <div key={`level-${idx}`} className="border-l border-white/20 px-2 py-2">
                                            {item?.proficiencyLevelId ?? ""}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-6 text-xs">
                                    {levels.map((item, idx) => (
                                        <div key={`desc-${idx}`} className="border-l border-white/20 px-3 py-3">
                                            {item?.description ?? ""}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-b border-white/20 px-4 py-3 font-semibold">Knowledge</div>
                            <div className="border-b border-white/20 col-span-6 px-0">
                                <div className="grid grid-cols-6 text-xs">
                                    {levels.map((item, idx) => (
                                        <div key={`know-${idx}`} className="border-l border-white/20 px-3 py-3">
                                            {Array.isArray(item?.knowledge) && item.knowledge.length ? (
                                                <ul className="list-disc list-outside pl-5 space-y-1">
                                                    {item.knowledge.map((entry, entryIdx) => (
                                                        <li key={`${item.proficiencyLevelId}-know-${entryIdx}`}>{entry}</li>
                                                    ))}
                                                </ul>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-b border-white/20 px-4 py-3 font-semibold">Abilities</div>
                            <div className="border-b border-white/20 col-span-6 px-0">
                                <div className="grid grid-cols-6 text-xs">
                                    {levels.map((item, idx) => (
                                        <div key={`abil-${idx}`} className="border-l border-white/20 px-3 py-3">
                                            {Array.isArray(item?.abilities) && item.abilities.length ? (
                                                <ul className="list-disc list-outside pl-5 space-y-1">
                                                    {item.abilities.map((entry, entryIdx) => (
                                                        <li key={`${item.proficiencyLevelId}-abil-${entryIdx}`}>{entry}</li>
                                                    ))}
                                                </ul>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="px-4 py-3 font-semibold">Range of Application</div>
                            <div className="col-span-6 px-4 py-3">
                                {loading ? "Loading..." : skill?.rangeOfApplication ?? ""}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
