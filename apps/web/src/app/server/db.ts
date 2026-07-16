import { PrismaClient } from "@acessa-plus/database";

const globalForPrisma = globalThis as typeof globalThis & {
  acessaPlusPrisma?: PrismaClient;
};

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPrisma(): PrismaClient {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  globalForPrisma.acessaPlusPrisma ??= new PrismaClient();

  return globalForPrisma.acessaPlusPrisma;
}
