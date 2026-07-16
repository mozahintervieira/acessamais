import { NextResponse } from "next/server";
import { requireCurrentUser } from "../../../server/session";
import { getTeacherWorkspace } from "../../../server/teacher-data";
import { getUsageSummary } from "../../../server/usage-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await requireCurrentUser();
  const [workspace, usage] = await Promise.all([
    getTeacherWorkspace(user),
    getUsageSummary(user.id)
  ]);

  return NextResponse.json({ ...workspace, usage });
}
