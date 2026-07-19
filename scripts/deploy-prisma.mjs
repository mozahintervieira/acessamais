import { spawnSync } from "node:child_process";

const isVercelBuild = process.env.VERCEL === "1";
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!isVercelBuild) {
  console.log("Prisma migrate deploy ignorado fora do build da Vercel.");
  process.exit(0);
}

if (!databaseUrl || !/^postgres(ql)?:\/\//.test(databaseUrl)) {
  console.error("DATABASE_URL de producao ausente ou invalida para Prisma migrate deploy.");
  process.exit(1);
}

const result = spawnSync(
  "pnpm",
  [
    "--filter",
    "@acessa-plus/database",
    "exec",
    "prisma",
    "migrate",
    "deploy",
    "--schema",
    "prisma/schema.prisma"
  ],
  {
    stdio: "inherit",
    shell: process.platform === "win32"
  }
);

process.exit(result.status ?? 1);
