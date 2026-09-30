import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const PROVIDER_CODE = "SEDU_ES";
const PROVIDER_NAME = "Curriculo do Espirito Santo / SEDU-ES";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { PrismaClient } = require(join(ROOT, "packages/database/node_modules/@prisma/client"));
const DATA_ROOT = join(ROOT, ".data", "curriculum");
const FILE_ROOT = join(DATA_ROOT, "files");
const EXTRACT_ROOT = join(DATA_ROOT, "extracted");
const DISCOVERY_URLS = [
  "https://curriculo.sedu.es.gov.br/curriculo/",
  "https://curriculo.sedu.es.gov.br/curriculo/documentoscurriculares/",
  "https://curriculo.sedu.es.gov.br/curriculo/orientacoescurriculares/",
];
const ALLOWED_HOSTS = new Set(["curriculo.sedu.es.gov.br", "sedu.es.gov.br"]);
const SKILL_PATTERN = /\b(?:EF\d{2}[A-Z]{2}\d{2}(?:\/ES)?|EM\d{2}[A-Z]{3}\d{3}[A-Za-z]*(?:\/ES)?)\b/g;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const maxDocuments = numberArg("--max-documents", 12);
const maxPages = numberArg("--max-pages", dryRun ? 10 : 0);

loadLocalEnv();

if (!process.env.DATABASE_URL && !dryRun) {
  console.error("DATABASE_URL ausente. Configure a variavel antes de executar a importacao curricular.");
  process.exitCode = 1;
  process.exit();
}

mkdirSync(FILE_ROOT, { recursive: true });
mkdirSync(EXTRACT_ROOT, { recursive: true });

const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;
const stats = {
  dryRun,
  sourcesVisited: 0,
  documentsDiscovered: 0,
  documentsSelected: 0,
  documentsDownloaded: 0,
  documentsSkipped: 0,
  documentsProcessed: 0,
  pagesExtracted: 0,
  tablesIdentified: 0,
  skillsExtracted: 0,
  recordsCreated: 0,
  recordsUpdated: 0,
  recordsRejected: 0,
  reviewIssuesCreated: 0,
  examples: [],
};

let importRun;

try {
  const provider = prisma ? await prisma.curriculumProvider.upsert({
    where: { code: PROVIDER_CODE },
    create: {
      code: PROVIDER_CODE,
      name: PROVIDER_NAME,
      jurisdiction: "Espirito Santo",
      official: true,
      status: "ACTIVE",
    },
    update: {
      name: PROVIDER_NAME,
      jurisdiction: "Espirito Santo",
      official: true,
      status: "ACTIVE",
    },
  }) : { id: "dry-provider", code: PROVIDER_CODE };

  importRun = dryRun
    ? null
    : await prisma.curriculumImportRun.create({
        data: {
          providerId: provider.id,
          triggerType: "MANUAL",
          status: "RUNNING",
        },
      });

  const discovered = await discoverDocuments();
  stats.documentsDiscovered = discovered.length;
  const selected = selectPriorityDocuments(discovered).slice(0, maxDocuments);
  stats.documentsSelected = selected.length;

  for (const doc of selected) {
    await syncDocument(provider, doc);
  }

  if (importRun) {
    await prisma.curriculumImportRun.update({
      where: { id: importRun.id },
      data: {
        finishedAt: new Date(),
        status: "COMPLETED",
        documentsDiscovered: stats.documentsDiscovered,
        documentsDownloaded: stats.documentsDownloaded,
        documentsSkipped: stats.documentsSkipped,
        documentsProcessed: stats.documentsProcessed,
        recordsCreated: stats.recordsCreated,
        recordsUpdated: stats.recordsUpdated,
        recordsRejected: stats.recordsRejected,
        reviewIssuesCreated: stats.reviewIssuesCreated,
      },
    });
  }

  console.log(JSON.stringify(stats, null, 2));
} catch (error) {
  if (importRun) {
    await prisma.curriculumImportRun.update({
      where: { id: importRun.id },
      data: {
        finishedAt: new Date(),
        status: "FAILED",
        errorSummary: error instanceof Error ? error.message : "CURRICULUM_SYNC_FAILED",
      },
    }).catch(() => undefined);
  }

  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect();
}

async function discoverDocuments() {
  const documents = [];
  const seen = new Set();

  for (const sourceUrl of DISCOVERY_URLS) {
    const source = parseSafeUrl(sourceUrl);

    if (!source || !ALLOWED_HOSTS.has(source.hostname)) {
      continue;
    }

    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "ACESSA+ Curriculum Import Engine/1.0" },
    });

    if (!response.ok) {
      continue;
    }

    stats.sourcesVisited += 1;
    const html = await response.text();

    for (const link of extractLinks(html, sourceUrl)) {
      const url = parseSafeUrl(link.url);
      if (!url || !ALLOWED_HOSTS.has(url.hostname)) continue;
      if (!url.pathname.toLowerCase().endsWith(".pdf")) continue;

      const key = url.toString();
      if (seen.has(key)) continue;
      seen.add(key);

      documents.push({
        title: cleanText(link.title),
        url: key,
        sourceUrl,
        sourceSection: link.section,
        documentType: inferDocumentType(link.title, key, sourceUrl, link.section),
        educationStage: inferEducationStage(link.title, key),
        subject: inferSubject(link.title, key),
        knowledgeArea: inferKnowledgeArea(link.title, key),
        grade: inferDocumentGrade(link.title, key),
        publicationYear: inferPublicationYear(link.title, key),
      });
    }
  }

  return documents;
}

async function syncDocument(provider, doc) {
  const source = dryRun
    ? { id: "dry-source" }
    : await prisma.curriculumSource.upsert({
        where: {
          providerId_sourceUrl: {
            providerId: provider.id,
            sourceUrl: doc.sourceUrl,
          },
        },
        create: {
          providerId: provider.id,
          title: doc.sourceSection || "Pagina oficial SEDU-ES",
          sourceUrl: doc.sourceUrl,
          sourceType: "HTML",
          official: true,
          accessedAt: new Date(),
          status: "ACTIVE",
        },
        update: {
          title: doc.sourceSection || "Pagina oficial SEDU-ES",
          official: true,
          accessedAt: new Date(),
          status: "ACTIVE",
        },
      });

  const fetched = await downloadDocument(doc);
  if (fetched.status === "DOWNLOADED") stats.documentsDownloaded += 1;
  if (fetched.status === "SKIPPED_IDENTICAL") stats.documentsSkipped += 1;

  const documentSlug = slugify(`${doc.documentType}-${doc.title}`);
  const documentRecord = dryRun
    ? { id: "dry-document" }
    : await upsertDocument(provider, source, doc, documentSlug);

  const versionLabel = String(doc.publicationYear || "sem-versao");
  const version = dryRun
    ? {
        id: "dry-version",
        contentHash: fetched.contentHash,
        localStorageKey: fetched.localStorageKey,
      }
    : await upsertDocumentVersion(documentRecord, doc, fetched, versionLabel);

  const extracted = extractPdf(fetched.absolutePath, fetched.contentHash, maxPages);
  stats.pagesExtracted += extracted.pages.length;
  stats.tablesIdentified += extracted.pages.reduce((total, page) => total + page.tables.length, 0);

  let item;
  if (!dryRun) {
    item = await prisma.curriculumImportItem.create({
      data: {
        importRunId: importRun.id,
        documentVersionId: version.id,
        status: "RUNNING",
        stage: "EXTRACTION",
        startedAt: new Date(),
      },
    });
  }

  let skillCount = 0;
  let warningCount = 0;

  for (const entity of extractSkillEntities(doc, version, extracted)) {
    skillCount += 1;
    stats.skillsExtracted += 1;
    if (entity.issues.length > 0) warningCount += entity.issues.length;

    if (!dryRun) {
      await persistSkillEntity(provider, version, entity);
    }

    if (stats.examples.length < 12) {
      stats.examples.push(publicExample(doc, fetched, entity));
    }
  }

  if (!dryRun) {
    await prisma.curriculumImportItem.update({
      where: { id: item.id },
      data: {
        status: "COMPLETED",
        stage: "PERSISTED",
        finishedAt: new Date(),
        extractedTextSize: extracted.pages.reduce((total, page) => total + page.text.length, 0),
        tableCount: extracted.pages.reduce((total, page) => total + page.tables.length, 0),
        skillCount,
        warningCount,
      },
    });

    await prisma.curriculumDocumentVersion.update({
      where: { id: version.id },
      data: {
        importedAt: new Date(),
        processingStatus: "COMPLETED",
        validationStatus: warningCount === 0 ? "PASSED" : "PENDING_REVIEW",
        extractionConfidence: skillCount > 0 ? 0.78 : 0.4,
      },
    });
  }

  stats.documentsProcessed += 1;
}

async function downloadDocument(doc) {
  const response = await fetch(doc.url, {
    headers: { "User-Agent": "ACESSA+ Curriculum Import Engine/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Falha ao baixar documento oficial (${response.status}): ${doc.url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentHash = sha256(buffer);
  const fileName = sanitizeFileName(decodeURIComponent(new URL(doc.url).pathname.split("/").at(-1) || "documento.pdf"));
  const relativePath = join(contentHash.slice(0, 2), `${contentHash}-${fileName}`);
  const absolutePath = join(FILE_ROOT, relativePath);

  if (!existsSync(absolutePath)) {
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, buffer);
    return {
      status: "DOWNLOADED",
      contentHash,
      fileName,
      fileSize: buffer.byteLength,
      mimeType: response.headers.get("content-type")?.split(";")[0] || "application/pdf",
      localStorageKey: relativePath,
      absolutePath,
    };
  }

  return {
    status: "SKIPPED_IDENTICAL",
    contentHash,
    fileName,
    fileSize: buffer.byteLength,
    mimeType: response.headers.get("content-type")?.split(";")[0] || "application/pdf",
    localStorageKey: relativePath,
    absolutePath,
  };
}

async function upsertDocument(provider, source, doc, slug) {
  const existing = await prisma.curriculumDocument.findFirst({
    where: {
      providerId: provider.id,
      slug,
    },
  });

  const data = {
    providerId: provider.id,
    sourceId: source.id,
    title: doc.title,
    slug,
    documentType: doc.documentType,
    educationStage: doc.educationStage,
    knowledgeArea: doc.knowledgeArea,
    subject: doc.subject,
    grade: doc.grade,
    schoolYear: doc.publicationYear ? String(doc.publicationYear) : null,
    publicationYear: doc.publicationYear,
    officialUrl: doc.url,
    official: true,
    status: "IMPORTED",
  };

  if (!existing) {
    stats.recordsCreated += 1;
    return prisma.curriculumDocument.create({ data });
  }

  stats.recordsUpdated += 1;
  return prisma.curriculumDocument.update({
    where: { id: existing.id },
    data,
  });
}

async function upsertDocumentVersion(documentRecord, doc, fetched, versionLabel) {
  const existing = await prisma.curriculumDocumentVersion.findFirst({
    where: {
      documentId: documentRecord.id,
      contentHash: fetched.contentHash,
    },
  });

  const data = {
    documentId: documentRecord.id,
    versionLabel,
    sourceUrl: doc.url,
    fileName: fetched.fileName,
    mimeType: fetched.mimeType,
    contentHash: fetched.contentHash,
    fileSize: fetched.fileSize,
    localStorageKey: fetched.localStorageKey,
    accessedAt: new Date(),
    processingStatus: "DOWNLOADED",
    validationStatus: "PENDING",
  };

  if (!existing) {
    stats.recordsCreated += 1;
    return prisma.curriculumDocumentVersion.create({ data });
  }

  stats.recordsUpdated += 1;
  return prisma.curriculumDocumentVersion.update({
    where: { id: existing.id },
    data,
  });
}

function extractPdf(absolutePath, contentHash, pageLimit = 0) {
  const cacheSuffix = pageLimit > 0 ? `-${pageLimit}-pages` : "";
  const outputPath = join(EXTRACT_ROOT, `${contentHash}${cacheSuffix}.json`);
  const cached = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : null;
  if (cached?.pages?.length) return cached;

  const python = resolvePython();
  const pythonArgs = [join(ROOT, "scripts", "curriculum-extract-pdf.py"), absolutePath];
  if (pageLimit > 0) pythonArgs.push(String(pageLimit));
  const result = spawnSync(python, pythonArgs, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(`Falha na extracao do PDF: ${result.stderr || result.stdout}`);
  }

  const parsed = JSON.parse(result.stdout);
  writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
  return parsed;
}

function extractSkillEntities(doc, version, extracted) {
  const entities = [];
  const seen = new Set();

  for (const page of extracted.pages) {
    const pageText = cleanText([
      page.text,
      ...page.tables.flatMap((table) => table.rows.map((row) => row.join(" | "))),
    ].join(" "));
    const matches = [...pageText.matchAll(SKILL_PATTERN)];

    for (const match of matches) {
      const rawCode = match[0];
      const normalizedCode = normalizeCode(rawCode);
      const key = `${normalizedCode}:${page.pageNumber}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const context = sliceContext(pageText, match.index || 0);
      const inferred = inferEntityFromContext(doc, page, rawCode, context);
      entities.push({
        ...inferred,
        code: rawCode,
        normalizedCode,
        documentVersionId: version.id,
        sourcePage: page.pageNumber,
        rawSourceText: context,
      });
    }
  }

  return entities;
}

function inferEntityFromContext(doc, page, code, context) {
  const normalizedContext = normalizeText(context);
  const subject = inferSubject(context, doc.url) || doc.subject || inferSubjectFromCode(code);
  const educationStage = inferStageFromCode(code) || doc.educationStage;
  const grade = inferGradeFromCode(code) || doc.grade;
  const trimester = inferTrimester(context);
  const description = extractDescription(code, context);
  const knowledgeObjects = extractLabeledValues(context, [
    "OBJETO DE CONHECIMENTO",
    "OBJETOS DE CONHECIMENTO",
    "OBJETO(S) DE CONHECIMENTO",
  ]);
  const expectations = extractLabeledValues(context, [
    "EXPECTATIVA DE APRENDIZAGEM",
    "EXPECTATIVAS DE APRENDIZAGEM",
    "EXPECTATIVA(S) DE APRENDIZAGEM",
  ]);
  const contents = extractLabeledValues(context, [
    "CONTEUDO",
    "CONTEUDOS",
    "CONTEUDOS RELACIONADOS",
    "CONTEUDO RELACIONADO",
  ]);
  const guidances = extractLabeledValues(context, [
    "ORIENTACOES CURRICULARES",
    "ORIENTACAO CURRICULAR",
    "ORIENTACOES",
    "ORIENTACAO",
  ]);

  let confidence = 0.45;
  if (description.length > 40) confidence += 0.22;
  if (subject) confidence += 0.08;
  if (grade) confidence += 0.08;
  if (knowledgeObjects.length > 0) confidence += 0.08;
  if (expectations.length > 0) confidence += 0.06;
  if ((page.tables || []).length > 0) confidence += 0.03;
  confidence = Math.min(0.98, Number(confidence.toFixed(2)));

  const issues = [];
  if (!description || description.length < 40) issues.push(issue("MISSING_DESCRIPTION", "HIGH", "Descricao oficial ausente ou curta demais."));
  if (looksCorrupted(description)) issues.push(issue("LOW_CONFIDENCE", "HIGH", "Descricao extraida com sinais de OCR/texto corrompido."));
  if (!grade) issues.push(issue("AMBIGUOUS_GRADE", "MEDIUM", "Ano/serie ambiguo no trecho extraido."));
  if (!subject) issues.push(issue("AMBIGUOUS_SUBJECT", "MEDIUM", "Componente curricular ambiguo no trecho extraido."));
  if (!/^(EF|EM)/.test(normalizeCode(code))) issues.push(issue("INVALID_CODE", "HIGH", "Codigo curricular invalido."));
  if (confidence < 0.72) issues.push(issue("LOW_CONFIDENCE", "MEDIUM", "Confianca de extracao abaixo do minimo de publicacao automatica."));
  if ((page.tables || []).length === 0 && normalizedContext.includes("tabela")) {
    issues.push(issue("BROKEN_TABLE", "MEDIUM", "Trecho indica tabela, mas nenhuma tabela estruturada foi extraida."));
  }
  if (knowledgeObjects.length === 0 && expectations.length === 0 && contents.length === 0) {
    issues.push(issue("UNRESOLVED_RELATION", "MEDIUM", "Nenhuma relacao curricular foi resolvida no trecho."));
  }

  return {
    officialDescription: description || context.slice(0, 600),
    educationStage,
    grade,
    subject,
    knowledgeArea: doc.knowledgeArea || inferKnowledgeArea(context, doc.url),
    trimester,
    knowledgeObjects,
    expectations,
    contents,
    guidances,
    confidence,
    validationStatus: issues.length > 0 || confidence < 0.72 ? "PENDING_REVIEW" : "PASSED",
    publicationStatus: issues.length > 0 || confidence < 0.72 ? "DRAFT" : "PUBLISHED",
    issues,
  };
}

async function persistSkillEntity(provider, version, entity) {
  const existing = await prisma.curriculumSkill.findFirst({
    where: {
      documentVersionId: version.id,
      normalizedCode: entity.normalizedCode,
      grade: entity.grade,
      subject: entity.subject,
    },
  });

  const data = {
    providerId: provider.id,
    documentVersionId: version.id,
    code: entity.code,
    normalizedCode: entity.normalizedCode,
    officialDescription: entity.officialDescription,
    educationStage: entity.educationStage,
    grade: entity.grade,
    subject: entity.subject,
    knowledgeArea: entity.knowledgeArea,
    trimester: entity.trimester,
    sourcePage: entity.sourcePage,
    sourceSection: "PDF page",
    rawSourceText: entity.rawSourceText,
    extractionConfidence: entity.confidence,
    validationStatus: entity.validationStatus,
    publicationStatus: entity.publicationStatus,
    official: true,
  };

  const skill = existing
    ? await prisma.curriculumSkill.update({ where: { id: existing.id }, data })
    : await prisma.curriculumSkill.create({ data });

  if (existing) stats.recordsUpdated += 1;
  else stats.recordsCreated += 1;

  for (const text of entity.knowledgeObjects) {
    const object = await upsertRelated("knowledgeObject", version, text, entity);
    await upsertRelation(skill, "KNOWLEDGE_OBJECT", object.id, "HAS_KNOWLEDGE_OBJECT", entity.confidence);
  }

  for (const text of entity.expectations) {
    const expectation = await upsertRelated("learningExpectation", version, text, entity);
    await upsertRelation(skill, "LEARNING_EXPECTATION", expectation.id, "HAS_LEARNING_EXPECTATION", entity.confidence);
  }

  for (const text of entity.contents) {
    const content = await upsertRelated("content", version, text, entity);
    await upsertRelation(skill, "CONTENT", content.id, "HAS_CONTENT", entity.confidence);
  }

  for (const text of entity.guidances) {
    const guidance = await upsertRelated("guidance", version, text, entity);
    await upsertRelation(skill, "GUIDANCE", guidance.id, "HAS_GUIDANCE", entity.confidence);
  }

  for (const currentIssue of entity.issues) {
    await upsertReviewIssue(version, skill, entity, currentIssue);
  }
}

async function upsertRelated(kind, version, text, entity) {
  const normalizedText = normalizeText(text);
  const baseData = {
    documentVersionId: version.id,
    officialText: text,
    sourcePage: entity.sourcePage,
    sourceSection: "PDF page",
    extractionConfidence: entity.confidence,
    validationStatus: entity.validationStatus === "PASSED" ? "PASSED" : "PENDING_REVIEW",
  };

  const where = {
    documentVersionId: version.id,
    normalizedText,
    sourceSection: "PDF page",
  };

  if (kind === "knowledgeObject") {
    return findUpdateCreate(prisma.curriculumKnowledgeObject, where, {
      ...baseData,
      normalizedText,
    });
  }

  if (kind === "learningExpectation") {
    return findUpdateCreate(prisma.curriculumLearningExpectation, where, {
      ...baseData,
      normalizedText,
    });
  }

  if (kind === "content") {
    return findUpdateCreate(prisma.curriculumContent, where, {
      ...baseData,
      normalizedText,
      title: text.slice(0, 120),
    });
  }

  const existing = await prisma.curriculumGuidance.findFirst({
    where: {
      documentVersionId: version.id,
      officialText: text,
      guidanceType: "CURRICULAR_ORIENTATION",
    },
  });
  const data = {
    documentVersionId: version.id,
    guidanceType: "CURRICULAR_ORIENTATION",
    officialText: text,
    trimester: entity.trimester,
    sourcePage: entity.sourcePage,
    sourceSection: "PDF page",
    extractionConfidence: entity.confidence,
    validationStatus: entity.validationStatus === "PASSED" ? "PASSED" : "PENDING_REVIEW",
  };
  if (existing) {
    stats.recordsUpdated += 1;
    return prisma.curriculumGuidance.update({ where: { id: existing.id }, data });
  }
  stats.recordsCreated += 1;
  return prisma.curriculumGuidance.create({ data });
}

async function findUpdateCreate(model, where, data) {
  const existing = await model.findFirst({ where });
  if (existing) {
    stats.recordsUpdated += 1;
    return model.update({ where: { id: existing.id }, data });
  }
  stats.recordsCreated += 1;
  return model.create({ data });
}

async function upsertRelation(skill, targetEntityType, targetEntityId, relationType, confidence) {
  const existing = await prisma.curriculumSkillRelation.findFirst({
    where: {
      sourceSkillId: skill.id,
      targetEntityType,
      targetEntityId,
      relationType,
    },
  });
  const data = {
    sourceSkillId: skill.id,
    targetEntityType,
    targetEntityId,
    relationType,
    confidence,
    validationStatus: confidence >= 0.72 ? "PASSED" : "PENDING_REVIEW",
  };
  if (existing) {
    stats.recordsUpdated += 1;
    return prisma.curriculumSkillRelation.update({ where: { id: existing.id }, data });
  }
  stats.recordsCreated += 1;
  return prisma.curriculumSkillRelation.create({ data });
}

async function upsertReviewIssue(version, skill, entity, currentIssue) {
  const existing = await prisma.curriculumReviewIssue.findFirst({
    where: {
      documentVersionId: version.id,
      skillId: skill.id,
      entityType: "CurriculumSkill",
      entityId: skill.id,
      issueType: currentIssue.issueType,
      sourcePage: entity.sourcePage,
      status: "OPEN",
    },
  });

  const data = {
    importRunId: importRun.id,
    documentVersionId: version.id,
    skillId: skill.id,
    entityType: "CurriculumSkill",
    entityId: skill.id,
    issueType: currentIssue.issueType,
    severity: currentIssue.severity,
    message: currentIssue.message,
    rawValue: entity.rawSourceText,
    sourcePage: entity.sourcePage,
    status: "OPEN",
  };

  if (existing) {
    stats.recordsUpdated += 1;
    return prisma.curriculumReviewIssue.update({ where: { id: existing.id }, data });
  }

  stats.reviewIssuesCreated += 1;
  return prisma.curriculumReviewIssue.create({ data });
}

function extractDescription(code, context) {
  const normalizedCode = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${normalizedCode}\\s*[:\\-]?\\s*([\\s\\S]{40,1100})`, "i");
  const match = context.match(pattern);
  const source = match?.[1] || context;
  return cleanText(source)
    .split(/\b(?:OBJETO(?:\(S\))? DE CONHECIMENTO|EXPECTATIVA(?:\(S\))? DE APRENDIZAGEM|DESCRITOR(?:ES)?|CONTEUDO(?:S)?|ORIENTACAO|ORIENTACOES|EF\d{2}[A-Z]{2}\d{2}|EM\d{2}[A-Z]{3}\d{3})\b/i)[0]
    ?.trim()
    .slice(0, 1200) || "";
}

function extractLabeledValues(context, labels) {
  const values = [];
  const stop = "(?:HABILIDADE|OBJETO|EXPECTATIVA|DESCRITOR|CONTEUDO|ORIENTACAO|TRIMESTRE|EF\\d{2}[A-Z]{2}\\d{2}|EM\\d{2}[A-Z]{3}\\d{3})";
  for (const label of labels) {
    const pattern = new RegExp(`${escapeRegex(label)}\\s*[:\\-]?\\s*([\\s\\S]{8,900}?)(?=\\b${stop}\\b|$)`, "i");
    const match = context.match(pattern);
    if (match?.[1]) values.push(...splitOfficialItems(match[1]));
  }
  return [...new Set(values.map(cleanText).filter((value) => value.length > 3))].slice(0, 8);
}

function splitOfficialItems(value) {
  return cleanText(value)
    .split(/(?:\s[;•]\s|\s-\s|\n| \| )/g)
    .map((item) => cleanText(item))
    .filter((item) => item.length > 3 && item.length < 500);
}

function sliceContext(text, index) {
  return cleanText(text.slice(Math.max(0, index - 1200), Math.min(text.length, index + 2400)));
}

function extractLinks(html, sourceUrl) {
  const links = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html)) !== null) {
    const href = match[1] || "";
    const title = cleanHtmlText(match[2] || "");
    if (!href || !title) continue;
    links.push({
      title,
      url: new URL(href, sourceUrl).toString(),
      section: inferSection(html, match.index),
    });
  }
  return links;
}

function selectPriorityDocuments(documents) {
  const prioritySubjects = [
    "Lingua Portuguesa",
    "Matematica",
    "Geografia",
    "Historia",
    "Ciencias",
    "Biologia",
    "Fisica",
    "Quimica",
  ];
  const selected = [];

  for (const subject of prioritySubjects) {
    const candidates = documents
      .filter((doc) => normalizeText(doc.subject || doc.title).includes(normalizeText(subject)))
      .sort((left, right) => documentPriorityScore(right) - documentPriorityScore(left));
    const match = candidates[0];
    if (match && !selected.some((doc) => doc.url === match.url)) selected.push(match);
  }

  for (const doc of documents) {
    if (selected.length >= maxDocuments) break;
    if (!selected.some((item) => item.url === doc.url)) selected.push(doc);
  }

  return selected;
}

function publicExample(doc, fetched, entity) {
  return {
    document: doc.title,
    url: doc.url,
    hash: fetched.contentHash,
    version: String(doc.publicationYear || "sem-versao"),
    page: entity.sourcePage,
    rawCode: entity.code,
    normalizedCode: entity.normalizedCode,
    officialDescription: entity.officialDescription,
    grade: entity.grade,
    component: entity.subject,
    object: entity.knowledgeObjects,
    expectation: entity.expectations,
    content: entity.contents,
    confidence: entity.confidence,
    validationStatus: entity.validationStatus,
    publicationStatus: entity.publicationStatus,
    issues: entity.issues.map((item) => item.issueType),
  };
}

function issue(issueType, severity, message) {
  return { issueType, severity, message };
}

function inferDocumentType(title, url, sourceUrl, section) {
  const source = normalizeText(`${title} ${url} ${sourceUrl} ${section}`);
  if (source.includes("orientacoes") || source.includes("orientacoescurriculares")) return "ORIENTACOES_CURRICULARES";
  if (source.includes("documento curricular")) return "DOCUMENTO_CURRICULAR";
  return "DOCUMENTO_OFICIAL";
}

function inferEducationStage(title, url) {
  const source = normalizeText(`${title} ${url}`);
  if (source.includes("ensino medio") || source.includes("em_")) return "Ensino Medio";
  if (source.includes("anos finais") || source.includes("efaf")) return "Ensino Fundamental - Anos Finais";
  if (source.includes("anos iniciais") || source.includes("efai")) return "Ensino Fundamental - Anos Iniciais";
  return null;
}

function inferStageFromCode(code) {
  const normalized = normalizeCode(code);
  if (normalized.startsWith("EF")) return "Ensino Fundamental";
  if (normalized.startsWith("EM")) return "Ensino Medio";
  return null;
}

function inferSubject(title, url) {
  const source = normalizeText(`${title} ${url}`);
  const subjects = [
    ["Lingua Portuguesa", ["lingua portuguesa", "lp_", "_lp_", "lp 26", "lp-"]],
    ["Matematica", ["matematica", "mat_", "_mat_", "mat 26", "mat-"]],
    ["Geografia", ["geografia", "geo", "_geo_"]],
    ["Historia", ["historia", "his", "_his_"]],
    ["Ciencias", ["ciencias", "cie", "_cie_"]],
    ["Biologia", ["biologia", "bio", "_bio_"]],
    ["Fisica", ["fisica", "fis", "_fis_"]],
    ["Quimica", ["quimica", "qui", "_qui_"]],
  ];
  return subjects.find(([, keys]) => keys.some((key) => source.includes(normalizeText(key))))?.[0] || null;
}

function inferSubjectFromCode(code) {
  const normalized = normalizeCode(code);
  if (normalized.includes("LP")) return "Lingua Portuguesa";
  if (normalized.includes("MA") || normalized.includes("MAT")) return "Matematica";
  if (normalized.includes("GEO")) return "Geografia";
  if (normalized.includes("HIS")) return "Historia";
  if (normalized.includes("CIE") || normalized.includes("CNT")) return "Ciencias da Natureza";
  return null;
}

function inferKnowledgeArea(title, url) {
  const subject = inferSubject(title, url);
  if (subject === "Lingua Portuguesa") return "Linguagens";
  if (subject === "Matematica") return "Matematica";
  if (["Geografia", "Historia"].includes(subject)) return "Ciencias Humanas";
  if (["Ciencias", "Biologia", "Fisica", "Quimica"].includes(subject)) return "Ciencias da Natureza";
  return null;
}

function inferDocumentGrade(title, url) {
  const source = normalizeText(`${title} ${url}`);
  const match = source.match(/\b([1-9])\s*(?:ano|serie)\b/);
  return match ? `${match[1]}o ano` : null;
}

function inferGradeFromCode(code) {
  const normalized = normalizeCode(code);
  const ef = normalized.match(/^EF(\d{2})/);
  if (ef) {
    const year = Number(ef[1]);
    if (year >= 1 && year <= 9) return `${year}o ano`;
    if (year === 15) return "1o ao 5o ano";
    if (year === 69) return "6o ao 9o ano";
  }
  if (normalized.startsWith("EM13")) return "Ensino Medio";
  return null;
}

function inferPublicationYear(title, url) {
  const match = `${title} ${url}`.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function inferTrimester(context) {
  const source = normalizeText(context);
  const match = source.match(/\b([1-4])\s*(?:o|º)?\s*trimestre\b/);
  return match ? `${match[1]}o trimestre` : null;
}

function inferSection(html, index) {
  const before = html.slice(Math.max(0, index - 1000), index);
  const headings = [...before.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
  const heading = headings.at(-1)?.[1];
  return cleanHtmlText(heading || "Pagina oficial");
}

function resolvePython() {
  const configured = process.env.CURRICULUM_PYTHON_BIN;
  if (configured && existsSync(configured)) return configured;
  const bundled = "C:\\Users\\mozah\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
  if (existsSync(bundled)) return bundled;
  return process.platform === "win32" ? "python" : "python3";
}

function loadLocalEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const path = join(ROOT, fileName);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

function numberArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function normalizeCode(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanHtmlText(value) {
  return cleanText(String(value || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&"));
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, "-").slice(0, 140) || "documento-curricular";
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSafeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function documentPriorityScore(doc) {
  const source = normalizeText(`${doc.title} ${doc.url} ${doc.educationStage || ""}`);
  let score = 0;
  if (source.includes("orientacoes")) score += 40;
  if (source.includes("efaf") || source.includes("anos finais")) score += 35;
  if (source.includes("em_") || source.includes("ensino medio")) score += 25;
  if (source.includes("2026") || source.includes("_26_")) score += 20;
  if (source.includes("efai") || source.includes("anos iniciais")) score -= 12;
  return score;
}

function looksCorrupted(value) {
  const text = cleanText(value);
  if (/[�]{2,}/.test(text)) return true;
  const letters = text.match(/\b[A-Z]\s+[A-Z]\s+[0-9]\s+[0-9]\b/g) || [];
  if (letters.length > 2) return true;
  if (/^\W+$/.test(text)) return true;
  return false;
}
