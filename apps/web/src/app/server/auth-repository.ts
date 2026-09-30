import { randomUUID } from "node:crypto";
import { canUseMemoryFallback, getPrisma, hasDatabaseUrl } from "./db";
import { devUsers, type AuthenticatedUser } from "./session";
import { hashPassword, verifyPassword } from "./password";

type StoredDevUser = AuthenticatedUser & {
  passwordHash: string;
  phone: string;
  referrals: ReferralInput[];
};

export type ReferralInput = {
  name?: string;
  email?: string;
  phone?: string;
  consentConfirmed: boolean;
};

const devPasswordUsers = new Map<string, StoredDevUser>();

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length >= 10 && digits.length <= 15;
}

export async function createTeacherAccount(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  referrals?: ReferralInput[];
}): Promise<AuthenticatedUser> {
  const email = input.email.trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  const referrals = (input.referrals ?? []).map((referral) => ({
    name: referral.name?.trim() || undefined,
    email: referral.email?.trim().toLowerCase() || undefined,
    phone: referral.phone ? normalizePhone(referral.phone) : undefined,
    consentConfirmed: referral.consentConfirmed
  }));
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
      phone,
      role: "TEACHER",
      passwordHash,
      referrals
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
        phone,
        passwordHash,
        role: "TEACHER",
        referralLeads: referrals.length
          ? {
              create: referrals.map((referral) => ({
                name: referral.name,
                email: referral.email,
                phone: referral.phone,
                consentConfirmed: referral.consentConfirmed
              }))
            }
          : undefined
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
