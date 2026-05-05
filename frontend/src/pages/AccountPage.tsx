import React, { useEffect, useState } from "react";
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

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      navigate("/login");
    }
  };

  const handleDeleteModeToggle = () => {
    if (assessments.length === 0 || deletingAssessmentId) return;
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
    return <div className="py-8 text-center text-white/80">Loading account...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mx-auto max-w-6xl py-4">
      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
        <section className="bg-gradient-to-r from-blue-900 via-blue-700 to-cyan-500 px-8 py-10 text-white md:px-12">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
                Account
              </p>
              <h1 className="mt-3 text-4xl font-bold">{displayName}</h1>
              <p className="mt-3 max-w-2xl text-white/85">
                Manage your JOB-PATH account details and review the information
                currently stored for your profile.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[220px]">
              <Link
                to="/"
                className="block rounded-xl bg-blue-950/80 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-950"
              >
                Return Home
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-xl bg-blue-950/80 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-950"
              >
                Log Out
              </button>
            </div>
          </div>
        </section>

        <section className="p-8 md:p-12">
          <div className="grid items-stretch gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="flex">
              <div className="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-bold text-slate-900">Assessment History</h2>
                  <button
                    type="button"
                    onClick={handleDeleteModeToggle}
                    disabled={assessments.length === 0 || deletingAssessmentId !== null}
                    className="rounded-lg bg-blue-950/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleteMode ? "Cancel Delete" : "Delete Assessment"}
                  </button>
                </div>
                {deleteMode ? (
                  <div className="mt-4 rounded-2xl bg-blue-950 px-5 py-4 text-white shadow-lg">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/85">
                      Delete Mode
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      Select the assessment you want to delete from the list below.
                    </p>
                    {pendingDeleteAssessmentId ? (
                      <div className="mt-4 rounded-xl border border-rose-300/35 bg-white/10 p-4">
                        <p className="text-sm font-semibold text-white">
                          Delete this saved assessment?
                        </p>
                        <p className="mt-1 text-sm text-cyan-50/90">
                          This will remove the selected assessment from your history.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setPendingDeleteAssessmentId(null)}
                            disabled={deletingAssessmentId !== null}
                            className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Keep It
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleConfirmDeleteAssessment()}
                            disabled={deletingAssessmentId !== null}
                            className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingAssessmentId ? "Deleting..." : "Delete Assessment"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {loadingAssessments ? (
                  <p className="mt-2 text-sm text-slate-600">Loading saved assessments...</p>
                ) : assessments.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {assessments.map((assessment) => {
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
                                ? "border-rose-400 bg-rose-100"
                                : "border-rose-200 bg-rose-50 hover:border-rose-300 hover:bg-rose-100"
                              : isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                          }`}
                          disabled={isDeleting}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {assessment.selectedCareer.careerName ||
                                  assessment.recommendation.topCareer.careerName}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatAssessmentTabLabel(assessment.createdAt)}
                              </p>
                            </div>
                            {deleteMode ? (
                              <span className="text-xs font-semibold text-rose-700">
                                {isDeleting ? "Deleting..." : isPendingDelete ? "Confirm Below" : "Select"}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No saved assessments yet.</p>
                )}
                {assessmentError ? (
                  <p className="mt-3 text-sm text-rose-600">{assessmentError}</p>
                ) : null}
              </div>
            </div>

            <div className="flex">
              <div className="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-lg font-bold text-slate-900">Profile Details</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      First name
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {user.firstName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Last name
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {user.lastName || "Not provided"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Email address
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Gender
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {user.gender || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Birthday
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {formattedBirthday}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <AssessmentSnapshotPanel
              assessment={
                assessments.find((assessment) => assessment.id === selectedAssessmentId) ?? null
              }
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
    return <div className="py-8 text-center text-slate-600">Loading saved assessment...</div>;
  }

  if (error) {
    return <div className="py-8 text-center text-rose-600">{error}</div>;
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Saved Assessment
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {assessment.recommendation.topCareer.careerName}
            </h2>
            <p className="mt-1 text-slate-600">{assessment.recommendation.topCareer.pathName}</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Saved On
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">{savedAt}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-lg font-bold text-slate-900">Selected Career</h3>
          <p className="mt-4 text-sm uppercase tracking-[0.16em] text-slate-500">Career</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {assessment.selectedCareer.careerName || "Not provided"}
          </p>
          <p className="mt-1 text-slate-600">{assessment.selectedCareer.pathName || "Not provided"}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <MetricCard
              title="Chosen Match"
              value={pct(assessment.recommendation.selectedCareerMatch.recommendationConfidence)}
            />
            <MetricCard
              title="Chosen Rank"
              value={
                assessment.recommendation.selectedCareerMatch.rank
                  ? `#${assessment.recommendation.selectedCareerMatch.rank}`
                  : "N/A"
              }
            />
          </div>

          <JobPathSection
            title="Chosen Jobpath"
            steps={selectedJobPathSteps}
            emptyMessage="No saved jobpath is available for this chosen career."
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-lg font-bold text-slate-900">Recommended Career</h3>
          <p className="mt-4 text-sm uppercase tracking-[0.16em] text-slate-500">Top Match</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {assessment.recommendation.topCareer.careerName}
          </p>
          <p className="mt-1 text-slate-600">{assessment.recommendation.topCareer.pathName}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <MetricCard
              title="Recommendation Confidence"
              value={pct(assessment.recommendation.topCareer.recommendationConfidence)}
            />
            <MetricCard
              title="Same As Chosen"
              value={assessment.recommendation.selectedCareerMatch.isTopRecommendation ? "Yes" : "No"}
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
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-lg font-bold text-slate-900">Why This Was Recommended</h3>
          <p className="mt-4 leading-7 text-slate-700">
            {assessment.recommendation.explainabilitySummary.narrative}
          </p>
        </section>
      ) : null}

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

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-lg font-bold text-slate-900">Other Strong Alternatives</h3>
        <div className="mt-4 space-y-3">
          {assessment.recommendation.topAlternatives.length > 0 ? (
            assessment.recommendation.topAlternatives.map((career) => (
              <div key={`${assessment.id}-${career.careerName}`} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{career.careerName}</p>
                    <p className="mt-1 text-sm text-slate-600">{career.pathNames.join(", ")}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {pct(career.recommendationConfidence)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">No alternative careers were saved for this assessment.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-lg font-bold text-slate-900">Assessment Summary</h3>
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
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
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
    <div className="mt-6 border-t border-slate-200 pt-5">
      <p className="text-sm uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {steps.length > 0 ? (
        <div className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <div key={`${title}-${step.roleName}-${step.roleLevel}`} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Step {index + 1} · {step.stage}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">{step.roleName}</p>
                </div>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                  L{step.roleLevel}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-600">{emptyMessage}</p>
      )}
    </div>
  );
}

function PriorityGapSection({
  title,
  assessment,
  gaps,
  emptyMessage,
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
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {gaps.length > 0 ? (
          gaps.map((gap) => (
            <div key={`${assessment.id}-${title}-${gap.key}`} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{gap.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{gap.recommendation}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {learningLinksForGap(gap.label, gap.recommendation).map((link) => (
                      <a
                        key={`${assessment.id}-${title}-${gap.key}-${link.label}`}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-500/20"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-700">{pct(gap.gapScore)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-600">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
