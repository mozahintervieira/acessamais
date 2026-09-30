import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CurriculumDocumentFetcher,
  CurriculumSourceDiscovery,
  LocalCurriculumFileStorage,
  type CurriculumHttpClient,
  sha256
} from "./curriculum-import-engine.js";

describe("Curriculum Import Engine", () => {
  it("descobre documentos oficiais, resolve URL relativa e remove duplicados", async () => {
    const html = `
      <h2>Orientações Curriculares 2026</h2>
      <a href="/curriculo/wp-content/uploads/2026/04/EFAF_LP_26_16_12_25.pdf">EFAF Língua Portuguesa 2026</a>
      <a href="/curriculo/wp-content/uploads/2026/04/EFAF_LP_26_16_12_25.pdf">Duplicado</a>
      <a href="https://example.com/invalido.pdf">Fonte externa</a>
    `;
    const discovery = new CurriculumSourceDiscovery(mockHttp({
      "https://curriculo.sedu.es.gov.br/curriculo/orientacoescurriculares/": {
        contentType: "text/html",
        body: html
      }
    }));

    const report = await discovery.discover([
      "https://curriculo.sedu.es.gov.br/curriculo/orientacoescurriculares/"
    ]);

    expect(report.documents).toHaveLength(1);
    expect(report.documents[0]?.url).toBe("https://curriculo.sedu.es.gov.br/curriculo/wp-content/uploads/2026/04/EFAF_LP_26_16_12_25.pdf");
    expect(report.documents[0]?.sourceType).toBe("PDF");
    expect(report.documents[0]?.documentType).toBe("ORIENTACOES_CURRICULARES");
    expect(report.documents[0]?.educationStage).toBe("Ensino Fundamental - Anos Finais");
    expect(report.documents[0]?.subject).toBe("Língua Portuguesa");
    expect(report.skippedLinks).toContainEqual({
      url: "https://example.com/invalido.pdf",
      reason: "LINK_HOST_NOT_ALLOWED"
    });
  });

  it("bloqueia descoberta em dominio nao permitido", async () => {
    const discovery = new CurriculumSourceDiscovery(mockHttp({}));
    const report = await discovery.discover(["https://example.com/curriculo"]);

    expect(report.sourcesVisited).toHaveLength(0);
    expect(report.skippedLinks[0]?.reason).toBe("SOURCE_HOST_NOT_ALLOWED");
  });

  it("baixa documento, calcula SHA-256 e salva arquivo local versionado", async () => {
    const root = await mkdtemp(join(tmpdir(), "acessa-curriculum-"));

    try {
      const content = Buffer.from("%PDF-1.4 conteudo oficial");
      const fetcher = new CurriculumDocumentFetcher(
        mockHttp({
          "https://curriculo.sedu.es.gov.br/curriculo/wp-content/uploads/2026/04/EFAF_LP_26_16_12_25.pdf": {
            contentType: "application/pdf",
            body: content
          }
        }),
        new LocalCurriculumFileStorage(root)
      );

      const result = await fetcher.fetch({
        sourceUrl: "https://curriculo.sedu.es.gov.br/curriculo/wp-content/uploads/2026/04/EFAF_LP_26_16_12_25.pdf"
      });

      expect(result.status).toBe("DOWNLOADED");
      expect(result.contentHash).toBe(sha256(content));
      expect(result.fileSize).toBe(content.byteLength);
      expect(result.localStorageKey).toContain(result.contentHash);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("nao salva novamente documento com hash ja conhecido", async () => {
    const root = await mkdtemp(join(tmpdir(), "acessa-curriculum-"));

    try {
      const content = Buffer.from("conteudo oficial");
      const storage = new LocalCurriculumFileStorage(root);
      const sourceUrl = "https://curriculo.sedu.es.gov.br/curriculo/wp-content/uploads/2026/04/EFAF_LP_26_16_12_25.pdf";
      const httpClient = mockHttp({
        [sourceUrl]: {
          contentType: "application/pdf",
          body: content
        }
      });
      const first = await new CurriculumDocumentFetcher(httpClient, storage).fetch({ sourceUrl });
      const second = await new CurriculumDocumentFetcher(httpClient, storage).fetch({ sourceUrl });

      expect(first.status).toBe("DOWNLOADED");
      expect(second.status).toBe("SKIPPED_IDENTICAL");
      expect(second.localStorageKey).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejeita download fora da whitelist oficial", async () => {
    const root = await mkdtemp(join(tmpdir(), "acessa-curriculum-"));

    try {
      const fetcher = new CurriculumDocumentFetcher(mockHttp({}), new LocalCurriculumFileStorage(root));

      await expect(fetcher.fetch({ sourceUrl: "https://example.com/documento.pdf" }))
        .rejects
        .toThrow("DOCUMENT_HOST_NOT_ALLOWED");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

function mockHttp(fixtures: Record<string, { contentType: string; body: string | Buffer }>): CurriculumHttpClient {
  return {
    async get(input) {
      const fixture = fixtures[input.url];

      if (!fixture) {
        return {
          status: 404,
          url: input.url,
          headers: { "content-type": "text/plain" },
          body: Buffer.from("not found")
        };
      }

      return {
        status: 200,
        url: input.url,
        headers: { "content-type": fixture.contentType },
        body: Buffer.isBuffer(fixture.body) ? fixture.body : Buffer.from(fixture.body)
      };
    }
  };
}
