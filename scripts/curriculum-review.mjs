import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const { PrismaClient } = require(join(ROOT, "packages/database/node_modules/@prisma/client"));
const args = parseArgs(process.argv.slice(2));

loadLocalEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL ausente. Nao foi possivel executar revisao curricular.");
  process.exit(1);
}

if (!args.issue || !args.action) {
  console.error("Uso: pnpm curriculum:review --issue <id> --action approve|correct|reject|publish --reviewer <nome> [--value <texto>] [--reason <motivo>]");
  process.exit(2);
}

const prisma = new PrismaClient();

try {
  const issue = await prisma.curriculumReviewIssue.findUnique({
    where: { id: args.issue },
    include: { skill: true },
  });

  if (!issue) {
    throw new Error("Issue curricular nao encontrada.");
  }

  const reviewer = args.reviewer || "revisor-curricular";
  const action = String(args.action).toUpperCase();
  const value = args.value || issue.suggestedValue || issue.rawValue || "";

  await prisma.curriculumReviewDecision.create({
    data: {
      issueId: issue.id,
      action,
      previousValue: issue.rawValue,
      approvedValue: value,
      reviewer,
      reason: args.reason,
    },
  });

  if (action === "REJECT") {
    await prisma.curriculumReviewIssue.update({
      where: { id: issue.id },
      data: {
        status: "RESOLVED",
        reviewedBy: reviewer,
        reviewedAt: new Date(),
        resolution: "REJECTED",
      },
    });

    if (issue.skillId) {
      await prisma.curriculumSkill.update({
        where: { id: issue.skillId },
        data: {
          validationStatus: "REJECTED",
          publicationStatus: "REJECTED",
        },
      });
    }
  }

  if (action === "APPROVE" || action === "CORRECT" || action === "PUBLISH") {
    await prisma.curriculumReviewIssue.update({
      where: { id: issue.id },
      data: {
        status: "RESOLVED",
        reviewedBy: reviewer,
        reviewedAt: new Date(),
        resolution: action,
      },
    });

    if (issue.skillId) {
      const data = {
        validationStatus: "PASSED",
        publicationStatus: action === "PUBLISH" ? "PUBLISHED" : issue.skill?.publicationStatus || "DRAFT",
      };

      if (action === "CORRECT" && args.value) {
        data.officialDescription = args.value;
      }

      if (action === "APPROVE") {
        data.publicationStatus = issue.skill?.publicationStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
      }

      await prisma.curriculumSkill.update({
        where: { id: issue.skillId },
        data,
      });
    }
  }

  console.log(JSON.stringify({
    issueId: issue.id,
    action,
    reviewer,
    status: "RECORDED",
  }, null, 2));
} finally {
  await prisma.$disconnect();
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    parsed[value.slice(2)] = values[index + 1] && !values[index + 1].startsWith("--")
      ? values[index + 1]
      : true;
  }
  return parsed;
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
