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
    <div className="bg-light-text/5 rounded-3xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-light-text">
            FSC Proficiency Level Descriptions
          </h2>
          <p className="mt-1 text-light-text/80">
            Reference guide for Functional Skill Proficiency Descriptors.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="back-button"
        >
          <span className="text-lg">
            <svg className= "w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
          </span>
          Back
        </button>
      </div>

      {selectedLevel ? (
        <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-card-bg/40 px-4 py-3 text-sm text-light-text/90">
          Viewing descriptor for proficiency level{" "}
          <span className="font-semibold text-light-accent-blue">{selectedLevel}</span>.
        </div>
      ) : null}

      {error ? <div className="mb-4 text-red-200">{error}</div> : null}

      <div className="rounded-3xl bg-card-bg/40 p-4 text-light-text shadow-2xl backdrop-blur-lg sm:p-6">
        {loading ? (
          <div className="px-3 py-3 text-light-text/70">
            Loading proficiency level descriptions...
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="px-3 py-3 text-light-text/70">
            No proficiency level descriptions available.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-light-text/15">
            <table className="min-w-[980px] w-full overflow-hidden text-sm">
              <thead className="bg-gradient-to-br from-primary-blue to-accent-blue text-light-text">
                <tr className="border-b border-light-text/20">
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
                <tr className="border-b border-light-text/20 bg-card-bg/40 text-light-text/85">
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
                      className={`border-b border-light-text/10 align-top transition ${
                        isSelected
                          ? "bg-gradient-to-r from-cyan-500/30 via-sky-500/25 to-blue-600/30 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.65)]"
                          : index % 2 === 0
                            ? "bg-light-text/5"
                            : "bg-light-text/[0.03]"
                      }`}
                    >
                      <td className="px-4 py-5 text-center">
                        <div
                          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold shadow-inner ${
                            isSelected
                              ? "bg-cyan-300 text-slate-950 shadow-cyan-100/40"
                              : "bg-card-bg/40 text-light-text shadow-white/10"
                          }`}
                        >
                          {row.level}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-5 text-left leading-6 ${
                          isSelected ? "text-light-text" : "text-light-text/90"
                        }`}
                      >
                        {row.knowledge_and_abilities}
                      </td>
                      <td
                        className={`px-4 py-5 text-left leading-6 ${
                          isSelected ? "text-light-text" : "text-light-text/90"
                        }`}
                      >
                        {row.autonomy_and_complexity}
                      </td>
                      <td
                        className={`px-4 py-5 text-left leading-6 ${
                          isSelected ? "text-light-text" : "text-light-text/90"
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

      <div className="mt-2 pt-1 text-right text-xs text-light-text/70">
        <p>
          Data source:
          <a
            href="https://bit.ly/psf-aai?r=qr"
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

