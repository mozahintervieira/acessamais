import { NextResponse } from "next/server";
import { isValidEmail } from "../../../../server/auth-repository";
import { passwordResetEmailConfigured, requestPasswordReset } from "../../../../server/password-reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!isValidEmail(email)) return NextResponse.json({ message: "Informe um e-mail válido." }, { status: 400 });
  if (!passwordResetEmailConfigured()) return NextResponse.json({ message: "A recuperação por e-mail ainda não está configurada. Contate acessamais5.0@gmail.com." }, { status: 503 });

  try {
    const configuredBaseUrl = process.env.APP_BASE_URL?.trim();
    const baseUrl = configuredBaseUrl || new URL(request.url).origin;
    await requestPasswordReset(email, baseUrl);
    return NextResponse.json({ message: "Se existir uma conta com esse e-mail, enviaremos um link válido por 30 minutos." });
  } catch (error) {
    console.error("password_reset_request_failed", { error: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ message: "Não foi possível enviar o e-mail agora. Tente novamente mais tarde." }, { status: 503 });
  }
}

