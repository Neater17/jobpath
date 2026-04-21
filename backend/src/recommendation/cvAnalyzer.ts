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

const stopWords = new Set([
  "and",
  "or",
  "the",
  "of",
  "to",
  "for",
  "in",
  "with",
  "on",
  "by",
  "a",
  "an",
]);

const competencyAliasOverrides: Record<string, string[]> = {
  strategy_planning: [
    "strategic planning",
    "strategy planning",
    "business strategy",
    "roadmap planning",
    "vision setting",
  ],
  strategy_implementation: [
    "strategy execution",
    "strategic execution",
    "strategy implementation",
    "operating model execution",
    "turn strategy into action",
  ],
  stakeholder_management: [
    "stakeholder management",
    "stakeholder engagement",
    "executive stakeholder",
    "cross functional stakeholder",
    "partner with leadership",
  ],
  people_and_performance_management: [
    "people management",
    "team leadership",
    "performance management",
    "managed team",
    "managed analysts",
    "lead a team",
  ],
  business_agility: [
    "business agility",
    "organizational agility",
    "adapt business priorities",
  ],
  budgeting: [
    "budgeting",
    "budget management",
    "p l ownership",
    "financial planning",
    "forecasting budget",
  ],
  portfolio_management: [
    "portfolio management",
    "program portfolio",
    "initiative portfolio",
    "investment prioritization",
  ],
  systems_thinking: [
    "systems thinking",
    "end to end systems",
    "holistic systems view",
    "cross functional system design",
  ],
  change_management: [
    "change management",
    "organizational change",
    "transformation management",
    "change leadership",
  ],
  data_visualization_and_storytelling: [
    "data visualization",
    "data storytelling",
    "dashboarding",
    "power bi",
    "tableau",
    "looker",
  ],
  data_analytics: [
    "data analytics",
    "analytics",
    "business analytics",
    "kpi analysis",
    "insight generation",
  ],
  data_engineering: [
    "data engineering",
    "etl",
    "elt",
    "data pipeline",
    "pipeline orchestration",
    "dbt",
    "airflow",
  ],
  machine_learning: [
    "machine learning",
    "predictive modeling",
    "model training",
    "supervised learning",
    "ml model",
  ],
  computational_modelling: [
    "machine learning",
    "predictive modeling",
    "model development",
    "statistical modeling",
    "computational modelling",
  ],
  self_learning_systems: [
    "machine learning",
    "ml systems",
    "self learning systems",
    "adaptive models",
    "ai systems",
  ],
  pattern_recognition_systems: [
    "pattern recognition",
    "classification model",
    "computer vision",
    "recognition system",
  ],
  model_deployment: [
    "model deployment",
    "model serving",
    "deploy ml models",
    "inference service",
  ],
  research: [
    "research",
    "literature review",
    "benchmarking",
    "experimentation",
    "research publication",
  ],
  data_governance: [
    "data governance",
    "data stewardship",
    "data policy",
    "data controls",
  ],
  data_protection_management: [
    "data protection",
    "privacy management",
    "data privacy",
    "privacy compliance",
  ],
  auditing_and_compliance: [
    "audit",
    "auditing",
    "compliance",
    "regulatory compliance",
    "policy compliance",
  ],
  artificial_intelligence_ethics_and_governance: [
    "ai governance",
    "responsible ai",
    "ai ethics",
    "model risk governance",
  ],
  cloud_computing: [
    "cloud computing",
    "aws",
    "azure",
    "gcp",
    "cloud platform",
  ],
  applications_development: [
    "software development",
    "application development",
    "backend development",
    "api development",
  ],
  continuous_integration_and_continuous_deployment: [
    "ci cd",
    "continuous integration",
    "continuous deployment",
    "build pipeline",
  ],
};

function inferSkillCategory(label: string): CvMatchedSkillCategory {
  const normalized = label.toLowerCase();
  if (/(python|sql|tableau|power bi|tensorflow|pytorch|spark|airflow|docker|kubernetes)/i.test(normalized)) {
    return "tool";
  }
  if (/(governance|management|architecture|deployment|delivery|operations|continuity|assurance|compliance)/i.test(normalized)) {
    return "workflow";
  }
  if (/(leadership|coaching|mentoring|negotiation|influence|adaptability|resilience)/i.test(normalized)) {
    return "role";
  }
  return "capability";
}

function buildAliases(label: string) {
  const normalized = normalizeText(label).trim();
  const aliases = new Set<string>([normalized]);
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    aliases.add(words.slice(0, 2).join(" "));
    aliases.add(words.slice(-2).join(" "));
  }
  if (words.length >= 3) {
    aliases.add(words.slice(0, 3).join(" "));
  }
  return Array.from(aliases).filter((alias) => alias.length > 2);
}

function buildKeyAliases(competencyKey: CompetencyKey, label: string) {
  const aliases = new Set<string>(buildAliases(label));
  const normalizedKey = normalizeText(competencyKey.replace(/_/g, " ")).trim();
  if (normalizedKey) {
    aliases.add(normalizedKey);
  }

  const keyTokens = normalizedKey
    .split(/\s+/)
    .filter((token) => token && !stopWords.has(token));
  if (keyTokens.length >= 2) {
    aliases.add(keyTokens.join(" "));
    aliases.add(keyTokens.slice(0, 2).join(" "));
    aliases.add(keyTokens.slice(-2).join(" "));
  }
  if (keyTokens.length >= 3) {
    aliases.add(keyTokens.slice(0, 3).join(" "));
    aliases.add(keyTokens.slice(-3).join(" "));
  }

  const acronym = keyTokens.map((token) => token[0]).join("");
  if (acronym.length >= 2) {
    aliases.add(acronym);
  }

  for (const alias of competencyAliasOverrides[competencyKey] ?? []) {
    aliases.add(normalizeText(alias).trim());
  }

  return Array.from(aliases).filter((alias) => alias.length > 2);
}

const skillSignals: SkillSignalDefinition[] = competencyOrder.map((competencyKey) => {
  const label = competencyLabels[competencyKey] ?? competencyKey;
  return {
    label,
    competencyKey,
    aliases: buildKeyAliases(competencyKey, label),
    weight: 1.15,
    category: inferSkillCategory(label),
  };
});

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
    aliases: [
      "business intelligence",
      "bi analyst",
      "business analyst",
      "reporting analyst",
      "dashboard",
      "kpi reporting",
      "executive reporting",
    ],
    weight: 1.25,
  },
  {
    pathKey: "data_stewardship",
    aliases: ["data steward", "data governance", "data quality", "metadata", "data policy", "data lineage"],
    weight: 1.2,
  },
  {
    pathKey: "data_engineering",
    aliases: ["data engineer", "etl", "data pipeline", "airflow", "dbt", "spark", "warehouse"],
    weight: 1.25,
  },
  {
    pathKey: "data_science",
    aliases: ["data scientist", "machine learning", "forecasting", "experimentation", "statistical modeling"],
    weight: 1.25,
  },
  {
    pathKey: "ai_engineering",
    aliases: ["ml engineer", "ai engineer", "llm", "mlops", "model deployment", "inference", "rag"],
    weight: 1.25,
  },
  {
    pathKey: "applied_research",
    aliases: ["research scientist", "research analyst", "benchmarking", "literature review", "publication"],
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

function cleanCandidateName(candidate: string) {
  const cleaned = candidate
    .replace(/^\d+\s+/, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:mba|ma|ms|msc|phd|ph\.d|dr|jr|sr)\b\.?/gi, " ")
    .replace(/\b(?:experience|summary|education|skills|projects|certifications|profile)\b.*$/i, "")
    .replace(/[|@].*$/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .trim();
  return cleaned.replace(/[,\-.]+$/g, "").trim();
}

function toDisplayName(candidate: string) {
  return candidate
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[a-z]\.$/.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function looksLikeCandidateName(candidate: string) {
  if (!candidate || candidate.length < 5 || candidate.length > 80) return false;
  if (/\d/.test(candidate)) return false;
  if (/@|https?:|www\./i.test(candidate)) return false;

  const words = candidate
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length < 2 || words.length > 6) return false;

  const validWordCount = words.filter((word) => /^[A-Za-z][A-Za-z.'-]*$/.test(word)).length;
  const capitalizedCount = words.filter((word) => /^[A-Z][A-Za-z.'-]*$/.test(word) || /^[A-Z]\.$/.test(word)).length;
  const uppercaseCount = words.filter((word) => /^[A-Z][A-Z.'-]*$/.test(word)).length;

  return (
    validWordCount >= Math.max(2, words.length - 1) &&
    (capitalizedCount >= Math.max(2, words.length - 1) || uppercaseCount >= Math.max(2, words.length - 1))
  );
}

function detectCandidateName(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const lineCandidates = lines.slice(0, 5);
  const headerChunk = rawText.slice(0, 320);
  const headerBeforeSection =
    headerChunk.match(/^[\s\S]*?(?=\b(?:experience|summary|education|skills|projects|certifications|profile)\b)/i)?.[0] ??
    headerChunk;
  const headerCandidates = headerBeforeSection
    .split(/\s{2,}|[|•]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const candidates = [...lineCandidates, ...headerCandidates]
    .map(cleanCandidateName)
    .filter(Boolean);

  const matched = candidates.find(looksLikeCandidateName);
  if (matched) {
    return toDisplayName(matched);
  }
  return null;
}

function detectTitle(text: string) {
  const candidates = [
    "chief business function officer",
    "chief analytics officer",
    "chief data officer",
    "chief information officer",
    "chief technology officer",
    "business analytics director",
    "data scientist",
    "data engineer",
    "bi analyst",
    "business analyst",
    "data steward",
    "ml engineer",
    "ai engineer",
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
