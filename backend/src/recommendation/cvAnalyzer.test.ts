import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCvText } from "./cvAnalyzer.js";

test("analyzeCvText extracts modern engineering and AI competencies from CV text", () => {
  const text = `
    Jane Doe
    Senior AI Engineer
    Experience
    Built ML pipelines with Airflow and dbt, deployed model serving APIs, and managed CI/CD workflows.
    Worked on machine learning experimentation, inference services, and cloud platform delivery on AWS.
    Skills
    Python, Airflow, dbt, MLOps, model deployment, machine learning, CI/CD, AWS
  `;

  const result = analyzeCvText(text, "resume.pdf");
  const foundKeys = new Set(result.cvAnalysis.competencySignals.map((item) => item.key));
  const topPathKeys = result.cvAnalysis.pathHints.slice(0, 3).map((item) => item.pathKey);

  assert.ok(foundKeys.has("data_engineering"));
  assert.ok(
    foundKeys.has("machine_learning") ||
      foundKeys.has("computational_modelling") ||
      foundKeys.has("self_learning_systems")
  );
  assert.ok(
    foundKeys.has("continuous_integration_and_continuous_deployment") ||
      foundKeys.has("cloud_computing")
  );
  assert.ok(topPathKeys.includes("ai_engineering") || topPathKeys.includes("data_engineering"));
});

test("analyzeCvText extracts executive strategy competencies without overcommitting to BI only", () => {
  const text = `
    Alex Smith
    Director of Analytics
    Summary
    Led strategic planning, portfolio management, budgeting, stakeholder engagement, and change management
    across cross-functional data and analytics initiatives. Owned executive reporting and team leadership
    while driving business strategy and operating model execution.
  `;

  const result = analyzeCvText(text, "executive_resume.docx");
  const foundKeys = new Set(result.cvAnalysis.competencySignals.map((item) => item.key));
  const pathHints = result.cvAnalysis.pathHints;

  assert.ok(foundKeys.has("strategy_planning"));
  assert.ok(foundKeys.has("portfolio_management"));
  assert.ok(foundKeys.has("budgeting"));
  assert.ok(foundKeys.has("stakeholder_management"));
  assert.ok(foundKeys.has("change_management"));
  assert.ok(pathHints.length > 0);
  assert.ok(pathHints.some((hint) => hint.pathKey === "business_intelligence"));
});

test("analyzeCvText detects governance-oriented CV language", () => {
  const text = `
    Jordan Lee
    Data Governance Manager
    Experience
    Established data governance policies, data quality controls, metadata standards, lineage practices,
    privacy compliance, and audit readiness programs for enterprise datasets.
    Certifications
    CDMP and data governance certification
  `;

  const result = analyzeCvText(text, null);
  const foundKeys = new Set(result.cvAnalysis.competencySignals.map((item) => item.key));
  const certs = new Map(result.certificationSignals.map((item) => [item.key, item.value]));

  assert.ok(foundKeys.has("data_governance") || foundKeys.has("auditing_and_compliance"));
  assert.ok(foundKeys.has("data_protection_management") || foundKeys.has("auditing_and_compliance"));
  assert.equal(certs.get("governance_certification"), 1);
});

test("analyzeCvText detects candidate name from flattened PDF-style header text", () => {
  const text = `
    1 JUSTINE JUDE C. PURA, MBA ( 傅佳璟 )  EXPERIENCE  Assistant Professor (December 2023 – Present)
    Manila, Philippines  FEU Institute of Technology
  `;

  const result = analyzeCvText(text, "Pura_JustineJude_Resume.pdf");

  assert.equal(result.cvAnalysis.summary.candidateName, "Justine Jude C. Pura");
});
