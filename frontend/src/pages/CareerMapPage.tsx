import React from "react";
import { Link } from "react-router-dom";
import { tracks, levels, roles, Role } from "../data/careerData";

export default function CareerGrid() {


  return (
    <div className="mb-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2">Career Map</h2>
          <p className="text-white/80">
            Explore different career paths and their progression levels
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

      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-3 overflow-x-auto relative">
        {/* GRID */}
        <div
          className="grid gap-2 sm:gap-4 w-full relative"
          style={{
            gridTemplateColumns: `minmax(110px, 160px) repeat(${tracks.length}, minmax(140px, 1fr))`,
            gridAutoRows: "minmax(70px, auto)",
          }}
        >
          {/* Track headers */}
          {tracks.map((track, i) => (
            <div
              key={track}
              className="bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center text-center px-2"
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              {track}
            </div>
          ))}

          {/* Level labels */}
          {levels.map((level, i) => (
            <div
              key={level}
              className="bg-white/20 text-white font-bold rounded-xl shadow flex items-center justify-center text-center text-sm"
              style={{ gridColumn: 1, gridRow: i + 2 }}
            >
              {level}
            </div>
          ))}

          {/* Roles */}
          {roles.map((r: Role) => (
            <Link
              key={r.Id}
              to={`/careers?careerId=${encodeURIComponent(r.Id)}`}
              className="bg-white text-gray-800 rounded-2xl shadow flex items-center justify-center text-center text-sm font-medium p-2 cursor-pointer transition hover:bg-white/90 hover:shadow-lg"
              style={{
                gridColumn: `${r.trackStart + 1} / span ${r.trackSpan}`,
                gridRow: `${r.level + 1} / span ${r.levelSpan ?? 1}`,
              }}
            >
              {r.title}
            </Link>
          ))}
        </div>
        
        <div className="mt-2 pt-1 text-xs text-white/70 text-right">
          <p>
            Data source: 
            <a 
              href="https://psf-aai.vercel.app/careermap" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline ml-1"
            >
              Philippine Skills Framework – AI Initiative (PSF-AAI)
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}