import { careerPaths, competencyLabels, competencyOrder } from "./catalog.js";
import { clamp01 } from "./utils.js";
import type {
  CareerPathKey,
  CertificationSignal,
  CertificationSignalKey,
  CompetencyKey,
  CvAnalysis,
  CvMatchedSkill,
  CvMatchedSkillCategory,
} from "./types.js";

type SkillSignalDefinition = {
  label: string;
  competencyKey: CompetencyKey;
  aliases: string[];
  weight: number;
  category: CvMatchedSkillCategory;
};

type PathHintDefinition = {
  pathKey: CareerPathKey;
  aliases: string[];
  weight: number;
};

type CvSignalExtraction = {
  cvAnalysis: CvAnalysis;
  featureVector: number[];
  certificationSignals: CertificationSignal[];
};

const skillSignals: SkillSignalDefinition[] = [
  {
    label: "Business Strategy",
    competencyKey: "business_strategy",
    aliases: ["business strategy", "roadmap", "kpi", "okr", "decision support", "strategic planning"],
    weight: 1.15,
    category: "capability",
  },
  {
    label: "SQL",
    competencyKey: "sql_data_access",
    aliases: ["sql", "postgresql", "mysql", "bigquery", "snowflake", "joins"],
    weight: 1.35,
    category: "tool",
  },
  {
    label: "Dashboarding and BI",
    competencyKey: "data_visualization",
    aliases: ["dashboard", "data visualization", "tableau", "power bi", "looker", "reporting"],
    weight: 1.2,
    category: "capability",
  },
  {
    label: "Data Governance",
    competencyKey: "data_quality_governance",
    aliases: ["data governance", "data quality", "metadata", "data lineage", "stewardship", "compliance"],
    weight: 1.25,
    category: "workflow",
  },
  {
    label: "Data Engineering",
    competencyKey: "data_engineering",
    aliases: ["etl", "elt", "data pipeline", "spark", "airflow", "dbt", "kafka", "lakehouse"],
    weight: 1.35,
    category: "workflow",
  },
  {
    label: "Statistics and Experimentation",
    competencyKey: "statistics_experimentation",
    aliases: ["statistics", "hypothesis testing", "experiment design", "ab testing", "forecasting"],
    weight: 1.2,
    category: "capability",
  },
  {
    label: "Machine Learning",
    competencyKey: "machine_learning",
    aliases: ["machine learning", "deep learning", "scikit learn", "xgboost", "feature engineering", "llm"],
    weight: 1.35,
    category: "capability",
  },
  {
    label: "MLOps and Deployment",
    competencyKey: "mlops_deployment",
    aliases: ["mlops", "model deployment", "model monitoring", "docker", "kubernetes", "mlflow", "inference api"],
    weight: 1.35,
    category: "workflow",
  },
  {
    label: "Research and Benchmarking",
    competencyKey: "research_innovation",
    aliases: ["research", "literature review", "benchmarking", "prototype", "publication", "novel method"],
    weight: 1.2,
    category: "capability",
  },
  {
    label: "Communication and Storytelling",
    competencyKey: "communication_storytelling",
    aliases: ["executive presentation", "storytelling", "documentation", "report writing", "stakeholder communication"],
    weight: 1.05,
    category: "capability",
  },
  {
    label: "Responsible AI and Risk",
    competencyKey: "responsible_ai",
    aliases: ["responsible ai", "ai ethics", "model fairness", "privacy", "risk management", "guardrails"],
    weight: 1.15,
    category: "workflow",
  },
  {
    label: "Cross-functional Delivery",
    competencyKey: "collaboration_delivery",
    aliases: ["cross functional", "stakeholder management", "agile", "project delivery", "collaboration"],
    weight: 0.95,
    category: "workflow",
  },
  {
    label: "Leadership",
    competencyKey: "leadership_execution",
    aliases: ["team lead", "led a team", "managed team", "mentored", "delivery leadership"],
    weight: 1.05,
    category: "capability",
  },
  {
    label: "Hands-on Delivery",
    competencyKey: "role_mastery",
    aliases: ["designed", "built", "implemented", "developed", "delivered", "owned", "deployed"],
    weight: 0.7,
    category: "role",
  },
];

const certificationSignalsByKey: Array<{
  key: CertificationSignalKey;
  label: string;
  aliases: string[];
}> = [
  {
    key: "sql_certification",
    label: "SQL Certification",
    aliases: ["sql certification", "oracle certified", "snowflake certification"],
  },
  {
    key: "python_certification",
    label: "Python Certification",
    aliases: ["python certification", "tensorflow certificate", "data science certificate"],
  },
  {
    key: "governance_certification",
    label: "Governance Certification",
    aliases: ["data governance certification", "cdmp", "dama", "privacy certification"],
  },
];

const pathHints: PathHintDefinition[] = [
  {
    pathKey: "business_intelligence",
    aliases: ["business intelligence", "bi analyst", "business analyst", "reporting analyst"],
    weight: 1.25,
  },
  {
    pathKey: "data_stewardship",
    aliases: ["data steward", "data governance", "data quality", "metadata"],
    weight: 1.2,
  },
  {
    pathKey: "data_engineering",
    aliases: ["data engineer", "etl", "data pipeline", "airflow", "dbt"],
    weight: 1.25,
  },
  {
    pathKey: "data_science",
    aliases: ["data scientist", "machine learning", "forecasting", "experimentation"],
    weight: 1.25,
  },
  {
    pathKey: "ai_engineering",
    aliases: ["ml engineer", "ai engineer", "llm", "mlops", "model deployment"],
    weight: 1.25,
  },
  {
    pathKey: "applied_research",
    aliases: ["research scientist", "research analyst", "benchmarking", "literature review"],
    weight: 1.2,
  },
];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function countAliasHits(text: string, aliases: string[]) {
  return aliases.reduce((count, alias) => {
    const normalizedAlias = normalizeText(alias).trim();
    if (!normalizedAlias) return count;
    return text.includes(normalizedAlias) ? count + 1 : count;
  }, 0);
}

function detectYearsExperience(text: string) {
  const matches = text.match(/(\d+)\+?\s+years?/i);
  return matches ? Number(matches[1]) : null;
}

function detectSuggestedLevel(years: number | null) {
  if (years === null) return 2;
  if (years >= 10) return 5;
  if (years >= 7) return 4;
  if (years >= 4) return 3;
  if (years >= 2) return 2;
  return 1;
}

function detectCandidateName(rawText: string) {
  const firstLine = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return null;
  return /^[A-Za-z][A-Za-z\s.'-]{2,60}$/.test(firstLine) ? firstLine : null;
}

function detectTitle(text: string) {
  const candidates = [
    "data scientist",
    "data engineer",
    "bi analyst",
    "business analyst",
    "data steward",
    "ml engineer",
    "research scientist",
  ];
  return candidates.find((candidate) => text.includes(candidate)) ?? null;
}

export function analyzeCvText(cvText: string, fileName: string | null): CvSignalExtraction {
  const normalizedText = normalizeText(cvText);
  const matchedSkills: CvMatchedSkill[] = [];
  const competencySignals = new Map<
    CompetencyKey,
    { key: CompetencyKey; label: string; score: number; evidence: string[] }
  >();

  skillSignals.forEach((signal) => {
    const hitCount = countAliasHits(normalizedText, signal.aliases);
    if (hitCount === 0) return;

    const score = clamp01((hitCount / signal.aliases.length) * signal.weight * 2.2);
    const evidence = signal.aliases
      .filter((alias) => normalizedText.includes(normalizeText(alias)))
      .slice(0, 4);

    matchedSkills.push({
      label: signal.label,
      competencyKey: signal.competencyKey,
      competencyLabel: competencyLabels[signal.competencyKey],
      category: signal.category,
      evidence,
      score,
    });

    const current =
      competencySignals.get(signal.competencyKey) ?? {
        key: signal.competencyKey,
        label: competencyLabels[signal.competencyKey],
        score: 0,
        evidence: [],
      };

    current.score = clamp01(Math.max(current.score, score));
    current.evidence = Array.from(new Set([...current.evidence, ...evidence])).slice(0, 4);
    competencySignals.set(signal.competencyKey, current);
  });

  const featureVector = competencyOrder.map(
    (key) => clamp01(competencySignals.get(key)?.score ?? 0)
  );

  const certificationSignals: CertificationSignal[] = certificationSignalsByKey.map((signal) => ({
    key: signal.key,
    label: signal.label,
    value: countAliasHits(normalizedText, signal.aliases) > 0 ? 1 : 0,
  }));

  const rankedPathHints = pathHints
    .map((hint) => {
      const evidence = hint.aliases
        .filter((alias) => normalizedText.includes(normalizeText(alias)))
        .slice(0, 4);

      return {
        pathKey: hint.pathKey,
        pathName: careerPaths[hint.pathKey].name,
        score: clamp01((evidence.length / Math.max(hint.aliases.length, 1)) * hint.weight * 2.5),
        evidence,
      };
    })
    .filter((hint) => hint.score > 0)
    .sort((left, right) => right.score - left.score);

  const years = detectYearsExperience(cvText);
  const suggestedLevel = detectSuggestedLevel(years);
  const title = detectTitle(normalizedText);
  const candidateName = detectCandidateName(cvText);
  const isLikelyResume =
    cvText.length > 120 &&
    /(experience|education|skills|projects|summary|work)/i.test(cvText);

  return {
    featureVector,
    certificationSignals,
    cvAnalysis: {
      summary: {
        textLength: cvText.length,
        matchedSkillCount: matchedSkills.length,
        detectedYearsExperience: years,
        suggestedLevel,
        detectedTitle: title,
        levelEvidence: years === null ? [] : [`Detected ${years} years of experience from CV text.`],
        isLikelyResume,
        resumeConfidence: isLikelyResume ? 0.84 : 0.42,
        rejectionReason: isLikelyResume ? null : "The uploaded text does not strongly resemble a resume yet.",
        candidateName,
        uploadedFileName: fileName,
        inputKind: fileName ? "resume" : "skills_profile",
      },
      matchedSkills: matchedSkills.sort((left, right) => right.score - left.score),
      competencySignals: Array.from(competencySignals.values()).sort(
        (left, right) => right.score - left.score
      ),
      pathHints: rankedPathHints,
    },
  };
}
