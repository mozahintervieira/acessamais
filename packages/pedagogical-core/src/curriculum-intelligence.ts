import type { CreateMissionRequest } from "@acessa-plus/types";

export type CurriculumProviderId = "SEDU_ES";

export type CurriculumSourceDocument = {
  id: string;
  providerId: CurriculumProviderId;
  title: string;
  version: string;
  url: string;
  retrievedAt: string;
  evidenceLines?: string;
};

export type CurriculumSkillRecord = {
  id: string;
  providerId: CurriculumProviderId;
  code: string;
  normalizedCode: string;
  discipline: string;
  stage: string;
  grade: string;
  sourceDocumentId: string;
  skillText: string;
  knowledgeObjects: string[];
  learningExpectations: string[];
  descriptors: string[];
  trimester?: string;
  validationStatus: "OFFICIAL_VERIFIED" | "PENDING_REVIEW";
};

export type CurriculumKnowledgePack = {
  providerId: CurriculumProviderId;
  repositorySource: "PRISMA" | "MEMORY_FALLBACK";
  sourceDocument: CurriculumSourceDocument;
  skill: CurriculumSkillRecord;
  requestedCode: string;
  requestedDiscipline?: string;
  requestedGrade?: string;
  requestedKnowledgeObject?: string;
  match: {
    status: "EXACT" | "NORMALIZED" | "NOT_FOUND";
    score: number;
    warnings: string[];
  };
  generationBrief: GenerationBrief;
};

export type GenerationBrief = {
  teacherIntent: string;
  sourceOfTruth: string;
  curricularCompetence: string;
  requiredEvidence: string[];
  contentBoundaries: string[];
  accessibilityImplications: string[];
  forbiddenDrift: string[];
  auditTrace: string[];
};

export type CurriculumAlignmentReport = {
  approved: boolean;
  totalScore: number;
  scores: {
    skillCodeMatch: number;
    knowledgeObjectMatch: number;
    evidenceAlignment: number;
    sourceTraceability: number;
  };
  issues: string[];
  recommendations: string[];
};

export const SEDU_ES_SOURCE_DOCUMENTS: CurriculumSourceDocument[] = [
  {
    id: "sedu-es-portal-curriculo",
    providerId: "SEDU_ES",
    title: "Portal oficial do Currículo do Espírito Santo",
    version: "Portal oficial",
    url: "https://curriculo.sedu.es.gov.br/curriculo/",
    retrievedAt: "2026-09-29",
    evidenceLines:
      "Portal oficial da SEDU-ES que reúne as páginas de orientações, documentos curriculares e demais referências do currículo estadual."
  },
  {
    id: "sedu-es-documentos-curriculares",
    providerId: "SEDU_ES",
    title: "Documentos curriculares - Currículo do Espírito Santo",
    version: "Índice oficial",
    url: "https://curriculo.sedu.es.gov.br/curriculo/documentoscurriculares/",
    retrievedAt: "2026-09-29",
    evidenceLines:
      "Índice oficial de documentos curriculares disponibilizado pela Secretaria de Estado da Educação do Espírito Santo."
  },
  {
    id: "sedu-es-orientacoes-curriculares",
    providerId: "SEDU_ES",
    title: "Orientações curriculares 2026 - Currículo do Espírito Santo",
    version: "2026",
    url: "https://curriculo.sedu.es.gov.br/curriculo/orientacoescurriculares/",
    retrievedAt: "2026-09-29",
    evidenceLines:
      "A página oficial apresenta orientações por etapa, componente curricular, trimestre e itinerário formativo, com links para os documentos correspondentes."
  },
  {
    id: "sedu-es-oc-2026-efaf-lp",
    providerId: "SEDU_ES",
    title: "Orientações Curriculares 2026 - Ensino Fundamental Anos Finais - Língua Portuguesa",
    version: "2026",
    url: "https://curriculo.sedu.es.gov.br/curriculo/wp-content/uploads/2026/04/EFAF_LP_26_16_12_25.pdf",
    retrievedAt: "2026-07-22",
    evidenceLines:
      "O documento informa que cada página contém código da habilidade, objetos de conhecimento, expectativas de aprendizagem e descritores; EF06LP04/ES aparece na página de morfossintaxe do 6º ano."
  }
];

export const SEDU_ES_SKILL_RECORDS: CurriculumSkillRecord[] = [
  {
    id: "sedu-es-ef06lp04-es",
    providerId: "SEDU_ES",
    code: "EF06LP04/ES",
    normalizedCode: normalizeCurriculumCode("EF06LP04/ES"),
    discipline: "Língua Portuguesa",
    stage: "Ensino Fundamental - Anos Finais",
    grade: "6º ano",
    sourceDocumentId: "sedu-es-oc-2026-efaf-lp",
    skillText:
      "Analisar a função e as flexões de substantivos e adjetivos e de verbos nos modos Indicativo, Subjuntivo e Imperativo: afirmativo e negativo, realizando a análise dos tópicos mencionados em textos de todos os campos de atuação.",
    knowledgeObjects: ["Morfossintaxe"],
    learningExpectations: [
      "Compreender e analisar as funções e flexões de substantivos.",
      "Desenvolver habilidades de leitura e escrita, focando na construção gramatical correta das frases."
    ],
    descriptors: [
      "D102_P Reconhecer o efeito de sentido decorrente da exploração de recursos ortográficos e/ou morfossintáticos.",
      "D053_P Reconhecer o efeito de sentido decorrente da escolha de uma determinada palavra ou expressão."
    ],
    trimester: "1º trimestre",
    validationStatus: "OFFICIAL_VERIFIED"
  }
];

export function normalizeCurriculumCode(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function listCurriculumProviders(): Array<{
  id: CurriculumProviderId;
  name: string;
  status: "AVAILABLE";
  documents: CurriculumSourceDocument[];
}> {
  return [
    {
      id: "SEDU_ES",
      name: "Currículo do Espírito Santo / SEDU-ES",
      status: "AVAILABLE",
      documents: SEDU_ES_SOURCE_DOCUMENTS
    }
  ];
}

export function searchCurriculumSkills(input: {
  query?: string;
  discipline?: string;
  grade?: string;
  providerId?: CurriculumProviderId;
}): CurriculumSkillRecord[] {
  const query = normalizeComparable(input.query);
  const discipline = normalizeComparable(input.discipline);
  const grade = normalizeComparable(input.grade);
  const providerId = input.providerId ?? "SEDU_ES";

  return SEDU_ES_SKILL_RECORDS.filter((record) => {
    if (record.providerId !== providerId) {
      return false;
    }

    const haystack = normalizeComparable([
      record.code,
      record.discipline,
      record.grade,
      record.skillText,
      ...record.knowledgeObjects,
      ...record.learningExpectations,
      ...record.descriptors
    ].join(" "));

    return (!query || haystack.includes(query)) &&
      (!discipline || normalizeComparable(record.discipline).includes(discipline)) &&
      (!grade || normalizeComparable(record.grade).includes(grade));
  });
}

export function resolveCurriculumKnowledgePack(
  request: CreateMissionRequest
): CurriculumKnowledgePack | undefined {
  const input = request.input;
  const requestedCode = input.skill ?? "";
  const normalizedCode = normalizeCurriculumCode(requestedCode);

  if (!shouldUseSeduEsProvider(request) && !normalizedCode.endsWith("ES")) {
    return undefined;
  }

  const exact = SEDU_ES_SKILL_RECORDS.find((record) => record.code === requestedCode.trim());
  const normalized = exact ??
    SEDU_ES_SKILL_RECORDS.find((record) => record.normalizedCode === normalizedCode);

  if (!normalized) {
    return undefined;
  }

  const sourceDocument = SEDU_ES_SOURCE_DOCUMENTS.find(
    (document) => document.id === normalized.sourceDocumentId
  );

  if (!sourceDocument) {
    return undefined;
  }

  const warnings = buildCurriculumWarnings(request, normalized);
  const matchStatus = exact ? "EXACT" : "NORMALIZED";

  return {
    providerId: "SEDU_ES",
    repositorySource: "MEMORY_FALLBACK",
    sourceDocument,
    skill: normalized,
    requestedCode,
    requestedDiscipline: input.discipline ?? input.subject,
    requestedGrade: input.gradeYear ?? input.yearGrade,
    requestedKnowledgeObject: input.knowledgeObject,
    match: {
      status: matchStatus,
      score: warnings.length === 0 ? 100 : 82,
      warnings
    },
    generationBrief: buildGenerationBrief(request, normalized, sourceDocument, warnings)
  };
}

export function validateCurriculumAlignment(input: {
  generated: Record<string, unknown>;
  pack?: CurriculumKnowledgePack;
}): CurriculumAlignmentReport {
  if (!input.pack) {
    return {
      approved: false,
      totalScore: 0,
      scores: {
        skillCodeMatch: 0,
        knowledgeObjectMatch: 0,
        evidenceAlignment: 0,
        sourceTraceability: 0
      },
      issues: ["CURRICULUM_PACK_NOT_AVAILABLE"],
      recommendations: ["Confirmar habilidade e fonte curricular oficial antes de declarar alinhamento curricular."]
    };
  }

  const serialized = normalizeComparable(JSON.stringify(input.generated));
  const skill = input.pack.skill;
  const issues: string[] = [];
  const recommendations: string[] = [];

  const skillCodeMatch = serialized.includes(normalizeComparable(skill.code)) ? 25 : 10;
  const knowledgeObjectMatch = skill.knowledgeObjects.some((object) =>
    serialized.includes(normalizeComparable(object))
  ) ? 25 : 12;
  const evidenceAlignment = skill.learningExpectations.some((expectation) =>
    expectation
      .split(/\s+/)
      .filter((word) => word.length > 5)
      .some((word) => serialized.includes(normalizeComparable(word)))
  ) ? 25 : 14;
  const sourceTraceability = serialized.includes("sedu") ||
    serialized.includes("espirito santo") ||
    serialized.includes("curriculo") ? 25 : 16;

  if (skillCodeMatch < 20) {
    issues.push("SKILL_CODE_NOT_REFERENCED_IN_TEACHER_GUIDE");
    recommendations.push("Registrar a habilidade oficial no guia do professor.");
  }

  if (knowledgeObjectMatch < 20) {
    issues.push("KNOWLEDGE_OBJECT_WEAKLY_REFERENCED");
    recommendations.push("Amarrar as tarefas ao objeto de conhecimento oficial.");
  }

  if (evidenceAlignment < 20) {
    issues.push("LEARNING_EXPECTATION_WEAKLY_EVIDENCED");
    recommendations.push("Explicitar no guia quais evidências mostram aprendizagem.");
  }

  const totalScore = skillCodeMatch + knowledgeObjectMatch + evidenceAlignment + sourceTraceability;

  return {
    approved: totalScore >= 80 && issues.length === 0,
    totalScore,
    scores: {
      skillCodeMatch,
      knowledgeObjectMatch,
      evidenceAlignment,
      sourceTraceability
    },
    issues,
    recommendations
  };
}

function shouldUseSeduEsProvider(request: CreateMissionRequest): boolean {
  const source = normalizeComparable([
    request.input.curriculumReference,
    request.input.skill,
    request.input.rawPrompt,
    request.input.contextNotes
  ].join(" "));

  return source.includes("espirito santo") ||
    source.includes("sedu") ||
    source.includes("curriculo do espirito santo") ||
    source.includes("es 2026");
}

function buildCurriculumWarnings(
  request: CreateMissionRequest,
  skill: CurriculumSkillRecord
): string[] {
  const warnings: string[] = [];
  const requestedDiscipline = normalizeComparable(request.input.discipline ?? request.input.subject);
  const requestedGrade = normalizeComparable(request.input.gradeYear ?? request.input.yearGrade);
  const requestedKnowledgeObject = normalizeComparable(request.input.knowledgeObject);

  if (requestedDiscipline && !normalizeComparable(skill.discipline).includes(requestedDiscipline)) {
    warnings.push(`A disciplina informada (${request.input.discipline ?? request.input.subject}) difere da fonte oficial (${skill.discipline}).`);
  }

  if (requestedGrade && !normalizeComparable(skill.grade).includes(requestedGrade.replace(/\D/g, ""))) {
    warnings.push(`O ano/série informado (${request.input.gradeYear ?? request.input.yearGrade}) precisa ser conferido com a fonte oficial (${skill.grade}).`);
  }

  if (
    requestedKnowledgeObject &&
    !skill.knowledgeObjects.some((object) => normalizeComparable(object).includes(requestedKnowledgeObject))
  ) {
    warnings.push(`O objeto informado (${request.input.knowledgeObject}) será tratado como recorte de conteúdo dentro de ${skill.knowledgeObjects.join(", ")}.`);
  }

  return warnings;
}

function buildGenerationBrief(
  request: CreateMissionRequest,
  skill: CurriculumSkillRecord,
  sourceDocument: CurriculumSourceDocument,
  warnings: string[]
): GenerationBrief {
  return {
    teacherIntent: request.input.rawPrompt ?? request.input.contextNotes ?? "Gerar material pedagógico acessível.",
    sourceOfTruth: `${sourceDocument.title} (${sourceDocument.version}) - ${sourceDocument.url}`,
    curricularCompetence: skill.skillText,
    requiredEvidence: [
      ...skill.learningExpectations,
      "A folha deve solicitar ao estudante análise ou uso funcional do conteúdo, não apenas cópia de termos."
    ],
    contentBoundaries: [
      `Preservar a habilidade ${skill.code}.`,
      `Trabalhar dentro de ${skill.knowledgeObjects.join(", ")}.`,
      "Não trocar a disciplina, série ou objeto de conhecimento informado pelo professor."
    ],
    accessibilityImplications: [
      "Aplicar DUA, comandos objetivos e apoios visuais com função pedagógica.",
      "Adequar mediação ao perfil do estudante sem infantilizar a linguagem."
    ],
    forbiddenDrift: [
      "Não gerar sequência desconectada da habilidade oficial.",
      "Não usar apenas palavras-chave do tema.",
      "Não substituir o conteúdo curricular por exercício genérico."
    ],
    auditTrace: [
      `provider=${skill.providerId}`,
      `skill=${skill.code}`,
      `document=${sourceDocument.id}`,
      `validation=${skill.validationStatus}`,
      ...warnings.map((warning) => `warning=${warning}`)
    ]
  };
}

function normalizeComparable(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
