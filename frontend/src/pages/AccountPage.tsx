import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { careerPaths, resolveRecommendationCareerName } from "../data/careerData";
import {
  deleteAssessmentResult,
  fetchMyAssessmentResults,
  logoutUser,
  type SavedAssessment,
  type SavedAssessmentFocusSkill,
  type SavedAssessmentJobPathStep,
} from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function AccountPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const [assessments, setAssessments] = useState<SavedAssessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<"career_assessment" | "cv_assessment">("career_assessment");
  const [deleteMode, setDeleteMode] = useState(false);
  const [pendingDeleteAssessmentId, setPendingDeleteAssessmentId] = useState<string | null>(null);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !user) {
      setAssessments([]);
      setLoadingAssessments(false);
      return;
    }

    let active = true;

    async function loadAssessments() {
      try {
        setLoadingAssessments(true);
        setAssessmentError(null);
        const results = await fetchMyAssessmentResults();
        if (!active) return;
        setAssessments(results);
        setSelectedAssessmentId((current) =>
          current && results.some((assessment) => assessment.id === current)
            ? current
            : null
        );
      } catch (error) {
        if (!active) return;
        setAssessmentError(
          error instanceof Error ? error.message : "Unable to load saved assessments right now."
        );
        setAssessments([]);
        setSelectedAssessmentId(null);
      } finally {
        if (active) setLoadingAssessments(false);
      }
    }

    void loadAssessments();
    return () => {
      active = false;
    };
  }, [hydrated, user]);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.firstName ||
    "User";
  const formattedBirthday = user?.birthday
    ? new Date(`${user.birthday}T00:00:00Z`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : "Not provided";
  const assessmentEntries = useMemo(
    () => assessments.filter((assessment) => assessment.assessmentType === "career_assessment"),
    [assessments]
  );
  const cvScanEntries = useMemo(
    () => assessments.filter((assessment) => assessment.assessmentType === "cv_assessment"),
    [assessments]
  );
  const visibleAssessments = historyTab === "career_assessment" ? assessmentEntries : cvScanEntries;
  const selectedVisibleAssessment =
    visibleAssessments.find((assessment) => assessment.id === selectedAssessmentId) ?? null;

  useEffect(() => {
    if (deleteMode) {
      setPendingDeleteAssessmentId(null);
    }
  }, [historyTab, deleteMode]);

  useEffect(() => {
    if (visibleAssessments.length === 0) {
      setSelectedAssessmentId(null);
      return;
    }

    setSelectedAssessmentId((current) =>
      current && visibleAssessments.some((assessment) => assessment.id === current)
        ? current
        : visibleAssessments[0].id
    );
  }, [visibleAssessments]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      navigate("/login");
    }
  };

  const handleDeleteModeToggle = () => {
    if (visibleAssessments.length === 0 || deletingAssessmentId) return;
    setDeleteMode((current) => {
      const next = !current;
      if (!next) {
        setPendingDeleteAssessmentId(null);
      }
      return next;
    });
  };

  const handleDeleteSelection = (assessmentId: string) => {
    if (deletingAssessmentId) return;
    setPendingDeleteAssessmentId((current) => (current === assessmentId ? null : assessmentId));
    setAssessmentError(null);
  };

  const handleConfirmDeleteAssessment = async () => {
    if (!pendingDeleteAssessmentId || deletingAssessmentId) return;

    if (deletingAssessmentId) return;

    try {
      setDeletingAssessmentId(pendingDeleteAssessmentId);
      setAssessmentError(null);
      await deleteAssessmentResult(pendingDeleteAssessmentId);
      setAssessments((current) =>
        current.filter((assessment) => assessment.id !== pendingDeleteAssessmentId)
      );
      setSelectedAssessmentId((current) =>
        current === pendingDeleteAssessmentId ? null : current
      );
      setPendingDeleteAssessmentId(null);
      setDeleteMode(false);
    } catch (error) {
      setAssessmentError(
        error instanceof Error ? error.message : "Unable to delete this assessment right now."
      );
    } finally {
      setDeletingAssessmentId(null);
    }
  };

  if (!hydrated) {
    return <div className="py-8 text-center text-light-text/80">Loading account...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mx-auto max-w-6xl py-4">
      <div className="overflow-hidden rounded-3xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(1,12,52,0.98),rgba(7,24,84,0.94))] shadow-[0_28px_90px_rgba(1,12,52,0.38)] backdrop-blur-xl">
        <section className="bg-gradient-to-r from-deep-bg via-navy-bg to-primary-blue px-8 py-10 text-light-text md:px-12">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="mt-3 text-4xl font-bold">{displayName}</h1>
              <p className="mt-3 max-w-2xl text-light-text/85">
                Manage your JOB-PATH account details and review the information
                currently stored for your profile.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[220px]">
              <Link
                to="/"
                className="block rounded-xl border border-light-accent-blue/25 bg-deep-bg/85 px-4 py-3 text-center font-semibold text-light-text transition hover:border-light-accent-blue/50 hover:bg-navy-bg"
              >
                Return Home
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-xl border border-light-accent-blue/25 bg-deep-bg/85 px-4 py-3 text-center font-semibold text-light-text transition hover:border-light-accent-blue/50 hover:bg-navy-bg"
              >
                Log Out
              </button>
            </div>
          </div>
        </section>

        <section className="bg-deep-bg/55 p-8 md:p-12">
          <div className="grid items-stretch gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="flex">
              <div className="flex h-full w-full flex-col rounded-2xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(11,41,152,0.92),rgba(7,24,84,0.94))] p-6 shadow-[0_22px_60px_rgba(1,12,52,0.28)]">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-bold text-light-text">Saved History</h2>
                  <button
                    type="button"
                    onClick={handleDeleteModeToggle}
                    disabled={visibleAssessments.length === 0 || deletingAssessmentId !== null}
                    className="rounded-lg bg-navy-bg/80 px-3 py-2 text-xs font-semibold text-light-text transition hover:bg-primary-blue disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleteMode
                      ? "Cancel Delete"
                      : historyTab === "career_assessment"
                        ? "Delete Assessment"
                        : "Delete CV Scan"}
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-light-text/15 bg-deep-bg/80 p-2 shadow-[0_12px_30px_rgba(1,12,52,0.18)]">
                  <button
                    type="button"
                    onClick={() => setHistoryTab("career_assessment")}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      historyTab === "career_assessment"
                        ? "bg-primary-blue text-light-text"
                        : "text-light-text hover:bg-light-accent-blue/20"
                    }`}
                  >
                    Assessments ({assessmentEntries.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab("cv_assessment")}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      historyTab === "cv_assessment"
                        ? "bg-primary-blue text-light-text"
                        : "text-light-text hover:bg-light-accent-blue/20"
                    }`}
                  >
                    CV Scans ({cvScanEntries.length})
                  </button>
                </div>
                {deleteMode ? (
                  <div className="mt-4 rounded-2xl border border-light-text/15 bg-[linear-gradient(180deg,rgba(1,12,52,0.98),rgba(7,24,84,0.92))] px-5 py-4 text-light-text shadow-[0_16px_40px_rgba(1,12,52,0.24)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-light-accent-blue/85">
                      Delete Mode
                    </p>
                    <p className="mt-2 text-sm font-semibold text-light-text">
                      Select the {historyTab === "career_assessment" ? "assessment" : "CV scan"} you want to delete from the list below.
                    </p>
                    {pendingDeleteAssessmentId ? (
                      <div className="mt-4 rounded-xl border border-rose-300/35 bg-rose-950/25 p-4 shadow-[0_12px_30px_rgba(1,12,52,0.16)]">
                        <p className="text-sm font-semibold text-light-text">
                          Delete this saved {historyTab === "career_assessment" ? "assessment" : "CV scan"}?
                        </p>
                        <p className="mt-1 text-sm text-light-accent-blue/90">
                          This will remove the selected {historyTab === "career_assessment" ? "assessment" : "CV scan"} from your history.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setPendingDeleteAssessmentId(null)}
                            disabled={deletingAssessmentId !== null}
                            className="rounded-lg border border-light-text/25 bg-card-bg/40 px-3 py-2 text-xs font-semibold text-light-text transition hover:border-light-accent-blue/50 hover:bg-primary-blue/30 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Keep It
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleConfirmDeleteAssessment()}
                            disabled={deletingAssessmentId !== null}
                            className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-light-text transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingAssessmentId
                              ? "Deleting..."
                              : historyTab === "career_assessment"
                                ? "Delete Assessment"
                                : "Delete CV Scan"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {loadingAssessments ? (
                  <p className="mt-2 text-sm text-muted-gray-blue">Loading saved assessments...</p>
                ) : visibleAssessments.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {visibleAssessments.map((assessment) => {
                      const isSelected = assessment.id === selectedAssessmentId;
                      const isDeleting = deletingAssessmentId === assessment.id;
                      const isPendingDelete = pendingDeleteAssessmentId === assessment.id;
                      return (
                        <button
                          key={assessment.id}
                          type="button"
                          onClick={() =>
                            deleteMode
                              ? handleDeleteSelection(assessment.id)
                              : setSelectedAssessmentId((current) =>
                                  current === assessment.id ? null : assessment.id
                                )
                          }
                          className={`block w-full rounded-xl border px-4 py-3 text-left transition ${
                            deleteMode
                              ? isPendingDelete
                                ? "border-rose-300 bg-rose-950/45"
                                : "border-rose-300/60 bg-rose-950/25 hover:border-rose-200 hover:bg-rose-950/40"
                              : isSelected
                                ? "border-light-accent-blue/70 bg-deep-bg/85 shadow-[0_14px_30px_rgba(1,12,52,0.2)]"
                                : "border-light-text/15 bg-deep-bg/72 hover:border-light-accent-blue/60 hover:bg-navy-bg/88"
                          }`}
                          disabled={isDeleting}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-light-text">
                                {assessment.selectedCareer.careerName ||
                                  assessment.recommendation.topCareer.careerName}
                              </p>
                              <p className="mt-1 text-xs text-muted-gray-blue">
                                {assessmentTypeLabel(assessment.assessmentType)} · {formatAssessmentTabLabel(assessment.createdAt)}
                              </p>
                            </div>
                            {deleteMode ? (
                              <span className="text-xs font-semibold text-rose-200">
                                {isDeleting ? "Deleting..." : isPendingDelete ? "Confirm Below" : "Select"}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-gray-blue">
                    {historyTab === "career_assessment"
                      ? "No saved assessments yet."
                      : "No saved CV scans yet."}
                  </p>
                )}
                {assessmentError ? (
                  <p className="mt-3 text-sm text-rose-300">{assessmentError}</p>
                ) : null}
              </div>
            </div>

            <div className="flex">
              <div className="flex h-full w-full flex-col rounded-2xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(11,41,152,0.92),rgba(7,24,84,0.94))] p-6 shadow-[0_22px_60px_rgba(1,12,52,0.28)]">
                <h2 className="text-lg font-bold text-light-text">Profile Details</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-light-text/12 bg-deep-bg/55 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-gray-blue">
                      First name
                    </p>
                    <p className="mt-1 text-base font-medium text-light-text">
                      {user.firstName || "Not provided"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-light-text/12 bg-deep-bg/55 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-gray-blue">
                      Last name
                    </p>
                    <p className="mt-1 text-base font-medium text-light-text">
                      {user.lastName || "Not provided"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-light-text/12 bg-deep-bg/55 p-4 shadow-sm sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-gray-blue">
                      Email address
                    </p>
                    <p className="mt-1 text-base font-medium text-light-text">
                      {user.email}
                    </p>
                  </div>
                  <div className="rounded-xl border border-light-text/12 bg-deep-bg/55 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-gray-blue">
                      Gender
                    </p>
                    <p className="mt-1 text-base font-medium text-light-text">
                      {user.gender || "Not provided"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-light-text/12 bg-deep-bg/55 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-gray-blue">
                      Birthday
                    </p>
                    <p className="mt-1 text-base font-medium text-light-text">
                      {formattedBirthday}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <AssessmentSnapshotPanel
              assessment={selectedVisibleAssessment}
              loading={loadingAssessments}
              error={assessmentError}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function formatAssessmentTabLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function assessmentTypeLabel(type: SavedAssessment["assessmentType"]) {
  return type === "cv_assessment" ? "CV Scan" : "Assessment";
}

function pct(value: number | null) {
  if (value === null) return "N/A";
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function learningLinksForGap(label: string, recommendation: string) {
  const query = encodeURIComponent(`${label} ${recommendation}`);
  const links = [
    {
      label: "Find Course",
      href: `https://www.coursera.org/search?query=${query}`,
    },
    {
      label: "Watch Tutorials",
      href: `https://www.youtube.com/results?search_query=${query}`,
    },
  ];

  if (/(data|machine learning|statistics|visualization|sql|mlops)/i.test(`${label} ${recommendation}`)) {
    links.push({
      label: "Practice Labs",
      href: "https://www.kaggle.com/learn",
    });
  }

  return links;
}

function getRecommendedPriorityGaps(assessment: SavedAssessment) {
  return assessment.recommendation.recommendedPriorityGaps ??
    assessment.recommendation.priorityGaps ??
    [];
}

function getSelectedCareerPriorityGaps(assessment: SavedAssessment) {
  return assessment.recommendation.selectedCareerPriorityGaps ??
    assessment.recommendation.priorityGaps ??
    [];
}

function buildSavedJobPathSteps(
  pathKey: SavedAssessment["selectedCareer"]["pathKey"] | SavedAssessment["recommendation"]["topCareer"]["pathKey"] | null | undefined,
  careerName: string | null | undefined,
  gaps: SavedAssessmentFocusSkill[]
): SavedAssessmentJobPathStep[] {
  if (!pathKey || !careerName) return [];

  const normalizedCareerName = resolveRecommendationCareerName(pathKey, careerName, null);
  if (!normalizedCareerName) return [];

  const path = careerPaths[pathKey];
  if (!path) return [];

  const orderedRoles = [...path.careers].sort((left, right) => left.level - right.level);
  const targetIndex = orderedRoles.findIndex((role) => role.name === normalizedCareerName);
  if (targetIndex === -1) return [];

  return orderedRoles.slice(0, targetIndex + 1).map((role, index) => ({
    roleName: role.name,
    roleLevel: role.level,
    stage: index === 0 ? "Starting Role" : index === targetIndex ? "Target Role" : "Progression Role",
    focusSkills: gaps.slice(index, index + 2),
  }));
}

function getSelectedCareerJobPathSteps(assessment: SavedAssessment) {
  return assessment.recommendation.selectedCareerJobPathSteps ??
    buildSavedJobPathSteps(
      assessment.selectedCareer.pathKey,
      assessment.selectedCareer.careerName,
      getSelectedCareerPriorityGaps(assessment)
    );
}

function getRecommendedCareerJobPathSteps(assessment: SavedAssessment) {
  return assessment.recommendation.recommendedJobPathSteps ??
    buildSavedJobPathSteps(
      assessment.recommendation.topCareer.pathKey,
      assessment.recommendation.topCareer.careerName,
      getRecommendedPriorityGaps(assessment)
    );
}

function AssessmentSnapshotPanel({
  assessment,
  loading,
  error,
}: {
  assessment: SavedAssessment | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return <div className="py-8 text-center text-muted-gray-blue">Loading saved assessment...</div>;
  }

  if (error) {
    return <div className="py-8 text-center text-rose-300">{error}</div>;
  }

  if (!assessment) {
    return null;
  }

  const savedAt = new Date(assessment.createdAt).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const selectedCareerGaps = getSelectedCareerPriorityGaps(assessment);
  const recommendedCareerGaps = getRecommendedPriorityGaps(assessment);
  const selectedJobPathSteps = getSelectedCareerJobPathSteps(assessment);
  const recommendedJobPathSteps = getRecommendedCareerJobPathSteps(assessment);
  const isCvAssessment = assessment.assessmentType === "cv_assessment";
  const selectedCareerName = assessment.selectedCareer.careerName;
  const selectedCareerPathName = assessment.selectedCareer.pathName;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(11,41,152,0.9),rgba(7,24,84,0.92))] p-6 shadow-[0_18px_50px_rgba(1,12,52,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-gray-blue">
              Saved {isCvAssessment ? "CV Scan" : "Assessment"}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-light-text">
              {assessment.recommendation.topCareer.careerName}
            </h2>
            <p className="mt-1 text-soft-lavender-blue">{assessment.recommendation.topCareer.pathName}</p>
          </div>
          <div className="rounded-xl border border-light-text/15 bg-deep-bg/78 px-4 py-3 text-right shadow-[0_10px_25px_rgba(1,12,52,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-gray-blue">
              Saved On
            </p>
            <p className="mt-1 text-sm font-medium text-light-text">{savedAt}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(11,41,152,0.9),rgba(7,24,84,0.92))] p-6 shadow-[0_18px_50px_rgba(1,12,52,0.24)]">
          <h3 className="text-lg font-bold text-light-text">
            {isCvAssessment ? "CV Profile Snapshot" : "Selected Career"}
          </h3>
          <p className="mt-4 text-sm uppercase tracking-[0.16em] text-muted-gray-blue">
            {isCvAssessment ? "Detected Title" : "Career"}
          </p>
          <p className="mt-1 text-xl font-semibold text-light-text">
            {selectedCareerName || (isCvAssessment ? "No title detected" : "Not provided")}
          </p>
          <p className="mt-1 text-soft-lavender-blue">
            {selectedCareerPathName || (isCvAssessment ? "Derived from uploaded CV content" : "Not provided")}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <MetricCard
              title={isCvAssessment ? "Matched Signals" : "Chosen Match"}
              value={
                isCvAssessment
                  ? `${assessment.answers.answeredCount}`
                  : pct(assessment.recommendation.selectedCareerMatch.recommendationConfidence)
              }
            />
            <MetricCard
              title={isCvAssessment ? "Input Source" : "Chosen Rank"}
              value={
                isCvAssessment
                  ? "CV Scan"
                  : assessment.recommendation.selectedCareerMatch.rank
                    ? `#${assessment.recommendation.selectedCareerMatch.rank}`
                    : "N/A"
              }
            />
          </div>

          {isCvAssessment ? null : (
            <JobPathSection
              title="Chosen Jobpath"
              steps={selectedJobPathSteps}
              emptyMessage="No saved jobpath is available for this chosen career."
            />
          )}
        </section>

        <section className="rounded-2xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(11,41,152,0.9),rgba(7,24,84,0.92))] p-6 shadow-[0_18px_50px_rgba(1,12,52,0.24)]">
          <h3 className="text-lg font-bold text-light-text">Recommended Career</h3>
          <p className="mt-4 text-sm uppercase tracking-[0.16em] text-muted-gray-blue">Top Match</p>
          <p className="mt-1 text-xl font-semibold text-light-text">
            {assessment.recommendation.topCareer.careerName}
          </p>
          <p className="mt-1 text-soft-lavender-blue">{assessment.recommendation.topCareer.pathName}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-1">
            <MetricCard
              title="Recommendation Confidence"
              value={pct(assessment.recommendation.topCareer.recommendationConfidence)}
            />
          </div>

          <JobPathSection
            title="Recommended Jobpath"
            steps={recommendedJobPathSteps}
            emptyMessage="No saved jobpath is available for this recommendation."
          />
        </section>
      </div>

      {assessment.recommendation.explainabilitySummary?.narrative ? (
        <section className="rounded-2xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(11,41,152,0.9),rgba(7,24,84,0.92))] p-6 shadow-[0_18px_50px_rgba(1,12,52,0.24)]">
          <h3 className="text-lg font-bold text-light-text">Why This Was Recommended</h3>
          <p className="mt-4 leading-7 text-light-text">
            {assessment.recommendation.explainabilitySummary.narrative}
          </p>
        </section>
      ) : null}

      {isCvAssessment ? (
        <>
          <PriorityGapSection
            title="Recommended Career Priority Gaps"
            assessment={assessment}
            gaps={recommendedCareerGaps}
            emptyMessage="No saved recommended-career gaps for this CV scan."
            columns={2}
          />

          <section className="rounded-2xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(11,41,152,0.9),rgba(7,24,84,0.92))] p-6 shadow-[0_18px_50px_rgba(1,12,52,0.24)]">
            <h3 className="text-lg font-bold text-light-text">Other Strong Alternatives</h3>
            <div className="mt-4 space-y-3">
              {assessment.recommendation.topAlternatives.length > 0 ? (
                assessment.recommendation.topAlternatives.map((career) => (
                  <div key={`${assessment.id}-${career.careerName}`} className="rounded-xl border border-light-text/10 bg-navy-bg/80 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-light-text">{career.careerName}</p>
                        <p className="mt-1 text-sm text-muted-gray-blue">{career.pathNames.join(", ")}</p>
                      </div>
                      <p className="text-sm font-semibold text-light-text">
                        {pct(career.recommendationConfidence)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-gray-blue">No alternative careers were saved for this assessment.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(11,41,152,0.9),rgba(7,24,84,0.92))] p-6 shadow-[0_18px_50px_rgba(1,12,52,0.24)]">
            <h3 className="text-lg font-bold text-light-text">CV Scan Summary</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Matched Signals" value={`${assessment.answers.answeredCount}`} />
              <MetricCard title="Stored Skills" value={`${assessment.answers.iHave.length}`} />
              <MetricCard
                title="Completion Rate"
                value={pct(assessment.recommendation.summary.completionRate)}
              />
              <MetricCard
                title="Overall Confidence"
                value={pct(assessment.recommendation.summary.confidence)}
              />
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <PriorityGapSection
              title="Selected Career Priority Gaps"
              assessment={assessment}
              gaps={selectedCareerGaps}
              emptyMessage="No saved selected-career gaps for this assessment."
            />
            <PriorityGapSection
              title="Recommended Career Priority Gaps"
              assessment={assessment}
              gaps={recommendedCareerGaps}
              emptyMessage="No saved recommended-career gaps for this assessment."
            />
          </div>
          <section className="rounded-2xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(11,41,152,0.9),rgba(7,24,84,0.92))] p-6 shadow-[0_18px_50px_rgba(1,12,52,0.24)]">
            <h3 className="text-lg font-bold text-light-text">Other Strong Alternatives</h3>
            <div className="mt-4 space-y-3">
              {assessment.recommendation.topAlternatives.length > 0 ? (
                assessment.recommendation.topAlternatives.map((career) => (
                  <div key={`${assessment.id}-${career.careerName}`} className="rounded-xl border border-light-text/10 bg-navy-bg/80 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-light-text">{career.careerName}</p>
                        <p className="mt-1 text-sm text-muted-gray-blue">{career.pathNames.join(", ")}</p>
                      </div>
                      <p className="text-sm font-semibold text-light-text">
                        {pct(career.recommendationConfidence)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-gray-blue">No alternative careers were saved for this assessment.</p>
              )}
            </div>
          </section>
        </>
      )}

      {isCvAssessment ? null : (
        <section className="rounded-2xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(11,41,152,0.9),rgba(7,24,84,0.92))] p-6 shadow-[0_18px_50px_rgba(1,12,52,0.24)]">
          <h3 className="text-lg font-bold text-light-text">Assessment Summary</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Answered Questions" value={`${assessment.answers.answeredCount}`} />
            <MetricCard title="Total Questions" value={`${assessment.answers.totalQuestions}`} />
            <MetricCard
              title="Completion Rate"
              value={pct(assessment.recommendation.summary.completionRate)}
            />
            <MetricCard
              title="Overall Confidence"
              value={pct(assessment.recommendation.summary.confidence)}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-light-text/12 bg-deep-bg/72 p-4 shadow-[0_10px_24px_rgba(1,12,52,0.16)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-gray-blue">{title}</p>
      <p className="mt-2 text-2xl font-bold text-light-text">{value}</p>
    </div>
  );
}

function JobPathSection({
  title,
  steps,
  emptyMessage,
}: {
  title: string;
  steps: SavedAssessmentJobPathStep[];
  emptyMessage: string;
}) {
  return (
    <div className="mt-6 border-t border-light-text/20 pt-5">
      <p className="text-sm uppercase tracking-[0.16em] text-muted-gray-blue">{title}</p>
      {steps.length > 0 ? (
        <div className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <div key={`${title}-${step.roleName}-${step.roleLevel}`} className="rounded-xl border border-light-text/12 bg-deep-bg/72 p-4 shadow-[0_10px_24px_rgba(1,12,52,0.16)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-gray-blue">
                    Step {index + 1} · {step.stage}
                  </p>
                  <p className="mt-1 font-semibold text-light-text">{step.roleName}</p>
                </div>
                <span className="rounded-lg border border-light-text/20 bg-card-bg/70 px-2 py-1 text-xs font-semibold text-soft-lavender-blue">
                  L{step.roleLevel}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-gray-blue">{emptyMessage}</p>
      )}
    </div>
  );
}

function PriorityGapSection({
  title,
  assessment,
  gaps,
  emptyMessage,
  columns = 1,
}: {
  title: string;
  assessment: SavedAssessment;
  gaps: Array<{
    key: string;
    label: string;
    gapScore: number;
    recommendation: string;
  }>;
  emptyMessage: string;
  columns?: 1 | 2;
}) {
  return (
    <section className="rounded-2xl border border-light-text/20 bg-[linear-gradient(180deg,rgba(11,41,152,0.9),rgba(7,24,84,0.92))] p-6 shadow-[0_18px_50px_rgba(1,12,52,0.24)]">
      <h3 className="text-lg font-bold text-light-text">{title}</h3>
      <div className={`mt-4 ${columns === 2 ? "grid gap-4 lg:grid-cols-2" : "space-y-3"}`}>
        {gaps.length > 0 ? (
          gaps.map((gap) => (
            <div key={`${assessment.id}-${title}-${gap.key}`} className="rounded-xl border border-light-text/12 bg-deep-bg/72 p-4 shadow-[0_10px_24px_rgba(1,12,52,0.16)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-light-text">{gap.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-gray-blue">{gap.recommendation}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {learningLinksForGap(gap.label, gap.recommendation).map((link) => (
                      <a
                        key={`${assessment.id}-${title}-${gap.key}-${link.label}`}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-light-accent-blue/40 bg-light-accent-blue/10 px-2.5 py-1 text-xs font-semibold text-light-accent-blue transition hover:bg-primary-blue/35 hover:text-light-text"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-semibold text-light-text">{pct(gap.gapScore)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-gray-blue">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
