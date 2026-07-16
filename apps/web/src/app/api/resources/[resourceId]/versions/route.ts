import { NextResponse } from "next/server";
import {
  createVersion,
  listVersions
} from "../../../demo-store";
import { getCurrentUser } from "../../../../server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ resourceId: string }> }
): Promise<NextResponse> {
  const currentUser = await getCurrentUser();
  const organizationId =
    currentUser?.organizationId ?? new URL(request.url).searchParams.get("organizationId");
  const { resourceId } = await context.params;

  if (!organizationId) {
    return NextResponse.json(
      { message: "organizationId e obrigatorio." },
      { status: 400 }
    );
  }

  return NextResponse.json(await listVersions(organizationId, resourceId, currentUser?.id));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ resourceId: string }> }
): Promise<NextResponse> {
  try {
    const { resourceId } = await context.params;
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as {
      organizationId?: string;
      contentJson?: unknown;
      contentText?: unknown;
    };

    const organizationId = currentUser?.organizationId ?? body.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { message: "organizationId e obrigatorio." },
        { status: 400 }
      );
    }

    if (!isRecord(body.contentJson)) {
      return NextResponse.json(
        { message: "contentJson deve ser um objeto editavel." },
        { status: 400 }
      );
    }

    const version = await createVersion({
      organizationId,
      userId: currentUser?.id,
      resourceId,
      contentJson: body.contentJson,
      contentText:
        typeof body.contentText === "string" ? body.contentText : undefined
    });

    if (!version) {
      return NextResponse.json(
        { message: "Recurso nao encontrado para esta organizacao." },
        { status: 404 }
      );
    }

    return NextResponse.json(version);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar nova versao."
      },
      { status: 400 }
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
