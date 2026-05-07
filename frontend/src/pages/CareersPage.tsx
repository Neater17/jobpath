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
    <div className="page-panel-strong relative p-6 sm:p-8">
      <button type="button" onClick={() => navigate(-1)} className="absolute right-6 top-6 back-button">
        <svg className= "w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
        Back
      </button>

      <div className="mb-6 text-center">
        <h2 className="text-2xl font-semibold text-light-text sm:text-3xl">
          {selectedItem?.careerTitle ?? "Career Details"}
        </h2>
        <p className="mt-1 text-light-text/70">
          {selectedItem?.careerId
            ? `${selectedItem.careerLevel} - ${
                Array.isArray(selectedItem.careerPath)
                  ? selectedItem.careerPath.join(" / ")
                  : selectedItem.careerPath
              }`
            : loadingList
              ? "Loading careers..."
              : ""}
        </p>
      </div>

      {error ? <div className="mb-4 text-red-200">{error}</div> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="page-panel lg:col-span-2 space-y-6 border-light-text/25 bg-navy-bg/65 p-6 text-light-text shadow-[0_24px_80px_rgba(1,12,52,0.28)]">
          <div>
            <h3 className="text-lg uppercase tracking-widest text-light-text">Job Description</h3>
            <p className="mt-2 text-sm leading-relaxed text-light-text/90">
              {loadingDetail ? "Loading description..." : selectedItem?.description ?? "No description available."}
            </p>
          </div>

          <div className="mt-10 border-t border-light-text/20 pt-6 text-xs text-light-text/70">
            <h3 className="text-lg uppercase tracking-widest text-light-text">
              Critical Work Functions and Key Tasks
            </h3>
            <div className="mt-3 space-y-4 text-sm">
              {loadingDetail ? (
                <div className="text-light-text/70">Loading work functions...</div>
              ) : workFunctions.length === 0 ? (
                <div className="text-light-text/70">No work functions available.</div>
              ) : (
                workFunctions.map((wf) => (
                  <div key={wf.workFunctionId}>
                    <div className="font-semibold">{wf.workFunctionName}</div>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-light-text/90">
                      {(Array.isArray(wf.keyTasks) ? wf.keyTasks : []).map((task, idx) => (
                        <li key={`${wf.workFunctionId}-${idx}`}>{task}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-10 border-t border-light-text/20 pt-6 text-xs text-light-text/70">
            <h3 className="text-lg uppercase tracking-widest text-light-text">Performance Expectations</h3>
            <p className="mt-2 text-sm text-light-text/90">
              {loadingDetail
                ? "Loading expectations..."
                : selectedItem?.performanceExpectations ?? "No expectations listed."}
            </p>
          </div>

          <div className="mt-10 border-t border-light-text/20 pt-6 text-xs text-light-text/70">
            <p>
              {loadingDetail ? (
                "Loading data source..."
              ) : (
                <>
                  Data source:
                  <a
                    href="https://bit.ly/psf-aai?r=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline text-light-accent-blue transition hover:text-soft-lavender-blue"
                  >
                    Philippine Skills Framework - AI Initiative (PSF-AAI)
                  </a>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="page-panel space-y-6 border-light-text/25 bg-navy-bg/65 p-6 text-light-text shadow-[0_24px_80px_rgba(1,12,52,0.28)]">
          <div>
            <h3 className="mb-3 text-center uppercase tracking-widest text-light-text">
              Functional Skills and Competencies
            </h3>
            <div className="overflow-hidden rounded-2xl border border-light-text/25 bg-deep-bg/45">
              <div className="grid grid-cols-[1fr_100px] bg-light-text/10 text-sm font-semibold">
                <div className="px-3 py-2">Skill</div>
                <div className="px-3 py-2 text-center">Proficiency</div>
              </div>
              <div className="divide-y divide-light-text/10 text-sm">
                {loadingDetail ? (
                  <div className="px-3 py-2 text-light-text/70">Loading skills...</div>
                ) : functionalSkills.length === 0 ? (
                  <div className="px-3 py-2 text-light-text/70">No functional skills available.</div>
                ) : (
                  functionalSkills.map((skill) => (
                    <div key={skill.functionalSkillId} className="grid grid-cols-[1fr_100px]">
                      <div className="px-3 py-2">
                        <Link
                          to={`/functional-skills?skillId=${skill.functionalSkillId}`}
                          className="text-light-text transition hover:text-light-accent-blue hover:underline"
                        >
                          {skill.title}
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
            <h3 className="mb-3 text-center uppercase tracking-widest text-light-text">
              Enabling Skills and Competencies
            </h3>
            <div className="overflow-hidden rounded-2xl border border-light-text/25 bg-deep-bg/45">
              <div className="grid grid-cols-[1fr_120px] bg-light-text/10 text-sm font-semibold">
                <div className="px-3 py-2">Skill</div>
                <div className="px-3 py-2 text-center">Proficiency</div>
              </div>
              <div className="divide-y divide-light-text/10 text-sm">
                {loadingDetail ? (
                  <div className="px-3 py-2 text-light-text/70">Loading skills...</div>
                ) : enablingSkills.length === 0 ? (
                  <div className="px-3 py-2 text-light-text/70">No enabling skills available.</div>
                ) : (
                  enablingSkills.map((skill, idx) => (
                    <div key={`${skill.enablingSkillId}-${idx}`} className="grid grid-cols-[1fr_120px]">
                      <div className="px-3 py-2">
                        <Link
                          to={`/enabling-skills?skillId=${skill.enablingSkillId}`}
                          className="text-light-text transition hover:text-light-accent-blue hover:underline"
                        >
                          {skill.title}
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
