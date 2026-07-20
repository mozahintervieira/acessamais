import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../server/session";
import { createStudent, listStudents } from "../../../server/teacher-data";
import { recordUsageEvent } from "../../../server/usage-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Entre novamente para acessar seus estudantes." }, { status: 401 });
  }

  return NextResponse.json(await listStudents(user));
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Entre novamente para salvar seu estudante." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const student = await createStudent(user, body);

    await recordUsageEvent({ userId: user.id, eventType: "STUDENT_CREATED" });

    return NextResponse.json(student);
  } catch (error) {
    console.error("teacher_student_create_failed", {
      error: error instanceof Error ? error.name : "UnknownError"
    });

    return NextResponse.json(
      { message: "Nao foi possivel salvar o estudante. Revise os dados e tente novamente." },
      { status: 400 }
    );
  }
}
