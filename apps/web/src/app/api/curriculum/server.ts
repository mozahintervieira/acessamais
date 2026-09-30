import type { CreateMissionRequest } from "@acessa-plus/types";
import {
  normalizeCurriculumCode,
  type CurriculumKnowledgePack,
  type CurriculumProviderId,
  type CurriculumSkillRecord,
  type CurriculumSourceDocument
} from "@acessa-plus/pedagogical-core";
import { getPrisma, hasDatabaseUrl } from "../../server/db";

export async function listPersistedCurriculumProviders() {
  if (!hasDatabaseUrl()) {
    return undefined;
  }

  try {
    const providers = await getPrisma().curriculumProvider.findMany({
      where: {
        status: "ACTIVE",
        official: true
      },
      include: {
        sources: {
          where: {
            status: "ACTIVE",
            official: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return providers.map((provider) => ({
      id: provider.code as CurriculumProviderId,
      name: provider.name,
      status: "AVAILABLE" as const,
      documents: provider.sources.map((source) => ({
        id: source.id,
        providerId: provider.code as CurriculumProviderId,
        title: source.title,
        version: source.sourceType,
        url: source.sourceUrl,
        retrievedAt: source.accessedAt?.toISOString() ?? source.updatedAt.toISOString()
      }))
    }));
  } catch {
    return undefined;
  }
}

export async function searchPersistedCurriculumSkills(input: {
  query?: string;
  discipline?: string;
  grade?: string;
  providerId?: CurriculumProviderId;
}): Promise<CurriculumSkillRecord[] | undefined> {
  if (!hasDatabaseUrl()) {
    return undefined;
  }

  try {
    const normalizedCode = normalizeCurriculumCode(input.query);
    const query = input.query?.trim();
    const records = await getPrisma().curriculumSkill.findMany({
      where: {
        provider: {
          code: input.providerId ?? "SEDU_ES"
        },
        validationStatus: "PASSED",
        publicationStatus: "PUBLISHED",
        ...(normalizedCode
          ? {
              OR: [
                { normalizedCode },
                { officialDescription: { contains: query ?? "", mode: "insensitive" } }
              ]
            }
          : {}),
        ...(input.discipline ? { subject: { contains: input.discipline, mode: "insensitive" } } : {}),
        ...(input.grade ? { grade: { contains: input.grade, mode: "insensitive" } } : {})
      },
      include: {
        provider: true,
        documentVersion: {
          include: {
            document: true,
            knowledgeObjects: true,
            learningExpectations: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 25
    });

    return records.map((record) => toSkillRecord(record));
  } catch {
    return undefined;
  }
}

export async function resolvePersistedCurriculumKnowledgePack(
  request: CreateMissionRequest
): Promise<CurriculumKnowledgePack | undefined> {
  const skills = await searchPersistedCurriculumSkills({
    query: request.input.skill,
    discipline: request.input.discipline ?? request.input.subject,
    grade: request.input.gradeYear ?? request.input.yearGrade,
    providerId: "SEDU_ES"
  });
  const skill = skills?.[0];

  if (!skill || !hasDatabaseUrl()) {
    return undefined;
  }

  try {
    const dbSkill = await getPrisma().curriculumSkill.findFirst({
      where: {
        id: skill.id,
        validationStatus: "PASSED",
        publicationStatus: "PUBLISHED"
      },
      include: {
        provider: true,
        documentVersion: {
          include: {
            document: {
              include: {
                source: true
              }
            },
            knowledgeObjects: true,
            learningExpectations: true
          }
        }
      }
    });

    if (!dbSkill) {
      return undefined;
    }

    const sourceDocument = toSourceDocument(dbSkill.provider.code, dbSkill.documentVersion.document);
    const warnings = buildPersistedWarnings(request, skill);

    return {
      providerId: dbSkill.provider.code as CurriculumProviderId,
      repositorySource: "PRISMA",
      sourceDocument,
      skill,
      requestedCode: request.input.skill ?? "",
      requestedDiscipline: request.input.discipline ?? request.input.subject,
      requestedGrade: request.input.gradeYear ?? request.input.yearGrade,
      requestedKnowledgeObject: request.input.knowledgeObject,
      match: {
        status: skill.normalizedCode === normalizeCurriculumCode(request.input.skill) ? "NORMALIZED" : "EXACT",
        score: warnings.length === 0 ? 100 : 82,
        warnings
      },
      generationBrief: {
        teacherIntent: request.input.rawPrompt ?? request.input.contextNotes ?? "Gerar material pedagógico acessível.",
        sourceOfTruth: `${sourceDocument.title} (${sourceDocument.version}) - ${sourceDocument.url}`,
        curricularCompetence: skill.skillText,
        requiredEvidence: [
          ...skill.learningExpectations,
          "A folha deve solicitar evidência observável da habilidade validada no banco curricular."
        ],
        contentBoundaries: [
          `Preservar a habilidade ${skill.code}.`,
          `Trabalhar dentro de ${skill.knowledgeObjects.join(", ") || "objeto curricular validado"}.`,
          "Não consumir registros curriculares em rascunho, pendentes ou rejeitados."
        ],
        accessibilityImplications: [
          "Aplicar DUA, comandos objetivos e apoios visuais com função pedagógica.",
          "Adequar mediação ao perfil do estudante sem infantilizar a linguagem."
        ],
        forbiddenDrift: [
          "Não gerar sequência desconectada da habilidade oficial publicada.",
          "Não substituir o conteúdo curricular por exercício genérico."
        ],
        auditTrace: [
          `provider=${dbSkill.provider.code}`,
          `skill=${skill.code}`,
          `documentVersion=${dbSkill.documentVersion.id}`,
          "source=persisted_curriculum"
        ]
      }
    };
  } catch {
    return undefined;
  }
}

function toSkillRecord(record: {
  id: string;
  provider: { code: string };
  code: string;
  normalizedCode: string;
  subject: string | null;
  educationStage: string | null;
  grade: string | null;
  documentVersionId: string;
  officialDescription: string;
  trimester: string | null;
  validationStatus: string;
  documentVersion: {
    knowledgeObjects: Array<{ officialText: string }>;
    learningExpectations: Array<{ officialText: string }>;
  };
}): CurriculumSkillRecord {
  return {
    id: record.id,
    providerId: record.provider.code as CurriculumProviderId,
    code: record.code,
    normalizedCode: record.normalizedCode,
    discipline: record.subject ?? "Componente curricular não informado",
    stage: record.educationStage ?? "Etapa não informada",
    grade: record.grade ?? "Ano/série não informado",
    sourceDocumentId: record.documentVersionId,
    skillText: record.officialDescription,
    knowledgeObjects: record.documentVersion.knowledgeObjects.map((item) => item.officialText),
    learningExpectations: record.documentVersion.learningExpectations.map((item) => item.officialText),
    descriptors: [],
    trimester: record.trimester ?? undefined,
    validationStatus: record.validationStatus === "PASSED" ? "OFFICIAL_VERIFIED" : "PENDING_REVIEW"
  };
}

function toSourceDocument(
  providerCode: string,
  document: {
    id: string;
    title: string;
    schoolYear: string | null;
    publicationYear: number | null;
    officialUrl: string;
  }
): CurriculumSourceDocument {
  return {
    id: document.id,
    providerId: providerCode as CurriculumProviderId,
    title: document.title,
    version: document.schoolYear ?? String(document.publicationYear ?? "sem versão"),
    url: document.officialUrl,
    retrievedAt: new Date().toISOString()
  };
}

function buildPersistedWarnings(
  request: CreateMissionRequest,
  skill: CurriculumSkillRecord
): string[] {
  const warnings: string[] = [];

  if (
    request.input.knowledgeObject &&
    skill.knowledgeObjects.length > 0 &&
    !skill.knowledgeObjects.some((object) =>
      object.toLowerCase().includes((request.input.knowledgeObject ?? "").toLowerCase())
    )
  ) {
    warnings.push(`O objeto informado (${request.input.knowledgeObject}) será conferido com os objetos curriculares publicados.`);
  }

  return warnings;
}
