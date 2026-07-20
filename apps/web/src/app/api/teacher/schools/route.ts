import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../server/session";
import { createSchool, listSchools } from "../../../server/teacher-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Entre novamente para acessar suas escolas." }, { status: 401 });
  }

  return NextResponse.json(await listSchools(user));
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Entre novamente para salvar sua escola." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, string>;

  return NextResponse.json(await createSchool(user, body));
}
