import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
      "Verificar alinhamento ao objetivo da aula.",
      "Verificar acessibilidade, clareza dos comandos e evidencias de aprendizagem.",
      "Evitar dados sensiveis ou diagnosticos alem do necessario pedagogicamente."
    ]),
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
  const apiKey = process.env.OPENAI_API_KEY;
  const adaptationProfile = buildAdaptationProfileText(request.input);

  if (!apiKey) {
    throw new Error(
      "Chave do provedor de IA nao configurada. Configure a variavel de ambiente na publicacao para gerar materiais."
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Voce e o Motor Pedagogico do ACESSA+. Interprete solicitacoes em linguagem natural e transforme uma frase do professor em recurso pedagogico completo, profissional e pronto para uso. Gere sempre dois documentos separados: studentSheet e teacherGuide. A studentSheet e a folha do estudante, A4 pronta para impressao, com aparencia de material de editora educacional. Ela deve conter somente conteudo destinado ao estudante: titulo, contexto, instrucoes, texto-base quando util, quadros de apoio, tabela ou organizador visual, elementos visuais descritos, atividades variadas e questoes com espaco de resposta. Nunca inclua na studentSheet: objetivo da aula, metodologia, adaptacao pedagogica aplicada, criterios de avaliacao, orientacoes ao professor, BNCC, habilidade, objeto de conhecimento ou informacao tecnica. O teacherGuide e separado e contem habilidade BNCC, objeto de conhecimento, objetivos, metodologia, adaptacoes realizadas, principios do DUA, orientacoes pedagogicas, criterios de avaliacao e sugestoes de aplicacao. O ACESSA+ nao gera texto solto: gera recurso pedagogico completo. Inferir disciplina, ano, habilidade, objetivo e necessidade quando estiverem implicitos; se faltar algo, use uma formulacao pedagogica generica em vez de bloquear a geracao. Nao inclua nome de aluno, escola, data, professor ou turma. Responda somente JSON valido, sem markdown."
        },
        {
          role: "user",
          content: JSON.stringify({
            tarefa:
              "Gerar o recurso educacional solicitado pelo professor em dois documentos separados. O documento principal deve ser a folha do estudante, sem informacoes tecnicas. O guia do professor deve conter as informacoes pedagogicas e tecnicas separadamente.",
            perfilInteligenteDeAdaptacao: adaptationProfile,
            regrasDeAdaptacao: [
              "Preservar sempre o objetivo de aprendizagem e a habilidade curricular.",
              "Para Deficiencia Intelectual: linguagem simples, frases curtas, apoio visual, exemplo resolvido, progressao de dificuldade e poucos comandos por vez.",
              "Para TEA: rotina visual, previsibilidade, instrucoes objetivas, organizacao por etapas e reducao de ambiguidades.",
              "Para Deficiencia Visual: fonte ampliada, alto contraste, descricao textual, imagens ampliadas e preparacao para material tatil ou Braille quando solicitado.",
              "Para Deficiencia Auditiva ou Libras: linguagem visual, comandos objetivos, apoio por imagens e Libras apenas quando houver seguranca.",
              "Para TDAH: comandos curtos, organizacao em blocos, foco visual, atividades rapidas e progressivas.",
              "Para Altas Habilidades/Superdotacao: desafios adicionais, investigacao, criacao, autonomia e aprofundamento.",
              "Para CAA: comandos simples, pictogramas descritos, escolhas por marcacao e formas alternativas de resposta."
            ],
            contrato: {
              studentSheet: {
                title: "titulo para o estudante, sem codigo BNCC",
                context: "contexto curto para o estudante",
                instructions: "array de instrucoes para o estudante",
                baseText: "texto-base quando necessario",
                didacticBoxes: "array de quadros de apoio para o estudante",
                visualElements: "array de elementos visuais para a folha",
                tableRows: "array no formato coluna1 | coluna2 | coluna3",
                questions: "array de objetos { command, support, answerSpace } para o estudante"
              },
              teacherGuide: {
                skillCode: "habilidade BNCC ou curricular",
                knowledgeObject: "objeto de conhecimento",
                objectives: "array de objetivos pedagogicos",
                methodology: "array de orientacoes metodologicas",
                adaptations: "array de adaptacoes realizadas",
                duaPrinciples: "array de principios do DUA aplicados",
                assessmentCriteria: "array de criterios de avaliacao",
                applicationSuggestions: "array de sugestoes de aplicacao"
              },
              subject: "string com disciplina ou area do conhecimento inferida",
              grade: "string com ano/serie quando informado ou inferido",
              worksheetTitle: "string com titulo da atividade",
              skillCode: "string com codigo/texto da habilidade",
              learningObjective: "string com objetivo de aprendizagem",
              context: "string com contexto pedagogico inicial da atividade",
              baseText: "string com texto-base curto quando necessario",
              instructions: "array de strings com instrucoes claras para estudante",
              questions: "array de objetos { command, support, answerSpace } com atividades variadas, progressivas e espaco de resposta",
              visualElements: "array de strings descrevendo icones, imagens, marcadores ou recursos visuais simples",
              didacticBoxes: "array de strings com quadros de apoio, lembretes ou conceitos-chave",
              tableRows: "array de strings no formato coluna1 | coluna2 | coluna3 para montar tabela pedagogica",
              graphicOrganizers: "array de strings com organizadores graficos sugeridos",
              methodologyTips: "array de strings com orientacoes objetivas para o professor",
              difficultyProgression: "array de strings descrevendo progressao de dificuldade",
              adaptationNotes: "array de strings explicando adaptacoes aplicadas",
              answerKey: "array de strings com gabarito ou criterios para professor",
              objectives: "array de strings",
              expectedOutputs: "array de strings",
              methodologicalConstraints: "array de strings",
              validationCriteria: "array de strings",
              warnings: "array de strings",
              lessonFlow: "array de strings",
              adaptedActivities: "array de strings",
              accessibilitySupports: "array de strings",
              assessment: "array de strings",
              teacherReport: "array de strings",
              reuseSuggestions: "array de strings"
            },
            pedidoNatural: request.input.rawPrompt,
            mission: request,
            context,
            decision
          })
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(`O provedor de IA retornou erro ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as { output_text?: string; output?: unknown };
  const outputText = payload.output_text ?? extractOutputText(payload.output);

  if (!outputText) {
    throw new Error("O provedor de IA nao retornou um recurso estruturado.");
  }

  return parseJsonObject(outputText);
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

  return Array.from({ length: count }, (_, index) => ({
    command: `Resolva a questao sobre ${theme}.`,
    support:
      index === 0
        ? "Observe as pistas visuais e leia o comando com atencao."
        : "Responda no espaco indicado.",
    answerSpace: "duas linhas"
  }));
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
      normalizeStringArray(generated.visualElements, [])
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

function buildTeacherGuide(
  generated: Record<string, unknown>,
  request: CreateMissionRequest
): Record<string, unknown> {
  const source = isRecord(generated.teacherGuide) ? generated.teacherGuide : {};

  return {
    skillCode: normalizeString(source.skillCode, normalizeString(generated.skillCode, request.input.skill ?? "")),
    knowledgeObject: normalizeString(source.knowledgeObject, request.input.knowledgeObject ?? ""),
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

function buildAdaptationProfileText(input: CreateMissionRequest["input"]): string {
  const profile = input.adaptationProfile;

  if (!profile?.enabled) {
    return "sem adaptacao especifica selecionada";
  }

  return [
    `publico-alvo/necessidade especifica: ${profile.targetAudience ?? input.specificNeed ?? "nao informado"}`,
    `perfil de aprendizagem: ${profile.learningProfile ?? input.readingWritingLevel ?? "nao informado"}`,
    `apoios necessarios: ${profile.supports?.join(", ") || "nao informados"}`
  ].join("; ");
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

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("A resposta do provedor de IA nao retornou um objeto estruturado.");
  }

  return parsed as Record<string, unknown>;
}

function extractOutputText(output: unknown): string | undefined {
  if (!Array.isArray(output)) {
    return undefined;
  }

  return output
    .flatMap((item) =>
      isRecord(item) && Array.isArray(item.content) ? item.content : []
    )
    .map((content) =>
      isRecord(content) && typeof content.text === "string" ? content.text : ""
    )
    .filter(Boolean)
    .join("\n");
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
