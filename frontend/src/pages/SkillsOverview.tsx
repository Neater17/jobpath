import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchEnablingSkillSummaries,
  fetchFunctionalSkillSummaries,
  type EnablingSkillSummary,
  type FunctionalSkillSummary,
} from "../services/api";
import { useSkillsStore } from "../store/skillsStore";

type ProficiencyLevel = {
  proficiencyLevelId: string;
  level: string;
};

type SkillRow = {
  code: string;
  skill: string;
  category: string;
  relatedCategory: string;
  description: string;
  proficiencyLevels: ProficiencyLevel[];
};

const emptyRows: SkillRow[] = [];

export default function SkillsOverview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = useSkillsStore((state) => state.activeTab);
  const sortKey = useSkillsStore((state) => state.sortKey);
  const sortDir = useSkillsStore((state) => state.sortDir);
  const setActiveTab = useSkillsStore((state) => state.setActiveTab);
  const handleSort = useSkillsStore((state) => state.handleSort);
  const [rows, setRows] = useState<SkillRow[]>(emptyRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hoveredRowCode, setHoveredRowCode] = useState<string | null>(null);
  const [scrollTick, setScrollTick] = useState(0);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const categoryCellRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const categoryLabelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const detailPath = activeTab === "functional" ? "/functional-skills" : "/enabling-skills";

  useEffect(() => {
    const requestedTab = searchParams.get("tab");

    if ((requestedTab === "functional" || requestedTab === "enabling") && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [activeTab, searchParams, setActiveTab]);

  useEffect(() => {
    let cancelled = false;

    async function loadSkills() {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === "functional") {
          const data = await fetchFunctionalSkillSummaries();
          const list = Array.isArray(data) ? data : [];
          if (!Array.isArray(data)) {
            setError("Functional skills response was not an array.");
          }
          if (!cancelled) {
            setRows(
              list.map((item: FunctionalSkillSummary) => ({
                code: item.functionalSkillId,
                skill: item.title,
                category: item.category,
                relatedCategory: item.relatedCategory,
                description: item.description,
                proficiencyLevels: item.proficiencyLevels,
              }))
            );
          }
        } else {
          const data = await fetchEnablingSkillSummaries();
          const list = Array.isArray(data) ? data : [];
          if (!Array.isArray(data)) {
            setError("Enabling skills response was not an array.");
          }
          if (!cancelled) {
            setRows(
              list.map((item: EnablingSkillSummary) => ({
                code: item.enablingSkillId,
                skill: item.title,
                category: item.category,
                relatedCategory: item.relatedCategory,
                description: item.description,
                proficiencyLevels: item.proficiencyLevels,
              }))
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load skills.");
          setRows(emptyRows);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSkills();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    const handleViewportChange = () => {
      setScrollTick((value) => value + 1);
    };

    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange);

    return () => {
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const categoryResult = a.category.localeCompare(b.category);
      if (categoryResult !== 0) return categoryResult;

      const left = a[sortKey] ?? "";
      const right = b[sortKey] ?? "";
      const result = left.localeCompare(right);
      return sortDir === "asc" ? result : -result;
    });
    return copy;
  }, [rows, sortDir, sortKey]);

  const groupedRows = useMemo(() => {
    return sortedRows.map((row, index) => {
      const previousRow = sortedRows[index - 1];
      const showCategory = !previousRow || previousRow.category !== row.category;

      let rowSpan = 0;
      if (showCategory) {
        rowSpan = 1;
        for (let cursor = index + 1; cursor < sortedRows.length; cursor += 1) {
          if (sortedRows[cursor].category !== row.category) break;
          rowSpan += 1;
        }
      }

      return {
        ...row,
        showCategory,
        rowSpan,
      };
    });
  }, [sortedRows]);

  const categoryStyleByName = useMemo(() => {
    const styles = new Map<string, string>();
    let categoryIndex = 0;

    groupedRows.forEach((row) => {
      if (!row.showCategory || styles.has(row.category)) return;

      styles.set(
        row.category,
        categoryIndex % 2 === 0
          ? "bg-light-accent-blue/14 text-light-text"
          : "bg-accent-blue/28 text-light-text"
      );
      categoryIndex += 1;
    });

    return styles;
  }, [groupedRows]);

  const firstRowCodeByCategory = useMemo(() => {
    const map = new Map<string, string>();

    groupedRows.forEach((row) => {
      if (row.showCategory) {
        map.set(row.category, row.code);
      }
    });

    return map;
  }, [groupedRows]);

  const getCategoryLabelStyle = (category: string): React.CSSProperties => {
    void scrollTick;

    const cellElement = categoryCellRefs.current[category];
    const labelElement = categoryLabelRefs.current[category];
    const groupRow = groupedRows.find((row) => row.showCategory && row.category === category);
    const isSingleRowCategory = !groupRow || groupRow.rowSpan <= 1;

    if (isSingleRowCategory) {
      return {
        top: "50%",
        transform: "translateY(-50%)",
      };
    }

    if (!cellElement || !labelElement) {
      return {
        top: "1rem",
        transform: "none",
      };
    }

    const cellRect = cellElement.getBoundingClientRect();
    const labelHeight = labelElement.getBoundingClientRect().height || 24;
    const stickyTop = Math.max(window.innerHeight / 2 - labelHeight / 2, 96);
    const padding = 16;
    const firstRowCode = firstRowCodeByCategory.get(category);
    const firstRowElement = firstRowCode ? rowRefs.current[firstRowCode] : null;
    const groupRows = sortedRows.filter((row) => row.category === category);
    const lastRowCode = groupRows[groupRows.length - 1]?.code;
    const lastRowElement = lastRowCode ? rowRefs.current[lastRowCode] : null;

    const hoveredRow = hoveredRowCode ? sortedRows.find((row) => row.code === hoveredRowCode) : null;

    if (hoveredRow && hoveredRow.category === category) {
      const rowElement = rowRefs.current[hoveredRowCode!];

      if (rowElement) {
        const rowRect = rowElement.getBoundingClientRect();
        const hoveredCenter = rowRect.top - cellRect.top + rowRect.height / 2;
        const firstRowRect = firstRowElement?.getBoundingClientRect();
        const lastRowRect = lastRowElement?.getBoundingClientRect();
        const minCenter = firstRowRect
          ? firstRowRect.top - cellRect.top + firstRowRect.height / 2
          : padding + labelHeight / 2;
        const maxCenter = lastRowRect
          ? lastRowRect.top - cellRect.top + lastRowRect.height / 2
          : cellRect.height - padding - labelHeight / 2;

        return {
          top: `${Math.min(Math.max(hoveredCenter, minCenter), maxCenter)}px`,
          transform: "translateY(-50%)",
        };
      }
    }

    const firstRowRect = firstRowElement?.getBoundingClientRect();
    const lastRowRect = lastRowElement?.getBoundingClientRect();
    const defaultTop = firstRowRect
      ? firstRowRect.top - cellRect.top + firstRowRect.height / 2 - labelHeight / 2
      : padding;
    const groupFullyVisible =
      !!firstRowRect &&
      !!lastRowRect &&
      firstRowRect.top >= 0 &&
      lastRowRect.bottom <= window.innerHeight;

    if (groupFullyVisible) {
      return {
        top: `${defaultTop}px`,
        transform: "none",
      };
    }

    const stickyPosition = stickyTop - cellRect.top;
    const minTop = firstRowRect
      ? firstRowRect.top - cellRect.top + firstRowRect.height / 2 - labelHeight / 2
      : padding;
    const maxTop = lastRowRect
      ? lastRowRect.top - cellRect.top + lastRowRect.height / 2 - labelHeight / 2
      : cellRect.height - padding - labelHeight;
    const resolvedTop = Math.min(Math.max(Math.max(defaultTop, stickyPosition), minTop), maxTop);

    return {
      top: `${resolvedTop}px`,
      transform: "none",
    };
  };

  const allProficiencyLevels = useMemo(() => {
    const levels = new Map<string, number>();
    sortedRows.forEach((row) => {
      row.proficiencyLevels?.forEach((level) => {
        if (!levels.has(level.level)) {
          levels.set(level.level, levels.size);
        }
      });
    });
    return Array.from(levels.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([level]) => level);
  }, [sortedRows]);

  const handleProficiencyHeaderClick = (level: string) => {
    if (activeTab === "enabling") {
      setToastMessage("Skill Proficiency Descriptors does not exist");
      return;
    }

    navigate(`/FSCProficiencyLevelDescriptions?level=${encodeURIComponent(level.replace(/^Level\s+/, ""))}`);
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
              <div className="mt-1 text-base font-semibold leading-6 text-light-text">{toastMessage}</div>
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
          <h2 className="mb-2 text-4xl font-bold text-light-text">Skills Overview</h2>
          <p className="text-light-text/80">
            Explore functional and enabling skills with their proficiency levels
          </p>
        </div>
        <button onClick={() => navigate(-1)} className="back-button">
          <svg className= "w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
          Back
        </button>
      </div>

      <div className="mb-6">
        <div className="flex w-full overflow-hidden rounded-full border border-light-text/20 bg-card-bg/40">
          <button
            type="button"
            onClick={() => setActiveTab("functional")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
              activeTab === "functional"
                ? "bg-light-text text-accent-blue"
                : "text-light-text hover:bg-primary-blue/30"
            }`}
          >
            Functional Skills
          </button>
          <div className="w-px bg-card-bg/50" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setActiveTab("enabling")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
              activeTab === "enabling"
                ? "bg-light-text text-accent-blue"
                : "text-light-text hover:bg-primary-blue/30"
            }`}
          >
            Enabling Skills
          </button>
        </div>
      </div>

      <div className="page-panel-strong p-4 text-light-text sm:p-6">
        {error ? <div className="mb-4 text-red-200">{error}</div> : null}
        {loading ? (
          <div className="px-3 py-3 text-light-text/70">Loading skills...</div>
        ) : groupedRows.length === 0 ? (
          <div className="px-3 py-3 text-light-text/70">No skills available.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full overflow-hidden rounded-lg text-sm">
              <thead className="bg-gradient-to-br from-primary-blue to-accent-blue">
                <tr className="rounded-t-lg border-b border-light-text/20">
                  <th rowSpan={2} className="text-left text-sm font-bold text-light-text">
                    <button
                      type="button"
                      onClick={() => handleSort("category")}
                      className="inline-flex items-center gap-2 px-4 py-3 transition hover:opacity-80"
                    >
                      Category
                      <span className="text-xs opacity-80">
                        {sortKey === "category" ? (sortDir === "asc" ? "^" : "v") : "<>"}
                      </span>
                    </button>
                  </th>
                  <th rowSpan={2} className="px-4 py-3 text-left text-sm font-bold text-light-text">
                    <button
                      type="button"
                      onClick={() => handleSort("skill")}
                      className="inline-flex items-center gap-2 transition hover:opacity-80"
                    >
                      Title
                      <span className="text-xs opacity-80">
                        {sortKey === "skill" ? (sortDir === "asc" ? "^" : "v") : "<>"}
                      </span>
                    </button>
                  </th>
                  <th rowSpan={2} className="px-4 py-3 text-left text-sm font-bold text-light-text">
                    Description
                  </th>
                  <th
                    colSpan={allProficiencyLevels.length}
                    className="px-4 py-3 text-center text-sm font-bold text-light-text"
                  >
                    Proficiency Levels
                  </th>
                </tr>
                <tr className="border-b border-light-text/20">
                  {allProficiencyLevels.map((level) => (
                    <th key={level} className="whitespace-nowrap px-4 py-3 text-center text-sm font-bold text-light-text">
                      <button
                        type="button"
                        onClick={() => handleProficiencyHeaderClick(level)}
                        className="inline-flex items-center justify-center underline decoration-white/30 underline-offset-4 transition hover:text-light-accent-blue hover:decoration-light-accent-blue"
                      >
                        {activeTab === "functional" ? (level.startsWith("Level ") ? level : `Level ${level}`) : level}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((row, rowIdx) => (
                  <tr
                    key={row.code}
                    ref={(element) => {
                      rowRefs.current[row.code] = element;
                    }}
                    className={`border-b border-light-text/10 transition ${
                      hoveredRowCode === row.code ? "bg-card-bg/50" : rowIdx % 2 === 0 ? "bg-light-text/5" : ""
                    }`}
                    onMouseEnter={() => setHoveredRowCode(row.code)}
                    onMouseLeave={() => setHoveredRowCode(null)}
                  >
                    {row.showCategory ? (
                      <td
                        rowSpan={row.rowSpan}
                        ref={(element) => {
                          categoryCellRefs.current[row.category] = element;
                        }}
                        className={`relative min-w-[220px] px-4 py-4 ${
                          categoryStyleByName.get(row.category) ?? "bg-light-accent-blue/14 text-light-text"
                        }`}
                      >
                        <div
                          ref={(element) => {
                            categoryLabelRefs.current[row.category] = element;
                          }}
                          className="left-4 right-4 font-medium text-light-text transition-all duration-150"
                          style={{
                            ...getCategoryLabelStyle(row.category),
                            position: "absolute",
                          }}
                        >
                          {row.category}
                        </div>
                      </td>
                    ) : null}
                    <td className="px-4 py-4">
                      <Link
                        to={`${detailPath}?skillId=${encodeURIComponent(row.code)}`}
                        className="font-semibold text-light-text underline underline-offset-2 transition hover:text-light-accent-blue"
                      >
                        {row.skill}
                      </Link>
                    </td>
                    <td className={`px-4 py-4 text-light-text/80 ${activeTab === "functional" ? "w-1/2" : "max-w-sm"}`}>
                      {row.description}
                    </td>
                    {allProficiencyLevels.map((level) => {
                      const profLevel = row.proficiencyLevels?.find((entry) => entry.level === level);
                      const displayValue =
                        profLevel?.proficiencyLevelId?.toLowerCase() === "none"
                          ? ""
                          : profLevel?.proficiencyLevelId;
                      return (
                        <td
                          key={`${row.code}-${level}`}
                          className={`whitespace-nowrap text-center text-xs text-light-text ${
                            activeTab === "functional" ? "px-2 py-4" : "px-4 py-4"
                          }`}
                        >
                          {profLevel && displayValue ? (
                            <Link
                              to={`${detailPath}?skillId=${encodeURIComponent(row.code)}`}
                              className="font-semibold text-light-text underline underline-offset-2 transition hover:text-light-accent-blue"
                            >
                              {displayValue}
                            </Link>
                          ) : (
                            ""
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 text-right text-xs text-light-text/70">
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
  );
}
