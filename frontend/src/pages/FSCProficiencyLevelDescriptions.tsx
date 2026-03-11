import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchProficiencyLevels,
  type ProficiencyLevel,
} from "../services/api";

type ProficiencyRow = ProficiencyLevel["proficiency_levels"][number];

export default function FSCProficiencyLevelDescriptions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<ProficiencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedLevel = searchParams.get("level");

  useEffect(() => {
    let cancelled = false;

    async function loadProficiencyLevels() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchProficiencyLevels();
        const levels = Array.isArray(data)
          ? data.flatMap((entry) => entry.proficiency_levels || [])
          : [];

        if (!cancelled) {
          setRows(levels);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load FSC proficiency level descriptions.");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProficiencyLevels();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRows = useMemo(
    () => [...rows].filter((row) => row.level !== 0).sort((a, b) => a.level - b.level),
    [rows]
  );

  return (
    <div className="bg-white/5 rounded-3xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">
            FSC Proficiency Level Descriptions
          </h2>
          <p className="mt-1 text-white/80">
            Reference guide for Functional Skill Proficiency Descriptors.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white/90 shadow-md transition hover:bg-white/25 hover:text-white"
        >
          <span className="text-lg">←</span>
          Back
        </button>
      </div>

      {selectedLevel ? (
        <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-white/10 px-4 py-3 text-sm text-white/90">
          Viewing descriptor for proficiency level{" "}
          <span className="font-semibold text-cyan-200">{selectedLevel}</span>.
        </div>
      ) : null}

      {error ? <div className="mb-4 text-red-200">{error}</div> : null}

      <div className="rounded-3xl bg-white/10 p-4 text-white shadow-2xl backdrop-blur-lg sm:p-6">
        {loading ? (
          <div className="px-3 py-3 text-white/70">
            Loading proficiency level descriptions...
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="px-3 py-3 text-white/70">
            No proficiency level descriptions available.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/15">
            <table className="min-w-[980px] w-full overflow-hidden text-sm">
              <thead className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <tr className="border-b border-white/20">
                  <th className="w-32 px-4 py-4 text-center font-bold">
                    Proficiency
                  </th>
                  <th className="px-4 py-4 text-left font-bold">
                    Knowledge and Abilities
                  </th>
                  <th className="px-4 py-4 text-left font-bold">
                    Autonomy and Complexity
                  </th>
                  <th className="px-4 py-4 text-left font-bold">
                    Responsibility
                  </th>
                </tr>
                <tr className="border-b border-white/20 bg-white/10 text-white/85">
                  <th className="px-4 py-3 text-center font-medium">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Required to support work as described under Responsibility,
                    Autonomy and Complexity
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Degree of decision-making and degree of difficulty of
                    situations and tasks
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Degree of supervision and accountability
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => {
                  const isSelected = selectedLevel === String(row.level);

                  return (
                    <tr
                      key={row.level}
                      className={`border-b border-white/10 align-top transition ${
                        isSelected
                          ? "bg-gradient-to-r from-cyan-500/30 via-sky-500/25 to-blue-600/30 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.65)]"
                          : index % 2 === 0
                            ? "bg-white/5"
                            : "bg-white/[0.03]"
                      }`}
                    >
                      <td className="px-4 py-5 text-center">
                        <div
                          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold shadow-inner ${
                            isSelected
                              ? "bg-cyan-300 text-slate-950 shadow-cyan-100/40"
                              : "bg-white/10 text-white shadow-white/10"
                          }`}
                        >
                          {row.level}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-5 text-left leading-6 ${
                          isSelected ? "text-white" : "text-white/90"
                        }`}
                      >
                        {row.knowledge_and_abilities}
                      </td>
                      <td
                        className={`px-4 py-5 text-left leading-6 ${
                          isSelected ? "text-white" : "text-white/90"
                        }`}
                      >
                        {row.autonomy_and_complexity}
                      </td>
                      <td
                        className={`px-4 py-5 text-left leading-6 ${
                          isSelected ? "text-white" : "text-white/90"
                        }`}
                      >
                        {row.responsibility}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-2 pt-1 text-right text-xs text-white/70">
        <p>
          Data source:
          <a
            href="https://psf-aai.vercel.app/skillsmapmain"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 underline"
          >
            Philippine Skills Framework – AI Initiative (PSF-AAI)
          </a>
        </p>
      </div>
    </div>
  );
}
