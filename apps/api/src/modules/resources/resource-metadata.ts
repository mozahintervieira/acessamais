import type { CreateMissionRequest } from "@acessa-plus/types";

export type ResourceMetadata = {
  missionType?: string;
  discipline?: string;
  gradeYear?: string;
  skill?: string;
  knowledgeObject?: string;
  theme?: string;
  specificNeed?: string;
  learningPreference?: string;
  readingWritingLevel?: string;
  expectedProductType?: string;
  accessibilityTags: string[];
  pedagogicalTags: string[];
  [key: string]: unknown;
};

export type ResourceSearchFilters = {
  organizationId: string;
  discipline?: string;
  gradeYear?: string;
  skill?: string;
  specificNeed?: string;
  q?: string;
};

export function buildResourceMetadata(input: {
  request: CreateMissionRequest;
  context: unknown;
  decision: unknown;
  knowledgeApplications: unknown;
}): ResourceMetadata {
  const missionInput = input.request.input;
  const discipline = normalizeText(missionInput.discipline ?? missionInput.subject);
  const gradeYear = normalizeText(missionInput.gradeYear ?? missionInput.yearGrade);
  const skill = normalizeText(missionInput.skill);
  const knowledgeObject = normalizeText(missionInput.knowledgeObject);
  const theme = normalizeText(missionInput.theme);
  const specificNeed = normalizeText(missionInput.specificNeed);
  const learningPreference = normalizeText(missionInput.learningPreference);
  const readingWritingLevel = normalizeText(missionInput.readingWritingLevel);
  const expectedProductType = normalizeText(missionInput.expectedProductType);

  return {
    missionType: input.request.missionType,
    discipline,
    gradeYear,
    skill,
    knowledgeObject,
    theme,
    specificNeed,
    learningPreference,
    readingWritingLevel,
    expectedProductType,
    pedagogicalTags: uniqueTags([
      tag("disciplina", discipline),
      tag("serie", gradeYear),
      tag("habilidade", skill),
      tag("objeto", knowledgeObject),
      tag("tema", theme),
      tag("produto", expectedProductType)
    ]),
    accessibilityTags: uniqueTags([
      tag("necessidade", specificNeed),
      tag("leitura-escrita", readingWritingLevel),
      tag("preferencia", summarizeTagValue(learningPreference))
    ]),
    context: input.context,
    decision: input.decision,
    knowledgeApplications: input.knowledgeApplications,
    source: input.request.missionType
  };
}

export function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ");

  return normalized ? normalized : undefined;
}

export function normalizeComparable(value: string | undefined): string {
  return normalizeText(value)?.toLocaleLowerCase("pt-BR") ?? "";
}

function summarizeTagValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.split(/[,.]/)[0]?.trim();
}

function tag(prefix: string, value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return `${prefix}:${normalizeComparable(value)}`;
}

function uniqueTags(tags: Array<string | undefined>): string[] {
  return [...new Set(tags.filter((item): item is string => Boolean(item)))];
}
