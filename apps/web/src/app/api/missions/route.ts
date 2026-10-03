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
    if (body && hasDatabaseUrl()) {
      const databaseUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;
      try { return NextResponse.json({ ...(await executeMission(currentUser ? { ...body, userId: currentUser.id, organizationId: currentUser.organizationId } : body)), persistenceNotice: "A proposta foi criada; o salvamento será concluído quando o banco estiver disponível." }); } catch (fallbackError) { console.error("mission_fallback_failed", fallbackError); } finally { if (databaseUrl) process.env.DATABASE_URL = databaseUrl; }
    }
    return NextResponse.json(buildEmergencyProposal(body), { status: 200 });
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
function buildEmergencyProposal(body: any) { const pedido = body?.input?.prompt ?? body?.pedido ?? "a solicitacao do professor"; const id = "emergency_" + Date.now(); return { missionId:id, resourceId:id+"_resource", versionId:id+"_version", missionType:body?.missionType ?? "ADAPT_ACTIVITY", status:"NEEDS_REVIEW", persistenceNotice:"Proposta de contingencia criada para revisao pedagogica.", pedagogicalPlan:{ worksheetTitle:"Proposta de atividade para revisao", subject:body?.input?.discipline ?? "Interdisciplinar", grade:body?.input?.gradeYear ?? "", learningObjective:"Organizar uma atividade inclusiva a partir do pedido do professor.", context:"Pedido recebido: " + pedido, studentSheet:{ title:"Atividade pronta para revisar", context:"A proposta foi estruturada pelo ACESSA+ e precisa de conferência do professor.", instructions:["Leia o comando.","Realize a atividade com os apoios necessarios."], questions:[{prompt:"Registre o que voce aprendeu.",type:"open"}]}, teacherGuide:"Revise objetivo, linguagem, acessibilidade e alinhamento curricular antes de entregar ao estudante.", warnings:["Proposta de contingencia: revise antes da aplicacao."], worksheets:[] } }; }
