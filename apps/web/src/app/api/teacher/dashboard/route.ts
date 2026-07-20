import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../server/session";
import { getTeacherWorkspace } from "../../../server/teacher-data";
import { getUsageSummary } from "../../../server/usage-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Entre novamente para acessar seu espaco pedagogico." }, { status: 401 });
  }

  const [workspace, usage] = await Promise.all([
    getTeacherWorkspace(user),
    getUsageSummary(user.id)
  ]);

  return NextResponse.json({ ...workspace, usage });
}
