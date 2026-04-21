import { careerPaths, type CareerPathKey } from "./careerData";
import type { EnablingSkill, FunctionalSkill } from "../services/api";

export type CompetencyKey = string;

export type Question = {
  id: string;
  text: string;
  competencies: CompetencyKey[];
  section: "functional" | "enabling" | "integration";
  sectionLabel: string;
  category?: string;
};

type SkillType = "functional" | "enabling";
type CompetencyCategory =
  | "technical"
  | "analytical"
  | "governance"
  | "delivery"
  | "leadership";
type EvidenceBand = "foundation" | "practitioner" | "advanced" | "leadership" | "executive";

type CareerSkillEntry = {
  functionalSkillId?: string;
  enablingSkillId?: string;
  title: string;
  proficiencyLevel?: string;
};

type SelectedCareerSnapshot = {
  functionalSkillsandCompetencies?: CareerSkillEntry[];
  enablingSkillsandCompetencies?: CareerSkillEntry[];
};

export type SkillCatalogSnapshot = {
  functionalSkills?: FunctionalSkill[];
  enablingSkills?: EnablingSkill[];
};

type SkillProfile = {
  key: CompetencyKey;
  title: string;
  skillType: SkillType;
  skillId: string;
  proficiencyLevel: string;
  priority: number;
  category: CompetencyCategory;
  evidenceBand: EvidenceBand;
  keywords: string[];
  categoryLabel?: string;
  relatedCategoryLabel?: string;
  description?: string;
  proficiencyDescription?: string;
};

type QuestionCandidate = {
  text: string;
  competencies: CompetencyKey[];
  priority: number;
  skillType: SkillType | "mixed";
  section: Question["section"];
  sectionLabel: string;
  category?: string;
};

const MIN_QUESTIONS = 25;
const MAX_QUESTIONS = 40;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function competencyKeyFromTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

function normalizeTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function titleCase(value: string) {
  return value
    .split(/[\s_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parsePriorityWeight(raw: string) {
  const text = raw.trim().toLowerCase();
  if (!text) {
    return 0.58;
  }

  const numericMatch = text.match(/\d+(?:\.\d+)?/);
  if (numericMatch) {
    const numeric = Number.parseFloat(numericMatch[0]);
    if (numeric <= 1) return Math.max(0, Math.min(1, numeric));
    if (numeric <= 5) return numeric / 5;
    if (numeric <= 7) return numeric / 7;
  }

  if (/(chief|executive|director|head)/.test(text)) return 0.96;
  if (/(manager|lead|architect|principal)/.test(text)) return 0.88;
  if (/(senior|advanced|specialist|expert)/.test(text)) return 0.78;
  if (/(professional|intermediate|practitioner|working)/.test(text)) return 0.62;
  if (/(associate|basic|foundation|foundational|entry)/.test(text)) return 0.4;
  return 0.58;
}

function findCareerLevel(pathKey: CareerPathKey, careerName: string) {
  return careerPaths[pathKey].careers.find((career) => career.name === careerName)?.level ?? 1;
}

function inferEvidenceBand(proficiencyLevel: string, careerLevel: number): EvidenceBand {
  const text = proficiencyLevel.toLowerCase();
  if (careerLevel >= 7 || /(chief|executive|c-level)/.test(text)) return "executive";
  if (careerLevel >= 5 || /(director|manager|lead|head)/.test(text)) return "leadership";
  if (careerLevel >= 4 || /(senior|advanced|specialist|expert)/.test(text)) return "advanced";
  if (careerLevel >= 2 || /(professional|intermediate|practitioner|working)/.test(text)) return "practitioner";
  return "foundation";
}

function inferCategory(title: string, skillType: SkillType, proficiencyLevel: string): CompetencyCategory {
  const text = `${title} ${proficiencyLevel}`.toLowerCase();
  if (
    /(governance|ethics|risk|compliance|audit|protection|security|standards|continuity|breach|quality|policy)/.test(
      text
    )
  ) {
    return "governance";
  }
  if (
    /(strategy|leadership|people|performance management|planning|portfolio|budget|influence|development|direction)/.test(
      text
    )
  ) {
    return "leadership";
  }
  if (
    /(project|product|stakeholder|partnership|change|delivery|customer|collaboration|communication|negotiation|implementation)/.test(
      text
    )
  ) {
    return "delivery";
  }
  if (
    /(analytics|analysis|modelling|modeling|research|visualization|storytelling|reasoning|text analytics|pattern recognition|needs analysis)/.test(
      text
    )
  ) {
    return "analytical";
  }
  if (skillType === "enabling" && /(communication|collaboration|adaptability|problem solving|sense making)/.test(text)) {
    return "delivery";
  }
  return "technical";
}

function inferCategoryFromCatalog(
  categoryLabel: string | undefined,
  relatedCategoryLabel: string | undefined,
  title: string,
  skillType: SkillType,
  proficiencyLevel: string
): CompetencyCategory {
  const combined = `${categoryLabel ?? ""} ${relatedCategoryLabel ?? ""}`.trim();
  return combined ? inferCategory(combined, skillType, proficiencyLevel) : inferCategory(title, skillType, proficiencyLevel);
}

function extractKeywords(title: string, proficiencyLevel: string) {
  const ignored = new Set([
    "and",
    "the",
    "for",
    "with",
    "level",
    "skills",
    "skill",
    "ability",
    "abilities",
    "work",
    "working",
    "advanced",
    "intermediate",
    "professional",
    "associate",
    "senior",
  ]);
  return Array.from(
    new Set(
      normalizeTokens(`${title} ${proficiencyLevel}`).filter((token) => token.length > 3 && !ignored.has(token))
    )
  ).slice(0, 5);
}

function normalizeCatalogLevel(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function buildCatalogLookups(skillCatalog?: SkillCatalogSnapshot | null) {
  const functionalById = new Map<string, FunctionalSkill>();
  const enablingById = new Map<string, EnablingSkill>();
  (skillCatalog?.functionalSkills ?? []).forEach((skill) => {
    functionalById.set(skill.functionalSkillId, skill);
  });
  (skillCatalog?.enablingSkills ?? []).forEach((skill) => {
    enablingById.set(skill.enablingSkillId, skill);
  });
  return { functionalById, enablingById };
}

function findProficiencyDescription(
  skillDefinition: FunctionalSkill | EnablingSkill | undefined,
  proficiencyLevel: string
) {
  if (!skillDefinition) {
    return "";
  }
  const target = normalizeCatalogLevel(proficiencyLevel);
  const matched =
    skillDefinition.proficiencyLevels.find(
      (level) =>
        normalizeCatalogLevel(level.level) === target ||
        normalizeCatalogLevel(level.proficiencyLevelId) === target
    ) ??
    skillDefinition.proficiencyLevels.find((level) => {
      const normalizedLevel = normalizeCatalogLevel(level.level);
      return normalizedLevel.includes(target) || target.includes(normalizedLevel);
    });
  return (matched?.description ?? "").trim();
}

function cleanSentence(value: string | undefined) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function firstSentence(value: string | undefined) {
  const text = cleanSentence(value);
  if (!text) {
    return "";
  }
  const match = text.match(/.+?[.!?](?:\s|$)/);
  return (match?.[0] ?? text).trim();
}

function supportingClause(value: string | undefined, fallback = "") {
  const sentence = firstSentence(value);
  if (!sentence) {
    return fallback;
  }
  return sentence.replace(/\.$/, "").trim();
}

function uniqueSkills(careerData: SelectedCareerSnapshot | null | undefined, skillCatalog?: SkillCatalogSnapshot | null) {
  const merged = new Map<string, SkillProfile>();
  const { functionalById, enablingById } = buildCatalogLookups(skillCatalog);
  const ingest = (skills: CareerSkillEntry[], skillType: SkillType) => {
    skills.forEach((skill) => {
      const title = skill?.title?.trim();
      if (!title) {
        return;
      }
      const key = competencyKeyFromTitle(title);
      const proficiencyLevel = (skill.proficiencyLevel ?? "").trim();
      const skillId =
        (skillType === "functional" ? skill.functionalSkillId : skill.enablingSkillId)?.trim() ?? key;
      const skillDefinition =
        skillType === "functional" ? functionalById.get(skillId) : enablingById.get(skillId);
      const existing = merged.get(key);
      const priority = parsePriorityWeight(proficiencyLevel);
      if (!existing || priority > existing.priority) {
        merged.set(key, {
          key,
          title,
          skillType,
          skillId,
          proficiencyLevel,
          priority,
          category: "technical",
          evidenceBand: "foundation",
          keywords: [],
          categoryLabel: skillDefinition?.category?.trim() || undefined,
          relatedCategoryLabel: skillDefinition?.relatedCategory?.trim() || undefined,
          description: cleanSentence(skillDefinition?.description),
          proficiencyDescription: cleanSentence(findProficiencyDescription(skillDefinition, proficiencyLevel)),
        });
      }
    });
  };

  ingest(careerData?.functionalSkillsandCompetencies ?? [], "functional");
  ingest(careerData?.enablingSkillsandCompetencies ?? [], "enabling");
  return Array.from(merged.values());
}

function annotateSkills(
  pathKey: CareerPathKey,
  careerName: string,
  careerData: SelectedCareerSnapshot | null | undefined,
  skillCatalog?: SkillCatalogSnapshot | null
) {
  const careerLevel = findCareerLevel(pathKey, careerName);
  return uniqueSkills(careerData, skillCatalog)
    .map((skill) => {
      const category = inferCategoryFromCatalog(
        skill.categoryLabel,
        skill.relatedCategoryLabel,
        skill.title,
        skill.skillType,
        skill.proficiencyLevel
      );
      const evidenceBand = inferEvidenceBand(skill.proficiencyLevel, careerLevel);
      return {
        ...skill,
        category,
        evidenceBand,
        keywords: extractKeywords(skill.title, skill.proficiencyLevel),
      };
    })
    .sort((left, right) => right.priority - left.priority || left.title.localeCompare(right.title));
}

function joinTitles(skills: SkillProfile[]) {
  const titles = skills.map((skill) => skill.title);
  if (titles.length <= 1) return titles[0] ?? "";
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

function bandPhrase(band: EvidenceBand) {
  switch (band) {
    case "executive":
      return "set direction, standards, and business trade-offs";
    case "leadership":
      return "lead decisions, priorities, and team execution";
    case "advanced":
      return "handle complex work independently and justify decisions";
    case "practitioner":
      return "deliver solid work with limited supervision";
    default:
      return "apply the fundamentals in real work";
  }
}

function contextLabel(skill: SkillProfile) {
  return skill.relatedCategoryLabel || skill.categoryLabel || titleCase(skill.category);
}

function singleSkillEvidencePrompt(skill: SkillProfile, careerName: string): QuestionCandidate {
  const categoryClauses: Record<CompetencyCategory, string> = {
    technical: `I have used ${skill.title} in real work and can explain the choices I made.`,
    analytical: `I have used ${skill.title} to investigate issues, interpret results, and support decisions.`,
    governance: `I have applied ${skill.title} to protect quality, standards, ethics, or risk in my work.`,
    delivery: `I have used ${skill.title} to coordinate work, communicate clearly, and deliver outcomes with stakeholders.`,
    leadership: `I have used ${skill.title} to guide direction, priorities, and execution in my work.`,
  };

  const context = contextLabel(skill);
  const support = supportingClause(
    skill.proficiencyDescription,
    supportingClause(skill.description, `This skill matters in ${context.toLowerCase()}`)
  );
  const text = `${categoryClauses[skill.category]} ${support}.`;
  return {
    text: text.replace(/\s+/g, " ").trim(),
    competencies: [skill.key],
    priority: skill.priority * (skill.skillType === "functional" ? 1.16 : 1.05),
    skillType: skill.skillType,
    section: skill.skillType,
    sectionLabel: skill.skillType === "functional" ? "Functional Skills" : "Enabling Skills",
    category: context,
  };
}

function groupedEvidencePrompt(
  skills: SkillProfile[],
  careerName: string,
  skillType: SkillType
): QuestionCandidate | null {
  if (skills.length === 0) {
    return null;
  }
  const lead = skills[0];
  const titleList = joinTitles(skills);
  const relatedContexts = Array.from(
    new Set(
      skills
        .map((skill) => skill.relatedCategoryLabel || skill.categoryLabel)
        .filter((value): value is string => Boolean(value))
    )
  );
  const context = relatedContexts.slice(0, 2).join(" and ") || contextLabel(lead);
  const categoryLead: Record<CompetencyCategory, string> = {
    technical: `I have combined ${titleList} to build, test, or improve work.`,
    analytical: `I have combined ${titleList} to frame problems, analyze evidence, and communicate insight.`,
    governance: `I have combined ${titleList} to keep work aligned with standards, quality, ethics, and risk expectations.`,
    delivery: `I have combined ${titleList} to work with stakeholders, keep momentum, and deliver outcomes.`,
    leadership: `I have combined ${titleList} to guide priorities, decisions, and people in my work.`,
  };
  const support = lead.keywords.length > 0 ? `Evidence may include ${lead.keywords.join(", ")}` : `This supports ${context.toLowerCase()}`;
  return {
    text: `${categoryLead[lead.category]} ${support}.`.replace(/\s+/g, " ").trim(),
    competencies: skills.map((skill) => skill.key),
    priority: skills.reduce((sum, skill) => sum + skill.priority, 0) / skills.length + 0.12,
    skillType,
    section: skillType,
    sectionLabel: skillType === "functional" ? "Functional Skills" : "Enabling Skills",
    category: context,
  };
}

function synthesisPrompt(
  title: string,
  text: string,
  skills: SkillProfile[],
  priorityBonus: number
): QuestionCandidate | null {
  if (skills.length === 0) {
    return null;
  }
  return {
    text: text.replace(/\s+/g, " ").trim(),
    competencies: skills.map((skill) => skill.key),
    priority:
      skills.reduce((sum, skill) => sum + skill.priority, 0) / Math.max(1, skills.length) + priorityBonus,
    skillType: "mixed",
    section: "integration",
    sectionLabel: "Integration Prompt",
    category: skills[0] ? contextLabel(skills[0]) : undefined,
  };
}

function chunkSkills(skills: SkillProfile[], size: number) {
  const chunks: SkillProfile[][] = [];
  for (let index = 0; index < skills.length; index += size) {
    chunks.push(skills.slice(index, index + size));
  }
  return chunks;
}

function buildQuestionCandidates(
  pathKey: CareerPathKey,
  careerName: string,
  careerData: SelectedCareerSnapshot | null | undefined,
  skillCatalog?: SkillCatalogSnapshot | null
) {
  const skills = annotateSkills(pathKey, careerName, careerData, skillCatalog);
  const functional = skills.filter((skill) => skill.skillType === "functional");
  const enabling = skills.filter((skill) => skill.skillType === "enabling");
  const allCandidates: QuestionCandidate[] = [];

  functional.forEach((skill) => {
    allCandidates.push(singleSkillEvidencePrompt(skill, careerName));
  });
  enabling.forEach((skill) => {
    allCandidates.push(singleSkillEvidencePrompt(skill, careerName));
  });

  const addGroupedByCategory = (items: SkillProfile[], skillType: SkillType) => {
    const byCategory = new Map<string, SkillProfile[]>();
    items.forEach((skill) => {
      const groupKey = `${skill.relatedCategoryLabel || skill.categoryLabel || skill.category}::${skill.category}`;
      const current = byCategory.get(groupKey) ?? [];
      current.push(skill);
      byCategory.set(groupKey, current);
    });
    byCategory.forEach((categorySkills) => {
      chunkSkills(categorySkills, 3).forEach((group) => {
        const candidate = groupedEvidencePrompt(group, careerName, skillType);
        if (candidate) {
          allCandidates.push(candidate);
        }
      });
    });
  };

  addGroupedByCategory(functional, "functional");
  addGroupedByCategory(enabling, "enabling");

  const highestPriority = skills.slice(0, 8);
  const topFunctional = functional.slice(0, 6);
  const topEnabling = enabling.slice(0, 6);
  const leadershipSignals = skills
    .filter((skill) => skill.category === "leadership" || skill.evidenceBand === "leadership" || skill.evidenceBand === "executive")
    .slice(0, 4);
  const governanceSignals = skills.filter((skill) => skill.category === "governance").slice(0, 4);
  const deliverySignals = skills.filter((skill) => skill.category === "delivery").slice(0, 4);

  const synthesisCandidates = [
    synthesisPrompt(
      "Role evidence",
      `I have connected ${joinTitles(highestPriority.slice(0, 3))} to meaningful work outcomes.`,
      highestPriority.slice(0, 3),
      0.18
    ),
    synthesisPrompt(
      "Functional integration",
      `I have combined ${joinTitles(topFunctional.slice(0, Math.min(4, topFunctional.length)))} in one piece of work instead of treating them as isolated skills.`,
      topFunctional.slice(0, Math.min(4, topFunctional.length)),
      0.16
    ),
    synthesisPrompt(
      "Enabling behaviors",
      `I have shown the behaviors behind ${joinTitles(topEnabling.slice(0, Math.min(4, topEnabling.length)))} when work becomes ambiguous, collaborative, or high stakes.`,
      topEnabling.slice(0, Math.min(4, topEnabling.length)),
      0.14
    ),
    synthesisPrompt(
      "Governance and risk",
      `I have balanced quality, governance, and risk while still delivering work outcomes.`,
      governanceSignals,
      0.15
    ),
    synthesisPrompt(
      "Stakeholder delivery",
      `I have adjusted how I communicate and deliver work to match stakeholder needs, timelines, and operational constraints.`,
      deliverySignals,
      0.12
    ),
    synthesisPrompt(
      "Progression readiness",
      `I have shown evidence through my work that I can apply these skills with independence and good judgment.`,
      leadershipSignals.length > 0 ? leadershipSignals : highestPriority.slice(0, 3),
      0.17
    ),
  ].filter((item): item is QuestionCandidate => Boolean(item));

  allCandidates.push(...synthesisCandidates);
  return skills.length > 0 ? allCandidates : [];
}

function dedupeCandidates(candidates: QuestionCandidate[]) {
  const merged = new Map<string, QuestionCandidate>();
  candidates.forEach((candidate) => {
    const key = `${candidate.text}::${candidate.competencies.join("|")}`;
    const existing = merged.get(key);
    if (!existing || candidate.priority > existing.priority) {
      merged.set(key, candidate);
    }
  });
  return Array.from(merged.values());
}

function chooseQuestionCount(skillCount: number) {
  const scaled = Math.round(skillCount * 1.1);
  return Math.max(MIN_QUESTIONS, Math.min(MAX_QUESTIONS, scaled));
}

function selectQuestions(candidates: QuestionCandidate[], targetCount: number) {
  const selected: QuestionCandidate[] = [];
  const seenText = new Set<string>();
  const quotas = {
    functional: Math.max(10, Math.round(targetCount * 0.45)),
    enabling: Math.max(8, Math.round(targetCount * 0.25)),
    mixed: Math.max(5, Math.round(targetCount * 0.2)),
  };
  const byType = {
    functional: dedupeCandidates(candidates.filter((candidate) => candidate.skillType === "functional")).sort(
      (left, right) => right.priority - left.priority
    ),
    enabling: dedupeCandidates(candidates.filter((candidate) => candidate.skillType === "enabling")).sort(
      (left, right) => right.priority - left.priority
    ),
    mixed: dedupeCandidates(candidates.filter((candidate) => candidate.skillType === "mixed")).sort(
      (left, right) => right.priority - left.priority
    ),
  };

  (["functional", "enabling", "mixed"] as const).forEach((type) => {
    for (const candidate of byType[type]) {
      if (selected.length >= targetCount || quotas[type] <= 0) {
        break;
      }
      if (seenText.has(candidate.text)) {
        continue;
      }
      selected.push(candidate);
      seenText.add(candidate.text);
      quotas[type] -= 1;
    }
  });

  const remainder = dedupeCandidates(candidates).sort((left, right) => right.priority - left.priority);
  for (const candidate of remainder) {
    if (selected.length >= targetCount) {
      break;
    }
    if (seenText.has(candidate.text)) {
      continue;
    }
    selected.push(candidate);
    seenText.add(candidate.text);
  }

  return selected.slice(0, targetCount);
}

function fallbackPrompts(pathKey: CareerPathKey | null, careerName: string | null): Question[] {
  const pathLabel = pathKey ? careerPaths[pathKey].name : "selected path";
  const label = careerName ?? "selected career";
  return [
    {
      id: `fallback-${slugify(label)}-q1`,
      text: `I can perform the core responsibilities expected of a ${label} in the ${pathLabel} track.`,
      competencies: ["career_readiness", "practical_execution"],
      section: "integration",
      sectionLabel: "Career Readiness",
    },
    {
      id: `fallback-${slugify(label)}-q2`,
      text: `I can communicate my work and decisions clearly with teammates and stakeholders.`,
      competencies: ["communication", "stakeholder_collaboration"],
      section: "enabling",
      sectionLabel: "Enabling Skill",
    },
    {
      id: `fallback-${slugify(label)}-q3`,
      text: `I can identify the next skills I need to strengthen to progress in this role.`,
      competencies: ["growth_planning", "role_progression"],
      section: "integration",
      sectionLabel: "Progression Prompt",
    },
  ];
}

export function getQuestionsForCareer(
  pathKey: CareerPathKey | null,
  careerName: string | null,
  careerData?: SelectedCareerSnapshot | null,
  skillCatalog?: SkillCatalogSnapshot | null
): Question[] {
  if (!pathKey || !careerName) {
    return fallbackPrompts(pathKey, careerName);
  }

  const candidates = buildQuestionCandidates(pathKey, careerName, careerData, skillCatalog);
  if (candidates.length === 0) {
    return fallbackPrompts(pathKey, careerName);
  }

  const chosen = selectQuestions(
    candidates,
    chooseQuestionCount(annotateSkills(pathKey, careerName, careerData, skillCatalog).length)
  );
  const prefix = `${pathKey}-${slugify(careerName)}`;

  return chosen.map((item, index) => ({
    id: `${prefix}-q${index + 1}`,
    text: item.text,
    competencies: item.competencies,
    section: item.section,
    sectionLabel: item.sectionLabel,
    category: item.category,
  }));
}

export const defaultQuestions: Question[] = fallbackPrompts(null, null);
