import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const SEDU_ES_ALLOWED_HOSTS = [
  "curriculo.sedu.es.gov.br",
  "sedu.es.gov.br"
];

export const SEDU_ES_DISCOVERY_URLS = [
  "https://curriculo.sedu.es.gov.br/curriculo/",
  "https://curriculo.sedu.es.gov.br/curriculo/documentoscurriculares/",
  "https://curriculo.sedu.es.gov.br/curriculo/orientacoescurriculares/"
];

export type CurriculumDiscoveredDocument = {
  title: string;
  url: string;
  sourceUrl: string;
  sourceSection: string;
  sourceType: "PDF" | "DOCX" | "XLSX" | "HTML" | "UNKNOWN";
  documentType: string;
  educationStage?: string;
  subject?: string;
  publicationYear?: number;
};

export type CurriculumDiscoveryReport = {
  providerCode: "SEDU_ES";
  sourcesVisited: string[];
  documents: CurriculumDiscoveredDocument[];
  skippedLinks: Array<{ url: string; reason: string }>;
  errors: Array<{ sourceUrl: string; message: string }>;
};

export type CurriculumHttpClient = {
  get(input: {
    url: string;
    headers: Record<string, string>;
    timeoutMs: number;
  }): Promise<{
    status: number;
    url: string;
    headers: Record<string, string | undefined>;
    body: Buffer;
  }>;
};

export type StoredCurriculumFile = {
  storageKey: string;
  contentHash: string;
  fileSize: number;
  mimeType: string;
  fileName: string;
};

export type CurriculumFileStorage = {
  save(input: {
    content: Buffer;
    contentHash: string;
    fileName: string;
    mimeType: string;
  }): Promise<StoredCurriculumFile>;
  exists(hash: string): Promise<boolean>;
  read(reference: string): Promise<Buffer>;
  remove(reference: string): Promise<void>;
};

export type CurriculumFetchedDocument = {
  status: "DOWNLOADED" | "SKIPPED_IDENTICAL";
  sourceUrl: string;
  finalUrl: string;
  contentHash: string;
  fileSize: number;
  fileName: string;
  mimeType: string;
  localStorageKey?: string;
};

export class CurriculumSourceDiscovery {
  constructor(
    private readonly httpClient: CurriculumHttpClient,
    private readonly options: {
      allowedHosts?: string[];
      timeoutMs?: number;
      retries?: number;
      userAgent?: string;
    } = {}
  ) {}

  async discover(sourceUrls = SEDU_ES_DISCOVERY_URLS): Promise<CurriculumDiscoveryReport> {
    const report: CurriculumDiscoveryReport = {
      providerCode: "SEDU_ES",
      sourcesVisited: [],
      documents: [],
      skippedLinks: [],
      errors: []
    };
    const seen = new Set<string>();

    for (const sourceUrl of sourceUrls) {
      if (!isAllowedCurriculumUrl(sourceUrl, this.options.allowedHosts)) {
        report.skippedLinks.push({ url: sourceUrl, reason: "SOURCE_HOST_NOT_ALLOWED" });
        continue;
      }

      try {
        const response = await this.getWithRetry(sourceUrl);
        report.sourcesVisited.push(sourceUrl);
        const html = response.body.toString("utf8");
        const links = extractLinks(html, sourceUrl);

        for (const link of links) {
          if (!isAllowedCurriculumUrl(link.url, this.options.allowedHosts)) {
            report.skippedLinks.push({ url: link.url, reason: "LINK_HOST_NOT_ALLOWED" });
            continue;
          }

          const sourceType = classifySourceType(link.url);

          if (sourceType === "UNKNOWN") {
            report.skippedLinks.push({ url: link.url, reason: "UNSUPPORTED_LINK_TYPE" });
            continue;
          }

          const key = normalizeUrlForDedupe(link.url);

          if (seen.has(key)) {
            continue;
          }

          seen.add(key);
          report.documents.push({
            title: link.title,
            url: link.url,
            sourceUrl,
            sourceSection: link.section,
            sourceType,
            documentType: inferDocumentType(link.title, link.url, sourceUrl, link.section),
            educationStage: inferEducationStage(link.title, link.url),
            subject: inferSubject(link.title, link.url),
            publicationYear: inferPublicationYear(link.title, link.url)
          });
        }
      } catch (error) {
        report.errors.push({
          sourceUrl,
          message: error instanceof Error ? error.message : "DISCOVERY_FAILED"
        });
      }
    }

    return report;
  }

  private async getWithRetry(url: string) {
    const retries = this.options.retries ?? 1;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await this.httpClient.get({
          url,
          headers: {
            "User-Agent": this.options.userAgent ?? "ACESSA+ Curriculum Import Engine/1.0"
          },
          timeoutMs: this.options.timeoutMs ?? 15_000
        });

        if (response.status < 200 || response.status >= 300) {
          throw new Error(`HTTP_${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("DISCOVERY_FAILED");
  }
}

export class CurriculumDocumentFetcher {
  constructor(
    private readonly httpClient: CurriculumHttpClient,
    private readonly storage: CurriculumFileStorage,
    private readonly options: {
      allowedHosts?: string[];
      timeoutMs?: number;
      maxBytes?: number;
      knownHashes?: Set<string>;
      userAgent?: string;
    } = {}
  ) {}

  async fetch(input: { sourceUrl: string; fileName?: string }): Promise<CurriculumFetchedDocument> {
    if (!isAllowedCurriculumUrl(input.sourceUrl, this.options.allowedHosts)) {
      throw new Error("DOCUMENT_HOST_NOT_ALLOWED");
    }

    const response = await this.httpClient.get({
      url: input.sourceUrl,
      headers: {
        "User-Agent": this.options.userAgent ?? "ACESSA+ Curriculum Import Engine/1.0"
      },
      timeoutMs: this.options.timeoutMs ?? 20_000
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP_${response.status}`);
    }

    const maxBytes = this.options.maxBytes ?? 30 * 1024 * 1024;

    if (response.body.byteLength > maxBytes) {
      throw new Error("DOCUMENT_TOO_LARGE");
    }

    const mimeType = normalizeMimeType(response.headers["content-type"], input.sourceUrl);

    if (!isSupportedMimeType(mimeType)) {
      throw new Error(`UNSUPPORTED_MIME_TYPE:${mimeType}`);
    }

    const contentHash = sha256(response.body);
    const fileName = input.fileName ?? inferFileName(response.url || input.sourceUrl, mimeType);

    if (this.options.knownHashes?.has(contentHash) || await this.storage.exists(contentHash)) {
      return {
        status: "SKIPPED_IDENTICAL",
        sourceUrl: input.sourceUrl,
        finalUrl: response.url || input.sourceUrl,
        contentHash,
        fileSize: response.body.byteLength,
        fileName,
        mimeType
      };
    }

    const stored = await this.storage.save({
      content: response.body,
      contentHash,
      fileName,
      mimeType
    });

    return {
      status: "DOWNLOADED",
      sourceUrl: input.sourceUrl,
      finalUrl: response.url || input.sourceUrl,
      contentHash,
      fileSize: response.body.byteLength,
      fileName,
      mimeType,
      localStorageKey: stored.storageKey
    };
  }
}

export class LocalCurriculumFileStorage implements CurriculumFileStorage {
  constructor(private readonly rootDir: string) {}

  async save(input: {
    content: Buffer;
    contentHash: string;
    fileName: string;
    mimeType: string;
  }): Promise<StoredCurriculumFile> {
    const storageKey = join(input.contentHash.slice(0, 2), `${input.contentHash}-${sanitizeFileName(input.fileName)}`);
    const absolutePath = join(this.rootDir, storageKey);
    const markerPath = join(this.rootDir, input.contentHash.slice(0, 2), `${input.contentHash}.marker`);

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.content);
    await writeFile(markerPath, storageKey);

    return {
      storageKey,
      contentHash: input.contentHash,
      fileSize: input.content.byteLength,
      mimeType: input.mimeType,
      fileName: input.fileName
    };
  }

  async exists(hash: string): Promise<boolean> {
    try {
      const prefix = hash.slice(0, 2);
      const marker = join(this.rootDir, prefix, `${hash}.marker`);

      await readFile(marker);
      return true;
    } catch {
      return false;
    }
  }

  async read(reference: string): Promise<Buffer> {
    return readFile(join(this.rootDir, reference));
  }

  async remove(reference: string): Promise<void> {
    const { rm } = await import("node:fs/promises");

    await rm(join(this.rootDir, reference), { force: true });
  }
}

export function isAllowedCurriculumUrl(url: string, allowedHosts = SEDU_ES_ALLOWED_HOSTS): boolean {
  try {
    const parsed = new URL(url);

    return parsed.protocol === "https:" && allowedHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function extractLinks(html: string, sourceUrl: string): Array<{
  title: string;
  url: string;
  section: string;
}> {
  const links: Array<{ title: string; url: string; section: string }> = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(html)) !== null) {
    const href = match[1] ?? "";
    const rawTitle = match[2] ?? "";
    const title = cleanHtmlText(rawTitle);

    if (!href || !title) {
      continue;
    }

    links.push({
      title,
      url: new URL(href, sourceUrl).toString(),
      section: inferHtmlSection(html, match.index)
    });
  }

  return links;
}

export function classifySourceType(url: string): CurriculumDiscoveredDocument["sourceType"] {
  const path = new URL(url).pathname.toLowerCase();

  if (path.endsWith(".pdf")) return "PDF";
  if (path.endsWith(".docx")) return "DOCX";
  if (path.endsWith(".xlsx")) return "XLSX";
  if (!/\.[a-z0-9]+$/.test(path)) return "HTML";
  return "UNKNOWN";
}

export function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function cleanHtmlText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function inferHtmlSection(html: string, index: number): string {
  const before = html.slice(Math.max(0, index - 900), index);
  const headings = [...before.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
  const last = headings.at(-1);

  return last ? cleanHtmlText(last[1] ?? "") : "Página oficial";
}

function inferDocumentType(title: string, url: string, sourceUrl = "", section = ""): string {
  const source = normalize(`${title} ${url} ${sourceUrl} ${section}`);

  if (source.includes("orientacoes curriculares") || source.includes("orientacoescurriculares")) {
    return "ORIENTACOES_CURRICULARES";
  }
  if (source.includes("documento curricular")) return "DOCUMENTO_CURRICULAR";
  return "DOCUMENTO_OFICIAL";
}

function inferEducationStage(title: string, url: string): string | undefined {
  const source = normalize(`${title} ${url}`);

  if (source.includes("ensino medio") || source.includes("em_")) return "Ensino Médio";
  if (source.includes("anos finais") || source.includes("efaf")) return "Ensino Fundamental - Anos Finais";
  if (source.includes("anos iniciais") || source.includes("efai")) return "Ensino Fundamental - Anos Iniciais";
  return undefined;
}

function inferSubject(title: string, url: string): string | undefined {
  const source = normalize(`${title} ${url}`);
  const subjects: Array<[string, string[]]> = [
    ["Língua Portuguesa", ["lingua portuguesa", "lp_"]],
    ["Matemática", ["matematica", "mat_"]],
    ["Geografia", ["geografia", "geo"]],
    ["História", ["historia", "his"]],
    ["Ciências", ["ciencias", "cie"]],
    ["Biologia", ["biologia", "bio"]],
    ["Física", ["fisica", "fis"]],
    ["Química", ["quimica", "qui"]]
  ];

  return subjects.find(([, keys]) => keys.some((key) => source.includes(key)))?.[0];
}

function inferPublicationYear(title: string, url: string): number | undefined {
  const match = `${title} ${url}`.match(/\b(20\d{2})\b/);

  return match ? Number(match[1]) : undefined;
}

function normalizeUrlForDedupe(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString();
}

function normalizeMimeType(contentType: string | undefined, url: string): string {
  const value = (contentType ?? "").split(";")[0]?.trim().toLowerCase();

  if (value) {
    return value;
  }

  const type = classifySourceType(url);
  if (type === "PDF") return "application/pdf";
  if (type === "DOCX") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (type === "XLSX") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "text/html";
}

function isSupportedMimeType(mimeType: string): boolean {
  return [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/html"
  ].includes(mimeType);
}

function inferFileName(url: string, mimeType: string): string {
  const pathName = new URL(url).pathname.split("/").filter(Boolean).at(-1);

  if (pathName?.includes(".")) {
    return pathName;
  }

  if (mimeType === "application/pdf") return "documento-curricular.pdf";
  if (mimeType.includes("wordprocessingml")) return "documento-curricular.docx";
  if (mimeType.includes("spreadsheetml")) return "documento-curricular.xlsx";
  return "documento-curricular.html";
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
