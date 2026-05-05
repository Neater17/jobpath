import assert from "node:assert/strict";
import test from "node:test";
import { RecommendationService } from "./service.js";

test("refreshModelInfo surfaces plain-text upstream errors without a JSON parse failure", async (t) => {
  const service = new RecommendationService();

  process.env.ML_SERVICE_URL = "https://ml.example.com/ml";

  t.mock.method(service as unknown as { sleep: () => Promise<void> }, "sleep", async () => {});
  t.mock.method(globalThis, "fetch", async () =>
    new Response("Too Many Requests\n", {
      status: 429,
      statusText: "Too Many Requests",
      headers: {
        "Content-Type": "text/plain",
      },
    })
  );

  await assert.rejects(
    () => service.refreshModelInfo(),
    /Recommendation model is unavailable: Too Many Requests/
  );
});

test("init does not throw when the ML service is unavailable during startup", async (t) => {
  const service = new RecommendationService();

  t.mock.method(service as unknown as { sleep: () => Promise<void> }, "sleep", async () => {});
  t.mock.method(service, "refreshModelInfo", async () => {
    throw new Error("Recommendation model is unavailable: Too Many Requests");
  });

  const warnings: string[] = [];
  t.mock.method(console, "warn", (message: string) => {
    warnings.push(message);
  });

  await assert.doesNotReject(async () => {
    await service.init();
  });

  assert.equal(warnings.length, 1);
  assert.match(
    warnings[0] ?? "",
    /Recommendation service starting in degraded mode: Recommendation model is unavailable: Too Many Requests/
  );
});
