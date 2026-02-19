import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchEnablingSkills,
  fetchFunctionalSkills,
  type EnablingSkill,
  type FunctionalSkill,
} from "../services/api";

type SkillRow = {
  code: string;
  skill: string;
  category: string;
  relatedCategory: string;
  description: string;
};

const emptyRows: SkillRow[] = [];

export default function SkillsList() {
  const [activeTab, setActiveTab] = useState<"functional" | "enabling">(
    "functional"
  );
  const [sortKey, setSortKey] = useState<"code" | "skill" | "category" | "relatedCategory">(
    "skill"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rows, setRows] = useState<SkillRow[]>(emptyRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailPath = activeTab === "functional" ? "/functional-skills-page" : "/enabling-skills-page";

  useEffect(() => {
    let cancelled = false;

    async function loadSkills() {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === "functional") {
          const data = await fetchFunctionalSkills();
          const list = Array.isArray(data) ? data : [];
          if (!Array.isArray(data)) {
            setError("Functional skills response was not an array.");
          }
          if (!cancelled) {
            setRows(
              list.map((item: FunctionalSkill) => ({
                code: item.functionalSkillId,
                skill: item.skillName,
                category: item.category,
                relatedCategory: item.relatedCategory,
                description: item.description,
              }))
            );
          }
        } else {
          const data = await fetchEnablingSkills();
          const list = Array.isArray(data) ? data : [];
          if (!Array.isArray(data)) {
            setError("Enabling skills response was not an array.");
          }
          if (!cancelled) {
            setRows(
              list.map((item: EnablingSkill) => ({
                code: item.enablingSkillId,
                skill: item.skillName,
                category: item.category,
                relatedCategory: item.relatedCategory,
                description: item.description,
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

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const left = a[sortKey] ?? "";
      const right = b[sortKey] ?? "";
      const result = left.localeCompare(right);
      return sortDir === "asc" ? result : -result;
    });
    return copy;
  }, [rows, sortDir, sortKey]);

  function handleSort(nextKey: "code" | "skill" | "category" | "relatedCategory") {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDir("asc");
  }

  return (
    <div className="bg-white/5 rounded-3xl p-6 sm:p-8">
      
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">
            Skills
          </h2>
          <p className="text-white/80 mt-1">
            Browse functional and enabling skills. 
          </p>
          <p className="text-white/80 mt-1">
            <br/>Click on a skill code or name for detailed information.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white/90 shadow-md transition hover:bg-white/25 hover:text-white"
        >
          <span className="text-lg">←</span>
          Back to Home
        </a>
      </div>
      <div className="mb-6">
      
        <div className="flex w-full overflow-hidden rounded-full border border-white/20 bg-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("functional")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
              activeTab === "functional"
                ? "bg-white text-blue-700"
                : "text-white hover:bg-white/20"
            }`}
          >
            Functional Skills
          </button>
          <div className="w-px bg-white/20" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setActiveTab("enabling")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
              activeTab === "enabling"
                ? "bg-white text-blue-700"
                : "text-white hover:bg-white/20"
            }`}
          >
            Enabling Skills
          </button>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-4 sm:p-6 text-white">
        {error ? <div className="text-red-200 mb-4">{error}</div> : null}
        <div className="overflow-x-auto">
          <div className="min-w-[960px]">
            <div className="grid grid-cols-[120px_220px_200px_200px_1fr] bg-white/20 text-sm font-semibold rounded-t-2xl">
              <button
                type="button"
                onClick={() => handleSort("code")}
                className="px-3 py-2 text-left hover:bg-white/20 transition inline-flex items-center gap-2"
              >
                Code
                <span className="text-xs opacity-80">
                  {sortKey === "code" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSort("skill")}
                className="px-3 py-2 text-left hover:bg-white/20 transition inline-flex items-center gap-2"
              >
                Skill
                <span className="text-xs opacity-80">
                  {sortKey === "skill" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSort("category")}
                className="px-3 py-2 text-left hover:bg-white/20 transition inline-flex items-center gap-2"
              >
                Category
                <span className="text-xs opacity-80">
                  {sortKey === "category" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSort("relatedCategory")}
                className="px-3 py-2 text-left hover:bg-white/20 transition inline-flex items-center gap-2"
              >
                Related Category
                <span className="text-xs opacity-80">
                  {sortKey === "relatedCategory" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                </span>
              </button>
              <div className="px-3 py-2">Description</div>
            </div>
            <div className="divide-y divide-white/10 text-sm">
              {loading ? (
                <div className="px-3 py-3 text-white/70">Loading skills...</div>
              ) : sortedRows.length === 0 ? (
                <div className="px-3 py-3 text-white/70">No skills available.</div>
              ) : (
                sortedRows.map((row) => (
                  <div
                    key={row.code}
                    className="grid grid-cols-[120px_220px_200px_200px_1fr]"
                  >
                    <div className="px-3 py-3">
                      <Link
                        to={`${detailPath}?skillId=${encodeURIComponent(row.code)}`}
                        className="text-white/90 hover:text-white underline-offset-2 hover:underline"
                      >
                        {row.code}
                      </Link>
                    </div>
                    <div className="px-3 py-3">
                      <Link
                        to={`${detailPath}?skillId=${encodeURIComponent(row.code)}`}
                        className="text-white/90 hover:text-white underline-offset-2 hover:underline"
                      >
                        {row.skill}
                      </Link>
                    </div>
                    <div className="px-3 py-3">{row.category}</div>
                    <div className="px-3 py-3">{row.relatedCategory}</div>
                    <div className="px-3 py-3">{row.description}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}