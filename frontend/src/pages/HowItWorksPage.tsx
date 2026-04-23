import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRecommendationModelInfo, type RecommendationModelInfo } from "../services/api";

export default function HowItWorksPage() {
  const [modelInfo, setModelInfo] = useState<RecommendationModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const ensembleWeights = useMemo(
    () =>
      modelInfo?.ensembleWeights ?? {
        logistic: 0.35,
        randomForest: 0.45,
        gradientBoosting: 0.2,
      },
    [modelInfo]
  );

  return (
    <div className="py-4 space-y-8">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">How JOB-PATH Works</h2>
          <p className="text-white/90 text-lg max-w-4xl">
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
          {loading ? <p className="text-cyan-100/90 text-sm mt-3">Loading live model details...</p> : null}
          {error ? <p className="text-amber-100/90 text-sm mt-3">{error}</p> : null}
        </div>
        <Link
          to="/"
          className="self-start inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white/90 shadow-md transition hover:bg-white/25 hover:text-white"
        >
          <span className="text-lg">←</span>
          Back to Home
        </Link>
      </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          description="Final score blends Logistic , Random Forest, and Gradient Boosting"
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

      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
        <h3 className="text-white font-bold text-2xl mb-4">Current Model Snapshot</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <InfoTile label="Model Version" value={modelInfo?.modelVersion ? `v${modelInfo.modelVersion}` : "N/A"} />
          <InfoTile label="Data Quality" value={modelInfo?.dataQuality ?? "N/A"} />
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            to="/career-select"
            className="px-6 py-3 bg-white text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition"
          >
            Start Assessment
          </Link>
          <Link
            to="/cv-upload"
            className="px-6 py-3 bg-white/15 text-white rounded-xl font-semibold hover:bg-white/25 transition border border-white/30"
          >
            Upload CV
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoChip({ label }: { label: string }) {
  return (
    <span className="px-3 py-1 rounded-full text-xs bg-white/20 text-white/90 border border-white/30">
      {label}
    </span>
  );
}

function StepCard(props: { step: string; title: string; description: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
      <div className="w-9 h-9 rounded-full bg-cyan-400/25 text-cyan-100 flex items-center justify-center font-bold">
        {props.step}
      </div>
      <h4 className="text-white font-bold text-xl mt-4">{props.title}</h4>
      <p className="text-white/80 text-sm mt-2 leading-relaxed">{props.description}</p>
    </div>
  );
}

function InfoTile(props: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl border border-white/20 p-4">
      <p className="text-white/70 text-xs uppercase tracking-wide">{props.label}</p>
      <p className="text-white font-bold text-2xl mt-2">{props.value}</p>
    </div>
  );
}
