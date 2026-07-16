import { NextResponse } from "next/server";
import { requireCurrentUser } from "../../../server/session";
import { getUsageSummary } from "../../../server/usage-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await requireCurrentUser();

  return NextResponse.json(await getUsageSummary(user.id));
}
