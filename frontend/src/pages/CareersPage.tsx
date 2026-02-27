import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchCareerById, fetchCareers, type Career } from "../services/api";

export default function CareersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Career[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Career | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryCareerId = searchParams.get("careerId");

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      setLoadingList(true);
      setError(null);
      try {
        const data = await fetchCareers();
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          if (!Array.isArray(data)) {
            setError("Career list response was not an array.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load careers");
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
        }
      }
    }

    loadItems();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const nextId = queryCareerId ?? items[0]?.careerId;
    if (nextId && nextId !== selectedId) {
      handleSelect(nextId, false);
    }
  }, [items, queryCareerId, selectedId]);

  async function handleSelect(id: string, updateUrl = true) {
    setSelectedId(id);
    setSelectedItem(null);
    setLoadingDetail(true);
    setError(null);
    if (updateUrl) {
      setSearchParams({ careerId: id }, { replace: true });
    }
    try {
      const item = await fetchCareerById(id);
      setSelectedItem(item);
    } catch (err) {
      setError("Failed to load career details");
    } finally {
      setLoadingDetail(false);
    }
  }

  const workFunctions = Array.isArray(selectedItem?.criticalWorkFunctionsandKeyTasks)
    ? selectedItem?.criticalWorkFunctionsandKeyTasks
    : [];
  const functionalSkills = Array.isArray(selectedItem?.functionalSkillsandCompetencies)
    ? selectedItem?.functionalSkillsandCompetencies
    : [];
  const enablingSkills = Array.isArray(selectedItem?.enablingSkillsandCompetencies)
    ? selectedItem?.enablingSkillsandCompetencies
    : [];

  return (
    <div className="bg-white/5 rounded-3xl p-6 sm:p-8 relative">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute right-6 top-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white/90 shadow-md transition hover:bg-white/25 hover:text-white"
      >
        <span className="text-lg">←</span>
        Back
      </button>
      
      <div className="mb-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold text-white">
          {selectedItem?.careerTitle ?? "Career Details"}
        </h2>
        <p className="text-white/70 mt-1">
          {selectedItem?.careerId
            ? `${selectedItem.careerLevel} · ${
                Array.isArray(selectedItem.careerPath)
                  ? selectedItem.careerPath.join(" / ")
                  : selectedItem.careerPath
              }`
            : ""}
        </p>
      </div>



      {error ? <div className="text-red-200 mb-4">{error}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 text-white space-y-6">
          <div>
            <h3 className="text-lg uppercase tracking-widest text-white">Job Description</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              {loadingDetail ? "Loading description..." : selectedItem?.description ?? "No description available."}
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-white/20 text-xs text-white/70"> 
            <h3 className="text-lg uppercase tracking-widest text-white">Critical Work Functions & Key Tasks</h3>
            <div className="mt-3 space-y-4 text-sm">
              {loadingDetail ? (
                <div className="text-white/70">Loading work functions...</div>
              ) : workFunctions.length === 0 ? (
                <div className="text-white/70">No work functions available.</div>
              ) : (
                workFunctions.map((wf) => (
                  <div key={wf.workFunctionId}>
                    <div className="font-semibold">{wf.workFunctionName}</div>
                    <ul className="list-disc list-inside text-white/90 mt-1 space-y-1">
                      {(Array.isArray(wf.keyTasks) ? wf.keyTasks : []).map((task, idx) => (
                        <li key={`${wf.workFunctionId}-${idx}`}>{task}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/20 text-xs text-white/70">
            <h3 className="text-lg uppercase tracking-widest text-white">Performance Expectations</h3>
            <p className="mt-2 text-sm text-white/90">
              {loadingDetail ? "Loading expectations..." : selectedItem?.performanceExpectations ?? "No expectations listed."}
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-white/20 text-xs text-white/70">
            <p>
              {loadingDetail ? (
                "Loading data source..."
              ) : (
                <>
                  Data source: 
                  <a 
                    href="https://psf-aai.vercel.app/careermap" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline ml-1"
                  >
                    Philippine Skills Framework – AI Initiative (PSF-AAI)
                  </a>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 text-white space-y-6">
          <div>
            <h3 className="text-center uppercase tracking-widest text-white mb-3">
              Functional Skills and Competencies
            </h3>
            <div className="overflow-hidden rounded-2xl border border-white/20">
              <div className="grid grid-cols-[1fr_100px] bg-white/20 text-sm font-semibold">
                <div className="px-3 py-2">Skill</div>
                <div className="px-3 py-2 text-center">Proficiency</div>
              </div>
              <div className="divide-y divide-white/10 text-sm">
                {loadingDetail ? (
                  <div className="px-3 py-2 text-white/70">Loading skills...</div>
                ) : functionalSkills.length === 0 ? (
                  <div className="px-3 py-2 text-white/70">No functional skills available.</div>
                ) : (
                  functionalSkills.map((skill) => (
                    <div key={skill.functionalSkillId} className="grid grid-cols-[1fr_100px]">
                      <div className="px-3 py-2">
                        <Link
                          to={`/functional-skills-page?skillId=${skill.functionalSkillId}`}
                          className="text-white hover:text-blue-300 hover:underline transition"
                        >
                          {skill.skillName}
                        </Link>
                      </div>
                      <div className="px-3 py-2 text-center">{skill.proficiencyLevel}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-center uppercase tracking-widest text-white mb-3">
              Enabling Skills and Competencies
            </h3>
            <div className="overflow-hidden rounded-2xl border border-white/20">
              <div className="grid grid-cols-[1fr_120px] bg-white/20 text-sm font-semibold">
                <div className="px-3 py-2">Skill</div>
                <div className="px-3 py-2 text-center">Proficiency</div>
              </div>
              <div className="divide-y divide-white/10 text-sm">
                {loadingDetail ? (
                  <div className="px-3 py-2 text-white/70">Loading skills...</div>
                ) : enablingSkills.length === 0 ? (
                  <div className="px-3 py-2 text-white/70">No enabling skills available.</div>
                ) : (
                  enablingSkills.map((skill, idx) => (
                    <div key={`${skill.enablingSkillId}-${idx}`} className="grid grid-cols-[1fr_120px]">
                      <div className="px-3 py-2">
                        <Link
                          to={`/enabling-skills-page?skillId=${skill.enablingSkillId}`}
                          className="text-white hover:text-blue-300 hover:underline transition"
                        >
                          {skill.skillName}
                        </Link>
                      </div>
                      <div className="px-3 py-2 text-center">{skill.proficiencyLevel}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
