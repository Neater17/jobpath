import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchCareers,
  fetchEnablingSkills,
  fetchFunctionalSkills,
  type Career,
  type EnablingSkill,
  type FunctionalSkill,
} from "../services/api";
import { levelOrder } from "../data/careerData";
import { useCareerStore } from "../store/careerStore";
import { useSkillsStore } from "../store/skillsStore";

export default function SkillMapPage() {
  const navigate = useNavigate();
  const headerCellClass =
    "rounded-xl border border-light-text/20 bg-light-accent-blue px-2 text-center text-sm font-bold text-deep-bg shadow-lg transition hover:bg-[#0B2998]";
  const dropdownPanelClass =
    "absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-light-text/20 bg-[#071854] text-light-text shadow-2xl";
  const dropdownOptionClass =
    "w-full bg-[#071854] px-4 py-3 text-left text-sm font-medium text-light-text transition hover:bg-[#0B2998]";
  const inactiveControlClass =
    "rounded-xl border border-light-text/15 bg-deep-bg/70 px-4 py-2 font-semibold text-light-text shadow-[0_10px_30px_rgba(1,12,52,0.24)] transition hover:border-light-accent-blue/45 hover:bg-navy-bg/90";
  const activeControlClass =
    "rounded-xl border border-light-accent-blue/45 bg-primary-blue px-4 py-2 font-semibold text-light-text shadow-[0_10px_30px_rgba(25,82,215,0.3)] transition hover:bg-accent-blue";
  const skillNameCellClass =
    "flex items-center justify-center rounded-2xl border border-light-text/15 bg-soft-navy/95 p-2 text-center text-xs font-semibold text-light-text shadow-[0_10px_30px_rgba(1,12,52,0.28)] transition transition hover:bg-[#0B2998]";
  const skillLevelCellClass =
    "flex items-center justify-center rounded-2xl border border-light-accent-blue/35 bg-primary-blue text-center text-xs font-bold text-light-text shadow-[0_12px_34px_rgba(25,82,215,0.26)] transition transition hover:bg-[#0B2998]";
  const unavailableCellClass =
    "flex items-center justify-center rounded-2xl border border-light-text/8 bg-[#02081f] text-center text-xs font-medium text-light-text/25 shadow-[0_10px_30px_rgba(1,12,52,0.24)]";
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [functionalSkillDefs, setFunctionalSkillDefs] = useState<FunctionalSkill[]>([]);
  const [enablingSkillDefs, setEnablingSkillDefs] = useState<EnablingSkill[]>([]);
  const [skillSearch, setSkillSearch] = useState<string>("");
  const { activeTab: skillTypeFilter, setActiveTab: setSkillTypeFilter, skillMapSort, setSkillMapSort } =
    useSkillsStore();
  const { selectedPathIdx, setSelectedPathIdx } = useCareerStore();

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

  useEffect(() => {
    if (!toastMessage) return;

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const careersByPath: Record<string, Career[]> = {};
  const careerPathOrder: string[] = [];

  careers.forEach((career) => {
    const paths = Array.isArray(career.careerPath) ? career.careerPath : [career.careerPath];

    paths.forEach((pathKey) => {
      if (!pathKey) return;
      if (!careersByPath[pathKey]) {
        careersByPath[pathKey] = [];
        careerPathOrder.push(pathKey);
      }
      careersByPath[pathKey].push(career);
    });
  });

  Object.keys(careersByPath).forEach((path) => {
    careersByPath[path].sort((a, b) => {
      const levelA = levelOrder[a.careerLevel] ?? 0;
      const levelB = levelOrder[b.careerLevel] ?? 0;
      return levelA - levelB;
    });
  });

  const allCareersFlat: Array<Career & { pathKey: string }> = [];
  careerPathOrder.forEach((pathKey) => {
    careersByPath[pathKey].forEach((career) => {
      allCareersFlat.push({ ...career, pathKey });
    });
  });

  const selectedPath = selectedPathIdx !== null ? careerPathOrder[selectedPathIdx] : null;
  const filteredCareersFlat = selectedPath
    ? allCareersFlat.filter((career) => career.pathKey === selectedPath)
    : allCareersFlat;

  const allFunctionalSkills = new Map<string, { id: string; name: string; count: number }>();
  const allEnablingSkills = new Map<string, { id: string; name: string; count: number }>();

  careers.forEach((career) => {
    career.functionalSkillsandCompetencies?.forEach((skill) => {
      if (!allFunctionalSkills.has(skill.functionalSkillId)) {
        allFunctionalSkills.set(skill.functionalSkillId, {
          id: skill.functionalSkillId,
          name: skill.title,
          count: 0,
        });
      }
      const existing = allFunctionalSkills.get(skill.functionalSkillId)!;
      existing.count += 1;
    });

    career.enablingSkillsandCompetencies?.forEach((skill) => {
      if (!allEnablingSkills.has(skill.enablingSkillId)) {
        allEnablingSkills.set(skill.enablingSkillId, {
          id: skill.enablingSkillId,
          name: skill.title,
          count: 0,
        });
      }
      const existing = allEnablingSkills.get(skill.enablingSkillId)!;
      existing.count += 1;
    });
  });

  const functionalSkillsArray = Array.from(allFunctionalSkills.values())
    .filter(
      (skill) =>
        skill.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
        skill.id.toLowerCase().includes(skillSearch.toLowerCase())
    )
    .sort((a, b) =>
      skillMapSort === "alphabetical" ? a.name.localeCompare(b.name) : b.count - a.count
    );

  const enablingSkillsArray = Array.from(allEnablingSkills.values())
    .filter(
      (skill) =>
        skill.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
        skill.id.toLowerCase().includes(skillSearch.toLowerCase())
    )
    .sort((a, b) =>
      skillMapSort === "alphabetical" ? a.name.localeCompare(b.name) : b.count - a.count
    );

  const allSkills = skillTypeFilter === "functional" ? functionalSkillsArray : enablingSkillsArray;

  const { pathHeaders } = useMemo(() => {
    const headers: Array<{ pathKey: string; pathName: string; span: number }> = [];

    careerPathOrder.forEach((pathKey) => {
      const careersInPath = careersByPath[pathKey] || [];
      if (careersInPath.length === 0) return;

      const pathName = pathKey
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      headers.push({ pathKey, pathName, span: careersInPath.length });
    });

    return { pathHeaders: headers };
  }, [careersByPath, careerPathOrder]);

  const proficiencyLevelsBySkill = useMemo(() => {
    const map = new Map<string, { levelId: string; level: string }[]>();
    const source = skillTypeFilter === "functional" ? functionalSkillDefs : enablingSkillDefs;

    source.forEach((skill) => {
      const levels = (skill.proficiencyLevels || []).map((level) => ({
        levelId: level.proficiencyLevelId,
        level: level.level,
      }));

      if ("functionalSkillId" in skill) {
        map.set(skill.functionalSkillId, levels);
      } else {
        map.set(skill.enablingSkillId, levels);
      }
    });

    return map;
  }, [skillTypeFilter, functionalSkillDefs, enablingSkillDefs]);

  const legendLevels = useMemo(() => {
    const source = skillTypeFilter === "functional" ? functionalSkillDefs : enablingSkillDefs;
    const seen = new Set<string>();
    const levels: string[] = [];

    source.forEach((skill) => {
      (skill.proficiencyLevels || []).forEach((level) => {
        if (level.level && level.level !== "0" && !seen.has(level.level)) {
          seen.add(level.level);
          levels.push(level.level);
        }
      });
    });

    return levels;
  }, [skillTypeFilter, functionalSkillDefs, enablingSkillDefs]);

  const resolveProficiencyLevel = (skillId: string, rawLevel: string | undefined): string => {
    if (!rawLevel) return "N/A";

    const levels = proficiencyLevelsBySkill.get(skillId);
    if (!levels || levels.length === 0) return rawLevel;

    const match = levels.find((level) => level.levelId === rawLevel || level.level === rawLevel);
    return match?.level || rawLevel;
  };

  const getSkillLevel = (
    career: Career,
    skillId: string,
    skillType: "functional" | "enabling"
  ): string => {
    if (skillType === "functional") {
      const skill = career.functionalSkillsandCompetencies?.find(
        (entry) => entry.functionalSkillId === skillId
      );
      if (skill) return skill.proficiencyLevel || "N/A";
    } else {
      const skill = career.enablingSkillsandCompetencies?.find(
        (entry) => entry.enablingSkillId === skillId
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

  const handleProficiencyLegendClick = (level: string) => {
    if (skillTypeFilter === "enabling") {
      setToastMessage("Skill Proficiency Descriptors does not exist");
      return;
    }

    navigate(`/FSCProficiencyLevelDescriptions?level=${encodeURIComponent(level)}`);
  };

  return (
    <div>
      {toastMessage && (
        <div className="fixed left-1/2 top-6 z-[100] w-[min(92vw,32rem)] -translate-x-1/2 rounded-3xl border border-light-accent-blue/40 bg-gradient-to-r from-primary-blue via-accent-blue to-primary-blue p-[1px] shadow-[0_20px_60px_rgba(37,99,235,0.4)]">
          <div className="flex items-start gap-3 rounded-[calc(1.5rem-1px)] bg-navy-bg/90 px-5 py-4 text-light-text backdrop-blur-md">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-light-accent-blue/20 text-lg text-light-accent-blue">
              !
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-light-accent-blue">
                Notice
              </div>
              <div className="mt-1 text-base font-semibold leading-6 text-light-text">
                {toastMessage}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-auto rounded-full px-2 py-1 text-sm font-semibold text-light-text/70 transition hover:bg-card-bg/40 hover:text-light-text"
              aria-label="Dismiss notification"
            >
              X
            </button>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="mb-2 text-4xl font-bold text-light-text">Skills Map</h2>
          <p className="text-light-text/80">
            Explore functional and enabling skills required for different career paths
          </p>
        </div>
        <button onClick={() => navigate(-1)} className="back-button">
          <svg className= "w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
          Back
        </button>
      </div>

      {!loading && (
        <div className="page-panel mb-4 px-4 py-4 text-light-text">
          <div className="text-base font-semibold">
            {skillTypeFilter === "functional"
              ? "Functional Skills Proficiency"
              : "Enabling Skills Proficiency"}
          </div>
          <p className="text-light-text/80">
            Explore the proficiency levels for each skill by clicking the buttons below. You can also
            click on individual skill levels in the map to view their descriptions.
          </p>
          {legendLevels.length > 0 ? (
            <div
              className="mt-3 gap-3 text-sm"
              style={{ display: "grid", gridTemplateColumns: `repeat(${legendLevels.length}, 1fr)` }}
            >
              {legendLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleProficiencyLegendClick(level)}
                  className="rounded-xl border border-light-text/15 bg-deep-bg/70 px-4 py-2 text-center font-medium text-light-text shadow-[0_10px_30px_rgba(1,12,52,0.24)] transition hover:bg-[#071854]"
                >
                  {level}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-light-text/70">No proficiency levels available.</div>
          )}
        </div>
      )}

      <div className="page-panel-strong overflow-x-auto p-6 sm:p-3">
        {error && <div className="mb-4 text-red-200">{error}</div>}

        {!loading && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSkillMapSort("alphabetical")}
              className={skillMapSort === "alphabetical" ? activeControlClass : inactiveControlClass}
            >
              Alphabetical
            </button>
            <button
              onClick={() => setSkillMapSort("by-usage")}
              className={skillMapSort === "by-usage" ? activeControlClass : inactiveControlClass}
            >
              By Usage
            </button>
            <input
              type="text"
              placeholder="Search skills..."
              value={skillSearch}
              onChange={(event) => setSkillSearch(event.target.value)}
              className="rounded-xl border border-light-text/20 bg-deep-bg/75 px-4 py-2 text-light-text placeholder-light-text/45 outline-none transition focus:border-light-accent-blue focus:ring-2 focus:ring-light-accent-blue/25"
            />
          </div>
        )}

        {loading ? (
          <div className="text-light-text/70">Loading careers data...</div>
        ) : (
          <div
            className="relative grid w-full gap-2 sm:gap-4"
            style={{
              gridTemplateColumns: `minmax(110px, 200px) repeat(${filteredCareersFlat.length}, minmax(100px, 1fr))`,
              gridAutoRows: "minmax(70px, auto)",
            }}
          >
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
                  className={`flex h-full w-full items-center justify-center rounded-xl px-2 text-center text-base font-medium text-light-text shadow-lg ${headerCellClass}`}
                >
                  {skillTypeFilter === "functional" ? "Functional" : "Enabling"}
                  <span className="ml-2 text-sm">
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                      className="size-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </span>
                </button>
                {openDropdown === 1 && (
                  <div className={dropdownPanelClass}>
                    <button
                      onClick={() => {
                        setSkillTypeFilter("functional");
                        setOpenDropdown(null);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm font-medium transition ${
                        skillTypeFilter === "functional"
                          ? "bg-primary-blue text-light-text"
                          : dropdownOptionClass
                      }`}
                    >
                      Functional Skills
                    </button>
                    <button
                      onClick={() => {
                        setSkillTypeFilter("enabling");
                        setOpenDropdown(null);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm font-medium transition ${
                        skillTypeFilter === "enabling"
                          ? "bg-primary-blue text-light-text"
                          : dropdownOptionClass
                      }`}
                    >
                      Enabling Skills
                    </button>
                  </div>
                )}
              </div>
            )}

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
                  className={`flex h-full w-full items-center justify-center rounded-xl px-2 text-center text-sm font-bold text-light-text shadow-lg ${headerCellClass}`}
                >
                  {pathHeaders[selectedPathIdx || 0]?.pathName}

                  <span className="ml-2 text-xs">
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                      className="size-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </span>
                </button>
                {openDropdown === 0 && (
                  <div className={dropdownPanelClass}>
                    {pathHeaders.map((header, idx) => (
                      <button
                        key={header.pathKey}
                        onClick={() => {
                          setSelectedPathIdx(idx);
                          setOpenDropdown(null);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm font-medium transition ${
                          idx === selectedPathIdx
                            ? "bg-primary-blue text-light-text"
                            : dropdownOptionClass
                        }`}
                      >
                        {header.pathName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {filteredCareersFlat.map((career, idx) => (
              <Link
                key={`header-${career._id}`}
                to={`/careers?careerId=${career.careerId}`}
                className={`flex cursor-pointer items-center justify-center rounded-xl p-2 text-center text-sm text-light-text shadow-lg ${headerCellClass}`}
                style={{
                  gridColumn: idx + 2,
                  gridRow: 2,
                }}
              >
                {career.careerTitle}
              </Link>
            ))}

            {allSkills.length > 0 ? (
              allSkills.map((skill, skillIdx) => (
                <React.Fragment key={skill.id}>
                  <Link
                    to={
                      skillTypeFilter === "functional"
                        ? `/functional-skills?skillId=${encodeURIComponent(skill.id)}`
                        : `/enabling-skills?skillId=${encodeURIComponent(skill.id)}`
                    }
                    className={`flex cursor-pointer items-center justify-center rounded-xl p-2 text-center text-sm text-light-text shadow-lg ${skillNameCellClass}`}
                    style={{
                      gridColumn: 1,
                      gridRow: skillIdx + 3,
                    }}
                  >
                    {skill.name}
                  </Link>

                  {filteredCareersFlat.map((career, careerIdx) => {
                    const skillType = functionalSkillsArray.find((entry) => entry.id === skill.id)
                      ? "functional"
                      : "enabling";
                    const level = getResolvedSkillLevel(career, skill.id, skillType);
                    const isNA = level === "N/A";
                    const detailPath =
                      skillType === "functional" ? "/functional-skills" : "/enabling-skills";

                    return isNA ? (
                      <div
                        key={`${skill.id}-${career._id}`}
                        className={unavailableCellClass}
                        style={{
                          gridColumn: careerIdx + 2,
                          gridRow: skillIdx + 3,
                        }}
                      >
                        -
                      </div>
                    ) : (
                      <Link
                        key={`${skill.id}-${career._id}`}
                        to={`${detailPath}?skillId=${encodeURIComponent(skill.id)}`}
                        className={skillLevelCellClass}
                        style={{
                          gridColumn: careerIdx + 2,
                          gridRow: skillIdx + 3,
                        }}
                      >
                        {level}
                      </Link>
                    );
                  })}
                </React.Fragment>
              ))
            ) : (
              <div className="col-span-full py-4 text-light-text/70">No skills data available.</div>
            )}
          </div>
        )}

        <div className="mt-2 pt-1 text-right text-xs text-light-text/70">
          <p>
            Data source:
            <a
              href="https://bit.ly/psf-aai?r=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 underline text-light-accent-blue transition hover:text-soft-lavender-blue"
            >
              Philippine Skills Framework - AI Initiative (PSF-AAI)
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
