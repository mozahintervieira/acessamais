import { NextResponse } from "next/server";
import {
  CurriculumSourceDiscovery,
  SEDU_ES_DISCOVERY_URLS,
  type CurriculumHttpClient
} from "@acessa-plus/pedagogical-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const officialHttpClient: CurriculumHttpClient = {
  async get(input) {
    const response = await fetch(input.url, {
      headers: input.headers,
      signal: AbortSignal.timeout(input.timeoutMs),
      cache: "no-store"
    });

    return {
      status: response.status,
      url: response.url,
      headers: {
        "content-type": response.headers.get("content-type") ?? undefined
      },
      body: Buffer.from(await response.arrayBuffer())
    };
  }
};

export async function GET(): Promise<NextResponse> {
  const discovery = await new CurriculumSourceDiscovery(officialHttpClient, {
    retries: 1,
    timeoutMs: 12_000,
    userAgent: "ACESSA+ Currículo ES/1.0"
  }).discover(SEDU_ES_DISCOVERY_URLS);

  return NextResponse.json({
    providerId: "SEDU_ES",
    providerName: "Currículo do Espírito Santo / SEDU-ES",
    officialSources: SEDU_ES_DISCOVERY_URLS,
    discovery,
    note: "Os documentos descobertos são referências oficiais. Habilidades só são declaradas verificadas após validação curricular e revisão docente."
  });
}
