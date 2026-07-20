import { NextResponse } from "next/server";
import { listResources } from "../demo-store";
import { getCurrentUser } from "../../server/session";
import { hasDatabaseUrl } from "../../server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const currentUser = await getCurrentUser();

  if (hasDatabaseUrl() && !currentUser) {
    return NextResponse.json(
      { message: "Entre novamente para acessar seu Banco Pedagogico." },
      { status: 401 }
    );
  }

  const organizationId = currentUser?.organizationId ?? params.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      { message: "organizationId e obrigatorio." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    await listResources({
      organizationId,
      userId: currentUser?.id,
      discipline: optionalParam(params, "discipline"),
      gradeYear: optionalParam(params, "gradeYear"),
      skill: optionalParam(params, "skill"),
      knowledgeObject: optionalParam(params, "knowledgeObject"),
      theme: optionalParam(params, "theme"),
      activityType: optionalParam(params, "activityType"),
      specificNeed: optionalParam(params, "specificNeed"),
      learningLevel: optionalParam(params, "learningLevel"),
      q: optionalParam(params, "q")
    })
  );
}

function optionalParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key)?.trim();

  return value ? value : undefined;
}
