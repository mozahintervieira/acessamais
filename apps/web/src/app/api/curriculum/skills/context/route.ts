import { NextResponse } from "next/server";
import { resolveCurriculumKnowledgePack } from "@acessa-plus/pedagogical-core";
import type { CreateMissionRequest } from "@acessa-plus/types";
import { resolvePersistedCurriculumKnowledgePack } from "../../server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const missionRequest: CreateMissionRequest = {
    userId: "curriculum-preview",
    organizationId: "curriculum-preview",
    missionType: "ADAPT_ACTIVITY",
    input: {
      skill: params.get("code") ?? undefined,
      discipline: params.get("discipline") ?? undefined,
      gradeYear: params.get("grade") ?? undefined,
      knowledgeObject: params.get("knowledgeObject") ?? undefined,
      curriculumReference:
        params.get("curriculumReference") ??
        "Currículo do Espírito Santo / SEDU-ES 2026",
      rawPrompt: params.get("intent") ?? undefined
    }
  };
  const pack = await resolvePersistedCurriculumKnowledgePack(missionRequest) ??
    resolveCurriculumKnowledgePack(missionRequest);

  if (!pack) {
    return NextResponse.json(
      {
        message:
          "Ainda não encontramos essa habilidade na base curricular oficial carregada no ACESSA+."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ curriculumKnowledgePack: pack });
}
