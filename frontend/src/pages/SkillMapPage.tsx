import React from "react";
import { skillMap } from "../data/careerData";

export default function SkillMapPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">Skills Map</h2>
        <p className="text-white/80">Explore skills required for different careers across various paths</p>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 overflow-x-auto">
        <div className="min-w-[1400px]">
          <div className="grid grid-cols-7 gap-3 mb-4">
            <div className="text-white font-bold text-center"></div>
            {skillMap.headers.map((h) => (
              <div key={h} className="bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold py-3 px-2 rounded-lg text-center text-sm shadow-lg">
                {h}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3 mb-4">
            <div className="bg-white/20 text-white font-semibold py-2 px-2 rounded text-center text-xs">Career Role</div>
            {skillMap.roleRow.map((r) => (
              <div key={r} className="bg-blue-500/30 text-white py-2 px-2 rounded text-center text-xs font-medium">
                {r}
              </div>
            ))}
          </div>

          {skillMap.skills.map((s) => (
            <div key={s.name} className="grid grid-cols-7 gap-3 mb-2">
              <div className="bg-white/90 text-gray-800 font-semibold py-3 px-2 rounded text-xs flex items-center">
                {s.name}
              </div>
              {s.values.map((v, idx) => {
                const isNA = v === "N/A";
                return (
                  <div
                    key={`${s.name}-${idx}`}
                    className={
                      isNA
                        ? "bg-gray-200 py-3 px-2 rounded text-center text-xs text-gray-400"
                        : "bg-white hover:bg-blue-50 py-3 px-2 rounded text-center text-xs cursor-pointer transition shadow"
                    }
                  >
                    {isNA ? "N/A" : <span className="font-bold text-blue-600">{v}</span>}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="mt-8 bg-blue-500/20 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">Skill Level Legend:</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm text-white">
              <div>Level 1: <span className="font-semibold">Beginner</span></div>
              <div>Level 2: <span className="font-semibold">Basic</span></div>
              <div>Level 3: <span className="font-semibold">Intermediate</span></div>
              <div>Level 4: <span className="font-semibold">Advanced</span></div>
              <div>Level 5: <span className="font-semibold">Expert</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
