import { NextResponse } from "next/server";
import { executeMission, listMissions } from "../demo-store";
import { getCurrentUser } from "../../server/session";
import { hasDatabaseUrl } from "../../server/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request): Promise<NextResponse> {
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let body: any;
  try {
    currentUser = await getCurrentUser();
    if (hasDatabaseUrl() && !currentUser) return NextResponse.json({ message: "Entre novamente para gerar e salvar o material no seu espaco pedagogico." }, { status: 401 });
    body = await request.json();
    return NextResponse.json(await executeMission(currentUser ? { ...body, userId: currentUser.id, organizationId: currentUser.organizationId } : body));
  } catch (error) {
    console.error("mission_execution_failed", { error: error instanceof Error ? error.name : "UnknownError", code: getErrorCode(error) });
    return NextResponse.json({
      code: "MISSION_GENERATION_FAILED",
      message: "Não foi possível concluir a geração e o salvamento do material. Seu pedido não precisa ser reescrito. Tente novamente; se persistir, entre em contato com o suporte."
    }, { status: 503 });
  }
}
export async function GET(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser();
  if (hasDatabaseUrl() && !currentUser) return NextResponse.json({ message: "Entre novamente para acessar seus materiais." }, { status: 401 });
  const organizationId = currentUser?.organizationId ?? new URL(request.url).searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ message: "organizationId e obrigatorio." }, { status: 400 });
  return NextResponse.json(await listMissions(organizationId, currentUser?.id));
}
function getErrorCode(error: unknown): string | undefined { return typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined; }
