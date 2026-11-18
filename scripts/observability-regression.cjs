const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "apps/web/src/app/server/usage-events.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics.length, 0);

const exportsObject = {};
vm.runInNewContext(compiled.outputText, {
  exports: exportsObject,
  console,
  Date,
  JSON,
  Map,
  Set,
  Number,
  Math,
  require: (name) => {
    if (name === "@acessa-plus/database") return { Prisma: {} };
    if (name === "./db")
      return {
        hasDatabaseUrl: () => false,
        getPrisma: () => {
          throw new Error("Database should not be called in this regression.");
        },
      };
    throw new Error(`Unexpected module: ${name}`);
  },
});

(async () => {
  const base = {
    model: "test-model",
    requestKind: "MATERIAL",
    durationMs: 1200,
    messageCount: 1,
    attachmentCount: 0,
    retried: false,
    curriculumSearchCompleted: true,
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
  };
  await exportsObject.recordChatGenerationMetric("teacher-a", {
    ...base,
    requestId: "request-success",
    status: "SUCCESS",
    statusCode: 200,
    curriculumStatus: "CURRENT_YEAR_DOCUMENT_CITED",
    officialSourceCount: 2,
    qualityStatus: "VERIFIED",
  });
  await exportsObject.recordChatGenerationMetric("teacher-b", {
    ...base,
    requestId: "request-failure",
    status: "PROVIDER_FAILED",
    statusCode: 503,
    curriculumSearchCompleted: false,
    durationMs: 400,
    errorCode: "PROVIDER_ERROR",
  });

  const summary = await exportsObject.getChatObservabilitySummary(30);
  assert.equal(summary.total, 2);
  assert.equal(summary.successful, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.successRate, 0.5);
  assert.equal(summary.averageLatencyMs, 800);
  assert.equal(summary.p95LatencyMs, 1200);
  assert.equal(summary.curriculumSearchRate, 0.5);
  assert.equal(summary.curriculumConfirmedRate, 0.5);
  assert.equal(summary.qualityVerifiedRate, 1);
  assert.equal(summary.totalTokens, 300);
  assert.equal(summary.costCoverage, 0);
  assert.equal(summary.recentFailures[0].errorCode, "PROVIDER_ERROR");
  assert.equal(summary.privacy.promptContentStored, false);
  assert.equal(summary.privacy.attachmentContentStored, false);
  console.log("PASS: observability metrics, aggregation and privacy contract");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
