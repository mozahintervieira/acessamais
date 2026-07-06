import { NextResponse } from "next/server";
import { listResources } from "../demo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const organizationId = params.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      { message: "organizationId e obrigatorio." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    await listResources({
      organizationId,
      discipline: optionalParam(params, "discipline"),
      gradeYear: optionalParam(params, "gradeYear"),
      skill: optionalParam(params, "skill"),
      specificNeed: optionalParam(params, "specificNeed"),
      q: optionalParam(params, "q")
    })
  );
}

function optionalParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key)?.trim();

  return value ? value : undefined;
}
