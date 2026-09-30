import { NextResponse } from "next/server";
import {
  createTeacherAccount,
  isValidEmail,
  isValidPhone,
  type ReferralInput
} from "../../../server/auth-repository";
import { validatePassword } from "../../../server/password";
import { createSession } from "../../../server/session";
import { recordUsageEvent } from "../../../server/usage-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    referrals?: ReferralInput[];
  };
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const phone = body.phone?.trim() ?? "";
  const password = body.password ?? "";
  const referrals = Array.isArray(body.referrals) ? body.referrals.slice(0, 10) : [];
  const passwordError = validatePassword(password);

  if (!name || name.length < 2) {
    return NextResponse.json({ message: "Informe seu nome." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ message: "Informe um e-mail valido." }, { status: 400 });
  }

  if (!isValidPhone(phone)) {
    return NextResponse.json({ message: "Informe um telefone valido com DDD." }, { status: 400 });
  }

  for (const referral of referrals) {
    const referralEmail = referral.email?.trim() ?? "";
    const referralPhone = referral.phone?.trim() ?? "";

    if (!referralEmail && !referralPhone) {
      return NextResponse.json(
        { message: "Cada indicacao precisa ter e-mail ou telefone." },
        { status: 400 }
      );
    }

    if (referralEmail && !isValidEmail(referralEmail)) {
      return NextResponse.json({ message: "Revise o e-mail da indicacao." }, { status: 400 });
    }

    if (referralPhone && !isValidPhone(referralPhone)) {
      return NextResponse.json({ message: "Revise o telefone da indicacao." }, { status: 400 });
    }

    if (!referral.consentConfirmed) {
      return NextResponse.json(
        { message: "Confirme que a pessoa indicada autorizou o contato." },
        { status: 400 }
      );
    }
  }

  if (passwordError) {
    return NextResponse.json({ message: passwordError }, { status: 400 });
  }

  try {
    const user = await createTeacherAccount({ name, email, phone, password, referrals });

    await createSession(user.id);
    await recordUsageEvent({ userId: user.id, eventType: "USER_REGISTERED" });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("auth_register_failed", {
      error: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? redactSensitiveError(error.message) : undefined
    });

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

function redactSensitiveError(message: string): string {
  return message.replace(/postgres(?:ql)?:\/\/\\S+/gi, "[REDACTED_DATABASE_URL]");
}
