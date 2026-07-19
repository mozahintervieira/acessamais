import { NextResponse } from "next/server";
import { authenticateTeacher, isValidEmail } from "../../../server/auth-repository";
import { createSession } from "../../../server/session";
import { recordUsageEvent } from "../../../server/usage-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!isValidEmail(email) || !password) {
    return NextResponse.json(
      { message: "Informe e-mail e senha." },
      { status: 400 }
    );
  }

  let user;

  try {
    user = await authenticateTeacher({ email, password });
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel entrar neste momento. A infraestrutura de dados esta indisponivel." },
      { status: 503 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { message: "E-mail ou senha incorretos." },
      { status: 401 }
    );
  }

  try {
    await createSession(user.id);
    await recordUsageEvent({ userId: user.id, eventType: "LOGIN" });
  } catch {
    return NextResponse.json(
      { message: "Nao foi possivel entrar neste momento. A infraestrutura de dados esta indisponivel." },
      { status: 503 }
    );
  }

  return NextResponse.json({ user });
}
