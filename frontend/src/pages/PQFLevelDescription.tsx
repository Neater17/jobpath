import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchPqfLevels, type PqfLevel } from "../services/api";

type PqfRow = PqfLevel["pqf_levels"][number];

export default function PQFLevelDescription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<PqfRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null);
  const selectedEducation = searchParams.get("education");

  useEffect(() => {
    let cancelled = false;

    async function loadPqfLevels() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchPqfLevels();
        const levels = Array.isArray(data)
          ? data.flatMap((entry) => entry.pqf_levels || [])
          : [];

        if (!cancelled) {
          setRows(levels);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load PQF level descriptions.");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPqfLevels();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.psf_level - b.psf_level),
    [rows]
  );

  const selectedQualifications = useMemo(() => {
    if (!selectedEducation) return new Set<string>();

    const educationMap: Record<string, string[]> = {
      "NC II, III/ Sr. High School": [
        "Grade 12",
        "National Certificate II",
        "National Certificate III",
      ],
      "ACT Degree/ NC III, IV, Diploma": [
        "National Certificate III",
        "National Certificate IV",
        "Diploma",
      ],
      Baccalaureate: ["Baccalaureate Degree"],
      "Post Baccalaureate": ["Post-baccalaureate Degree"],
      "Doctoral/ Post Doctoral": ["Doctoral and Post-doctoral Degree"],
    };

    return new Set(educationMap[selectedEducation] ?? []);
  }, [selectedEducation]);

  return (
    <div className="bg-white/5 rounded-3xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">
            PQF Level Description
          </h2>
          <p className="mt-1 text-white/80">
            Reference guide for qualifications, PQF levels, and PSF alignment.
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

      {selectedEducation ? (
        <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-white/10 px-4 py-3 text-sm text-white/90">
          Showing PQF descriptions for{" "}
          <span className="font-semibold text-cyan-200">
            {selectedEducation}
          </span>
          .
        </div>
      ) : null}

      {error ? <div className="mb-4 text-red-200">{error}</div> : null}

      <div className="rounded-3xl bg-white/10 p-4 text-white shadow-2xl backdrop-blur-lg sm:p-6">
        {loading ? (
          <div className="px-3 py-3 text-white/70">
            Loading PQF level descriptions...
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="px-3 py-3 text-white/70">
            No PQF level descriptions available.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/15">
            <table className="min-w-[980px] w-full overflow-hidden text-sm">
              <thead className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <tr className="border-b border-white/20">
                  <th className="w-48 px-4 py-4 text-left font-bold">
                    Qualifications
                  </th>
                  <th className="w-28 px-4 py-4 text-center font-bold">
                    PQF Level
                  </th>
                  <th className="px-4 py-4 text-left font-bold">
                    PQF Level Descriptor
                  </th>
                  <th className="w-28 px-4 py-4 text-center font-bold">
                    PSF Level
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => {
                  const rowKey = `${row.qualification}-${row.pqf_level ?? "none"}-${row.psf_level}`;
                  const isSelected = selectedQualifications.has(row.qualification);

                  return (
                  <tr
                    key={rowKey}
                    className={`border-b border-white/10 align-top transition ${
                      isSelected
                        ? "bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-blue-600/20 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.45)]"
                        : hoveredRowKey === rowKey
                          ? "bg-white/15"
                        : index % 2 === 0
                          ? "bg-white/5"
                          : "bg-white/[0.03]"
                    }`}
                    onMouseEnter={() => setHoveredRowKey(rowKey)}
                    onMouseLeave={() => setHoveredRowKey(null)}
                  >
                    <td className={`px-4 py-5 align-middle font-semibold ${
                      isSelected ? "bg-cyan-400/20 text-white" : "bg-cyan-400/10 text-cyan-50"
                    }`}>
                      {row.qualification}
                    </td>
                    <td className="px-4 py-5 align-middle text-center font-medium text-white/90">
                      {row.pqf_level ?? ""}
                    </td>
                    <td className="px-4 py-5 text-white/90">
                      {Array.isArray(row.descriptor) && row.descriptor.length > 0 ? (
                        <ul className="list-disc space-y-2 pl-5 leading-6">
                          {row.descriptor.map((entry, entryIdx) => (
                            <li key={`${row.qualification}-descriptor-${entryIdx}`}>
                              {entry}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                    <td className="px-4 py-5 align-middle text-center font-semibold text-white">
                      <Link
                        to={`/FSCProficiencyLevelDescriptions?level=${encodeURIComponent(
                          String(row.psf_level)
                        )}`}
                        className="inline-flex min-w-[3rem] items-center justify-center rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-100 shadow-sm transition hover:border-cyan-200/50 hover:bg-cyan-300/20 hover:text-white hover:shadow-md"
                      >
                        {row.psf_level}
                      </Link>
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
