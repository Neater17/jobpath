import React from "react";
import type {
  RecommendationCalibrationBin,
  RecommendationModelMetricGroup,
  RecommendationModelSnapshot,
} from "../services/api";

type Props = {
  snapshot: RecommendationModelSnapshot;
};

type ModelKey = "logistic" | "randomForest" | "gradientBoosting" | "ensemble";
type MetricKey = "top1" | "top3" | "logLoss" | "brier" | "ece";

const MODEL_SERIES: Array<{
  key: ModelKey;
  label: string;
  fill: string;
  stroke: string;
  text: string;
}> = [
  { key: "logistic", label: "Logistic", fill: "#67e8f9", stroke: "#a5f3fc", text: "text-cyan-100" },
  {
    key: "randomForest",
    label: "Random Forest",
    fill: "#6ee7b7",
    stroke: "#a7f3d0",
    text: "text-emerald-100",
  },
  {
    key: "gradientBoosting",
    label: "Gradient Boosting",
    fill: "#fcd34d",
    stroke: "#fde68a",
    text: "text-amber-100",
  },
  { key: "ensemble", label: "Ensemble", fill: "#f0abfc", stroke: "#f5d0fe", text: "text-fuchsia-100" },
];

const VALIDATION_METRICS: Array<{ key: MetricKey; label: string; better: "higher" | "lower" }> = [
  { key: "top1", label: "Top-1", better: "higher" },
  { key: "top3", label: "Top-3", better: "higher" },
  { key: "logLoss", label: "Log Loss", better: "lower" },
  { key: "brier", label: "Brier", better: "lower" },
  { key: "ece", label: "ECE", better: "lower" },
];

const PERFORMANCE_COLUMNS: Array<{ key: MetricKey; label: string; format: (value: number) => string }> = [
  { key: "top1", label: "Top-1", format: formatPercent },
  { key: "top3", label: "Top-3", format: formatPercent },
  { key: "logLoss", label: "Log Loss", format: formatDecimal },
  { key: "brier", label: "Brier", format: formatDecimal },
  { key: "ece", label: "ECE", format: formatDecimal },
];

export function ModelSnapshotVisualizations({ snapshot }: Props) {
  const hardTagCounts = Object.entries(snapshot.hardValidation.tagCounts)
    .sort((left, right) => right[1] - left[1])
    .map(([key, value]) => ({
      key,
      label: humanizeKey(key),
      value,
    }));

  return (
    <section className="space-y-6 rounded-[2rem] border border-cyan-200/25 bg-slate-950/35 p-6 shadow-2xl">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/75">
          Current Artifact Visualizations
        </p>
        <h3 className="text-3xl font-bold text-white">Model diagnostics from the live recommendation snapshot</h3>
        <p className="max-w-4xl text-sm leading-7 text-white/80">
          These visuals are generated from the currently deployed recommendation artifacts and evaluation
          payloads. They show model diagnostics, calibration, and explainability evidence rather than
          direct real-world labor market distributions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Model Version" value={snapshot.model.modelVersion ? `v${snapshot.model.modelVersion}` : "N/A"} />
        <SummaryCard label="Trained At" value={formatDate(snapshot.model.trainedAt)} />
        <SummaryCard label="Training Samples" value={formatInteger(snapshot.model.sampleCount)} />
        <SummaryCard label="Feature Count" value={formatInteger(snapshot.model.featureCount)} />
        <SummaryCard label="Career Classes" value={formatInteger(snapshot.model.classCount)} />
        <SummaryCard label="Data Source" value={snapshot.model.dataSource} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Dataset Split"
          description="The current artifact split is shown as one part-to-whole stacked bar so the relative evaluation coverage is visible at a glance."
        >
          <StackedSplitBar
            items={[
              { label: "Train", value: snapshot.split.train, fill: "#67e8f9" },
              { label: "Validation", value: snapshot.split.validation, fill: "#93c5fd" },
              { label: "Hard Validation", value: snapshot.split.hardValidation, fill: "#fcd34d" },
              { label: "Test", value: snapshot.split.test, fill: "#6ee7b7" },
            ]}
          />
        </Panel>

        <Panel
          title="Ensemble Weights"
          description="A donut chart is used here because the ensemble weights are a simple three-part contribution to the final prediction."
        >
          <DonutWeights
            items={[
              { label: "Logistic", value: snapshot.ensembleWeights.logistic, fill: "#67e8f9" },
              { label: "Random Forest", value: snapshot.ensembleWeights.randomForest, fill: "#6ee7b7" },
              { label: "Gradient Boosting", value: snapshot.ensembleWeights.gradientBoosting, fill: "#fcd34d" },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-1">
        <Panel
          title="Model Performance Comparison"
          description="A heatmap works better than grouped bars here because it lets you compare several models and several metrics in one compact matrix."
        >
          <PerformanceHeatmap values={snapshot.evaluation} />
        </Panel>
      </div>
      
          <Panel
            title="Baseline vs Hard Validation"
            description="A slope chart shows how each ensemble metric shifts from ordinary validation to the harder ambiguity-focused validation slice."
          >
            <ValidationSlopeChart baseline={snapshot.validationComparison.baseline} hard={snapshot.validationComparison.hard} />
          </Panel>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel 
            title="Confidence Calibration"
            description={`This reliability diagram compares predicted confidence against observed accuracy by confidence bin. Fallback accuracy: ${formatPercent(snapshot.confidenceCalibration.fallbackAccuracy)}.`}
          >
            <ReliabilityDiagram bins={snapshot.confidenceCalibration.bins} />
          </Panel>


          <Panel
            title="Hard Validation Case Mix"
            description="A treemap-style layout highlights how the difficult validation subset is distributed across ambiguity and stretch-fit case types."
          >
            <TreemapCaseMix items={hardTagCounts} />
          </Panel>
        </div>

      <Panel
        title="Top Feature Importances"
        description="A lollipop chart is used here to rank the strongest ensemble features while preserving a lighter, more readable diagnostic view than solid bars."
      >
        <LollipopImportanceChart
          items={snapshot.topFeatureImportances.map((item) => ({
            label: item.label,
            key: item.key,
            value: item.ensemble,
          }))}
        />
      </Panel>
    </section>
  );
}

function Panel(props: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-xl">
      <h4 className="text-xl font-bold text-white">{props.title}</h4>
      <p className="mt-2 text-sm leading-6 text-white/70">{props.description}</p>
      <div className="mt-5">{props.children}</div>
    </div>
  );
}

function SummaryCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/15 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/75">{props.label}</p>
      <p className="mt-2 text-lg font-bold text-white">{props.value}</p>
    </div>
  );
}

function StackedSplitBar(props: { items: Array<{ label: string; value: number; fill: string }> }) {
  const total = props.items.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-full bg-white/10">
        <div className="flex h-8 w-full">
          {props.items.map((item) => (
            <div
              key={item.label}
              title={`${item.label}: ${formatInteger(item.value)}`}
              style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.fill }}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {props.items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
              <p className="text-sm font-semibold text-white">{item.label}</p>
            </div>
            <p className="mt-2 text-lg font-bold text-white">{formatInteger(item.value)}</p>
            <p className="text-xs text-white/55">{formatPercent(item.value / total)} of total artifact samples</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutWeights(props: { items: Array<{ label: string; value: number; fill: string }> }) {
  const radius = 74;
  const strokeWidth = 22;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  let offset = 0;

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <div className="relative mx-auto h-[190px] w-[190px] shrink-0">
        <svg viewBox="0 0 190 190" className="h-full w-full -rotate-90">
          <circle cx="95" cy="95" r={normalizedRadius} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} fill="none" />
          {props.items.map((item) => {
            const length = circumference * item.value;
            const dashoffset = -offset;
            offset += length;
            return (
              <circle
                key={item.label}
                cx="95"
                cy="95"
                r={normalizedRadius}
                stroke={item.fill}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                fill="none"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashoffset}
              />
            );
          })}
        </svg>
      </div>
      <div className="flex-1 space-y-3">
        {props.items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                <p className="text-sm font-semibold text-white">{item.label}</p>
              </div>
              <p className="text-sm font-semibold text-white/85">{formatPercent(item.value)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceHeatmap(props: { values: RecommendationModelMetricGroup }) {
  const metricRange: Record<MetricKey, { min: number; max: number }> = {
    top1: computeMetricRange(props.values, "top1"),
    top3: computeMetricRange(props.values, "top3"),
    logLoss: computeMetricRange(props.values, "logLoss"),
    brier: computeMetricRange(props.values, "brier"),
    ece: computeMetricRange(props.values, "ece"),
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-white/60 p-3" />
            {MODEL_SERIES.map((series) => (
              <th key={series.key} className={`text-center text-xs font-semibold uppercase tracking-[0.16em] ${series.text} p-3`}>
                {series.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERFORMANCE_COLUMNS.map((column) => (
            <tr key={column.key}>
              <td className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60 p-3">
                {column.label}
              </td>
              {MODEL_SERIES.map((series) => {
                const value = props.values[series.key][column.key];
                const intensity = normalizeRange(value, metricRange[column.key].min, metricRange[column.key].max);
                return (
                  <td
                    key={`${series.key}-${column.key}`}
                    className="p-2"
                  >
                    <div
                      className="rounded-xl border border-white/10 p-3 text-center shadow-inner"
                      style={{ backgroundColor: heatmapColor(series.fill, intensity) }}
                      title={`${series.label} ${column.label}: ${column.format(value)}`}
                    >
                      <p className="text-sm font-bold text-white">{column.format(value)}</p>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValidationSlopeChart(props: {
  baseline: RecommendationModelMetricGroup;
  hard: RecommendationModelMetricGroup;
}) {
  const rows = VALIDATION_METRICS.map((metric) => {
    const baseline = props.baseline.ensemble[metric.key];
    const hard = props.hard.ensemble[metric.key];
    const delta = hard - baseline;
    const isImprovement = metric.better === "higher" ? delta > 0 : delta < 0;

    return {
      ...metric,
      baseline,
      hard,
      delta,
      isImprovement,
    };
  });

  const maxValue = Math.max(...rows.map((r) => Math.max(r.baseline, r.hard)));

  return (
    <div className="space-y-6">
      {rows.map((row) => {
        const baselineY = (row.baseline / maxValue) * 100;
        const hardY = (row.hard / maxValue) * 100;
        const formattedBaseline = row.key === "top1" || row.key === "top3" ? formatPercent(row.baseline) : formatDecimal(row.baseline);
        const formattedHard = row.key === "top1" || row.key === "top3" ? formatPercent(row.hard) : formatDecimal(row.hard);

        return (
          <div key={row.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm font-semibold text-white mb-4">{row.label}</p>

            <div className="relative h-40 bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <svg className="w-full h-full" preserveAspectRatio="none">
                {/* Connecting line */}
                <line
                  x1="8%"
                  y1={`${100 - baselineY}%`}
                  x2="92%"
                  y2={`${100 - hardY}%`}
                  stroke={row.isImprovement ? "#10b981" : "#ef4444"}
                  strokeWidth="3"
                  opacity="0.7"
                />

                {/* Baseline point */}
                <circle
                  cx="8%"
                  cy={`${100 - baselineY}%`}
                  r="6"
                  fill="#22d3ee"
                  stroke="#06b6d4"
                  strokeWidth="2"
                />

                {/* Hard point */}
                <circle
                  cx="92%"
                  cy={`${100 - hardY}%`}
                  r="6"
                  fill="#fbbf24"
                  stroke="#f59e0b"
                  strokeWidth="2"
                />
              </svg>

              {/* Left side - Baseline */}
              <div className="absolute left-4 top-0 bottom-0 flex flex-col items-start justify-between py-4 pointer-events-none">
                <div className="text-left">
                  <p className="text-xs text-white font-medium">Baseline</p>
                  <p className="text-lg font-bold text-white">{formattedBaseline}</p>
                </div>
              </div>

              {/* Center - Change indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`rounded-lg px-3 py-2 backdrop-blur-sm ${
                  row.delta === 0
                    ? "bg-white/10 border border-white/20"
                    : row.isImprovement
                      ? "bg-emerald-500/20 border border-emerald-400/40"
                      : "bg-red-500/20 border border-red-400/40"
                }`}>
                  <p className={`text-sm font-semibold ${
                    row.delta === 0
                      ? "text-white/70"
                      : row.isImprovement
                        ? "text-emerald-300"
                        : "text-red-300"
                  }`}>
                    {row.delta === 0
                      ? "No change"
                      : `${row.isImprovement ? "✓" : "✗"} ${row.key === "top1" || row.key === "top3" ? formatPercent(Math.abs(row.delta)) : formatDecimal(Math.abs(row.delta))}`}
                  </p>
                </div>
              </div>

              {/* Right side - Hard validation */}
              <div className="absolute right-4 top-0 bottom-0 flex flex-col items-end justify-between py-4 pointer-events-none">
                <div className="text-right">
                  <p className="text-xs text-white font-medium">Hard</p>
                  <p className="text-lg font-bold text-white">{formattedHard}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReliabilityDiagram(props: { bins: RecommendationCalibrationBin[] }) {
  const bins = props.bins.filter((bin) => bin.count > 0);

  if (bins.length === 0) {
    return <p className="text-sm text-white/65">No populated confidence bins are available for this artifact.</p>;
  }

  const width = 600;
  const height = 280;
  const padding = 44;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = bins.map((bin) => {
    const x = padding + innerWidth * bin.avgConfidence;
    const y = height - padding - innerHeight * bin.accuracy;
    return { x, y, label: `${formatPercent(bin.min)}-${formatPercent(bin.max)}`, count: bin.count, accuracy: bin.accuracy, avgConfidence: bin.avgConfidence };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <rect x={padding} y={padding} width={innerWidth} height={innerHeight} fill="rgba(255,255,255,0.02)" rx="18" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.3)" strokeDasharray="6 6" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.16)" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.16)" />

        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={padding}
              y1={height - padding - innerHeight * tick}
              x2={width - padding}
              y2={height - padding - innerHeight * tick}
              stroke="rgba(255,255,255,0.08)"
            />
            <text x={padding - 10} y={height - padding - innerHeight * tick + 4} fill="rgba(255,255,255,0.55)" fontSize="11" textAnchor="end">
              {formatPercent(tick)}
            </text>
            <text x={padding + innerWidth * tick} y={height - padding + 18} fill="rgba(255,255,255,0.55)" fontSize="11" textAnchor="middle">
              {formatPercent(tick)}
            </text>
          </g>
        ))}

        <path d={path} fill="none" stroke="#67e8f9" strokeWidth="3" />
        {points.map((point, index) => {
          const bubble = 7 + Math.sqrt(point.count);
          return (
            <g key={index}>
              <circle cx={point.x} cy={point.y} r={bubble} fill="rgba(34,211,238,0.22)" />
              <circle cx={point.x} cy={point.y} r={4.5} fill="#67e8f9" stroke="#cffafe" strokeWidth="2" />
            </g>
          );
        })}
      </svg>
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="text-xs text-white/55">X-axis: average predicted confidence</p>
        <p className="text-xs text-white/55">Y-axis: observed accuracy</p>
      </div>
    </div>
  );
}

function TreemapCaseMix(props: { items: Array<{ key: string; label: string; value: number }> }) {
  const total = props.items.reduce((sum, item) => sum + item.value, 0) || 1;
  const topItems = props.items.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex min-h-[260px] flex-wrap overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03]">
        {topItems.map((item, index) => {
          const basis = `${Math.max((item.value / total) * 100, 18)}%`;
          const palettes = [
            "from-rose-500/35 to-rose-400/15",
            "from-cyan-500/30 to-cyan-400/10",
            "from-amber-500/30 to-amber-400/10",
            "from-emerald-500/30 to-emerald-400/10",
          ];
          return (
            <div
              key={item.key}
              className={`flex min-h-[110px] grow basis-[22%] flex-col justify-between border border-white/10 bg-gradient-to-br p-4 ${palettes[index % palettes.length]}`}
              style={{ flexBasis: basis }}
            >
              <p className="max-w-[16ch] text-sm font-semibold text-white">{item.label}</p>
              <div>
                <p className="text-xl font-bold text-white">{formatInteger(item.value)}</p>
                <p className="text-xs text-white/60">{formatPercent(item.value / total)} of hard cases</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-white/50">Showing the top 10 hard-validation case categories by count.</p>
    </div>
  );
}

function LollipopImportanceChart(props: { items: Array<{ label: string; key: string; value: number }> }) {
  const maxValue = Math.max(...props.items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Feature</div>
            <div className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Importance</div>
            {props.items.map((item) => {
              const intensity = item.value / maxValue;
              return (
                <React.Fragment key={item.key}>
                  <div className="flex items-center rounded-2xl border border-white/10 p-3 text-sm font-semibold text-white">
                    {item.label}
                  </div>
                  <div
                    className="flex items-center justify-center rounded-2xl border border-white/10 p-3 text-sm font-bold text-white shadow-inner transition-colors"
                    style={{ backgroundColor: heatmapColor("#f0abfc", 0.22 + intensity * 0.78) }}
                    title={`${item.label}: ${formatDecimal(item.value)}`}
                  >
                    {formatDecimal(item.value)}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
      <p className="text-xs text-white/50">Brighter cells indicate higher feature importance in the ensemble model.</p>
    </div>
  );
}

function computeMetricRange(values: RecommendationModelMetricGroup, key: MetricKey) {
  const seriesValues = MODEL_SERIES.map((series) => values[series.key][key]);
  return {
    min: Math.min(...seriesValues),
    max: Math.max(...seriesValues),
  };
}

function normalizeRange(value: number, min: number, max: number) {
  if (max === min) {
    return 0.7;
  }
  return 0.22 + ((value - min) / (max - min)) * 0.78;
}

function heatmapColor(hex: string, intensity: number) {
  const alpha = Math.max(0.16, Math.min(0.9, intensity));
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number) {
  return value.toFixed(3);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function humanizeKey(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
