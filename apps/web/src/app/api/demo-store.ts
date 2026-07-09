import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { generateJsonWithConfiguredProvider } from "@acessa-plus/ai-core";
import {
  buildAdaptationProfileText,
  buildPedagogicalGenerationPrompt
} from "@acessa-plus/pedagogical-core";
import type {
  CreateMissionRequest,
  DecisionResult,
  KnowledgeApplicationResult,
  MissionType,
  PedagogicalPlan,
  ResolvedContext
} from "@acessa-plus/types";

type MissionStatus = "COMPLETED" | "NEEDS_REVIEW";

type ResourceMetadata = {
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
  activityType?: string;
  questionCount?: string;
  difficultyLevel?: string;
  outputFormat?: string;
  learningLevel?: string;
  accessibilityTags: string[];
  pedagogicalTags: string[];
  [key: string]: unknown;
};

type ResourceVersion = {
  id: string;
  resourceId: string;
  versionNumber: number;
  contentJson: Record<string, unknown>;
  contentText: string;
  validationStatus: "PENDING";
  createdAt: string;
};

type Resource = {
  id: string;
  missionId?: string;
  organizationId: string;
  createdByUserId: string;
  type: "LESSON_PLAN" | "ADAPTED_ACTIVITY";
  title: string;
  status: "DRAFT";
  metadata: ResourceMetadata;
  versions: ResourceVersion[];
  createdAt: string;
  updatedAt: string;
};

type Mission = {
  id: string;
  organizationId: string;
  createdByUserId: string;
  missionType: MissionType;
  status: MissionStatus;
  input: CreateMissionRequest["input"];
  context: ResolvedContext;
  decision: DecisionResult;
  createdAt: string;
  resources: Resource[];
};

type DemoDatabase = {
  missions: Mission[];
  resources: Resource[];
};

type MissionExecutionResult = {
  missionId: string;
  resourceId: string;
  versionId: string;
  missionType: MissionType;
  status: MissionStatus;
  context: ResolvedContext;
  decision: DecisionResult;
  pedagogicalPlan: PedagogicalPlan & Record<string, unknown>;
};

type ResourceListItem = {
  id: string;
  missionId?: string;
  type: string;
  title: string;
  status: string;
  metadata: ResourceMetadata;
  latestVersion?: ResourceVersion;
  createdAt: string;
};

const KNOWLEDGE_IDS = ["metodo-acessa", "dua", "lgpd-educacional"];
const storePath = join(tmpdir(), "acessa-plus-demo-store.json");

const globalStore = globalThis as typeof globalThis & {
  acessaPlusDemoStore?: DemoDatabase;
};

export async function executeMission(
  request: CreateMissionRequest
): Promise<MissionExecutionResult> {
  validateMission(request);

  const context = resolveContext(request);
  const decision = resolveDecision(context);
  const pedagogicalPlan = await generatePedagogicalPlan(request, context, decision);
  const status: MissionStatus = decision.canProceedToPedagogicalEngine
    ? "COMPLETED"
    : "NEEDS_REVIEW";
  const contentText = buildContentText(request, context, pedagogicalPlan);
  const now = new Date().toISOString();
  const missionId = `mission_${randomUUID()}`;
  const resourceId = `resource_${randomUUID()}`;
  const versionId = `version_${randomUUID()}`;
  const version: ResourceVersion = {
    id: versionId,
    resourceId,
    versionNumber: 1,
    contentJson: pedagogicalPlan,
    contentText,
    validationStatus: "PENDING",
    createdAt: now
  };
  const resource: Resource = {
    id: resourceId,
    missionId,
    organizationId: request.organizationId,
    createdByUserId: request.userId,
    type: request.missionType === "ADAPT_ACTIVITY" ? "ADAPTED_ACTIVITY" : "LESSON_PLAN",
    title: resolveTitle(request),
    status: "DRAFT",
    metadata: buildMetadata(request, context, decision, pedagogicalPlan),
    versions: [version],
    createdAt: now,
    updatedAt: now
  };
  const mission: Mission = {
    id: missionId,
    organizationId: request.organizationId,
    createdByUserId: request.userId,
    missionType: request.missionType,
    status,
    input: request.input,
    context,
    decision,
    createdAt: now,
    resources: [resource]
  };
  const db = await readStore();

  db.missions.unshift(mission);
  db.resources.unshift(resource);
  await writeStore(db);

  return {
    missionId,
    resourceId,
    versionId,
    missionType: request.missionType,
    status,
    context,
    decision,
    pedagogicalPlan
  };
}

export async function listMissions(organizationId: string) {
  const db = await readStore();

  return db.missions
    .filter((mission) => mission.organizationId === organizationId)
    .map((mission) => ({
      id: mission.id,
      missionType: mission.missionType,
      status: mission.status,
      title: mission.resources[0]?.title ?? "Missao sem recurso",
      resourceId: mission.resources[0]?.id,
      createdAt: mission.createdAt
    }));
}

export async function getMissionDetail(
  organizationId: string,
  missionId: string
) {
  const db = await readStore();
  const mission = db.missions.find(
    (item) => item.id === missionId && item.organizationId === organizationId
  );

  if (!mission) {
    return null;
  }

  return {
    id: mission.id,
    organizationId: mission.organizationId,
    createdByUserId: mission.createdByUserId,
    missionType: mission.missionType,
    status: mission.status,
    input: mission.input,
    createdAt: mission.createdAt,
    resources: mission.resources.map((resource) => ({
      id: resource.id,
      type: resource.type,
      title: resource.title,
      status: resource.status,
      metadata: resource.metadata,
      versions: [...resource.versions].sort(
        (left, right) => right.versionNumber - left.versionNumber
      )
    }))
  };
}

export async function listResources(input: {
  organizationId: string;
  discipline?: string;
  gradeYear?: string;
  skill?: string;
  knowledgeObject?: string;
  theme?: string;
  activityType?: string;
  specificNeed?: string;
  learningLevel?: string;
  q?: string;
}): Promise<ResourceListItem[]> {
  const db = await readStore();

  return db.resources
    .filter((resource) => resource.organizationId === input.organizationId)
    .filter((resource) => matches(resource.metadata.discipline, input.discipline))
    .filter((resource) => matches(resource.metadata.gradeYear, input.gradeYear))
    .filter((resource) => matches(resource.metadata.skill, input.skill))
    .filter((resource) =>
      matches(resource.metadata.knowledgeObject, input.knowledgeObject)
    )
    .filter((resource) => matches(resource.metadata.theme, input.theme))
    .filter((resource) => matches(resource.metadata.activityType, input.activityType))
    .filter((resource) => matches(resource.metadata.specificNeed, input.specificNeed))
    .filter((resource) => matches(resource.metadata.learningLevel, input.learningLevel))
    .filter((resource) =>
      input.q
        ? resource.versions.some((version) =>
            normalizeComparable(version.contentText).includes(
              normalizeComparable(input.q)
            )
          )
        : true
    )
    .map((resource) => ({
      id: resource.id,
      missionId: resource.missionId,
      type: resource.type,
      title: resource.title,
      status: resource.status,
      metadata: resource.metadata,
      latestVersion: [...resource.versions].sort(
        (left, right) => right.versionNumber - left.versionNumber
      )[0],
      createdAt: resource.createdAt
    }));
}

export async function listVersions(organizationId: string, resourceId: string) {
  const resource = await findResource(organizationId, resourceId);

  return resource
    ? [...resource.versions].sort(
        (left, right) => right.versionNumber - left.versionNumber
      )
    : [];
}

export async function createVersion(input: {
  organizationId: string;
  resourceId: string;
  contentJson: Record<string, unknown>;
  contentText?: string;
}) {
  const db = await readStore();
  const resource = db.resources.find(
    (item) =>
      item.id === input.resourceId && item.organizationId === input.organizationId
  );

  if (!resource) {
    return null;
  }

  const now = new Date().toISOString();
  const latestNumber = resource.versions.reduce(
    (latest, version) => Math.max(latest, version.versionNumber),
    0
  );
  const version: ResourceVersion = {
    id: `version_${randomUUID()}`,
    resourceId: resource.id,
    versionNumber: latestNumber + 1,
    contentJson: input.contentJson,
    contentText: input.contentText?.trim() || buildVersionText(input.contentJson),
    validationStatus: "PENDING",
    createdAt: now
  };

  resource.versions.unshift(version);
  resource.updatedAt = now;

  const mission = db.missions.find((item) => item.id === resource.missionId);
  const missionResource = mission?.resources.find((item) => item.id === resource.id);

  if (missionResource) {
    missionResource.versions = resource.versions;
    missionResource.updatedAt = now;
  }

  await writeStore(db);

  return version;
}

async function findResource(organizationId: string, resourceId: string) {
  const db = await readStore();

  return db.resources.find(
    (resource) => resource.id === resourceId && resource.organizationId === organizationId
  );
}

async function generatePedagogicalPlan(
  request: CreateMissionRequest,
  context: ResolvedContext,
  decision: DecisionResult
): Promise<PedagogicalPlan & Record<string, unknown>> {
  const generated = await callOpenAI(request, context, decision);
  const fallback = buildGeneratedFallbacks(request);

  return {
    intent: request.missionType,
    contextCompleteness: context.completeness,
    objectives: normalizeStringArray(generated.objectives, decision.objectives),
    expectedOutputs: normalizeStringArray(
      generated.expectedOutputs,
      decision.expectedProducts
    ),
    protocolApplications: buildKnowledgeApplications(),
    methodologicalConstraints: normalizeStringArray(
      generated.methodologicalConstraints,
      decision.constraints
    ),
    validationCriteria: normalizeStringArray(generated.validationCriteria, [
      "Verificar se a atividade avalia diretamente a competencia exigida pela habilidade curricular.",
      "Verificar acessibilidade, clareza dos comandos e evidencias de aprendizagem.",
      "Evitar dados sensiveis ou diagnosticos alem do necessario pedagogicamente."
    ]),
    curricularAnalysis: buildCurricularAnalysis(generated, request),
    warnings: normalizeStringArray(generated.warnings, []),
    studentSheet: buildStudentSheet(generated, request),
    teacherGuide: buildTeacherGuide(generated, request),
    worksheetTitle: normalizeString(
      generated.worksheetTitle,
      `Atividade: ${request.input.theme ?? request.input.knowledgeObject ?? "conteudo"}`
    ),
    subject: normalizeString(
      generated.subject,
      request.input.discipline ?? request.input.subject ?? "Recurso pedagogico"
    ),
    grade: normalizeString(
      generated.grade,
      request.input.gradeYear ?? request.input.yearGrade ?? ""
    ),
    skillCode: normalizeString(generated.skillCode, request.input.skill ?? ""),
    learningObjective: normalizeString(
      generated.learningObjective,
      request.input.lessonObjective ??
        request.input.objective ??
        "Desenvolver a aprendizagem prevista na solicitacao do professor."
    ),
    context: normalizeString(
      generated.context,
      "Contexto organizado para introduzir a atividade de forma clara e significativa."
    ),
    baseText: normalizeString(generated.baseText, ""),
    instructions: normalizeStringArray(generated.instructions, [
      "Leia com atencao e responda no espaco indicado.",
      "Use apoio visual, concreto ou leitura mediada quando necessario."
    ]),
    questions: normalizeQuestions(generated.questions, request),
    visualElements: normalizeStringArray(generated.visualElements, []),
    didacticBoxes: normalizeStringArray(generated.didacticBoxes, [
      "Leia o comando, observe o exemplo e registre sua resposta no espaco indicado."
    ]),
    tableRows: normalizeStringArray(generated.tableRows, [
      "Informacao principal | Ideia importante | Minha resposta"
    ]),
    graphicOrganizers: normalizeStringArray(generated.graphicOrganizers, []),
    methodologyTips: normalizeStringArray(generated.methodologyTips, [
      "Mediar a leitura dos comandos, oferecer exemplo inicial e registrar evidencias de aprendizagem durante a realizacao."
    ]),
    difficultyProgression: normalizeStringArray(generated.difficultyProgression, [
      "Comecar com reconhecimento do conceito.",
      "Avancar para aplicacao guiada.",
      "Finalizar com producao ou explicacao propria."
    ]),
    adaptationNotes: buildAdaptationNotes(generated.adaptationNotes, request),
    answerKey: normalizeStringArray(generated.answerKey, []),
    lessonFlow: normalizeStringArray(generated.lessonFlow, fallback.lessonFlow),
    adaptedActivities: normalizeStringArray(
      generated.adaptedActivities,
      fallback.adaptedActivities
    ),
    accessibilitySupports: normalizeStringArray(
      generated.accessibilitySupports,
      fallback.accessibilitySupports
    ),
    assessment: normalizeStringArray(generated.assessment, fallback.assessment),
    teacherReport: normalizeStringArray(generated.teacherReport, fallback.teacherReport),
    reuseSuggestions: normalizeStringArray(
      generated.reuseSuggestions,
      fallback.reuseSuggestions
    )
  };
}

async function callOpenAI(
  request: CreateMissionRequest,
  context: ResolvedContext,
  decision: DecisionResult
): Promise<Record<string, unknown>> {
  const prompt = buildPedagogicalGenerationPrompt(request, context, decision);
  const response = await generateJsonWithConfiguredProvider<Record<string, unknown>>(
    {
      purpose:
        request.missionType === "ADAPT_ACTIVITY"
          ? "ACTIVITY_ADAPTATION"
          : "LESSON_PLAN_GENERATION",
      systemPrompt: prompt.systemPrompt,
      userPayload: prompt.userPayload,
      outputSchemaName: prompt.outputSchemaName,
      safetyLevel: request.input.specificNeed ? "SENSITIVE" : "STANDARD"
    },
    {
      openAiApiKey: process.env.OPENAI_API_KEY,
      openAiModel: process.env.OPENAI_MODEL
    }
  );

  return response.output;
}

function resolveContext(request: CreateMissionRequest): ResolvedContext {
  const input = request.input;
  const missingFieldEntries: Array<[string, string | undefined]> = [
    ["rawPrompt", input.rawPrompt],
    ["discipline", input.discipline ?? input.subject],
    ["gradeYear", input.gradeYear ?? input.yearGrade],
    ["skill", input.skill],
    ["knowledgeObject", input.knowledgeObject],
    ["theme", input.theme],
    ["lessonObjective", input.lessonObjective ?? input.objective],
    ["specificNeed", input.specificNeed ?? input.adaptationProfile?.targetAudience],
    ["learningPreference", input.learningPreference],
    ["readingWritingLevel", input.readingWritingLevel ?? input.adaptationProfile?.learningProfile],
    ["availableResources", input.availableResources?.join(", ")],
    ["expectedProductType", input.expectedProductType],
    ["activityType", input.activityType],
    ["questionCount", input.questionCount],
    ["difficultyLevel", input.difficultyLevel],
    ["outputFormat", input.outputFormat]
  ];
  const missingFields = missingFieldEntries
    .filter(([, value]) => !value)
    .map(([field]) => field);
  const completeness = input.rawPrompt
    ? missingFields.length <= 3
      ? "COMPLETE"
      : "PARTIAL"
    : missingFields.length === 0
      ? "COMPLETE"
      : missingFields.length <= 3
        ? "PARTIAL"
        : "INSUFFICIENT";

  return {
    missionType: request.missionType,
    rawInput: {
      ...input,
      subject: input.subject ?? input.discipline,
      yearGrade: input.yearGrade ?? input.gradeYear,
      objective: input.objective ?? input.lessonObjective,
      accessibilityNeeds:
        input.accessibilityNeeds ??
        (input.specificNeed ? [input.specificNeed] : undefined)
    },
    organizationId: request.organizationId,
    userId: request.userId,
    availableKnowledgeIds: KNOWLEDGE_IDS,
    detectedSignals: [
      input.rawPrompt ? "entrada:linguagem-natural" : undefined,
      input.discipline ? `disciplina:${input.discipline}` : undefined,
      input.gradeYear ? `serie:${input.gradeYear}` : undefined,
      input.specificNeed ? `necessidade:${input.specificNeed}` : undefined,
      input.adaptationProfile?.targetAudience
        ? `perfil-adaptacao:${input.adaptationProfile.targetAudience}`
        : undefined,
      input.expectedProductType ? `produto:${input.expectedProductType}` : undefined
    ].filter((item): item is string => Boolean(item)),
    missingFields,
    completeness
  };
}

function resolveDecision(context: ResolvedContext): DecisionResult {
  const input = context.rawInput;

  return {
    stages: {
      CONTEXT: [
        `Disciplina: ${input.discipline ?? input.subject ?? "nao informada"}`,
        `Serie/ano: ${input.gradeYear ?? input.yearGrade ?? "nao informado"}`,
        `Necessidade pedagogica: ${input.specificNeed ?? input.adaptationProfile?.targetAudience ?? "nao informada"}`,
        `Perfil Inteligente de Adaptacao: ${buildAdaptationProfileText(input)}`
      ],
      OBJECTIVE: [input.lessonObjective ?? input.objective ?? "Definir objetivo da aula."],
      CONSTRAINTS: [
        "Preservar linguagem pedagogica, sem perfil medico.",
        "Aplicar DUA, acessibilidade visual, comandos claros e avaliacao formativa.",
        input.readingWritingLevel
          ? `Considerar nivel de leitura/escrita: ${input.readingWritingLevel}`
          : `Considerar perfil de aprendizagem: ${input.adaptationProfile?.learningProfile ?? "informado pelo professor."}`
      ],
      EXPECTED_PRODUCT: [
        input.expectedProductType ?? "Material pedagogico inclusivo reutilizavel."
      ]
    },
    knowledgeApplications: buildKnowledgeApplications(),
    objectives: [
      input.lessonObjective ??
        input.objective ??
        `Criar recurso pedagogico pronto para uso a partir do pedido: ${input.rawPrompt ?? input.theme ?? "tema informado"}.`
    ],
    constraints: [
      "Usar comandos objetivos e criterios claros de mediacao.",
      "Oferecer multiplas formas de acesso, participacao e expressao.",
      "Guardar apenas informacoes pedagogicas necessarias."
    ],
    expectedProducts: [
      input.expectedProductType ?? "Atividade A4 pronta para impressao."
    ],
    warnings:
      context.completeness === "COMPLETE"
        ? []
        : ["A missao possui campos ausentes; revise antes de usar com estudantes."],
    canProceedToPedagogicalEngine: context.completeness !== "INSUFFICIENT"
  };
}

function buildKnowledgeApplications(): KnowledgeApplicationResult[] {
  return [
    {
      knowledgeId: "metodo-acessa",
      knowledgeVersion: "0.1.0",
      knowledgeType: "PROTOCOL",
      appliedCriteria: [
        "Interpretar a solicitacao como missao pedagogica.",
        "Organizar contexto, objetivo, restricoes e produto esperado antes da geracao."
      ],
      recommendations: [
        "Manter linguagem clara para o professor e material reutilizavel."
      ],
      constraints: ["Nao responder como chatbot direto."],
      confidence: 0.86,
      warnings: []
    },
    {
      knowledgeId: "dua",
      knowledgeVersion: "0.1.0",
      knowledgeType: "PROTOCOL",
      appliedCriteria: [
        "Oferecer multiplas formas de acesso, participacao e expressao.",
        "Prever apoio visual, concreto, tecnologico ou multissensorial quando pertinente."
      ],
      recommendations: [
        "Usar comandos objetivos, pistas visuais e avaliacao formativa."
      ],
      constraints: ["Nao reduzir expectativa pedagogica por causa da necessidade especifica."],
      confidence: 0.84,
      warnings: []
    },
    {
      knowledgeId: "lgpd-educacional",
      knowledgeVersion: "0.1.0",
      knowledgeType: "LEGISLATION",
      appliedCriteria: [
        "Usar apenas dados pedagogicos necessarios.",
        "Evitar exposicao de dados sensiveis ou perfil medico."
      ],
      recommendations: [
        "Revisar qualquer informacao identificavel antes de compartilhar o material."
      ],
      constraints: ["Nao registrar diagnosticos alem do necessario para adaptacao pedagogica."],
      confidence: 0.82,
      warnings: []
    }
  ];
}

function validateMission(request: CreateMissionRequest): void {
  if (!request.userId || !request.organizationId || !request.missionType) {
    throw new Error("userId, organizationId e missionType sao obrigatorios.");
  }

  if (!["CREATE_LESSON_PLAN", "ADAPT_ACTIVITY"].includes(request.missionType)) {
    throw new Error("missionType nao suportado no MVP.");
  }

  if (!request.input || typeof request.input !== "object") {
    throw new Error("input da missao e obrigatorio.");
  }

  if (
    !request.input.rawPrompt &&
    !request.input.theme &&
    !request.input.lessonObjective &&
    !request.input.originalContent
  ) {
    throw new Error("Descreva em uma frase o recurso pedagogico que deseja criar.");
  }
}

function buildGeneratedFallbacks(request: CreateMissionRequest): {
  lessonFlow: string[];
  adaptedActivities: string[];
  accessibilitySupports: string[];
  assessment: string[];
  teacherReport: string[];
  reuseSuggestions: string[];
} {
  const input = request.input;
  const theme = input.theme ?? input.knowledgeObject ?? input.rawPrompt ?? "tema informado";
  const need = input.specificNeed ?? "necessidade pedagogica informada";
  const resources = input.availableResources?.join(", ") || "recursos disponiveis";

  return {
    lessonFlow: [
      `Acolhida e ativacao de conhecimentos previos sobre ${theme} com apoio visual ou concreto.`,
      "Apresentacao do objetivo da aula em linguagem simples, com exemplo modelado pelo professor.",
      "Exploracao guiada do conteudo com participacao oral, visual e pratica.",
      "Atividade adaptada individual ou em dupla, com mediacao e pistas graduadas.",
      "Fechamento com socializacao da aprendizagem e registro de evidencias observaveis."
    ],
    adaptedActivities: [
      `Selecionar imagens, palavras-chave ou exemplos concretos relacionados a ${theme}.`,
      "Parear informacoes, imagens e comandos curtos para reduzir carga de leitura sem reduzir o objetivo pedagogico.",
      "Responder oralmente, apontando, marcando alternativas ou organizando cartoes, conforme a forma de expressao mais acessivel.",
      `Produzir um pequeno registro final usando ${resources}.`
    ],
    accessibilitySupports: [
      `Adequar comandos, tempo, mediacao e recursos considerando ${need}.`,
      "Usar fonte legivel, bom contraste, pistas visuais e organizacao por etapas.",
      "Oferecer exemplo pronto antes da producao independente.",
      "Permitir resposta oral, visual, escrita, manipulativa ou digital."
    ],
    assessment: [
      "Observar participacao, compreensao dos comandos e necessidade de apoio durante a atividade.",
      "Registrar evidencias de aprendizagem por checklist simples.",
      "Comparar o desempenho com o objetivo da aula, nao com padrao unico da turma.",
      "Usar feedback imediato, objetivo e formativo."
    ],
    teacherReport: [
      `O material foi organizado para favorecer acesso ao tema ${theme} com foco pedagogico e acessibilidade.`,
      `As adaptacoes consideram ${need} sem transformar a proposta em perfil medico.`,
      "A avaliacao prioriza evidencias de aprendizagem, participacao e autonomia progressiva.",
      "O recurso pode ser revisado e reutilizado em novas turmas ou contextos."
    ],
    reuseSuggestions: [
      "Salvar o recurso como modelo para atividades com objetivos semelhantes.",
      "Alterar disciplina, habilidade ou tema mantendo a estrutura de acessibilidade.",
      "Registrar quais apoios funcionaram melhor para qualificar futuras versoes.",
      "Reutilizar as tags pedagogicas e de acessibilidade no Banco Inteligente."
    ]
  };
}

async function readStore(): Promise<DemoDatabase> {
  if (globalStore.acessaPlusDemoStore) {
    return globalStore.acessaPlusDemoStore;
  }

  try {
    const parsed = JSON.parse(await readFile(storePath, "utf8")) as DemoDatabase;
    globalStore.acessaPlusDemoStore = parsed;

    return parsed;
  } catch {
    const empty = { missions: [], resources: [] };

    globalStore.acessaPlusDemoStore = empty;
    return empty;
  }
}

async function writeStore(db: DemoDatabase): Promise<void> {
  globalStore.acessaPlusDemoStore = db;

  try {
    await mkdir(dirname(storePath), { recursive: true });
    await writeFile(storePath, JSON.stringify(db), "utf8");
  } catch {
    // Vercel serverless storage is ephemeral; memory still keeps the demo flow alive.
  }
}

function buildMetadata(
  request: CreateMissionRequest,
  context: ResolvedContext,
  decision: DecisionResult,
  plan: PedagogicalPlan
): ResourceMetadata {
  const input = request.input;
  const discipline = normalizeText(input.discipline ?? input.subject);
  const gradeYear = normalizeText(input.gradeYear ?? input.yearGrade);
  const skill = normalizeText(input.skill);
  const knowledgeObject = normalizeText(input.knowledgeObject);
  const theme = normalizeText(input.theme);
  const specificNeed = normalizeText(input.specificNeed);
  const adaptationTarget = normalizeText(input.adaptationProfile?.targetAudience);
  const learningPreference = normalizeText(input.learningPreference);
  const readingWritingLevel = normalizeText(input.readingWritingLevel);
  const expectedProductType = normalizeText(input.expectedProductType);
  const activityType = normalizeText(input.activityType);
  const questionCount = normalizeText(input.questionCount);
  const difficultyLevel = normalizeText(input.difficultyLevel);
  const outputFormat = normalizeText(input.outputFormat);
  const learningLevel = normalizeText(input.learningLevel ?? input.readingWritingLevel);

  return {
    missionType: request.missionType,
    discipline,
    gradeYear,
    skill,
    knowledgeObject,
    theme,
    specificNeed: specificNeed ?? adaptationTarget,
    learningPreference,
    readingWritingLevel,
    expectedProductType,
    activityType,
    questionCount,
    difficultyLevel,
    outputFormat,
    learningLevel,
    pedagogicalTags: uniqueTags([
      tag("disciplina", discipline),
      tag("serie", gradeYear),
      tag("habilidade", skill),
      tag("objeto", knowledgeObject),
      tag("tema", theme),
      tag("tipo", activityType),
      tag("dificuldade", difficultyLevel),
      tag("produto", expectedProductType)
    ]),
    accessibilityTags: uniqueTags([
      tag("necessidade", specificNeed),
      tag("perfil-adaptacao", adaptationTarget),
      tag("leitura-escrita", readingWritingLevel),
      tag("preferencia", learningPreference?.split(/[,.]/)[0]?.trim())
    ]),
    context,
    decision,
    knowledgeApplications: plan.protocolApplications,
    source: "next-api-demo"
  };
}

function buildContentText(
  request: CreateMissionRequest,
  context: ResolvedContext,
  plan: PedagogicalPlan & Record<string, unknown>
): string {
  const input = request.input;
  const lines = [
    `Pedido natural: ${input.rawPrompt ?? ""}`,
    `Missao: ${request.missionType}`,
    `Disciplina: ${input.discipline ?? input.subject ?? ""}`,
    `Serie/ano: ${input.gradeYear ?? input.yearGrade ?? ""}`,
    `Habilidade: ${input.skill ?? ""}`,
    `Objeto de conhecimento: ${input.knowledgeObject ?? ""}`,
    `Tema: ${input.theme ?? ""}`,
    `Objetivo: ${plan.objectives.join("; ")}`,
    `Necessidade especifica: ${input.specificNeed ?? ""}`,
    `Perfil Inteligente de Adaptacao: ${buildAdaptationProfileText(input)}`,
    `Como aprende melhor: ${input.learningPreference ?? ""}`,
    `Nivel de leitura/escrita: ${input.readingWritingLevel ?? ""}`,
    `Recursos disponiveis: ${input.availableResources?.join(", ") ?? ""}`,
    `Tipo de atividade: ${input.activityType ?? ""}`,
    `Quantidade de questoes: ${input.questionCount ?? ""}`,
    `Nivel de dificuldade: ${input.difficultyLevel ?? ""}`,
    `Formato: ${input.outputFormat ?? ""}`,
    `Produto esperado: ${plan.expectedOutputs.join("; ")}`,
    `Titulo da atividade: ${normalizeString(plan.worksheetTitle, "")}`,
    `Disciplina inferida: ${normalizeString(plan.subject, "")}`,
    `Ano/serie inferido: ${normalizeString(plan.grade, "")}`,
    `Objetivo de aprendizagem: ${normalizeString(plan.learningObjective, "")}`,
    `Contexto: ${normalizeString(plan.context, "")}`,
    `Texto-base: ${normalizeString(plan.baseText, "")}`,
    `Quadros de apoio: ${normalizeStringArray(plan.didacticBoxes, []).join("; ")}`,
    `Tabela: ${normalizeStringArray(plan.tableRows, []).join("; ")}`,
    `Organizadores graficos: ${normalizeStringArray(plan.graphicOrganizers, []).join("; ")}`,
    `Progressao: ${normalizeStringArray(plan.difficultyProgression, []).join("; ")}`,
    `Questoes: ${normalizeQuestions(plan.questions, request)
      .map((question) => question.command)
      .join("; ")}`,
    `Completude do contexto: ${context.completeness}`,
    `Restricoes: ${plan.methodologicalConstraints.join("; ")}`,
    `Validacao: ${plan.validationCriteria.join("; ")}`,
    `Atividades: ${normalizeStringArray(plan.adaptedActivities, []).join("; ")}`,
    `Relatorio: ${normalizeStringArray(plan.teacherReport, []).join("; ")}`
  ];

  return lines.filter((line) => !line.endsWith(": ")).join("\n");
}

function buildVersionText(contentJson: Record<string, unknown>): string {
  return [
    `Titulo: ${normalizeString(contentJson.worksheetTitle, "")}`,
    `Habilidade: ${normalizeString(contentJson.skillCode, "")}`,
    `Texto-base: ${normalizeString(contentJson.baseText, "")}`,
    `Questoes: ${normalizeQuestions(contentJson.questions, undefined)
      .map((question) => question.command)
      .join("; ")}`,
    `Objetivo: ${normalizeStringArray(contentJson.objectives, []).join("; ")}`,
    `Produto esperado: ${normalizeStringArray(contentJson.expectedOutputs, []).join("; ")}`,
    `Restricoes: ${normalizeStringArray(contentJson.methodologicalConstraints, []).join("; ")}`,
    `Validacao: ${normalizeStringArray(contentJson.validationCriteria, []).join("; ")}`
  ]
    .filter((line) => !line.endsWith(": "))
    .join("\n");
}

function resolveTitle(request: CreateMissionRequest): string {
  const prefix =
    request.missionType === "ADAPT_ACTIVITY"
      ? "Atividade adaptada"
      : "Atividade pronta para impressao";

  return request.input.theme ? `${prefix}: ${request.input.theme}` : prefix;
}

function normalizeQuestions(
  value: unknown,
  request: CreateMissionRequest | undefined
): Array<{ command: string; support?: string; answerSpace?: string }> {
  if (Array.isArray(value)) {
    const questions: Array<{
      command: string;
      support?: string;
      answerSpace?: string;
    }> = [];

    for (const item of value) {
      if (typeof item === "string" && item.trim()) {
        questions.push({ command: item.trim() });
        continue;
      }

      if (isRecord(item)) {
        const command = normalizeString(item.command, "");

        if (command) {
          questions.push({
            command,
            support: normalizeString(item.support, ""),
            answerSpace: normalizeString(item.answerSpace, "")
          });
        }
      }
    }

    if (questions.length > 0) {
      return questions;
    }
  }

  const input = request?.input;
  const count = Math.min(
    Math.max(Number.parseInt(input?.questionCount ?? "5", 10) || 5, 1),
    10
  );
  const theme = input?.theme ?? input?.knowledgeObject ?? "conteudo estudado";
  const subject = normalizeComparable(input?.discipline ?? input?.subject);
  const commands = buildFallbackQuestionCommands(theme, subject);

  return Array.from({ length: count }, (_, index) => {
    const command =
      commands[index % commands.length] ??
      `Observe os apoios visuais sobre ${theme} e responda no espaco indicado.`;

    return {
      command,
      support:
        index === 0
          ? "Observe o exemplo, os recursos visuais e leia o comando com atencao."
          : index === 1
            ? "Use o quadro de apoio para organizar sua resposta."
            : "Responda no espaco indicado.",
      answerSpace: "duas linhas"
    };
  });
}

function buildFallbackQuestionCommands(theme: string, subject: string): string[] {
  const normalizedTheme = normalizeComparable(theme);

  if (subject.includes("matematica") || normalizedTheme.includes("equacao")) {
    return [
      `Observe a balanca visual sobre ${theme} e marque qual ideia ela representa.`,
      `Resolva uma situacao simples envolvendo ${theme} usando o exemplo como apoio.`,
      "Complete a tabela com uma informacao, uma estrategia e uma resposta.",
      "Explique, com suas palavras ou desenho, como encontrou a resposta.",
      "Crie uma situacao parecida e registre no espaco indicado."
    ];
  }

  if (subject.includes("ciencia")) {
    return [
      `Observe o esquema visual sobre ${theme} e identifique os elementos principais.`,
      "Complete o quadro comparando duas ideias do tema.",
      "Marque a alternativa que melhor explica o fenomeno apresentado.",
      "Organize uma sequencia com inicio, desenvolvimento e resultado.",
      "Desenhe ou escreva uma conclusao sobre o que aprendeu."
    ];
  }

  if (subject.includes("historia") || subject.includes("geografia")) {
    return [
      `Observe o mapa, linha do tempo ou esquema sobre ${theme} e localize a informacao principal.`,
      "Complete o quadro com uma causa, uma caracteristica e uma consequencia.",
      "Relacione cada informacao ao contexto correto.",
      "Explique uma mudanca ou permanencia ligada ao tema.",
      "Registre uma conclusao usando palavras, desenho ou marcacao."
    ];
  }

  if (subject.includes("portugues") || subject.includes("lingua")) {
    return [
      `Leia o texto de apoio sobre ${theme} e circule a ideia principal.`,
      "Marque a opcao que melhor responde ao comando.",
      "Complete a frase usando uma informacao do texto.",
      "Organize as cenas ou ideias na ordem correta.",
      "Escreva ou desenhe uma resposta curta sobre o tema."
    ];
  }

  return [
    `Observe os apoios visuais sobre ${theme} e identifique a informacao principal.`,
    "Complete o quadro com uma ideia importante e uma resposta.",
    "Marque a alternativa que combina com o que foi estudado.",
    "Explique com palavras, desenho ou marcacao o que voce entendeu.",
    "Crie uma resposta final usando o espaco indicado."
  ];
}

function buildStudentSheet(
  generated: Record<string, unknown>,
  request: CreateMissionRequest
): Record<string, unknown> {
  const source = isRecord(generated.studentSheet) ? generated.studentSheet : {};

  return {
    title: normalizeString(
      source.title,
      normalizeString(
        generated.worksheetTitle,
        `Atividade: ${request.input.theme ?? request.input.knowledgeObject ?? "conteudo"}`
      )
    ),
    context: normalizeString(
      source.context,
      normalizeString(
        generated.context,
        "Leia as informacoes, observe os apoios visuais e realize as atividades com atencao."
      )
    ),
    instructions: normalizeStringArray(source.instructions, [
      "Leia cada comando com atencao.",
      "Responda nos espacos indicados."
    ]),
    baseText: normalizeString(source.baseText, normalizeString(generated.baseText, "")),
    didacticBoxes: normalizeStringArray(
      source.didacticBoxes,
      normalizeStringArray(generated.didacticBoxes, [
        "Use o exemplo e as pistas visuais para ajudar na resposta."
      ])
    ),
    visualElements: normalizeStringArray(
      source.visualElements,
      normalizeStringArray(generated.visualElements, buildFallbackVisualElements(request))
    ),
    tableRows: normalizeStringArray(
      source.tableRows,
      normalizeStringArray(generated.tableRows, [
        "Informacao principal | Ideia importante | Minha resposta"
      ])
    ),
    questions: normalizeQuestions(source.questions ?? generated.questions, request)
  };
}

function buildFallbackVisualElements(request: CreateMissionRequest): string[] {
  const input = request.input;
  const source = normalizeComparable(
    `${input.discipline ?? input.subject ?? ""} ${input.theme ?? input.knowledgeObject ?? ""}`
  );

  if (source.includes("matematica") || source.includes("equacao")) {
    return ["balanca de equacao", "reta numerica", "tabela simples", "blocos de contagem"];
  }

  if (source.includes("ciencia") || source.includes("ecossistema")) {
    return ["ciclo com setas", "tabela comparativa", "organizador visual", "esquema de relacoes"];
  }

  if (source.includes("historia")) {
    return ["linha do tempo", "tabela comparativa", "personagem lendo", "organizador visual"];
  }

  if (source.includes("geografia")) {
    return ["mapa simples", "tabela comparativa", "organizador visual", "setas de localizacao"];
  }

  if (source.includes("portugues") || source.includes("lingua")) {
    return ["personagem lendo", "sequencia de cenas", "cartoes visuais", "organizador visual"];
  }

  if (source.includes("caa")) {
    return ["cartoes CAA", "pictogramas em grade", "cartoes visuais"];
  }

  return ["organizador visual", "tabela simples", "cartoes visuais", "exemplo resolvido"];
}

function buildTeacherGuide(
  generated: Record<string, unknown>,
  request: CreateMissionRequest
): Record<string, unknown> {
  const source = isRecord(generated.teacherGuide) ? generated.teacherGuide : {};
  const curricularAnalysis = normalizeStringArray(
    source.curricularAnalysis,
    buildCurricularAnalysis(generated, request)
  );

  return {
    skillCode: normalizeString(source.skillCode, normalizeString(generated.skillCode, request.input.skill ?? "")),
    knowledgeObject: normalizeString(source.knowledgeObject, request.input.knowledgeObject ?? ""),
    curricularAnalysis,
    objectives: normalizeStringArray(
      source.objectives,
      normalizeStringArray(generated.objectives, [
        request.input.lessonObjective ??
          request.input.objective ??
          "Promover a aprendizagem prevista no recurso."
      ])
    ),
    methodology: normalizeStringArray(
      source.methodology,
      normalizeStringArray(generated.methodologyTips, [
        "Apresentar a atividade, mediar a leitura dos comandos e acompanhar as respostas."
      ])
    ),
    adaptations: buildAdaptationNotes(generated.adaptationNotes, request),
    duaPrinciples: normalizeStringArray(source.duaPrinciples, [
      "Oferecer multiplas formas de acesso, participacao e expressao.",
      "Usar apoios visuais, organizacao clara e formas alternativas de resposta quando necessario."
    ]),
    assessmentCriteria: normalizeStringArray(
      source.assessmentCriteria,
      normalizeStringArray(generated.validationCriteria, [
        "Confirmar se a resposta do estudante evidencia a competencia exigida pela habilidade curricular.",
        "Observar compreensao dos comandos, participacao e evidencias de aprendizagem."
      ])
    ),
    applicationSuggestions: normalizeStringArray(
      source.applicationSuggestions,
      normalizeStringArray(generated.reuseSuggestions, [
        "Aplicar com mediacao proporcional ao perfil do estudante e registrar apoios que funcionaram."
      ])
    )
  };
}

function buildCurricularAnalysis(
  generated: Record<string, unknown>,
  request: CreateMissionRequest
): string[] {
  const input = request.input;
  const skill = normalizeString(generated.skillCode, input.skill ?? "");
  const knowledgeObject = normalizeString(
    generated.knowledgeObject,
    input.knowledgeObject ?? input.theme ?? ""
  );
  const learningObjective = normalizeString(
    generated.learningObjective,
    input.lessonObjective ?? input.objective ?? ""
  );
  const generatedAnalysis = normalizeStringArray(generated.curricularAnalysis, []);

  return [
    ...generatedAnalysis,
    skill
      ? `Habilidade curricular analisada como fonte principal: ${skill}.`
      : "Habilidade curricular nao informada; a atividade deve explicitar competencia curricular antes de uso oficial.",
    knowledgeObject
      ? `Objeto de conhecimento considerado: ${knowledgeObject}.`
      : "Objeto de conhecimento nao informado; usar o tema apenas como contexto, nao como substituto da competencia.",
    learningObjective
      ? `Competencia esperada: ${learningObjective}.`
      : "Competencia esperada inferida a partir da solicitacao do professor.",
    "As questoes devem exigir evidencia observavel da habilidade, nao apenas repetir palavras-chave do tema.",
    "Se uma tarefa nao avaliar diretamente a competencia curricular, ela deve ser descartada e reconstruida antes da entrega."
  ];
}

function buildAdaptationNotes(
  generatedValue: unknown,
  request: CreateMissionRequest
): string[] {
  const generatedNotes = normalizeStringArray(generatedValue, []);

  if (!request.input.specificNeed && !request.input.adaptationProfile?.enabled) {
    return generatedNotes;
  }

  return [
    `Adaptacao pedagogica aplicada: ${buildAdaptationProfileText(request.input)}.`,
    ...generatedNotes,
    ...(generatedNotes.length === 0
      ? ["Comandos objetivos, organizacao visual e espacos amplos para resposta."]
      : [])
  ];
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return normalized.length > 0 ? normalized : fallback;
}

function matches(value: string | undefined, filter: string | undefined): boolean {
  return filter
    ? normalizeComparable(value).includes(normalizeComparable(filter))
    : true;
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ");

  return normalized ? normalized : undefined;
}

function normalizeComparable(value: string | undefined): string {
  return normalizeText(value)
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR") ?? "";
}

function tag(prefix: string, value: string | undefined): string | undefined {
  return value ? `${prefix}:${normalizeComparable(value)}` : undefined;
}

function uniqueTags(tags: Array<string | undefined>): string[] {
  return [...new Set(tags.filter((item): item is string => Boolean(item)))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
