import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ModelSnapshotVisualizations } from "../components/ModelSnapshotVisualizations";
import {
  fetchRecommendationModelInfo,
  fetchRecommendationModelSnapshot,
  type RecommendationModelInfo,
  type RecommendationModelSnapshot,
} from "../services/api";

export default function HowItWorksPage() {
  const [modelInfo, setModelInfo] = useState<RecommendationModelInfo | null>(null);
  const [modelSnapshot, setModelSnapshot] = useState<RecommendationModelSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVisualizations, setShowVisualizations] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadModelInfo() {
      setLoading(true);
      setError(null);
      try {
        const model = await fetchRecommendationModelInfo();
        if (active) {
          setModelInfo(model);
        }
      } catch {
        if (active) {
          setError("Model details are unavailable right now. Showing the recommendation flow overview instead.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadModelInfo();
    return () => {
      active = false;
    };
  }, []);

  async function handleToggleVisualizations() {
    if (showVisualizations) {
      setShowVisualizations(false);
      return;
    }

    setShowVisualizations(true);
    if (modelSnapshot || snapshotLoading) {
      return;
    }

    setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      const snapshot = await fetchRecommendationModelSnapshot();
      setModelSnapshot(snapshot);
    } catch {
      setSnapshotError(
        "The artifact-backed visualization snapshot is unavailable right now. The live model summary above is still current."
      );
    } finally {
      setSnapshotLoading(false);
    }
  }

  return (
    <div className="space-y-8 py-4">
      <div className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-lg md:p-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">How JOB-PATH Works</h2>
            <p className="max-w-4xl text-lg text-white/90">
              JOB-PATH converts your guided assessment answers or CV and resume signals into competency
              scores, runs them through multiple machine learning models, and shows why a specific
              career is recommended for you alongside growth gaps and alternative paths. If a CV upload
              is not recognized as a usable resume or skills profile, the system may flag it instead of
              generating a direct recommendation.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <InfoChip label={`Features: ${modelInfo?.featureCount ?? 14}`} />
              <InfoChip label={`Career Profiles: ${modelInfo?.classCount ?? 30}`} />
              <InfoChip label={`Training Samples: ${modelInfo?.sampleCount ?? "N/A"}`} />
              <InfoChip label={`Data Source: ${modelInfo?.dataSource ?? "System Default"}`} />
            </div>
            {loading ? <p className="mt-3 text-sm text-cyan-100/90">Loading live model details...</p> : null}
            {error ? <p className="mt-3 text-sm text-amber-100/90">{error}</p> : null}
          </div>
          <Link
            to="/"
            className="self-start inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white/90 shadow-md transition hover:bg-white/25 hover:text-white"
          >
            <span className="text-lg">&larr;</span>
            Back to Home
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StepCard
          step="1"
          title="Choose Your Input"
          description="You can complete the guided assessment or upload a CV to generate an initial profile."
        />
        <StepCard
          step="2"
          title="Build Competency Signals"
          description={`The system converts your answers or CV evidence into ${modelInfo?.featureCount ?? 14} competency signals.`}
        />
        <StepCard
          step="3"
          title="Run 3 Models"
          description="Recommendations are ranked using Logistic Regression, Random Forest, and Gradient Boosting."
        />
        <StepCard
          step="4"
          title="Compute Ensemble Score"
          description="Final ranking blends the base model outputs into one recommendation score before confidence and gap analysis are applied."
        />
        <StepCard
          step="5"
          title="Explain The Result"
          description="The app shows explainability insights so you can see which signals helped or hurt the top recommendation."
        />
        <StepCard
          step="6"
          title="Highlight Growth Gaps"
          description="You receive development priorities and alternative career options to guide next steps."
        />
      </div>

      <div className="rounded-3xl border border-cyan-200/25 bg-cyan-400/10 p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Note</p>
        <h3 className="mt-3 text-2xl font-bold text-white">When to use manual assessment vs CV upload</h3>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/80">
          The CV reader is useful for a fast starting point, but the guided assessment is usually
          stronger when you want the most accurate fit score because resumes often omit context,
          recent skill growth, and work you can do even when it is not spelled out in the document.
        </p>
      </div>

      <div className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <h3 className="mb-4 text-2xl font-bold text-white">Current Model Snapshot</h3>
        <div className="grid gap-4 md:grid-cols-1">
          <InfoTile label="Model Version" value={modelInfo?.modelVersion ? `v${modelInfo.modelVersion}` : "N/A"} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void handleToggleVisualizations();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-200/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-400/20"
          >
            <span className="text-base">{showVisualizations ? "-" : "+"}</span>
            {showVisualizations ? "Hide Visualizations" : "View Model Visualizations"}
          </button>
        </div>
        {snapshotLoading ? (
          <p className="mt-3 text-sm text-cyan-100/90">Loading artifact-backed model visualizations...</p>
        ) : null}
        {snapshotError ? <p className="mt-3 text-sm text-amber-100/90">{snapshotError}</p> : null}
      </div>

      {showVisualizations && modelSnapshot ? (
        <ModelSnapshotVisualizations snapshot={modelSnapshot} />
      ) : null}
    </div>
  );
}

function InfoChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs text-white/90">
      {label}
    </span>
  );
}

function StepCard(props: { step: string; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-lg">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/25 font-bold text-cyan-100">
        {props.step}
      </div>
      <h4 className="mt-4 text-xl font-bold text-white">{props.title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-white/80">{props.description}</p>
    </div>
  );
}

function InfoTile(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-4">
      <p className="text-xs uppercase tracking-wide text-white/70">{props.label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{props.value}</p>
    </div>
  );
}
