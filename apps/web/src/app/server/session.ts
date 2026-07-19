import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPrisma, hasDatabaseUrl } from "./db";

export type AuthenticatedUser = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "REVIEWER";
};

const cookieName = "acessa_plus_session";
const sessionDays = 30;

function getSecret(): string {
  return process.env.AUTH_SECRET || "acessa-plus-dev-secret-change-in-production";
}

function hashToken(token: string): string {
  return createHmac("sha256", getSecret()).update(token).digest("hex");
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function encodeCookie(token: string): string {
  return `${token}.${sign(token)}`;
}

function decodeCookie(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const [token, signature] = value.split(".");

  if (!token || !signature) {
    return null;
  }

  const expected = sign(token);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  return token;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  if (hasDatabaseUrl()) {
    await getPrisma().authSession.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt
      }
    });
  } else {
    devSessions.set(hashToken(token), { userId, expiresAt });
  }

  const cookieStore = await cookies();

  cookieStore.set(cookieName, encodeCookie(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1" || process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = decodeCookie(cookieStore.get(cookieName)?.value);

  if (token) {
    if (hasDatabaseUrl()) {
      await getPrisma().authSession.deleteMany({
        where: { tokenHash: hashToken(token) }
      });
    } else {
      devSessions.delete(hashToken(token));
    }
  }

  cookieStore.delete(cookieName);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = decodeCookie(cookieStore.get(cookieName)?.value);

  if (!token) {
    return null;
  }

  if (!hasDatabaseUrl()) {
    const session = devSessions.get(hashToken(token));
    const user = session && session.expiresAt > new Date() ? devUsers.get(session.userId) : null;

    return user ? toAuthenticatedUser(user) : null;
  }

  const session = await getPrisma().authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return {
    id: session.user.id,
    organizationId: session.user.organizationId,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role
  };
}

function toAuthenticatedUser(user: AuthenticatedUser): AuthenticatedUser {
  return {
    id: user.id,
    organizationId: user.organizationId,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

export async function requireCurrentUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Sessao obrigatoria.");
  }

  return user;
}

const devSessions = new Map<string, { userId: string; expiresAt: Date }>();
export const devUsers = new Map<string, AuthenticatedUser>();
