import { NextResponse } from "next/server";
import { validatePassword } from "../../../../server/password";
import { consumePasswordReset } from "../../../../server/password-reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
  const token = body.token?.trim() ?? "";
  const password = body.password ?? "";
  const passwordError = validatePassword(password);
  if (!token) return NextResponse.json({ message: "Link de recuperação inválido." }, { status: 400 });
  if (passwordError) return NextResponse.json({ message: passwordError }, { status: 400 });

  try {
    const changed = await consumePasswordReset(token, password);
    if (!changed) return NextResponse.json({ message: "Este link é inválido, expirou ou já foi usado." }, { status: 400 });
    return NextResponse.json({ message: "Senha redefinida. Você já pode entrar no ACESSA+." });
  } catch (error) {
    console.error("password_reset_failed", { error: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ message: "Não foi possível redefinir a senha agora." }, { status: 503 });
  }
}

