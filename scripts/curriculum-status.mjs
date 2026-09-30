import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const { PrismaClient } = require(join(ROOT, "packages/database/node_modules/@prisma/client"));

loadLocalEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL ausente. Nao foi possivel consultar o status curricular.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const [
    providers,
    documents,
    versions,
    skillsByPublication,
    skillsByValidation,
    issuesByStatus,
    relations,
    samples,
  ] = await Promise.all([
    prisma.curriculumProvider.count(),
    prisma.curriculumDocument.count(),
    prisma.curriculumDocumentVersion.count(),
    prisma.curriculumSkill.groupBy({ by: ["publicationStatus"], _count: true }),
    prisma.curriculumSkill.groupBy({ by: ["validationStatus"], _count: true }),
    prisma.curriculumReviewIssue.groupBy({ by: ["status", "issueType"], _count: true }),
    prisma.curriculumSkillRelation.count(),
    prisma.curriculumSkill.findMany({
      where: { publicationStatus: "PUBLISHED", validationStatus: "PASSED" },
      include: {
        documentVersion: { include: { document: true } },
        reviewIssues: true,
      },
      orderBy: [{ subject: "asc" }, { normalizedCode: "asc" }],
      take: 12,
    }),
  ]);

  console.log(JSON.stringify({
    providers,
    documents,
    versions,
    relations,
    skillsByPublication,
    skillsByValidation,
    issuesByStatus,
    publishedSamples: samples.map((skill) => ({
      document: skill.documentVersion.document.title,
      url: skill.documentVersion.sourceUrl,
      hash: skill.documentVersion.contentHash,
      version: skill.documentVersion.versionLabel,
      page: skill.sourcePage,
      rawCode: skill.code,
      normalizedCode: skill.normalizedCode,
      officialDescription: skill.officialDescription,
      grade: skill.grade,
      component: skill.subject,
      confidence: skill.extractionConfidence,
      validationStatus: skill.validationStatus,
      publicationStatus: skill.publicationStatus,
      issues: skill.reviewIssues.map((issue) => issue.issueType),
    })),
  }, null, 2));
} finally {
  await prisma.$disconnect();
}

function loadLocalEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const path = join(ROOT, fileName);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
      }
    }
  }
}
