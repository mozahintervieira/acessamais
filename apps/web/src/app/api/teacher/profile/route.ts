import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../server/session";
import { getTeacherProfileRecord, saveTeacherProfileRecord } from "../../../server/teacher-data";
import { recordUsageEvent } from "../../../server/usage-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Entre novamente para acessar seu perfil." }, { status: 401 });
  }

  return NextResponse.json(await getTeacherProfileRecord(user));
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Entre novamente para salvar seu perfil." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const profile = await saveTeacherProfileRecord(user, body);

  if (profile.onboardingCompleted) {
    await recordUsageEvent({ userId: user.id, eventType: "PROFILE_COMPLETED" });
  }

  return NextResponse.json(profile);
}
