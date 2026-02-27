import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  fetchCareers,
  fetchFunctionalSkills,
  fetchEnablingSkills,
  type Career,
  type FunctionalSkill,
  type EnablingSkill,
} from "../services/api";

export default function SkillMapPage() {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPathIdx, setSelectedPathIdx] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [skillTypeFilter, setSkillTypeFilter] = useState<"functional" | "enabling">("functional");
  const [functionalSkillDefs, setFunctionalSkillDefs] = useState<FunctionalSkill[]>([]);
  const [enablingSkillDefs, setEnablingSkillDefs] = useState<EnablingSkill[]>([]);

  useEffect(() => {
    async function loadCareers() {
      setLoading(true);
      setError(null);
      try {
        const [careersData, functionalData, enablingData] = await Promise.all([
          fetchCareers(),
          fetchFunctionalSkills(),
          fetchEnablingSkills(),
        ]);
        setCareers(careersData || []);
        setFunctionalSkillDefs(functionalData || []);
        setEnablingSkillDefs(enablingData || []);
        setSelectedPathIdx(0); // Default to first path
      } catch (err) {
        setError("Failed to load careers data.");
        setCareers([]);
        setFunctionalSkillDefs([]);
        setEnablingSkillDefs([]);
      } finally {
        setLoading(false);
      }
    }

    loadCareers();
  }, []);

  // Group careers by career path and create a sorted list
  const careersByPath: Record<string, Career[]> = {};
  const careerPathOrder: string[] = [];
  
  careers.forEach((career) => {
    // Handle careers with multiple paths
    const paths = Array.isArray(career.careerPath) 
      ? career.careerPath 
      : [career.careerPath];
    
    paths.forEach((pathKey) => {
      if (pathKey) {
        if (!careersByPath[pathKey]) {
          careersByPath[pathKey] = [];
          careerPathOrder.push(pathKey);
        }
        careersByPath[pathKey].push(career);
      }
    });
  });

  // Sort careers by level within each path
  Object.keys(careersByPath).forEach((path) => {
    careersByPath[path].sort((a, b) => {
      const levelA = parseInt(a.careerLevel) || 0;
      const levelB = parseInt(b.careerLevel) || 0;
      return levelA - levelB;
    });
  });

  // Create a flat list of careers with path info for header structure
  const allCareersFlat: Array<Career & { pathKey: string }> = [];
  careerPathOrder.forEach((pathKey) => {
    careersByPath[pathKey].forEach((career) => {
      allCareersFlat.push({ ...career, pathKey });
    });
  });

  // Filter to show only selected path
  const selectedPath = selectedPathIdx !== null ? careerPathOrder[selectedPathIdx] : null;
  const filteredCareersFlat = selectedPath
    ? allCareersFlat.filter((c) => c.pathKey === selectedPath)
    : allCareersFlat;

  // Gather all unique skills
  const allFunctionalSkills = new Map<
    string,
    { id: string; name: string; count: number }
  >();
  const allEnablingSkills = new Map<
    string,
    { id: string; name: string; count: number }
  >();

  careers.forEach((career) => {
    career.functionalSkillsandCompetencies?.forEach((skill) => {
      if (!allFunctionalSkills.has(skill.functionalSkillId)) {
        allFunctionalSkills.set(skill.functionalSkillId, {
          id: skill.functionalSkillId,
          name: skill.skillName,
          count: 0,
        });
      }
      const existing = allFunctionalSkills.get(skill.functionalSkillId)!;
      existing.count++;
    });

    career.enablingSkillsandCompetencies?.forEach((skill) => {
      if (!allEnablingSkills.has(skill.enablingSkillId)) {
        allEnablingSkills.set(skill.enablingSkillId, {
          id: skill.enablingSkillId,
          name: skill.skillName,
          count: 0,
        });
      }
      const existing = allEnablingSkills.get(skill.enablingSkillId)!;
      existing.count++;
    });
  });

  // Filter to show all skills
  const functionalSkillsArray = Array.from(allFunctionalSkills.values())
    .sort((a, b) => b.count - a.count);

  const enablingSkillsArray = Array.from(allEnablingSkills.values())
    .sort((a, b) => b.count - a.count);

  const allSkills =
    skillTypeFilter === "functional" ? functionalSkillsArray : enablingSkillsArray;

  // Get ordered career paths and their names from careers data
  const { pathHeaders, pathNameMap } = useMemo(() => {
    const headers: Array<{ pathKey: string; pathName: string; span: number }> = [];
    const nameMap: Record<string, string> = {};
    
    careerPathOrder.forEach((pathKey) => {
      const careersInPath = careersByPath[pathKey] || [];
      if (careersInPath.length > 0) {
        const pathName = pathKey
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        nameMap[pathKey] = pathName;
        headers.push({ pathKey, pathName, span: careersInPath.length });
      }
    });
    
    return { pathHeaders: headers, pathNameMap: nameMap };
  }, [careersByPath, careerPathOrder]);

  const proficiencyLevelsBySkill = useMemo(() => {
    const map = new Map<string, { levelId: string; level: string }[]>();
    const source =
      skillTypeFilter === "functional" ? functionalSkillDefs : enablingSkillDefs;

    source.forEach((skill) => {
      const levels = (skill.proficiencyLevels || []).map((level) => ({
        levelId: level.proficiencyLevelId,
        level: level.level,
      }));

      if ('functionalSkillId' in skill) {
        map.set(skill.functionalSkillId, levels);
      } else {
        map.set(skill.enablingSkillId, levels);
      }
    });

    return map;
  }, [skillTypeFilter, functionalSkillDefs, enablingSkillDefs]);

  const legendLevels = useMemo(() => {
    const source =
      skillTypeFilter === "functional" ? functionalSkillDefs : enablingSkillDefs;
    const seen = new Set<string>();
    const levels: string[] = [];

    source.forEach((skill) => {
      (skill.proficiencyLevels || []).forEach((level) => {
        if (level.level && !seen.has(level.level)) {
          seen.add(level.level);
          levels.push(level.level);
        }
      });
    });

    return levels;
  }, [skillTypeFilter, functionalSkillDefs, enablingSkillDefs]);

  const resolveProficiencyLevel = (
    skillId: string,
    rawLevel: string | undefined
  ): string => {
    if (!rawLevel) return "N/A";

    const levels = proficiencyLevelsBySkill.get(skillId);
    if (!levels || levels.length === 0) return rawLevel;

    const match = levels.find(
      (level) => level.levelId === rawLevel || level.level === rawLevel
    );
    return match?.level || rawLevel;
  };

  const getSkillLevel = (
    career: Career,
    skillId: string,
    skillType: "functional" | "enabling"
  ): string => {
    if (skillType === "functional") {
      const skill = career.functionalSkillsandCompetencies?.find(
        (s) => s.functionalSkillId === skillId
      );
      if (skill) return skill.proficiencyLevel || "N/A";
    } else {
      const skill = career.enablingSkillsandCompetencies?.find(
        (s) => s.enablingSkillId === skillId
      );
      if (skill) return skill.proficiencyLevel || "N/A";
    }
    return "N/A";
  };
  
  const getResolvedSkillLevel = (
    career: Career,
    skillId: string,
    skillType: "functional" | "enabling"
  ): string => {
    const rawLevel = getSkillLevel(career, skillId, skillType);
    return resolveProficiencyLevel(skillId, rawLevel);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2">Skills Map</h2>
          <p className="text-white/80">
            Explore functional and enabling skills required for different career paths
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

      {!loading && (
        <div className="mb-4 rounded-2xl bg-white/10 px-4 py-3 text-white">
          <div className="text-base font-semibold">
            {skillTypeFilter === "functional"
              ? "Functional Skills Proficiency"
              : "Enabling Skills Proficiency"}
          </div>
          {legendLevels.length > 0 ? (
            <div className="mt-3 gap-3 text-sm" style={{ display: 'grid', gridTemplateColumns: `repeat(${legendLevels.length}, 1fr)` }}>
              {legendLevels.map((level) => (
                <div
                  key={level}
                  className="rounded-lg bg-white/10 px-4 py-2 text-center font-medium"
                >
                  {level}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-white/70">
              No proficiency levels available.
            </div>
          )}
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-3 overflow-x-auto">
        {error && <div className="text-red-200 mb-4">{error}</div>}

        {loading ? (
          <div className="text-white/70">Loading careers data...</div>
        ) : (
          <div
            className="grid gap-2 sm:gap-4 w-full relative"
            style={{
              gridTemplateColumns: `minmax(110px, 200px) repeat(${filteredCareersFlat.length}, minmax(100px, 1fr))`,
              gridAutoRows: "minmax(70px, auto)",
            }}
          >
            {/* Skill Type Filter Dropdown*/}
            {selectedPath && (
              <div
                key="skill-type-filter"
                className="relative"
                style={{
                  gridColumn: 1,
                  gridRow: 2,
                }}
              >
                <button
                  onClick={() => setOpenDropdown(openDropdown === 1 ? null : 1)}
                  className="w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white font-medium text-base rounded-xl shadow-lg flex items-center justify-center text-center px-2 h-full hover:from-blue-700 hover:to-blue-800 transition"
                >
                  {skillTypeFilter === "functional" ? "Functional" : "Enabling"}
                  <span className="ml-2 text-sm">▼</span>
                </button>
                {openDropdown === 1 && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-white text-gray-800 rounded-lg shadow-2xl z-50">
                    <button
                      onClick={() => {
                        setSkillTypeFilter("functional");
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium transition rounded-t-lg ${
                        skillTypeFilter === "functional"
                          ? "bg-blue-100 text-blue-700"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      Functional Skills
                    </button>
                    <button
                      onClick={() => {
                        setSkillTypeFilter("enabling");
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium transition rounded-b-lg ${
                        skillTypeFilter === "enabling"
                          ? "bg-blue-100 text-blue-700"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      Enabling Skills
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Clickable Path Headers with Dropdown */}
            {selectedPath && (
              <div
                key="path-dropdown"
                className="relative"
                style={{
                  gridColumn: `1 / span ${filteredCareersFlat.length + 1}`,
                  gridRow: 1,
                }}
              >
                <button
                  onClick={() => setOpenDropdown(openDropdown === 0 ? null : 0)}
                  className="w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center text-center px-2 h-full hover:from-blue-700 hover:to-blue-800 transition"
                >
                  {pathHeaders[selectedPathIdx || 0]?.pathName}
                  <span className="ml-2 text-xs">▼</span>
                </button>
                {openDropdown === 0 && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-white text-gray-800 rounded-lg shadow-2xl z-50">
                    {pathHeaders.map((header, idx) => (
                      <button
                        key={header.pathKey}
                        onClick={() => {
                          setSelectedPathIdx(idx);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm font-medium transition ${
                          idx === selectedPathIdx
                            ? "bg-blue-100 text-blue-700"
                            : "hover:bg-gray-100"
                        } ${idx === 0 ? "rounded-t-lg" : ""} ${
                          idx === pathHeaders.length - 1 ? "rounded-b-lg" : ""
                        }`}
                      >
                        {header.pathName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Career Title Headers */}
            {[...filteredCareersFlat].reverse().map((career, idx) => (
              <Link
                key={`header-${career._id}`}
                to={`/careers?careerId=${career.careerId}`}
                className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm rounded-xl shadow-lg flex items-center justify-center text-center p-2 hover:from-blue-700 hover:to-blue-800 transition cursor-pointer"
                style={{
                  gridColumn: idx + 2,
                  gridRow: 2,
                }}
              >
                {career.careerTitle}
              </Link>
            ))}

            {/* Skill Rows */}
            {allSkills.length > 0 ? (
              allSkills.map((skill, skillIdx) => (
                <React.Fragment key={skill.id}>
                  {/* Skill Name */}
                  <Link
                    to={skillTypeFilter === "functional" ? `/functional-skills-page?skillId=${encodeURIComponent(skill.id)}` : `/enabling-skills-page?skillId=${encodeURIComponent(skill.id)}`}
                    className="bg-white/90 text-gray-800 rounded-xl shadow flex items-center justify-center text-center text-xs font-semibold p-2 hover:bg-blue-600 hover:text-white hover:shadow-lg transition cursor-pointer"
                    style={{
                      gridColumn: 1,
                      gridRow: skillIdx + 3,
                    }}
                  >
                    {skill.name}
                  </Link>

                  {/* Proficiency Levels */}
                  {[...filteredCareersFlat].reverse().map((career, careerIdx) => {
                    const skillType = functionalSkillsArray.find(
                      (s) => s.id === skill.id
                    )
                      ? "functional"
                      : "enabling";
                    const level = getResolvedSkillLevel(career, skill.id, skillType);
                    const isNA = level === "N/A";

                    return (
                      <div
                        key={`${skill.id}-${career._id}`}
                        className={`rounded-xl shadow flex items-center justify-center text-center text-xs font-medium ${
                          isNA
                            ? "bg-gray-400 text-gray-300"
                            : "bg-white text-blue-600"
                        }`}
                        style={{
                          gridColumn: careerIdx + 2,
                          gridRow: skillIdx + 3,
                        }}
                      >
                        {isNA ? "—" : <span className="font-bold">{level}</span>}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))
            ) : (
              <div className="text-white/70 py-4 col-span-full">
                No skills data available.
              </div>
            )}
          </div>
        )}

        
      </div>
    </div>
  );
}
