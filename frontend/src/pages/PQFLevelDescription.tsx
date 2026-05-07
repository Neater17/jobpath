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
    <div className="bg-light-text/5 rounded-3xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-light-text">
            PQF Level Description
          </h2>
          <p className="mt-1 text-light-text/80">
            Reference guide for qualifications, PQF levels, and PSF alignment.
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

      {selectedEducation ? (
        <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-card-bg/40 px-4 py-3 text-sm text-light-text/90">
          Showing PQF descriptions for{" "}
          <span className="font-semibold text-light-accent-blue">
            {selectedEducation}
          </span>
          .
        </div>
      ) : null}

      {error ? <div className="mb-4 text-red-200">{error}</div> : null}

      <div className="rounded-3xl bg-card-bg/40 p-4 text-light-text shadow-2xl backdrop-blur-lg sm:p-6">
        {loading ? (
          <div className="px-3 py-3 text-light-text/70">
            Loading PQF level descriptions...
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="px-3 py-3 text-light-text/70">
            No PQF level descriptions available.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-light-text/15">
            <table className="min-w-[980px] w-full overflow-hidden text-sm">
              <thead className="bg-gradient-to-br from-primary-blue to-accent-blue text-light-text">
                <tr className="border-b border-light-text/20">
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
                    className={`border-b border-light-text/10 align-top transition ${
                      isSelected
                        ? "bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-blue-600/20 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.45)]"
                        : hoveredRowKey === rowKey
                          ? "bg-card-bg/40"
                        : index % 2 === 0
                          ? "bg-light-text/5"
                          : "bg-light-text/[0.03]"
                    }`}
                    onMouseEnter={() => setHoveredRowKey(rowKey)}
                    onMouseLeave={() => setHoveredRowKey(null)}
                  >
                    <td className={`px-4 py-5 align-middle font-semibold ${
                      isSelected ? "bg-light-accent-blue/20 text-light-text" : "bg-cyan-400/10 text-light-accent-blue"
                    }`}>
                      {row.qualification}
                    </td>
                    <td className="px-4 py-5 align-middle text-center font-medium text-light-text/90">
                      {row.pqf_level ?? ""}
                    </td>
                    <td className="px-4 py-5 text-light-text/90">
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
                    <td className="px-4 py-5 align-middle text-center font-semibold text-light-text">
                      <Link
                        to={`/FSCProficiencyLevelDescriptions?level=${encodeURIComponent(
                          String(row.psf_level)
                        )}`}
                        className="inline-flex min-w-[3rem] items-center justify-center rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-light-accent-blue shadow-sm transition hover:border-cyan-200/50 hover:bg-light-accent-blue/20 hover:text-light-text hover:shadow-md"
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

