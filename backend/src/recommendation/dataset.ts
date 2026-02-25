import fs from "node:fs/promises";
import mongoose from "mongoose";
import type { CareerPathKey, CareerProfile, CompetencyKey } from "./types.js";
import { clamp01, SeededRng } from "./utils.js";
import Career from "../models/Career.js";

export type TrainingSample = {
  features: number[];
  label: number;
};

export type TrainingDataset = {
  samples: TrainingSample[];
  dataSource: string;
};

type ExternalSample = {
  careerName: string;
  pathKey?: string;
  features: Record<string, number>;
};

const targetSyntheticSampleCount = 9800;

const pathAliasMap: Record<string, CareerPathKey> = {
  businessintelligence: "business_intelligence",
  businessintelligencestrategy: "business_intelligence",
  businessstrategy: "business_intelligence",
  "data stewardship": "data_stewardship",
  datastewardship: "data_stewardship",
  governance: "data_stewardship",
  dataengineering: "data_engineering",
  engineering: "data_engineering",
  datascience: "data_science",
  science: "data_science",
  aiengineering: "ai_engineering",
  machinelearningengineering: "ai_engineering",
  mlengineering: "ai_engineering",
  appliedresearch: "applied_research",
  research: "applied_research",
};

const skillAliasEntries: Array<[string, CompetencyKey]> = [
  ["business", "business_strategy"],
  ["strategy", "business_strategy"],
  ["kpi", "business_strategy"],
  ["sql", "sql_data_access"],
  ["query", "sql_data_access"],
  ["database", "sql_data_access"],
  ["visual", "data_visualization"],
  ["dashboard", "data_visualization"],
  ["report", "data_visualization"],
  ["governance", "data_quality_governance"],
  ["quality", "data_quality_governance"],
  ["lineage", "data_quality_governance"],
  ["pipeline", "data_engineering"],
  ["etl", "data_engineering"],
  ["elt", "data_engineering"],
  ["engineering", "data_engineering"],
  ["statistics", "statistics_experimentation"],
  ["experiment", "statistics_experimentation"],
  ["hypothesis", "statistics_experimentation"],
  ["machine learning", "machine_learning"],
  ["model", "machine_learning"],
  ["prediction", "machine_learning"],
  ["mlops", "mlops_deployment"],
  ["deployment", "mlops_deployment"],
  ["monitoring", "mlops_deployment"],
  ["research", "research_innovation"],
  ["innovation", "research_innovation"],
  ["publication", "research_innovation"],
  ["communication", "communication_storytelling"],
  ["storytelling", "communication_storytelling"],
  ["presentation", "communication_storytelling"],
  ["responsible", "responsible_ai"],
  ["ethic", "responsible_ai"],
  ["fairness", "responsible_ai"],
  ["collaboration", "collaboration_delivery"],
  ["stakeholder", "collaboration_delivery"],
  ["delivery", "collaboration_delivery"],
  ["lead", "leadership_execution"],
  ["management", "leadership_execution"],
  ["execution", "leadership_execution"],
  ["role", "role_mastery"],
  ["mastery", "role_mastery"],
  ["proficiency", "role_mastery"],
];

const keywordBoosts: Record<CompetencyKey, string[]> = {
  business_strategy: ["business", "strategy", "kpi", "impact", "value"],
  sql_data_access: ["sql", "query", "table", "database"],
  data_visualization: ["dashboard", "report", "visual", "chart"],
  data_quality_governance: ["governance", "quality", "lineage", "compliance"],
  data_engineering: ["pipeline", "etl", "elt", "orchestration", "warehouse"],
  statistics_experimentation: ["statistics", "experiment", "a/b", "hypothesis"],
  machine_learning: ["machine learning", "model", "prediction", "classification"],
  mlops_deployment: ["mlops", "deployment", "monitoring", "production"],
  research_innovation: ["research", "innovation", "baseline", "literature"],
  communication_storytelling: ["communicate", "story", "presentation", "stakeholder"],
  responsible_ai: ["responsible", "ethical", "fairness", "bias", "risk"],
  collaboration_delivery: ["collaboration", "cross-functional", "delivery", "coordination"],
  leadership_execution: ["lead", "manager", "roadmap", "execution"],
  role_mastery: ["role", "specialist", "expertise", "proficiency"],
};

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function buildSkillAliasMap() {
  const map = new Map<string, CompetencyKey>();
  (Object.keys(keywordBoosts) as CompetencyKey[]).forEach((key) => {
    map.set(key, key);
    map.set(normalizeToken(key), key);
  });
  skillAliasEntries.forEach(([alias, key]) => {
    map.set(normalizeToken(alias), key);
  });
  return map;
}

const skillAliasMap = buildSkillAliasMap();

function parseProficiencyScore(raw: unknown) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return clamp01(raw > 1 ? raw / 100 : raw);
  }
  if (typeof raw !== "string") return 0.65;

  const text = raw.trim();
  if (!text) return 0.65;
  const normalized = normalizeToken(text);

  const percent = text.match(/^(-?\d+(\.\d+)?)\s*%$/);
  if (percent) {
    const value = Number(percent[1]);
    if (Number.isFinite(value)) return clamp01(value / 100);
  }

  const levelMatch = normalized.match(/level\s*([1-5])/);
  if (levelMatch) {
    return clamp01((Number(levelMatch[1]) - 1) / 4);
  }

  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    return clamp01(numeric > 1 ? numeric / 100 : numeric);
  }

  if (normalized.includes("beginner") || normalized.includes("basic")) return 0.3;
  if (normalized.includes("intermediate")) return 0.55;
  if (normalized.includes("advanced")) return 0.8;
  if (normalized.includes("expert") || normalized.includes("master")) return 0.95;
  return 0.65;
}

function inferLevel(rawLevel: unknown, title: string) {
  const combined = `${typeof rawLevel === "string" ? rawLevel : ""} ${title}`.toLowerCase();
  const explicit = combined.match(/([1-5])/);
  if (explicit) {
    const value = Number(explicit[1]);
    if (value >= 1 && value <= 5) return value;
  }
  if (combined.includes("chief") || combined.includes("director") || combined.includes("principal")) return 5;
  if (combined.includes("manager") || combined.includes("lead")) return 4;
  if (combined.includes("senior")) return 3;
  if (combined.includes("junior") || combined.includes("intern") || combined.includes("assistant")) return 1;
  return 2;
}

function inferPathKey(rawPath: unknown, title: string): CareerPathKey | null {
  const candidates: string[] = [];
  if (Array.isArray(rawPath)) {
    rawPath.forEach((item) => {
      if (typeof item === "string") candidates.push(item);
    });
  } else if (typeof rawPath === "string") {
    candidates.push(rawPath);
  }
  candidates.push(title);

  for (const candidate of candidates) {
    const normalized = normalizeToken(candidate);
    const compact = normalized.replace(/\s+/g, "");
    if (pathAliasMap[compact]) return pathAliasMap[compact];
    for (const [alias, key] of Object.entries(pathAliasMap)) {
      if (normalized.includes(alias) || compact.includes(alias)) {
        return key;
      }
    }
  }

  return null;
}

function mapSkillToCompetency(skillName: string): CompetencyKey | null {
  const normalized = normalizeToken(skillName);
  const compact = normalized.replace(/\s+/g, "");
  const direct = skillAliasMap.get(normalized) ?? skillAliasMap.get(compact);
  if (direct) return direct;

  let best: { key: CompetencyKey; score: number } | null = null;
  for (const [alias, key] of skillAliasEntries) {
    const aliasNormalized = normalizeToken(alias);
    if (!aliasNormalized) continue;
    if (normalized.includes(aliasNormalized)) {
      const score = aliasNormalized.length;
      if (!best || score > best.score) {
        best = { key, score };
      }
    }
  }
  return best?.key ?? null;
}

function pickProfileIndex(
  profiles: CareerProfile[],
  pathKey: CareerPathKey | null,
  level: number,
  title: string
) {
  const normalizedTitle = normalizeToken(title).replace(/\s+/g, "");
  const exact = profiles.findIndex(
    (profile) => normalizeToken(profile.careerName).replace(/\s+/g, "") === normalizedTitle
  );
  if (exact >= 0) return exact;

  let candidates = profiles.map((profile, index) => ({ profile, index }));
  if (pathKey) {
    const byPath = candidates.filter((candidate) => candidate.profile.pathKey === pathKey);
    if (byPath.length > 0) {
      candidates = byPath;
    }
  }

  candidates.sort((left, right) => {
    const levelDistance = Math.abs(left.profile.level - level) - Math.abs(right.profile.level - level);
    if (levelDistance !== 0) return levelDistance;

    const leftName = normalizeToken(left.profile.careerName);
    const rightName = normalizeToken(right.profile.careerName);
    const leftMatch = leftName.includes(normalizeToken(title)) || normalizeToken(title).includes(leftName) ? 1 : 0;
    const rightMatch = rightName.includes(normalizeToken(title)) || normalizeToken(title).includes(rightName) ? 1 : 0;
    return rightMatch - leftMatch;
  });

  return candidates[0]?.index ?? 0;
}

async function buildDatasetFromMongoBenchmarks(
  profiles: CareerProfile[],
  competencyOrder: CompetencyKey[]
): Promise<TrainingDataset | null> {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  type CareerDoc = {
    careerPath?: string | string[];
    careerTitle?: string;
    careerLevel?: string;
    description?: string;
    performanceExpectations?: string;
    criticalWorkFunctionsandKeyTasks?: Array<{ workFunctionName?: string; keyTasks?: string[] }>;
    functionalSkillsandCompetencies?: Array<{ skillName?: string; proficiencyLevel?: string }>;
    enablingSkillsandCompetencies?: Array<{ skillName?: string; proficiencyLevel?: string }>;
  };

  const docs = (await Career.find()
    .select(
      "careerPath careerTitle careerLevel description performanceExpectations criticalWorkFunctionsandKeyTasks functionalSkillsandCompetencies enablingSkillsandCompetencies"
    )
    .lean()) as CareerDoc[];

  if (docs.length === 0) {
    return null;
  }

  const canonicalRows: Array<{ label: number; features: number[] }> = [];

  for (const doc of docs) {
    const title = doc.careerTitle ?? "";
    if (!title) continue;

    const pathKey = inferPathKey(doc.careerPath, title);
    const level = inferLevel(doc.careerLevel, title);
    const profileIndex = pickProfileIndex(profiles, pathKey, level, title);
    const profile = profiles[profileIndex];

    const baseVector = competencyOrder.map((key) => clamp01(0.36 + profile.weights[key] * 0.54));
    const perCompetencyScores = new Map<CompetencyKey, number[]>();

    const allSkills = [
      ...(doc.functionalSkillsandCompetencies ?? []),
      ...(doc.enablingSkillsandCompetencies ?? []),
    ];

    allSkills.forEach((skill) => {
      const skillName = typeof skill.skillName === "string" ? skill.skillName : "";
      if (!skillName) return;

      const competency = mapSkillToCompetency(skillName);
      if (!competency) return;

      const score = parseProficiencyScore(skill.proficiencyLevel);
      const existing = perCompetencyScores.get(competency) ?? [];
      existing.push(score);
      perCompetencyScores.set(competency, existing);
    });

    const textBlob = [
      doc.description ?? "",
      doc.performanceExpectations ?? "",
      ...(doc.criticalWorkFunctionsandKeyTasks ?? []).flatMap((item) => [
        item.workFunctionName ?? "",
        ...(item.keyTasks ?? []),
      ]),
    ]
      .join(" ")
      .toLowerCase();

    const rowVector = competencyOrder.map((key, index) => {
      const observed = perCompetencyScores.get(key) ?? [];
      const observedScore =
        observed.length > 0
          ? observed.reduce((sum, value) => sum + value, 0) / observed.length
          : baseVector[index];

      const boostTerms = keywordBoosts[key];
      const hits = boostTerms.filter((term) => textBlob.includes(term)).length;
      const keywordBoost = Math.min(0.16, hits * 0.03);

      return clamp01(observedScore * 0.82 + baseVector[index] * 0.18 + keywordBoost);
    });

    canonicalRows.push({
      label: profileIndex,
      features: rowVector,
    });
  }

  if (canonicalRows.length < 3) {
    return null;
  }

  const rng = new SeededRng(20260224);
  const samples: TrainingSample[] = [];
  const basePerRow = Math.floor(targetSyntheticSampleCount / canonicalRows.length);
  const remainder = targetSyntheticSampleCount % canonicalRows.length;

  canonicalRows.forEach((row, index) => {
    const count = basePerRow + (index < remainder ? 1 : 0);
    for (let i = 0; i < count; i += 1) {
      const peer = canonicalRows[rng.int(canonicalRows.length)];
      const features = row.features.map((value, featureIndex) => {
        const blended = clamp01(value * 0.88 + peer.features[featureIndex] * 0.08);
        const jitter = (rng.next() - 0.5) * 0.16;
        const scenarioShift = rng.next() > 0.92 ? (rng.next() - 0.5) * 0.24 : 0;
        return clamp01(blended + jitter + scenarioShift);
      });

      samples.push({
        features,
        label: row.label,
      });
    }
  });

  return {
    samples,
    dataSource: `mongo-career-benchmarks:${canonicalRows.length}:samples:${samples.length}`,
  };
}

function parseExternalSamples(raw: unknown): ExternalSample[] {
  if (Array.isArray(raw)) {
    return raw as ExternalSample[];
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as { samples?: unknown[] }).samples)) {
    return (raw as { samples: ExternalSample[] }).samples;
  }
  throw new Error("Dataset JSON must be an array or an object with a samples array");
}

async function loadDatasetFromFile(
  filePath: string,
  profiles: CareerProfile[],
  competencyOrder: CompetencyKey[]
): Promise<TrainingDataset> {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(content);
  const externalSamples = parseExternalSamples(parsed);

  const profileIndexByPathAndCareer = new Map<string, number>();
  const profileIndexByCareer = new Map<string, number>();
  profiles.forEach((profile, index) => {
    profileIndexByPathAndCareer.set(`${profile.pathKey}::${profile.careerName}`, index);
    if (!profileIndexByCareer.has(profile.careerName)) {
      profileIndexByCareer.set(profile.careerName, index);
    }
  });

  const samples: TrainingSample[] = [];
  externalSamples.forEach((sample, index) => {
    if (!sample || typeof sample !== "object") {
      throw new Error(`Invalid dataset sample at index ${index}`);
    }
    if (typeof sample.careerName !== "string" || sample.careerName.trim().length === 0) {
      throw new Error(`Missing careerName at dataset sample ${index}`);
    }
    if (!sample.features || typeof sample.features !== "object") {
      throw new Error(`Missing features object at dataset sample ${index}`);
    }

    const pathCareerKey = sample.pathKey
      ? `${sample.pathKey}::${sample.careerName}`
      : null;
    const label =
      (pathCareerKey ? profileIndexByPathAndCareer.get(pathCareerKey) : undefined) ??
      profileIndexByCareer.get(sample.careerName);

    if (label === undefined) {
      throw new Error(
        `Sample ${index} career "${sample.careerName}" not found in configured career profiles`
      );
    }

    const features = competencyOrder.map((key) => clamp01(Number(sample.features[key] ?? 0)));
    samples.push({ features, label });
  });

  if (samples.length < profiles.length) {
    throw new Error("Dataset has too few samples to train the ensemble");
  }

  return {
    samples,
    dataSource: `historical-json:${filePath}`,
  };
}

function sampleWithReplacement(values: TrainingSample[], count: number, rng: SeededRng) {
  if (values.length === 0 || count <= 0) return [] as TrainingSample[];
  const out: TrainingSample[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(values[rng.int(values.length)]);
  }
  return out;
}

function blendDatasets(
  mongoDataset: TrainingDataset,
  externalDataset: TrainingDataset,
  mongoShare = 0.82
): TrainingDataset {
  const rng = new SeededRng(20260224);
  const targetCount = targetSyntheticSampleCount;
  const mongoCount = Math.round(targetCount * mongoShare);
  const externalCount = targetCount - mongoCount;

  const combined = [
    ...sampleWithReplacement(mongoDataset.samples, mongoCount, rng),
    ...sampleWithReplacement(externalDataset.samples, externalCount, rng),
  ];
  rng.shuffle(combined);

  return {
    samples: combined,
    dataSource: `mongo-first-blend(${mongoCount}/${externalCount}):${mongoDataset.dataSource}+${externalDataset.dataSource}`,
  };
}

function buildSyntheticDataset(
  profiles: CareerProfile[],
  competencyOrder: CompetencyKey[]
): TrainingDataset {
  const rng = new SeededRng(20260224);
  const samples: TrainingSample[] = [];

  const profileWeightVectors = profiles.map((profile) =>
    competencyOrder.map((key) => clamp01(profile.weights[key]))
  );

  const baseSamplesPerCareer = Math.floor(targetSyntheticSampleCount / profileWeightVectors.length);
  const remainderSamples = targetSyntheticSampleCount % profileWeightVectors.length;

  profileWeightVectors.forEach((baseVector, label) => {
    const samplesForCareer = baseSamplesPerCareer + (label < remainderSamples ? 1 : 0);

    for (let i = 0; i < samplesForCareer; i += 1) {
      const difficultyMix = rng.next();
      const peerIndex = rng.int(profileWeightVectors.length);
      const peerVector = profileWeightVectors[peerIndex];
      const vector = baseVector.map((baseValue, featureIndex) => {
        const peerWeight = peerVector[featureIndex];
        const mixedTarget = clamp01(baseValue * (0.82 + difficultyMix * 0.12) + peerWeight * 0.06);
        const perturbation = (rng.next() - 0.5) * 0.34;
        const confidenceLift = rng.next() > 0.78 ? 0.08 : 0;
        return clamp01(mixedTarget + perturbation + confidenceLift);
      });
      samples.push({ features: vector, label });
    }
  });

  return {
    samples,
    dataSource: `synthetic-profile-bootstrap:${samples.length}`,
  };
}

export async function loadOrBuildTrainingDataset(
  profiles: CareerProfile[],
  competencyOrder: CompetencyKey[],
  datasetPath?: string
): Promise<TrainingDataset> {
  let externalDataset: TrainingDataset | null = null;
  if (datasetPath) {
    try {
      externalDataset = await loadDatasetFromFile(datasetPath, profiles, competencyOrder);
    } catch (error) {
      console.warn(
        `[recommendation] Failed to load dataset from ${datasetPath}, falling back to other sources`,
        error
      );
    }
  }

  try {
    const mongoDataset = await buildDatasetFromMongoBenchmarks(profiles, competencyOrder);
    if (mongoDataset) {
      return externalDataset ? blendDatasets(mongoDataset, externalDataset) : mongoDataset;
    }
  } catch (error) {
    console.warn("[recommendation] Failed to build dataset from MongoDB, using synthetic fallback", error);
  }

  if (externalDataset) {
    return externalDataset;
  }

  return buildSyntheticDataset(profiles, competencyOrder);
}
