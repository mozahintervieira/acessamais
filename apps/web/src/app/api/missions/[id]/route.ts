import { NextResponse } from "next/server";
import { getMissionDetail } from "../../demo-store";
import { getCurrentUser } from "../../../server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const currentUser = await getCurrentUser();
  const organizationId =
    currentUser?.organizationId ?? new URL(request.url).searchParams.get("organizationId");
  const { id } = await context.params;

  if (!organizationId) {
    return NextResponse.json(
      { message: "organizationId e obrigatorio." },
      { status: 400 }
    );
  }

  const mission = await getMissionDetail(organizationId, id, currentUser?.id);

  if (!mission) {
    return NextResponse.json(
      { message: "Missao nao encontrada para esta organizacao." },
      { status: 404 }
    );
  }

  return NextResponse.json(mission);
}
