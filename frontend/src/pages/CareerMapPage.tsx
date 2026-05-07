import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { tracks, levels, roles, Role } from "../data/careerData";

export default function CareerGrid() {
  const navigate = useNavigate();
  const clickableCellClass =
    "group relative flex cursor-pointer items-center justify-center rounded-2xl border border-light-text/10 bg-soft-navy/95 p-3 text-center text-sm font-medium text-light-text shadow-[0_10px_30px_rgba(1,12,52,0.3)] transition hover:border-light-accent-blue/55 hover:bg-primary-blue hover:text-light-text hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-blue";
  const educationalCellClass =
    "group relative flex cursor-pointer items-center justify-center rounded-2xl border border-light-accent-blue/30 bg-light-accent-blue/95 p-3 text-center text-sm font-medium text-deep-bg shadow-[0_10px_30px_rgba(37,79,163,0.18)] transition hover:bg-primary-blue hover:text-light-text hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-blue";

  return (
    <div className="mb-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-4xl font-bold text-light-text mb-2">Career Map</h2>
          <p className="text-light-text/80">
            Explore different career paths and their progression levels
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

      <div className="page-panel-strong relative overflow-x-auto p-6 sm:p-3">
        {/* GRID */}
        <div
          className="grid gap-2 sm:gap-4 w-full relative"
          style={{
            gridTemplateColumns: `minmax(110px, 160px) minmax(140px, 1fr) repeat(${tracks.length}, minmax(140px, 1fr))`,
            gridAutoRows: "minmax(70px, auto)",
          }}
        >
          {/* Job Level Header */}
          <div
            className="bg-gradient-to-br from-primary-blue to-accent-blue text-light-text font-bold text-sm rounded-xl shadow-lg flex items-center justify-center text-center px-2"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            Job Level
          </div>

          {/* Track headers */}
          {tracks.map((track, i) => (
            <div
              key={track}
              className="bg-gradient-to-br from-primary-blue to-accent-blue text-light-text font-bold text-sm rounded-xl shadow-lg flex items-center justify-center text-center px-2"
              style={{ gridColumn: i + 3, gridRow: 1 }}
            >
              {track}
            </div>
          ))}

          {/* Educational Level Header */}
          <div
            className="bg-gradient-to-br from-primary-blue to-accent-blue text-light-text font-bold text-sm rounded-xl shadow-lg flex items-center justify-center text-center px-2"
            style={{ gridColumn: 2, gridRow: 1 }}
          >
            Educational Level
          </div>

          {/* Level labels */}
          {levels.map((level, i) => (
            <div
              key={level}
              className="flex items-center justify-center rounded-xl border border-light-text/10 bg-deep-bg/80 text-center text-sm font-bold text-light-text shadow"
              style={{ gridColumn: 1, gridRow: i + 2 }}
            >
              {level}
            </div>
          ))}

          {/* Educational Level cells */}
          {/* Doctoral/ Post Doctoral: C-Level to Director (3 rows) */}
          <Link
            to={`/PQFLevelDescription?education=${encodeURIComponent("Doctoral/ Post Doctoral")}`}
            className={educationalCellClass}
            style={{
              gridColumn: 2,
              gridRow: "2 / span 3",
            }}
          >
            <span>Doctoral/ Post Doctoral</span>
          </Link>

          {/* Post Baccalaureate: Senior Manager to Senior Professional (3 rows) */}
          <Link
            to={`/PQFLevelDescription?education=${encodeURIComponent("Post Baccalaureate")}`}
            className={educationalCellClass}
            style={{
              gridColumn: 2,
              gridRow: "5 / span 3",
            }}
          >
            <span>Post Baccalaureate</span>
          </Link>

          {/* Baccalaureate: Professional (1 row) */}
          <Link
            to={`/PQFLevelDescription?education=${encodeURIComponent("Baccalaureate")}`}
            className={educationalCellClass}
            style={{
              gridColumn: 2,
              gridRow: "8 / span 1",
            }}
          >
            <span>Baccalaureate</span>
          </Link>

          {/* ACT Degree/ NC III, IV, Diploma: Senior Associate (1 row) */}
          <Link
            to={`/PQFLevelDescription?education=${encodeURIComponent("ACT Degree/ NC III, IV, Diploma")}`}
            className={educationalCellClass}
            style={{
              gridColumn: 2,
              gridRow: 9,
            }}
          >
            <span>ACT Degree/ NC III, IV, Diploma</span>
          </Link>

          {/* "NC II, III/ Sr. High School": Associate (1 row) */}
          <Link
            to={`/PQFLevelDescription?education=${encodeURIComponent("NC II, III/ Sr. High School")}`}
            className={educationalCellClass}
            style={{
              gridColumn: 2,
              gridRow: 10,
            }}
          >
            <span>NC II, III/ Sr. High School</span>
          </Link>


          {/* Roles */}
          {roles.map((r: Role) => (
            <Link
              key={r.Id}
              to={`/careers?careerId=${encodeURIComponent(r.Id)}`}
              className={clickableCellClass}
              style={{
                gridColumn: `${r.trackStart + 2} / span ${r.trackSpan}`,
                gridRow: `${r.level + 1} / span ${r.levelSpan ?? 1}`,
              }}
            >
              <span>{r.title}</span>
            </Link>
          ))}
        </div>
        
        <div className="mt-2 pt-1 text-xs text-light-text/70 text-right">
          <p>
            Data source: 
            <a 
              href="https://bit.ly/psf-aai?r=qr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-1 underline text-light-accent-blue transition hover:text-soft-lavender-blue"
            >
              Philippine Skills Framework – AI Initiative (PSF-AAI)
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

