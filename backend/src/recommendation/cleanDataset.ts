import fs from "node:fs/promises";
import path from "node:path";
import { buildCareerProfiles, competencyLabels, competencyOrder } from "./catalog.js";
import type { CareerPathKey, CompetencyKey } from "./types.js";
import { clamp01 } from "./utils.js";

type ParsedArgs = {
  input: string;
  output: string;
};

type CleanRow = {
  careerName: string;
  pathKey: CareerPathKey;
  features: Record<CompetencyKey, number>;
};

type RawRecord = Record<string, unknown>;

const pathAliasMap: Record<string, CareerPathKey> = {
  businessintelligence: "business_intelligence",
  business_intelligence: "business_intelligence",
  businessintelligencestrategy: "business_intelligence",
  bistrategy: "business_intelligence",
  datastewardship: "data_stewardship",
  data_stewardship: "data_stewardship",
  stewardship: "data_stewardship",
  dataengineering: "data_engineering",
  data_engineering: "data_engineering",
  engineering: "data_engineering",
  datascience: "data_science",
  data_science: "data_science",
  aiengineering: "ai_engineering",
  ai_engineering: "ai_engineering",
  mlengineering: "ai_engineering",
  appliedresearch: "applied_research",
  applied_research: "applied_research",
  research: "applied_research",
};

const competencyAliasEntries: Array<[string, CompetencyKey]> = [
  ["businessstrategy", "business_strategy"],
  ["businessstrat", "business_strategy"],
  ["business_alignment", "business_strategy"],
  ["sqldataaccess", "sql_data_access"],
  ["sql", "sql_data_access"],
  ["sqlquerying", "sql_data_access"],
  ["databaseaccess", "sql_data_access"],
  ["datavisualization", "data_visualization"],
  ["dashboarding", "data_visualization"],
  ["reporting", "data_visualization"],
  ["dataqualitygovernance", "data_quality_governance"],
  ["datagovernance", "data_quality_governance"],
  ["dataquality", "data_quality_governance"],
  ["governance", "data_quality_governance"],
  ["dataengineering", "data_engineering"],
  ["etl", "data_engineering"],
  ["pipelines", "data_engineering"],
  ["statisticsexperimentation", "statistics_experimentation"],
  ["statistics", "statistics_experimentation"],
  ["experimentation", "statistics_experimentation"],
  ["abtesting", "statistics_experimentation"],
  ["machinelearning", "machine_learning"],
  ["ml", "machine_learning"],
  ["modeling", "machine_learning"],
  ["mlopsdeployment", "mlops_deployment"],
  ["mlops", "mlops_deployment"],
  ["deployment", "mlops_deployment"],
  ["researchinnovation", "research_innovation"],
  ["research", "research_innovation"],
  ["innovation", "research_innovation"],
  ["communicationstorytelling", "communication_storytelling"],
  ["communication", "communication_storytelling"],
  ["storytelling", "communication_storytelling"],
  ["responsibleai", "responsible_ai"],
  ["ethicalai", "responsible_ai"],
  ["aiethics", "responsible_ai"],
  ["collaborationdelivery", "collaboration_delivery"],
  ["collaboration", "collaboration_delivery"],
  ["delivery", "collaboration_delivery"],
  ["leadershipexecution", "leadership_execution"],
  ["leadership", "leadership_execution"],
  ["execution", "leadership_execution"],
  ["rolemastery", "role_mastery"],
  ["roleproficiency", "role_mastery"],
  ["mastery", "role_mastery"],
];

const yesValues = new Set(["yes", "y", "true", "have", "has", "present", "high", "strong"]);
const noValues = new Set(["no", "n", "false", "none", "missing", "low", "weak", "not"]);

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseArgs(argv: string[]): ParsedArgs {
  let input = "";
  let output = "";

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--input" || token === "-i") {
      input = argv[index + 1] ?? "";
      index += 1;
    } else if (token === "--output" || token === "-o") {
      output = argv[index + 1] ?? "";
      index += 1;
    }
  }

  if (!input || !output) {
    throw new Error(
      "Usage: node --loader ts-node/esm src/recommendation/cleanDataset.ts --input <raw.json|raw.csv> --output <cleaned.json>"
    );
  }

  return { input, output };
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      const next = line[index + 1];
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(text: string): RawRecord[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: RawRecord[] = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = parseCsvLine(lines[lineIndex]);
    const row: RawRecord = {};
    headers.forEach((header, columnIndex) => {
      row[header] = values[columnIndex] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function toRecords(inputPath: string, content: string): RawRecord[] {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === ".csv") {
    return parseCsv(content);
  }

  const parsed = JSON.parse(content) as unknown;
  if (Array.isArray(parsed)) {
    return parsed as RawRecord[];
  }
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { rows?: unknown[] }).rows)) {
    return (parsed as { rows: RawRecord[] }).rows;
  }
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { samples?: unknown[] }).samples)) {
    return (parsed as { samples: RawRecord[] }).samples;
  }
  throw new Error("Unsupported input format. Expected CSV, JSON array, {rows:[]}, or {samples:[]}");
}

function parseNumericValue(rawValue: unknown): number | null {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === "number") {
    if (!Number.isFinite(rawValue)) return null;
    return clamp01(rawValue > 1 ? rawValue / 100 : rawValue);
  }

  const text = String(rawValue).trim();
  if (!text) return null;

  const normalized = normalizeText(text);
  if (yesValues.has(normalized)) return 1;
  if (noValues.has(normalized)) return 0;

  const percentMatch = text.match(/^(-?\d+(\.\d+)?)\s*%$/);
  if (percentMatch) {
    const value = Number(percentMatch[1]);
    if (!Number.isFinite(value)) return null;
    return clamp01(value / 100);
  }

  const levelMatch = normalized.match(/^level([1-5])$/);
  if (levelMatch) {
    const level = Number(levelMatch[1]);
    return clamp01((level - 1) / 4);
  }

  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return null;
  return clamp01(numeric > 1 ? numeric / 100 : numeric);
}

function parseLevel(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const rounded = Math.round(raw);
    return rounded >= 1 && rounded <= 5 ? rounded : null;
  }
  const text = String(raw).trim();
  if (!text) return null;
  const match = text.match(/([1-5])/);
  if (!match) return null;
  return Number(match[1]);
}

function buildAliasMaps() {
  const competencyAliasMap = new Map<string, CompetencyKey>();
  competencyOrder.forEach((key) => {
    competencyAliasMap.set(normalizeText(key), key);
    competencyAliasMap.set(normalizeText(competencyLabels[key]), key);
  });
  competencyAliasEntries.forEach(([alias, key]) => {
    competencyAliasMap.set(normalizeText(alias), key);
  });
  return competencyAliasMap;
}

function resolvePathKey(rawPath: unknown): CareerPathKey | null {
  if (typeof rawPath !== "string") return null;
  const normalized = normalizeText(rawPath);
  return pathAliasMap[normalized] ?? null;
}

function getValueFromKeys(record: RawRecord, keys: string[]): unknown {
  const normalizedCandidates = new Set(keys.map(normalizeText));
  for (const [key, value] of Object.entries(record)) {
    if (normalizedCandidates.has(normalizeText(key))) {
      return value;
    }
  }
  return null;
}

function mainCareerAliasMap() {
  const profiles = buildCareerProfiles();
  const map = new Map<string, { careerName: string; pathKey: CareerPathKey; level: number }>();
  profiles.forEach((profile) => {
    map.set(normalizeText(profile.careerName), {
      careerName: profile.careerName,
      pathKey: profile.pathKey,
      level: profile.level,
    });
  });
  return { map, profiles };
}

type CareerLookup = ReturnType<typeof mainCareerAliasMap>;

function resolveCareer(record: RawRecord, lookup: CareerLookup) {
  const { map, profiles } = lookup;
  const rawCareer = getValueFromKeys(record, [
    "careerName",
    "career",
    "careerTitle",
    "role",
    "label",
    "targetCareer",
  ]);
  const rawPath = getValueFromKeys(record, ["pathKey", "careerPath", "track", "path", "domain"]);
  const rawLevel = getValueFromKeys(record, ["level", "careerLevel", "targetLevel", "roleLevel"]);

  const resolvedPath = resolvePathKey(rawPath);
  const level = parseLevel(rawLevel);

  if (typeof rawCareer === "string" && rawCareer.trim().length > 0) {
    const normalizedCareer = normalizeText(rawCareer);
    const exact = map.get(normalizedCareer);
    if (exact) return exact;

    const fuzzy = profiles.find((profile) => {
      const normalizedProfile = normalizeText(profile.careerName);
      return (
        normalizedProfile.includes(normalizedCareer) || normalizedCareer.includes(normalizedProfile)
      );
    });
    if (fuzzy) {
      return {
        careerName: fuzzy.careerName,
        pathKey: fuzzy.pathKey,
        level: fuzzy.level,
      };
    }
  }

  if (resolvedPath && level) {
    const byPathAndLevel = profiles.find(
      (profile) => profile.pathKey === resolvedPath && profile.level === level
    );
    if (byPathAndLevel) {
      return {
        careerName: byPathAndLevel.careerName,
        pathKey: byPathAndLevel.pathKey,
        level: byPathAndLevel.level,
      };
    }
  }

  if (resolvedPath) {
    const byPath = profiles.find((profile) => profile.pathKey === resolvedPath);
    if (byPath) {
      return {
        careerName: byPath.careerName,
        pathKey: byPath.pathKey,
        level: byPath.level,
      };
    }
  }

  return null;
}

function tryParseFeaturesObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text.startsWith("{")) return null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function extractPartialFeatures(record: RawRecord, competencyAliasMap: Map<string, CompetencyKey>) {
  const values = new Map<CompetencyKey, number>();

  const featuresObj = tryParseFeaturesObject(
    getValueFromKeys(record, ["features", "featureMap", "competencies", "skillScores"])
  );
  if (featuresObj) {
    for (const [key, raw] of Object.entries(featuresObj)) {
      const competency = competencyAliasMap.get(normalizeText(key));
      if (!competency) continue;
      const numeric = parseNumericValue(raw);
      if (numeric === null) continue;
      values.set(competency, numeric);
    }
  }

  for (const [key, raw] of Object.entries(record)) {
    const competency = competencyAliasMap.get(normalizeText(key));
    if (!competency) continue;
    const numeric = parseNumericValue(raw);
    if (numeric === null) continue;
    values.set(competency, numeric);
  }

  return values;
}

function median(values: number[]) {
  if (values.length === 0) return 0.5;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

async function run() {
  const args = parseArgs(process.argv);
  const raw = await fs.readFile(args.input, "utf8");
  const records = toRecords(args.input, raw);
  const competencyAliasMap = buildAliasMaps();
  const careerLookup = mainCareerAliasMap();
  const discarded: string[] = [];

  const partialRows: Array<{
    careerName: string;
    pathKey: CareerPathKey;
    features: Map<CompetencyKey, number>;
  }> = [];

  records.forEach((record, index) => {
    const career = resolveCareer(record, careerLookup);
    if (!career) {
      discarded.push(`row ${index + 1}: unable to resolve career/path`);
      return;
    }

    const features = extractPartialFeatures(record, competencyAliasMap);
    if (features.size < 2) {
      discarded.push(`row ${index + 1}: insufficient feature columns`);
      return;
    }

    partialRows.push({
      careerName: career.careerName,
      pathKey: career.pathKey,
      features,
    });
  });

  if (partialRows.length === 0) {
    throw new Error("No usable rows after cleaning. Check career labels and feature columns.");
  }

  const globalMedians = new Map<CompetencyKey, number>();
  competencyOrder.forEach((key) => {
    const observed = partialRows
      .map((row) => row.features.get(key))
      .filter((value): value is number => typeof value === "number");
    globalMedians.set(key, median(observed));
  });

  const cleanedRows: CleanRow[] = partialRows.map((row) => {
    const features = {} as Record<CompetencyKey, number>;
    competencyOrder.forEach((key) => {
      const value = row.features.get(key) ?? globalMedians.get(key) ?? 0.5;
      features[key] = clamp01(value);
    });
    return {
      careerName: row.careerName,
      pathKey: row.pathKey,
      features,
    };
  });

  const dedupe = new Map<string, CleanRow>();
  cleanedRows.forEach((row) => {
    const signature = competencyOrder
      .map((key) => row.features[key].toFixed(4))
      .join("|");
    const key = `${row.pathKey}::${row.careerName}::${signature}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, row);
    }
  });

  const finalRows = Array.from(dedupe.values());

  const output = {
    samples: finalRows,
    meta: {
      createdAt: new Date().toISOString(),
      sourceFile: args.input,
      inputRows: records.length,
      usableRows: partialRows.length,
      outputRows: finalRows.length,
      discardedRows: discarded.length,
      discardedPreview: discarded.slice(0, 25),
      features: competencyOrder.length,
    },
  };

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, JSON.stringify(output, null, 2), "utf8");

  console.log("[clean-dataset] completed");
  console.log(`  input: ${args.input}`);
  console.log(`  output: ${args.output}`);
  console.log(`  rows: ${records.length} -> ${finalRows.length}`);
  console.log(`  discarded: ${discarded.length}`);
}

run().catch((error) => {
  console.error("[clean-dataset] failed:", error);
  process.exit(1);
});
