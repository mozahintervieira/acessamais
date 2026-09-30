import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const { PrismaClient } = require(join(ROOT, "packages/database/node_modules/@prisma/client"));

loadLocalEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL ausente. Configure a variavel antes de executar o seed curricular.");
  process.exit(1);
}

const prisma = new PrismaClient();

const now = new Date();

const sources = [
  {
    title: "Portal Currículo SEDU-ES",
    sourceUrl: "https://curriculo.sedu.es.gov.br/curriculo/",
    sourceType: "PORTAL"
  },
  {
    title: "Documentos Curriculares SEDU-ES",
    sourceUrl: "https://curriculo.sedu.es.gov.br/curriculo/documentoscurriculares/",
    sourceType: "DOCUMENT_INDEX"
  },
  {
    title: "Orientações Curriculares SEDU-ES",
    sourceUrl: "https://curriculo.sedu.es.gov.br/curriculo/orientacoescurriculares/",
    sourceType: "ORIENTATION_INDEX"
  }
];

async function main() {
  const provider = await prisma.curriculumProvider.upsert({
    where: { code: "SEDU_ES" },
    update: {
      name: "Currículo do Espírito Santo",
      jurisdiction: "Espírito Santo",
      official: true,
      status: "ACTIVE"
    },
    create: {
      code: "SEDU_ES",
      name: "Currículo do Espírito Santo",
      jurisdiction: "Espírito Santo",
      official: true,
      status: "ACTIVE"
    }
  });

  for (const source of sources) {
    await prisma.curriculumSource.upsert({
      where: {
        providerId_sourceUrl: {
          providerId: provider.id,
          sourceUrl: source.sourceUrl
        }
      },
      update: {
        title: source.title,
        sourceType: source.sourceType,
        official: true,
        accessedAt: now,
        status: "ACTIVE"
      },
      create: {
        providerId: provider.id,
        title: source.title,
        sourceUrl: source.sourceUrl,
        sourceType: source.sourceType,
        official: true,
        accessedAt: now,
        status: "ACTIVE"
      }
    });
  }

  console.log("Seed curricular concluído: SEDU_ES e fontes oficiais iniciais.");
}

main()
  .catch((error) => {
    console.error("Falha no seed curricular.", {
      message: error instanceof Error ? error.message : String(error)
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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
