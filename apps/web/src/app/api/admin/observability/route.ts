import { NextResponse } from "next/server";
import { canViewObservability, getCurrentUser } from "../../../server/session";
import { getChatObservabilitySummary } from "../../../server/usage-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { message: "Sessão obrigatória." },
      { status: 401 },
    );
  if (!canViewObservability(user))
    return NextResponse.json({ message: "Acesso restrito." }, { status: 403 });

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") ?? "30");
  const days = Number.isFinite(requestedDays) ? requestedDays : 30;
  return NextResponse.json(await getChatObservabilitySummary(days), {
    headers: { "Cache-Control": "no-store" },
  });
}
