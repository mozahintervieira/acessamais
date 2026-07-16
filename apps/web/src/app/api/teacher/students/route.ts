import { NextResponse } from "next/server";
import { requireCurrentUser } from "../../../server/session";
import { createStudent, listStudents } from "../../../server/teacher-data";
import { recordUsageEvent } from "../../../server/usage-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await requireCurrentUser();

  return NextResponse.json(await listStudents(user));
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await requireCurrentUser();
  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const student = await createStudent(user, body);

  await recordUsageEvent({ userId: user.id, eventType: "STUDENT_CREATED" });

  return NextResponse.json(student);
}
