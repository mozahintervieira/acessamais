import { NextResponse } from "next/server";
import { clearSession } from "../../../server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  await clearSession();

  return NextResponse.json({ ok: true });
}
