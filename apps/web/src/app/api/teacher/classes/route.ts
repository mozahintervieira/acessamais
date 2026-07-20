import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../server/session";
import { createClassroom, listClassrooms } from "../../../server/teacher-data";
import { recordUsageEvent } from "../../../server/usage-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Entre novamente para acessar suas turmas." }, { status: 401 });
  }

  return NextResponse.json(await listClassrooms(user));
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Entre novamente para salvar sua turma." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const classroom = await createClassroom(user, body);

  await recordUsageEvent({ userId: user.id, eventType: "CLASS_CREATED" });

  return NextResponse.json(classroom);
}
