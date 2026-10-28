import { createHash, randomBytes } from "node:crypto";
import { getPrisma, hasDatabaseUrl } from "./db";
import { hashPassword } from "./password";

const resetLifetimeMs = 30 * 60 * 1000;
const rateWindowMs = 15 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function passwordResetEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.PASSWORD_RESET_FROM?.trim());
}

export async function requestPasswordReset(email: string, baseUrl: string): Promise<void> {
  if (!hasDatabaseUrl()) throw new Error("DATA_INFRASTRUCTURE_UNAVAILABLE");
  if (!passwordResetEmailConfigured()) throw new Error("EMAIL_INFRASTRUCTURE_UNAVAILABLE");

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return;

  const recentCount = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - rateWindowMs) } }
  });
  if (recentCount >= 3) return;

  const rawToken = randomBytes(32).toString("base64url");
  const record = await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + resetLifetimeMs) }
  });
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/redefinir-senha?token=${encodeURIComponent(rawToken)}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.PASSWORD_RESET_FROM,
      to: [user.email],
      reply_to: "acessamais5.0@gmail.com",
      subject: "Redefinição de senha do ACESSA+",
      text: `Recebemos um pedido para redefinir sua senha. Use este link em até 30 minutos: ${resetUrl}\n\nSe você não fez o pedido, ignore esta mensagem.`
    })
  });

  if (!response.ok) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => undefined);
    throw new Error("EMAIL_DELIVERY_FAILED");
  }
}

export async function consumePasswordReset(token: string, password: string): Promise<boolean> {
  if (!hasDatabaseUrl()) throw new Error("DATA_INFRASTRUCTURE_UNAVAILABLE");
  const prisma = getPrisma();
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) return false;

  const passwordHash = await hashPassword(password);
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() }
    });
    if (updated.count !== 1) return false;
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.authSession.deleteMany({ where: { userId: record.userId } });
    return true;
  });
  return result;
}

