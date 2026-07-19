import { NextResponse } from "next/server";
import { createTeacherAccount, isValidEmail } from "../../../server/auth-repository";
import { validatePassword } from "../../../server/password";
import { createSession } from "../../../server/session";
import { recordUsageEvent } from "../../../server/usage-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
  };
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const passwordError = validatePassword(password);

  if (!name || name.length < 2) {
    return NextResponse.json({ message: "Informe seu nome." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ message: "Informe um e-mail valido." }, { status: 400 });
  }

  if (passwordError) {
    return NextResponse.json({ message: passwordError }, { status: 400 });
  }

  try {
    const user = await createTeacherAccount({ name, email, password });

    await createSession(user.id);
    await recordUsageEvent({ userId: user.id, eventType: "USER_REGISTERED" });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "DATA_INFRASTRUCTURE_UNAVAILABLE") {
      return NextResponse.json(
        { message: "Nao foi possivel criar a conta neste momento. A infraestrutura de dados esta indisponivel." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel criar a conta. Verifique os dados e tente novamente." },
      { status: 400 }
    );
  }
}
