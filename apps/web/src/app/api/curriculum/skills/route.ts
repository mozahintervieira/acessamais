import { NextResponse } from "next/server";
import {
  searchCurriculumSkills,
  type CurriculumProviderId
} from "@acessa-plus/pedagogical-core";
import { searchPersistedCurriculumSkills } from "../server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const providerParam = params.get("providerId");
  const providerId: CurriculumProviderId =
    providerParam === "SEDU_ES" || providerParam === null ? "SEDU_ES" : "SEDU_ES";

  const query = {
    providerId,
    query: params.get("q") ?? params.get("code") ?? undefined,
    discipline: params.get("discipline") ?? undefined,
    grade: params.get("grade") ?? undefined
  };

  return NextResponse.json({
    skills: await searchPersistedCurriculumSkills(query) ?? searchCurriculumSkills(query)
  });
}
