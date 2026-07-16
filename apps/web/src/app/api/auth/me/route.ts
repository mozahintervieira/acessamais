import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();

  return NextResponse.json({ user });
}
