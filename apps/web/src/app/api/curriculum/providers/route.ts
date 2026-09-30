import { NextResponse } from "next/server";
import { listCurriculumProviders } from "@acessa-plus/pedagogical-core";
import { listPersistedCurriculumProviders } from "../server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    providers: await listPersistedCurriculumProviders() ?? listCurriculumProviders()
  });
}
