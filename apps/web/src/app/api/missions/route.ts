import { NextResponse } from "next/server";
import {
  executeMission,
  listMissions
} from "../demo-store";
import { getCurrentUser } from "../../server/session";
import { hasDatabaseUrl } from "../../server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();

    if (hasDatabaseUrl() && !currentUser) {
      return NextResponse.json(
        { message: "Entre novamente para gerar e salvar o material no seu espaco pedagogico." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = await executeMission(
      currentUser
        ? {
            ...body,
            userId: currentUser.id,
            organizationId: currentUser.organizationId
          }
        : body
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel executar a missao."
      },
      { status: 400 }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser();
  const organizationId =
    currentUser?.organizationId ?? new URL(request.url).searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      { message: "organizationId e obrigatorio." },
      { status: 400 }
    );
  }

  return NextResponse.json(await listMissions(organizationId, currentUser?.id));
}
