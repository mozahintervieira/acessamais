import { PrismaClient } from "@acessa-plus/database";

const globalForPrisma = globalThis as typeof globalThis & {
  acessaPlusPrisma?: PrismaClient;
};

export function hasDatabaseUrl(): boolean {
  const value = process.env.DATABASE_URL?.trim();

  return Boolean(value && /^postgres(ql)?:\/\//.test(value));
}

export function requiresPersistentDatabase(): boolean {
  return process.env.VERCEL === "1";
}

export function canUseMemoryFallback(): boolean {
  return !requiresPersistentDatabase();
}

export function getPrisma(): PrismaClient {
  if (!hasDatabaseUrl()) {
    throw new Error("Banco de dados indisponivel.");
  }

  globalForPrisma.acessaPlusPrisma ??= new PrismaClient();

  return globalForPrisma.acessaPlusPrisma;
}
