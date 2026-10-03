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
    const result = await executeMission(currentUser ? { ...body, userId: currentUser.id, organizationId: currentUser.organizationId } : body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("mission_execution_failed", { error: error instanceof Error ? error.name : "UnknownError", code: getErrorCode(error) });
    if (body && hasDatabaseUrl()) {
      const databaseUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;
      try {
        const result = await executeMission(currentUser ? { ...body, userId: currentUser.id, organizationId: currentUser.organizationId } : body);
        return NextResponse.json({ ...result, persistenceNotice: "A proposta foi criada; o salvamento será concluído quando o banco estiver disponível." });
      } catch (fallbackError) {
        console.error("mission_fallback_failed", { error: fallbackError instanceof Error ? fallbackError.name : "UnknownError", code: getErrorCode(fallbackError) });
      } finally {
        if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
      }
    }
    return NextResponse.json({ message: toTeacherFriendlyMissionError(error) }, { status: 400 });
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser();
  if (hasDatabaseUrl() && !currentUser) return NextResponse.json({ message: "Entre novamente para acessar seus materiais." }, { status: 401 });
  const organizationId = currentUser?.organizationId ?? new URL(request.url).searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ message: "organizationId e obrigatorio." }, { status: 400 });
  return NextResponse.json(await listMissions(organizationId, currentUser?.id));
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) return String(error.code);
  return undefined;
}

function toTeacherFriendlyMissionError(error: unknown): string {
  if (!(error instanceof Error)) return "Nao foi possivel gerar o material agora. Tente novamente.";
  const allowedMessages = ["Entre novamente para gerar e salvar o material no seu espaco pedagogico.", "Informe a quantidade de folhas A4 usando um numero entre 1 e 10.", "Descreva em uma frase o recurso pedagogico que deseja criar.", "missionType nao suportado no MVP."];
  if (allowedMessages.includes(error.message)) return error.message;
  if (error.name === "PedagogicalProjectError") return "A combinacao entre disciplina, habilidade e objeto de conhecimento precisa ser revisada antes da geracao.";
  return "A proposta foi interrompida por uma falha tecnica. Tente gerar novamente; se persistir, o material sera encaminhado para revisao tecnica.";
}
