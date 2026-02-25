import { careerPaths, type CareerPathKey } from "./careerData";

export type CompetencyKey =
  | "business_strategy"
  | "sql_data_access"
  | "data_visualization"
  | "data_quality_governance"
  | "data_engineering"
  | "statistics_experimentation"
  | "machine_learning"
  | "mlops_deployment"
  | "research_innovation"
  | "communication_storytelling"
  | "responsible_ai"
  | "collaboration_delivery"
  | "leadership_execution"
  | "role_mastery";

export type Question = {
  id: string;
  text: string;
  competencies: CompetencyKey[];
};

type PromptDefinition = {
  text: string;
  competencies: CompetencyKey[];
};

function prompt(text: string, competencies: CompetencyKey[]): PromptDefinition {
  return { text, competencies };
}

const pathFunctionalPrompts: Record<CareerPathKey, PromptDefinition[]> = {
  business_intelligence: [
    prompt("I can define business questions and convert them into measurable analytics objectives.", [
      "business_strategy",
      "role_mastery",
    ]),
    prompt("I can create dashboards and reports that track KPIs for business functions.", [
      "data_visualization",
      "communication_storytelling",
      "role_mastery",
    ]),
    prompt("I can write SQL queries to extract and transform data for decision support.", [
      "sql_data_access",
      "role_mastery",
    ]),
    prompt("I can validate data quality before publishing business insights.", [
      "data_quality_governance",
      "sql_data_access",
    ]),
    prompt("I can identify trends, outliers, and business opportunities from datasets.", [
      "statistics_experimentation",
      "business_strategy",
    ]),
    prompt("I can communicate findings as actionable recommendations for stakeholders.", [
      "communication_storytelling",
      "business_strategy",
    ]),
    prompt("I can align BI deliverables to strategic and operational goals.", [
      "business_strategy",
      "leadership_execution",
    ]),
    prompt("I can prioritize analytics requests based on impact, urgency, and effort.", [
      "business_strategy",
      "leadership_execution",
      "collaboration_delivery",
    ]),
    prompt("I can define consistent metric logic and maintain semantic KPI definitions.", [
      "data_quality_governance",
      "data_visualization",
    ]),
    prompt("I can collaborate with data engineers and stewards to improve analytics data models.", [
      "collaboration_delivery",
      "data_engineering",
      "sql_data_access",
    ]),
  ],
  data_stewardship: [
    prompt("I can apply governance standards and stewardship workflows to business datasets.", [
      "data_quality_governance",
      "role_mastery",
    ]),
    prompt("I can document metadata, data ownership, and critical data definitions.", [
      "data_quality_governance",
      "communication_storytelling",
    ]),
    prompt("I can monitor data quality indicators and coordinate issue remediation.", [
      "data_quality_governance",
      "collaboration_delivery",
    ]),
    prompt("I can enforce data classification, privacy, and access control policies.", [
      "data_quality_governance",
      "responsible_ai",
    ]),
    prompt("I can support lineage and traceability for critical data elements.", [
      "data_quality_governance",
      "data_engineering",
    ]),
    prompt("I can align governance controls with regulatory and risk requirements.", [
      "responsible_ai",
      "business_strategy",
    ]),
    prompt("I can run stewardship forums and coordinate actions with business owners.", [
      "collaboration_delivery",
      "leadership_execution",
    ]),
    prompt("I can identify master and reference data issues and propose controls.", [
      "data_quality_governance",
      "sql_data_access",
    ]),
    prompt("I can evaluate compliance gaps and prioritize governance improvements.", [
      "business_strategy",
      "leadership_execution",
      "responsible_ai",
    ]),
    prompt("I can communicate governance tradeoffs clearly to technical and non-technical teams.", [
      "communication_storytelling",
      "collaboration_delivery",
    ]),
  ],
  data_engineering: [
    prompt("I can build and maintain reliable batch or streaming data pipelines.", [
      "data_engineering",
      "role_mastery",
    ]),
    prompt("I can design ETL/ELT workflows that are testable, observable, and recoverable.", [
      "data_engineering",
      "mlops_deployment",
    ]),
    prompt("I can model data for analytics in warehouses or lakehouses.", [
      "data_engineering",
      "sql_data_access",
    ]),
    prompt("I can optimize pipeline performance, resource usage, and cost.", [
      "data_engineering",
      "business_strategy",
    ]),
    prompt("I can implement schema contracts and automated data quality checks in pipelines.", [
      "data_quality_governance",
      "data_engineering",
    ]),
    prompt("I can manage orchestration, retries, and dependency handling for workflows.", [
      "data_engineering",
      "mlops_deployment",
    ]),
    prompt("I can apply version control and CI/CD for data platform changes.", [
      "mlops_deployment",
      "data_engineering",
    ]),
    prompt("I can enforce secure data access and least privilege on data platforms.", [
      "data_quality_governance",
      "responsible_ai",
    ]),
    prompt("I can establish pipeline monitoring with clear SLAs and incident playbooks.", [
      "mlops_deployment",
      "leadership_execution",
    ]),
    prompt("I can collaborate with analysts and scientists to operationalize data products.", [
      "collaboration_delivery",
      "business_strategy",
      "data_engineering",
    ]),
  ],
  data_science: [
    prompt("I can frame business opportunities as measurable analytics or modeling problems.", [
      "business_strategy",
      "role_mastery",
    ]),
    prompt("I can perform exploratory analysis and statistical profiling to guide modeling decisions.", [
      "statistics_experimentation",
      "sql_data_access",
    ]),
    prompt("I can engineer robust features for predictive and descriptive models.", [
      "machine_learning",
      "data_engineering",
    ]),
    prompt("I can train and compare models using appropriate performance metrics.", [
      "machine_learning",
      "statistics_experimentation",
    ]),
    prompt("I can reduce leakage, bias, and overfitting risks through proper validation.", [
      "machine_learning",
      "responsible_ai",
    ]),
    prompt("I can explain model outputs, assumptions, and uncertainty to stakeholders.", [
      "communication_storytelling",
      "statistics_experimentation",
    ]),
    prompt("I can design and interpret A/B tests and controlled experiments.", [
      "statistics_experimentation",
      "business_strategy",
    ]),
    prompt("I can collaborate with engineers to operationalize models in production workflows.", [
      "collaboration_delivery",
      "mlops_deployment",
      "machine_learning",
    ]),
    prompt("I can define monitoring indicators for model quality and business impact over time.", [
      "mlops_deployment",
      "business_strategy",
    ]),
    prompt("I can align data science work to product or business priorities.", [
      "business_strategy",
      "leadership_execution",
    ]),
  ],
  ai_engineering: [
    prompt("I can design and deploy production-grade ML/AI services with clear SLOs.", [
      "mlops_deployment",
      "data_engineering",
      "role_mastery",
    ]),
    prompt("I can implement reproducible training, model versioning, and release workflows.", [
      "mlops_deployment",
      "machine_learning",
    ]),
    prompt("I can monitor drift, quality, and reliability for live AI services.", [
      "mlops_deployment",
      "machine_learning",
    ]),
    prompt("I can design scalable inference APIs and integration patterns.", [
      "data_engineering",
      "mlops_deployment",
    ]),
    prompt("I can evaluate tradeoffs between model quality, latency, and infrastructure cost.", [
      "business_strategy",
      "mlops_deployment",
    ]),
    prompt("I can implement safety, fairness, and risk guardrails for AI systems.", [
      "responsible_ai",
      "machine_learning",
    ]),
    prompt("I can run incident response for model or pipeline failures.", [
      "mlops_deployment",
      "leadership_execution",
      "collaboration_delivery",
    ]),
    prompt("I can apply CI/CD and infrastructure automation to AI platforms.", [
      "mlops_deployment",
      "data_engineering",
    ]),
    prompt("I can evaluate and tune retrieval, prompting, and evaluation loops for GenAI systems.", [
      "machine_learning",
      "research_innovation",
      "responsible_ai",
    ]),
    prompt("I can collaborate with product, legal, and security teams on production AI rollout.", [
      "collaboration_delivery",
      "responsible_ai",
      "communication_storytelling",
    ]),
  ],
  applied_research: [
    prompt("I can review literature and identify relevant state-of-the-art methods.", [
      "research_innovation",
      "role_mastery",
    ]),
    prompt("I can formulate research hypotheses tied to practical outcomes.", [
      "research_innovation",
      "business_strategy",
    ]),
    prompt("I can design experiments with clear baselines and evaluation criteria.", [
      "research_innovation",
      "statistics_experimentation",
    ]),
    prompt("I can build prototypes to test novel methods under realistic constraints.", [
      "research_innovation",
      "machine_learning",
      "data_engineering",
    ]),
    prompt("I can evaluate validity, reproducibility, and limitations of findings.", [
      "statistics_experimentation",
      "research_innovation",
    ]),
    prompt("I can document methods and findings for technical and non-technical audiences.", [
      "communication_storytelling",
      "research_innovation",
    ]),
    prompt("I can translate research results into product, policy, or operational recommendations.", [
      "business_strategy",
      "communication_storytelling",
    ]),
    prompt("I can evaluate ethical, societal, and deployment implications of proposed methods.", [
      "responsible_ai",
      "research_innovation",
    ]),
    prompt("I can benchmark models against SOTA and internal baselines rigorously.", [
      "machine_learning",
      "research_innovation",
      "statistics_experimentation",
    ]),
    prompt("I can collaborate with engineering teams to productionize research outputs.", [
      "collaboration_delivery",
      "mlops_deployment",
      "research_innovation",
    ]),
  ],
};

const levelProgressionPrompts: Record<number, PromptDefinition[]> = {
  1: [
    prompt("I can perform assigned analytics and data tasks with close guidance.", [
      "role_mastery",
      "collaboration_delivery",
    ]),
    prompt("I can follow established standards and quality checks consistently.", [
      "data_quality_governance",
      "role_mastery",
    ]),
    prompt("I can communicate progress and blockers clearly to my mentor or supervisor.", [
      "communication_storytelling",
      "collaboration_delivery",
    ]),
    prompt("I can apply feedback quickly to improve my technical outputs.", [
      "role_mastery",
      "collaboration_delivery",
    ]),
  ],
  2: [
    prompt("I can independently deliver end-to-end work items within my role scope.", [
      "role_mastery",
      "collaboration_delivery",
    ]),
    prompt("I can prioritize tasks and escalate blockers with clear context.", [
      "leadership_execution",
      "communication_storytelling",
    ]),
    prompt("I can coordinate effectively with cross-functional stakeholders on deliverables.", [
      "collaboration_delivery",
      "communication_storytelling",
    ]),
    prompt("I can make sound tradeoff decisions between speed, quality, and impact.", [
      "business_strategy",
      "leadership_execution",
    ]),
  ],
  3: [
    prompt("I can mentor junior teammates and review work for quality and consistency.", [
      "leadership_execution",
      "collaboration_delivery",
    ]),
    prompt("I can improve team processes, standards, or tooling in my functional area.", [
      "leadership_execution",
      "data_quality_governance",
    ]),
    prompt("I can lead complex workstreams with multiple dependencies.", [
      "leadership_execution",
      "collaboration_delivery",
    ]),
    prompt("I can align stakeholders around delivery plans and measurable outcomes.", [
      "business_strategy",
      "communication_storytelling",
      "leadership_execution",
    ]),
  ],
  4: [
    prompt("I can translate business strategy into team-level analytics and AI initiatives.", [
      "business_strategy",
      "leadership_execution",
    ]),
    prompt("I can allocate resources across competing priorities and delivery risks.", [
      "leadership_execution",
      "business_strategy",
    ]),
    prompt("I can drive cross-team alignment on data and AI outcomes.", [
      "collaboration_delivery",
      "leadership_execution",
    ]),
    prompt("I can define KPIs and accountability mechanisms for team performance.", [
      "business_strategy",
      "leadership_execution",
      "data_quality_governance",
    ]),
  ],
  5: [
    prompt("I can define organizational direction for analytics, data, and AI capabilities.", [
      "business_strategy",
      "leadership_execution",
    ]),
    prompt("I can set governance, risk, and investment priorities for long-term impact.", [
      "data_quality_governance",
      "responsible_ai",
      "leadership_execution",
    ]),
    prompt("I can represent data and AI strategy with executive-level stakeholders.", [
      "communication_storytelling",
      "business_strategy",
      "leadership_execution",
    ]),
    prompt("I can sponsor enterprise initiatives that scale data and AI value responsibly.", [
      "responsible_ai",
      "business_strategy",
      "leadership_execution",
    ]),
  ],
};

const crossCuttingPrompts: PromptDefinition[] = [
  prompt("I can communicate technical findings in language appropriate to business stakeholders.", [
    "communication_storytelling",
    "business_strategy",
  ]),
  prompt("I can apply ethical and responsible use principles when working with data and AI.", [
    "responsible_ai",
    "data_quality_governance",
  ]),
  prompt("I can collaborate with multidisciplinary teams to deliver measurable outcomes.", [
    "collaboration_delivery",
    "role_mastery",
  ]),
  prompt("I can define measurable outcomes and track progress using clear success metrics.", [
    "business_strategy",
    "leadership_execution",
  ]),
  prompt("I can improve my skill gaps through structured learning and applied practice.", [
    "role_mastery",
    "leadership_execution",
  ]),
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function roleSpecificPrompts(pathLabel: string, careerName: string): PromptDefinition[] {
  return [
    prompt(
      `I can perform the core responsibilities expected of a ${careerName} role in the ${pathLabel} track.`,
      ["role_mastery", "business_strategy"]
    ),
    prompt(
      `I can identify and close competency gaps needed to progress from the ${careerName} role.`,
      ["role_mastery", "leadership_execution"]
    ),
    prompt(
      `I can deliver outcomes for the ${careerName} role that are measurable and aligned to business goals.`,
      ["business_strategy", "communication_storytelling", "role_mastery"]
    ),
    prompt(
      `I can collaborate with adjacent roles to increase impact as a ${careerName} in the ${pathLabel} track.`,
      ["collaboration_delivery", "role_mastery", "communication_storytelling"]
    ),
  ];
}

function mergePromptDefinitions(prompts: PromptDefinition[]): PromptDefinition[] {
  const merged = new Map<string, Set<CompetencyKey>>();
  prompts.forEach((item) => {
    const current = merged.get(item.text) ?? new Set<CompetencyKey>();
    item.competencies.forEach((competency) => current.add(competency));
    merged.set(item.text, current);
  });

  return Array.from(merged.entries()).map(([text, competencies]) => ({
    text,
    competencies: Array.from(competencies),
  }));
}

export function getQuestionsForCareer(
  pathKey: CareerPathKey | null,
  careerName: string | null
): Question[] {
  if (!pathKey || !careerName) {
    return defaultQuestions;
  }

  const path = careerPaths[pathKey];
  const level = path.careers.find((career) => career.name === careerName)?.level ?? 1;

  const promptSet = mergePromptDefinitions([
    ...pathFunctionalPrompts[pathKey],
    ...levelProgressionPrompts[level],
    ...crossCuttingPrompts,
    ...roleSpecificPrompts(path.name, careerName),
  ]);
  const prefix = `${pathKey}-${slugify(careerName)}`;

  return promptSet.map((item, idx) => ({
    id: `${prefix}-q${idx + 1}`,
    text: item.text,
    competencies: item.competencies,
  }));
}

export const defaultQuestions: Question[] = [
  {
    id: "default-q1",
    text: "I can analyze data to identify trends, risks, and opportunities relevant to business objectives.",
    competencies: ["business_strategy", "statistics_experimentation", "role_mastery"],
  },
  {
    id: "default-q2",
    text: "I can structure and validate data before using it for analysis, reporting, or modeling.",
    competencies: ["data_quality_governance", "sql_data_access", "data_engineering"],
  },
  {
    id: "default-q3",
    text: "I can communicate insights clearly to technical and non-technical stakeholders.",
    competencies: ["communication_storytelling", "collaboration_delivery"],
  },
  {
    id: "default-q4",
    text: "I can apply governance, privacy, and responsible-use practices when working with data and AI.",
    competencies: ["responsible_ai", "data_quality_governance"],
  },
  {
    id: "default-q5",
    text: "I can collaborate with cross-functional teams to deliver analytics and data outcomes.",
    competencies: ["collaboration_delivery", "leadership_execution"],
  },
  {
    id: "default-q6",
    text: "I can track progress against role expectations and identify priority skills for development.",
    competencies: ["role_mastery", "leadership_execution"],
  },
  {
    id: "default-q7",
    text: "I can apply statistical or machine learning techniques appropriate to the problem context.",
    competencies: ["statistics_experimentation", "machine_learning"],
  },
  {
    id: "default-q8",
    text: "I can support deployment and monitoring of analytics or AI solutions in production.",
    competencies: ["mlops_deployment", "data_engineering"],
  },
];
