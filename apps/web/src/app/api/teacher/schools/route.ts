import { NextResponse } from "next/server";
import { requireCurrentUser } from "../../../server/session";
import { createSchool, listSchools } from "../../../server/teacher-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await requireCurrentUser();

  return NextResponse.json(await listSchools(user));
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await requireCurrentUser();
  const body = (await request.json().catch(() => ({}))) as Record<string, string>;

  return NextResponse.json(await createSchool(user, body));
}
