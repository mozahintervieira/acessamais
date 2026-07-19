import { randomUUID } from "node:crypto";
import { canUseMemoryFallback, getPrisma, hasDatabaseUrl } from "./db";
import { devUsers, type AuthenticatedUser } from "./session";
import { hashPassword, verifyPassword } from "./password";

type StoredDevUser = AuthenticatedUser & {
  passwordHash: string;
};

const devPasswordUsers = new Map<string, StoredDevUser>();

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createTeacherAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthenticatedUser> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  if (!hasDatabaseUrl()) {
    if (!canUseMemoryFallback()) {
      throw new Error("DATA_INFRASTRUCTURE_UNAVAILABLE");
    }

    if ([...devPasswordUsers.values()].some((user) => user.email === email)) {
      throw new Error("Ja existe uma conta com este e-mail.");
    }

    const user: StoredDevUser = {
      id: `dev_user_${randomUUID()}`,
      organizationId: `dev_org_${randomUUID()}`,
      name: input.name.trim(),
      email,
      role: "TEACHER",
      passwordHash
    };

    devPasswordUsers.set(user.id, user);
    devUsers.set(user.id, user);

    return withoutPassword(user);
  }

  const prisma = getPrisma();
  const user = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: `Espaco pedagogico de ${input.name.trim()}`,
        type: "INDEPENDENT"
      }
    });

    return tx.user.create({
      data: {
        organizationId: organization.id,
        name: input.name.trim(),
        email,
        passwordHash,
        role: "TEACHER"
      }
    });
  });

  return {
    id: user.id,
    organizationId: user.organizationId,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

export async function authenticateTeacher(input: {
  email: string;
  password: string;
}): Promise<AuthenticatedUser | null> {
  const email = input.email.trim().toLowerCase();

  if (!hasDatabaseUrl()) {
    if (!canUseMemoryFallback()) {
      throw new Error("DATA_INFRASTRUCTURE_UNAVAILABLE");
    }

    const user = [...devPasswordUsers.values()].find((item) => item.email === email);

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return null;
    }

    devUsers.set(user.id, user);

    return withoutPassword(user);
  }

  const user = await getPrisma().user.findUnique({ where: { email } });

  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    return null;
  }

  return {
    id: user.id,
    organizationId: user.organizationId,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function withoutPassword(user: StoredDevUser): AuthenticatedUser {
  return {
    id: user.id,
    organizationId: user.organizationId,
    name: user.name,
    email: user.email,
    role: user.role
  };
}
