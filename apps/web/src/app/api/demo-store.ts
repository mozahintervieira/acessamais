import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Prisma } from "@acessa-plus/database";
import { generateJsonWithConfiguredProvider } from "@acessa-plus/ai-core";
import {
  buildAdaptationProfileText,
  buildMaterialBlueprint,
  type ActivityActionType,
  type MaterialBlueprint,
  type PlannedTask,
  PedagogicalValidator,
  type PedagogicalValidationReport,
  buildPedagogicalGenerationPrompt,
  RegenerationPolicy,
  selectRegenerationOutput,
  type PedagogicalCorrectionPrompt
} from "@acessa-plus/pedagogical-core";
import { getPrisma, hasDatabaseUrl } from "../server/db";
import { recordUsageEvent } from "../server/usage-events";
import type {
  CreateMissionRequest,
  DecisionResult,
  KnowledgeApplicationResult,
  MissionType,
  PedagogicalPlan,
  ResolvedContext
} from "@acessa-plus/types";

type MissionStatus = "COMPLETED" | "NEEDS_REVIEW";

const INTERNAL_PEDAGOGICAL_VALIDATION = Symbol(
  "acessa-plus.internal-pedagogical-validation"
);

type InternallyValidatedGeneration = Record<string, unknown> & {
  [INTERNAL_PEDAGOGICAL_VALIDATION]?: InternalPedagogicalValidationState;
};

type InternalPedagogicalValidationAttempt = {
  attempt: number;
  report: PedagogicalValidationReport;
  correctionApplied: boolean;
};

type InternalPedagogicalValidationState = {
  attempts: InternalPedagogicalValidationAttempt[];
  selectedAttempt: number;
  belowStandard: boolean;
};

type ResourceMetadata = {
  missionType?: string;
  discipline?: string;
  gradeYear?: string;
  skill?: string;
  knowledgeObject?: string;
  curriculumReference?: string;
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
  if (hasDatabaseUrl()) {
    await writeMissionToPrisma(mission, resource, version);
  } else {
    const db = await readStore();

    db.missions.unshift(mission);
    db.resources.unshift(resource);
    await writeStore(db);
  }

  await recordUsageEvent({
    userId: request.userId,
    eventType: "MATERIAL_GENERATED",
    resourceId,
    metadata: {
      missionType: request.missionType,
      discipline: request.input.discipline,
      gradeYear: request.input.gradeYear
    }
  });
  await recordUsageEvent({
    userId: request.userId,
    eventType: "MATERIAL_SAVED",
    resourceId
  });

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

export async function listMissions(organizationId: string, userId?: string) {
  if (hasDatabaseUrl()) {
    const missions = await getPrisma().mission.findMany({
      where: {
        organizationId,
        ...(userId ? { createdByUserId: userId } : {})
      },
      include: { resources: true },
      orderBy: { createdAt: "desc" }
    });

    return missions.map((mission) => ({
      id: mission.id,
      missionType: mission.type,
      status: mission.status === "COMPLETED" ? "COMPLETED" : mission.status,
      title: mission.resources[0]?.title ?? "Missao sem recurso",
      resourceId: mission.resources[0]?.id,
      createdAt: mission.createdAt.toISOString()
    }));
  }

  const db = await readStore();

  return db.missions
    .filter((mission) => mission.organizationId === organizationId)
    .filter((mission) => (userId ? mission.createdByUserId === userId : true))
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
  missionId: string,
  userId?: string
) {
  if (hasDatabaseUrl()) {
    const mission = await getPrisma().mission.findFirst({
      where: {
        id: missionId,
        organizationId,
        ...(userId ? { createdByUserId: userId } : {})
      },
      include: {
        resources: {
          include: {
            versions: {
              orderBy: { versionNumber: "desc" }
            }
          }
        }
      }
    });

    if (!mission) {
      return null;
    }

    if (userId) {
      await recordUsageEvent({
        userId,
        eventType: "MATERIAL_OPENED",
        resourceId: mission.resources[0]?.id
      });
    }

    return {
      id: mission.id,
      organizationId: mission.organizationId,
      createdByUserId: mission.createdByUserId,
      missionType: mission.type,
      status: mission.status,
      input: mission.input,
      createdAt: mission.createdAt.toISOString(),
      resources: mission.resources.map((resource) => ({
        id: resource.id,
        type: resource.type,
        title: resource.title,
        status: resource.status,
        metadata: resource.metadata,
        versions: resource.versions.map((version) => ({
          id: version.id,
          resourceId: version.resourceId,
          versionNumber: version.versionNumber,
          contentJson: version.contentJson,
          contentText: version.contentText,
          validationStatus: version.validationStatus,
          createdAt: version.createdAt.toISOString()
        }))
      }))
    };
  }

  const db = await readStore();
  const mission = db.missions.find(
    (item) =>
      item.id === missionId &&
      item.organizationId === organizationId &&
      (userId ? item.createdByUserId === userId : true)
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
  userId?: string;
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
  if (hasDatabaseUrl()) {
    const resources = await getPrisma().resource.findMany({
      where: {
        organizationId: input.organizationId,
        ...(input.userId ? { createdByUserId: input.userId } : {})
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return resources
      .map((resource) => ({
        id: resource.id,
        missionId: resource.missionId ?? undefined,
        type: resource.type,
        title: resource.title,
        status: resource.status,
        metadata: resource.metadata as ResourceMetadata,
        latestVersion: resource.versions[0]
          ? {
              id: resource.versions[0].id,
              resourceId: resource.versions[0].resourceId,
              versionNumber: resource.versions[0].versionNumber,
              contentJson: resource.versions[0].contentJson as Record<string, unknown>,
              contentText: resource.versions[0].contentText,
              validationStatus: "PENDING" as const,
              createdAt: resource.versions[0].createdAt.toISOString()
            }
          : undefined,
        createdAt: resource.createdAt.toISOString()
      }))
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
          ? normalizeComparable(resource.latestVersion?.contentText).includes(
              normalizeComparable(input.q)
            )
          : true
      );
  }

  const db = await readStore();

  return db.resources
    .filter((resource) => resource.organizationId === input.organizationId)
    .filter((resource) => (input.userId ? resource.createdByUserId === input.userId : true))
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

export async function listVersions(organizationId: string, resourceId: string, userId?: string) {
  const resource = await findResource(organizationId, resourceId, userId);

  return resource
    ? [...resource.versions].sort(
        (left, right) => right.versionNumber - left.versionNumber
      )
    : [];
}

export async function createVersion(input: {
  organizationId: string;
  userId?: string;
  resourceId: string;
  contentJson: Record<string, unknown>;
  contentText?: string;
}) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const resource = await prisma.resource.findFirst({
      where: {
        id: input.resourceId,
        organizationId: input.organizationId,
        ...(input.userId ? { createdByUserId: input.userId } : {})
      },
      include: { versions: true }
    });

    if (!resource) {
      return null;
    }

    const latestNumber = resource.versions.reduce(
      (latest, version) => Math.max(latest, version.versionNumber),
      0
    );
    const version = await prisma.resourceVersion.create({
      data: {
        resourceId: resource.id,
        versionNumber: latestNumber + 1,
        contentJson: toPrismaJson(input.contentJson),
        contentText: input.contentText?.trim() || buildVersionText(input.contentJson),
        validationStatus: "PENDING"
      }
    });

    await prisma.resource.update({
      where: { id: resource.id },
      data: { updatedAt: new Date() }
    });

    if (input.userId) {
      await recordUsageEvent({
        userId: input.userId,
        eventType: "MATERIAL_SAVED",
        resourceId: resource.id
      });
    }

    return {
      id: version.id,
      resourceId: version.resourceId,
      versionNumber: version.versionNumber,
      contentJson: version.contentJson,
      contentText: version.contentText,
      validationStatus: "PENDING",
      createdAt: version.createdAt.toISOString()
    };
  }

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

async function findResource(organizationId: string, resourceId: string, userId?: string) {
  if (hasDatabaseUrl()) {
    const resource = await getPrisma().resource.findFirst({
      where: {
        id: resourceId,
        organizationId,
        ...(userId ? { createdByUserId: userId } : {})
      },
      include: { versions: true }
    });

    return resource
      ? {
          ...resource,
          missionId: resource.missionId ?? undefined,
          type: resource.type as Resource["type"],
          status: resource.status as Resource["status"],
          metadata: resource.metadata as ResourceMetadata,
          createdAt: resource.createdAt.toISOString(),
          updatedAt: resource.updatedAt.toISOString(),
          versions: resource.versions.map((version) => ({
            id: version.id,
            resourceId: version.resourceId,
            versionNumber: version.versionNumber,
            contentJson: version.contentJson as Record<string, unknown>,
            contentText: version.contentText,
            validationStatus: "PENDING" as const,
            createdAt: version.createdAt.toISOString()
          }))
        }
      : undefined;
  }

  const db = await readStore();

  return db.resources.find(
    (resource) =>
      resource.id === resourceId &&
      resource.organizationId === organizationId &&
      (userId ? resource.createdByUserId === userId : true)
  );
}

async function generatePedagogicalPlan(
  request: CreateMissionRequest,
  context: ResolvedContext,
  decision: DecisionResult
): Promise<PedagogicalPlan & Record<string, unknown>> {
  const materialBlueprint = buildMaterialBlueprint(request, context, decision);
  const generated = await generateAndSelectPedagogicalOutput(
    request,
    context,
    decision,
    materialBlueprint
  );
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
    studentSheet: buildStudentSheet(generated, request, materialBlueprint),
    teacherGuide: buildTeacherGuide(generated, request, materialBlueprint),
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
  decision: DecisionResult,
  materialBlueprint: MaterialBlueprint
): Promise<InternallyValidatedGeneration> {
  const prompt = buildPedagogicalGenerationPrompt(
    request,
    context,
    decision,
    undefined,
    materialBlueprint
  );
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

async function generateAndSelectPedagogicalOutput(
  request: CreateMissionRequest,
  context: ResolvedContext,
  decision: DecisionResult,
  materialBlueprint: MaterialBlueprint
): Promise<InternallyValidatedGeneration> {
  const validator = new PedagogicalValidator();
  const firstOutput = await callOpenAI(request, context, decision, materialBlueprint);
  const firstReport = validateGeneratedOutput(
    validator,
    buildNormalizedValidationCandidate(firstOutput, request, materialBlueprint),
    materialBlueprint
  );
  const regenerationDecision = new RegenerationPolicy().decide({
    materialBlueprint,
    originalOutput: buildNormalizedValidationCandidate(
      firstOutput,
      request,
      materialBlueprint
    ) as Parameters<PedagogicalValidator["validate"]>[0],
    validationReport: firstReport,
    attempt: 0
  });

  if (!regenerationDecision.shouldRegenerate || !regenerationDecision.correctionPrompt) {
    attachInternalPedagogicalValidation(firstOutput, {
      attempts: [
        {
          attempt: 0,
          report: firstReport,
          correctionApplied: false
        }
      ],
      selectedAttempt: 0,
      belowStandard: !firstReport.approved
    });

    return firstOutput;
  }

  const correctedOutput = await callOpenAIWithCorrectionPrompt(
    request,
    regenerationDecision.correctionPrompt
  );
  const correctedReport = validateGeneratedOutput(
    validator,
    buildNormalizedValidationCandidate(correctedOutput, request, materialBlueprint),
    materialBlueprint
  );
  const selection = selectRegenerationOutput(
    {
      attempt: 0,
      output: firstOutput,
      report: firstReport
    },
    {
      attempt: 1,
      output: correctedOutput,
      report: correctedReport
    }
  );

  attachInternalPedagogicalValidation(selection.selected.output, {
    attempts: selection.attempts.map((attempt) => ({
      attempt: attempt.attempt,
      report: attempt.report,
      correctionApplied: attempt.attempt > 0
    })),
    selectedAttempt: selection.selected.attempt,
    belowStandard: selection.belowStandard
  });

  return selection.selected.output;
}

async function callOpenAIWithCorrectionPrompt(
  request: CreateMissionRequest,
  correctionPrompt: PedagogicalCorrectionPrompt
): Promise<InternallyValidatedGeneration> {
  const response = await generateJsonWithConfiguredProvider<Record<string, unknown>>(
    {
      purpose:
        request.missionType === "ADAPT_ACTIVITY"
          ? "ACTIVITY_ADAPTATION"
          : "LESSON_PLAN_GENERATION",
      systemPrompt: correctionPrompt.systemPrompt,
      userPayload: correctionPrompt.userPayload,
      outputSchemaName: correctionPrompt.outputSchemaName,
      safetyLevel: request.input.specificNeed ? "SENSITIVE" : "STANDARD"
    },
    {
      openAiApiKey: process.env.OPENAI_API_KEY,
      openAiModel: process.env.OPENAI_MODEL
    }
  );

  return response.output;
}

function validateGeneratedOutput(
  validator: PedagogicalValidator,
  generated: InternallyValidatedGeneration,
  materialBlueprint: MaterialBlueprint
): PedagogicalValidationReport {
  return validator.validate(
    generated as Parameters<PedagogicalValidator["validate"]>[0],
    materialBlueprint
  );
}

function buildNormalizedValidationCandidate(
  generated: InternallyValidatedGeneration,
  request: CreateMissionRequest,
  materialBlueprint: MaterialBlueprint
): InternallyValidatedGeneration {
  return {
    ...generated,
    studentSheet: buildStudentSheet(generated, request, materialBlueprint),
    teacherGuide: buildTeacherGuide(generated, request, materialBlueprint)
  };
}

function attachInternalPedagogicalValidation(
  generated: InternallyValidatedGeneration,
  validationState: InternalPedagogicalValidationState
): void {
  Object.defineProperty(generated, INTERNAL_PEDAGOGICAL_VALIDATION, {
    value: validationState,
    enumerable: false,
    configurable: false
  });
}

function resolveContext(request: CreateMissionRequest): ResolvedContext {
  const input = request.input;
  const missingFieldEntries: Array<[string, string | undefined]> = [
    ["rawPrompt", input.rawPrompt],
    ["discipline", input.discipline ?? input.subject],
    ["gradeYear", input.gradeYear ?? input.yearGrade],
    ["skill", input.skill],
    ["knowledgeObject", input.knowledgeObject],
    ["curriculumReference", input.curriculumReference],
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
      input.curriculumReference ? `curriculo:${input.curriculumReference}` : undefined,
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

async function writeMissionToPrisma(
  mission: Mission,
  resource: Resource,
  version: ResourceVersion
): Promise<void> {
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    await tx.mission.create({
      data: {
        id: mission.id,
        organizationId: mission.organizationId,
        createdByUserId: mission.createdByUserId,
        type: mission.missionType,
        status: mission.status === "COMPLETED" ? "COMPLETED" : "FAILED",
        input: toPrismaJson(mission.input),
        profileContext: toPrismaJson({
          context: mission.context,
          decision: mission.decision
        }),
        createdAt: new Date(mission.createdAt)
      }
    });

    await tx.resource.create({
      data: {
        id: resource.id,
        organizationId: resource.organizationId,
        createdByUserId: resource.createdByUserId,
        missionId: resource.missionId,
        type: resource.type,
        title: resource.title,
        status: resource.status,
        metadata: toPrismaJson(resource.metadata),
        createdAt: new Date(resource.createdAt),
        updatedAt: new Date(resource.updatedAt)
      }
    });

    await tx.resourceVersion.create({
      data: {
        id: version.id,
        resourceId: version.resourceId,
        versionNumber: version.versionNumber,
        contentJson: toPrismaJson(version.contentJson),
        contentText: version.contentText,
        validationStatus: version.validationStatus,
        createdAt: new Date(version.createdAt)
      }
    });
  });
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
  const curriculumReference = normalizeText(input.curriculumReference);
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
    curriculumReference,
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
      tag("curriculo", curriculumReference),
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
    `Referencia curricular: ${input.curriculumReference ?? ""}`,
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

type BlueprintAlignedQuestion = {
  plannedTaskOrder: number;
  actionType: ActivityActionType;
  pedagogicalPurpose: string;
  cognitiveDemand: string;
  responseMode: string;
  supportRequired: string[];
  visualFunction: string;
  successCriterion: string;
  instruction: string;
  content: string;
  command: string;
  support?: string;
  answerSpace?: string;
};

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

  if (subject.includes("matematica") && normalizedTheme.includes("equacao")) {
    return [
      "Observe a representacao de equilibrio e identifique qual numero deixa os dois lados iguais.",
      "Pareie cada equacao simples ao resultado correto.",
      "Complete as lacunas da tabela para descobrir o valor de x.",
      "Resolva a situacao-problema usando os passos indicados.",
      "Crie uma equacao simples com apoio do modelo."
    ];
  }

  if (
    subject.includes("matematica") ||
    normalizedTheme.includes("progressao") ||
    normalizedTheme.includes("pa")
  ) {
    return [
      "Observe as sequencias e descubra a razao de cada uma. Depois escreva os tres proximos termos.",
      "Marque com X a alternativa que mostra uma progressao aritmetica e escreva a razao.",
      "Verifique se o termo destacado esta correto. Se nao estiver, escreva o valor correto.",
      "Resolva o problema usando a sequencia visual e registre o calculo.",
      "Complete a tabela com primeiro termo, razao, posicao e termo pedido."
    ];
  }

  if (subject.includes("quimica") || normalizedTheme.includes("reacao")) {
    return [
      "Observe a reacao representada por blocos e escreva o nome dos reagentes e do produto.",
      "Classifique cada reacao: sintese, decomposicao, simples troca ou dupla troca.",
      "Marque com X a alternativa que representa uma transformacao quimica.",
      "Ligue cada parte da reacao ao seu nome: reagentes ou produtos.",
      "Organize as letras e escreva o nome do tipo de reacao representado."
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
      "Observe o mapa simplificado e responda as perguntas sobre localizacao e territorio.",
      "Marque com X as alternativas corretas sobre o tema estudado.",
      "Observe as situacoes territoriais e escreva qual conflito ou problema aparece.",
      "Complete a linha do tempo com as etapas da formacao territorial.",
      "Escreva duas acoes que ajudam a respeitar as diferencas e cuidar do territorio."
    ];
  }

  if (subject.includes("portugues") || subject.includes("lingua")) {
    return [
      "Leia o texto abaixo e circule a ideia principal.",
      "Observe as imagens e marque qual representa o assunto principal do texto.",
      "Marque as informacoes que aparecem no texto.",
      "Complete as frases com palavras do quadro.",
      "Reescreva as ideias na ordem correta para formar um texto com sentido."
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

export function buildStudentSheet(
  generated: Record<string, unknown>,
  request: CreateMissionRequest,
  materialBlueprint: MaterialBlueprint
): Record<string, unknown> {
  const source = isRecord(generated.studentSheet) ? generated.studentSheet : {};
  const fallback = buildFallbackStudentSheetContent(request, materialBlueprint);
  const questions = normalizeQuestionsFromBlueprint(
    source.questions ?? generated.questions,
    materialBlueprint
  );

  return {
    title: normalizeString(
      source.title,
      normalizeString(
        generated.worksheetTitle,
        fallback.title
      )
    ),
    context: normalizeString(
      source.context,
      normalizeString(
        generated.context,
        fallback.context
      )
    ),
    instructions: normalizeStringArray(source.instructions, [
      "Leia cada comando com atencao.",
      "Responda nos espacos indicados."
    ]),
    baseText: normalizeString(source.baseText, normalizeString(generated.baseText, fallback.baseText)),
    didacticBoxes: normalizeStringArray(
      source.didacticBoxes,
      normalizeStringArray(generated.didacticBoxes, fallback.didacticBoxes)
    ),
    visualElements: normalizeStringArray(
      source.visualElements,
      normalizeStringArray(
        generated.visualElements,
        buildBlueprintVisualElements(materialBlueprint)
      )
    ),
    tableRows: normalizeStringArray(
      source.tableRows,
      normalizeStringArray(generated.tableRows, fallback.tableRows)
    ),
    questions
  };
}

function normalizeQuestionsFromBlueprint(
  value: unknown,
  materialBlueprint: MaterialBlueprint
): BlueprintAlignedQuestion[] {
  const generatedQuestions = normalizeGeneratedQuestionRecords(value);
  const usedIndexes = new Set<number>();

  return materialBlueprint.plannedTasks.map((plannedTask, index) => {
    const generatedQuestion = findGeneratedQuestionForTask(
      generatedQuestions,
      plannedTask,
      index,
      usedIndexes
    );
    const instruction = normalizeString(
      generatedQuestion?.instruction,
      normalizeString(generatedQuestion?.command, buildInstructionFromPlannedTask(plannedTask, materialBlueprint))
    );
    const command = normalizeString(
      generatedQuestion?.command,
      instruction
    );

    return {
      plannedTaskOrder: plannedTask.order,
      actionType: plannedTask.actionType,
      pedagogicalPurpose: normalizeString(
        generatedQuestion?.pedagogicalPurpose,
        plannedTask.pedagogicalPurpose
      ),
      cognitiveDemand: normalizeString(
        generatedQuestion?.cognitiveDemand,
        plannedTask.cognitiveDemand
      ),
      responseMode: normalizeString(
        generatedQuestion?.responseMode,
        plannedTask.responseMode
      ),
      supportRequired: normalizeStringArray(
        generatedQuestion?.supportRequired,
        plannedTask.supportRequired
      ),
      visualFunction: normalizeString(
        generatedQuestion?.visualFunction,
        plannedTask.visualFunction
      ),
      successCriterion: normalizeString(
        generatedQuestion?.successCriterion,
        plannedTask.successCriterion
      ),
      instruction,
      content: normalizeString(
        generatedQuestion?.content,
        materialBlueprint.content
      ),
      command,
      support: normalizeString(
        generatedQuestion?.support,
        buildSupportFromPlannedTask(plannedTask)
      ),
      answerSpace: normalizeString(
        generatedQuestion?.answerSpace,
        buildAnswerSpaceFromPlannedTask(plannedTask)
      )
    };
  });
}

function normalizeGeneratedQuestionRecords(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { command: item };
      }

      return isRecord(item) ? item : undefined;
    })
    .filter((item): item is Record<string, unknown> => Boolean(item));
}

function findGeneratedQuestionForTask(
  generatedQuestions: Array<Record<string, unknown>>,
  plannedTask: PlannedTask,
  fallbackIndex: number,
  usedIndexes: Set<number>
): Record<string, unknown> | undefined {
  const byOrder = generatedQuestions.findIndex((question, index) =>
    !usedIndexes.has(index) &&
    Number(question.plannedTaskOrder) === plannedTask.order
  );

  if (byOrder >= 0) {
    usedIndexes.add(byOrder);
    return generatedQuestions[byOrder];
  }

  const byAction = generatedQuestions.findIndex((question, index) =>
    !usedIndexes.has(index) &&
    normalizeString(question.actionType, "") === plannedTask.actionType
  );

  if (byAction >= 0) {
    usedIndexes.add(byAction);
    return generatedQuestions[byAction];
  }

  if (!usedIndexes.has(fallbackIndex) && generatedQuestions[fallbackIndex]) {
    usedIndexes.add(fallbackIndex);
    return generatedQuestions[fallbackIndex];
  }

  return undefined;
}

function buildInstructionFromPlannedTask(
  plannedTask: PlannedTask,
  materialBlueprint: MaterialBlueprint
): string {
  const content = materialBlueprint.content || materialBlueprint.knowledgeObject;

  switch (plannedTask.actionType) {
    case "OBSERVE":
      return `Observe o recurso visual sobre ${content} e responda a pergunta principal.`;
    case "MATCH":
      return `Pareie cada representacao de ${content} ao resultado ou significado correto.`;
    case "COMPLETE":
      return `Complete as lacunas usando as pistas visuais e os passos indicados.`;
    case "SOLVE":
      return `Resolva uma situacao-problema sobre ${content} e registre o calculo.`;
    case "CREATE_GUIDED_EXAMPLE":
      return `Crie um exemplo simples de ${content} seguindo o modelo.`;
    case "CLASSIFY":
      return `Classifique os exemplos nos grupos corretos.`;
    case "ORDER":
      return `Organize os itens na ordem correta.`;
    case "COMPARE":
      return `Compare as representacoes e marque semelhancas ou diferencas importantes.`;
    case "CONNECT":
      return `Ligue as informacoes que representam a mesma ideia.`;
    default:
      return `${plannedTask.pedagogicalPurpose}.`;
  }
}

function buildSupportFromPlannedTask(plannedTask: PlannedTask): string {
  const support = plannedTask.supportRequired.slice(0, 2).join("; ");

  return support || plannedTask.instructionStyle;
}

function buildAnswerSpaceFromPlannedTask(plannedTask: PlannedTask): string {
  if (plannedTask.actionType === "MATCH" || plannedTask.responseMode.includes("ligar")) {
    return "pares para ligar";
  }

  if (plannedTask.actionType === "COMPLETE" || plannedTask.responseMode.includes("completar")) {
    return "lacunas e caixas";
  }

  if (plannedTask.actionType === "SOLVE") {
    return "espaco para calculo e resposta";
  }

  if (plannedTask.actionType === "CREATE_GUIDED_EXAMPLE") {
    return "campos guiados";
  }

  return "duas linhas";
}

function buildBlueprintVisualElements(materialBlueprint: MaterialBlueprint): string[] {
  return materialBlueprint.plannedTasks
    .map((task) => task.visualFunction)
    .filter((visual, index, visuals) => visual && visuals.indexOf(visual) === index);
}

function buildFallbackStudentSheetContent(request: CreateMissionRequest, materialBlueprint: MaterialBlueprint): {
  title: string;
  context: string;
  baseText: string;
  didacticBoxes: string[];
  tableRows: string[];
} {
  const input = request.input;
  const theme = input.theme ?? input.knowledgeObject ?? "conteudo estudado";
  const source = normalizeComparable(
    `${input.discipline ?? input.subject ?? ""} ${theme} ${input.skill ?? ""}`
  );

  if (source.includes("matematica") && source.includes("equacao")) {
    return {
      title: "Equacoes do primeiro grau: descobrindo o valor desconhecido",
      context:
        "Uma equacao mostra uma igualdade. O valor desconhecido precisa deixar os dois lados com o mesmo resultado.",
      baseText: "",
      didacticBoxes: [
        "Exemplo resolvido: se x + 3 = 8, entao x = 5, porque 5 + 3 = 8.",
        "Use caixas, setas e tabela para organizar cada passo.",
        "Leia uma etapa por vez e registre somente o necessario."
      ],
      tableRows: [
        "Problema | Equacao | Valor de x",
        "x + 2 = 6 | O que falta para 2 chegar a 6? | ___",
        "x + 4 = 9 | O que falta para 4 chegar a 9? | ___"
      ]
    };
  }

  if (
    source.includes("portugues") ||
    source.includes("lingua") ||
    source.includes("coesao") ||
    source.includes("coerencia")
  ) {
    return {
      title: "Coesao e coerencia: o assunto principal do texto",
      context:
        "Ideia principal e o assunto mais importante de um texto. As outras informacoes ajudam a contar a historia.",
      baseText:
        "A escola organizou uma campanha para arrecadar livros. Os estudantes participaram levando livros em bom estado. Todos colaboraram com alegria. Ao final, muitos livros foram doados a biblioteca da comunidade.",
      didacticBoxes: [
        "Dica: procure quem participou, o que aconteceu e qual foi o resultado.",
        "Exemplo: se o texto fala sobre doacao de livros, essa e a ideia principal.",
        "Use as imagens para lembrar as informacoes do texto."
      ],
      tableRows: [
        "Ideia principal | Doacao de livros | Circule no texto",
        "Informacao secundaria | Estudantes participaram | Marque com X",
        "Informacao secundaria | Livros em bom estado | Escreva uma frase"
      ]
    };
  }

  if (
    source.includes("progressao") ||
    source.includes("aritmetica") ||
    source.includes("pa")
  ) {
    return {
      title: "Progressao aritmetica (PA): identificando regularidades",
      context:
        "Uma progressao aritmetica e uma sequencia numerica em que a diferenca entre dois termos consecutivos e sempre a mesma. Essa diferenca e chamada de razao.",
      baseText: "",
      didacticBoxes: [
        "Exemplo resolvido: 2, 5, 8, 11. A razao e 3, porque cada termo aumenta 3.",
        "Observe as setas entre os numeros para descobrir o padrao.",
        "Use a tabela para organizar primeiro termo, razao e termo pedido."
      ],
      tableRows: [
        "P.A. | Razao | Proximos termos",
        "2, 5, 8, 11 | r = 3 | ___, ___, ___",
        "20, 16, 12, 8 | r = -4 | ___, ___, ___"
      ]
    };
  }

  if (source.includes("matematica") && source.includes("geometria")) {
    return {
      title: `${theme}: observando formas e medidas`,
      context: "A geometria ajuda a observar formas, medidas, posicoes e relacoes no espaco.",
      baseText: "",
      didacticBoxes: [
        "Observe as formas antes de responder.",
        "Compare lados, vertices, medidas ou posicoes.",
        "Use desenhos e marcas para organizar sua resposta."
      ],
      tableRows: [
        "Forma | Caracteristica | Minha resposta",
        "Quadrado | 4 lados iguais | ___",
        "Triangulo | 3 lados | ___"
      ]
    };
  }

  if (source.includes("matematica") && source.includes("porcent")) {
    return {
      title: `${theme}: partes de 100`,
      context: "Porcentagem representa uma parte de cada 100 partes iguais.",
      baseText: "",
      didacticBoxes: [
        "Use o quadro de 100 partes para visualizar a porcentagem.",
        "Relacione porcentagem com parte e todo.",
        "Resolva uma etapa por vez."
      ],
      tableRows: [
        "Total | Porcentagem | Parte",
        "100 | 25% | ___",
        "100 | 50% | ___"
      ]
    };
  }

  if (source.includes("matematica") && source.includes("funcao")) {
    return {
      title: `${theme}: relacionando valores`,
      context: "Uma funcao relaciona um valor de entrada a um valor de saida por uma regra.",
      baseText: "",
      didacticBoxes: [
        "Observe a regra antes de completar a tabela.",
        "Compare entrada e saida.",
        "Use setas para acompanhar a transformacao."
      ],
      tableRows: [
        "Entrada | Regra | Saida",
        "1 | + 2 | ___",
        "2 | + 2 | ___"
      ]
    };
  }

  if (source.includes("matematica") && source.includes("operac")) {
    return {
      title: `${theme}: resolvendo operacoes`,
      context: "As operacoes ajudam a juntar, retirar, repartir ou comparar quantidades.",
      baseText: "",
      didacticBoxes: [
        "Use material concreto ou desenhos para representar as quantidades.",
        "Resolva da esquerda para a direita quando indicado.",
        "Confira sua resposta no final."
      ],
      tableRows: [
        "Situacao | Operacao | Resultado",
        "Juntar quantidades | ___ | ___",
        "Retirar quantidades | ___ | ___"
      ]
    };
  }

  if (
    source.includes("quimica") ||
    source.includes("transformacao") ||
    source.includes("reacao")
  ) {
    return {
      title: "Transformacoes quimicas: reagentes e produtos",
      context:
        "Nas reacoes quimicas, as substancias iniciais se transformam em novas substancias. Antes da seta ficam os reagentes. Depois da seta ficam os produtos.",
      baseText: "",
      didacticBoxes: [
        "Exemplo resolvido: H2 + Cl2 -> 2HCl. H2 e Cl2 sao reagentes. 2HCl e produto.",
        "Observe os blocos coloridos para perceber se houve transformacao.",
        "A seta mostra o caminho da reacao: antes da seta e depois da seta."
      ],
      tableRows: [
        "Reacao | Reagentes | Produtos",
        "H2 + Cl2 -> 2HCl | H2 e Cl2 | 2HCl",
        "2H2O -> 2H2 + O2 | 2H2O | 2H2 e O2"
      ]
    };
  }

  if (
    source.includes("geografia") ||
    source.includes("territorio") ||
    source.includes("espirito santo") ||
    source.includes("brasil")
  ) {
    return {
      title: "Brasil e Espirito Santo: territorio e conflitos",
      context:
        "O Brasil e formado por estados e pelo Distrito Federal. O Espirito Santo fica na regiao Sudeste e possui diferentes paisagens, cidades, povos e conflitos territoriais.",
      baseText: "",
      didacticBoxes: [
        "Observe o mapa para localizar o Espirito Santo.",
        "Compare as situacoes: povos tradicionais, crescimento urbano e uso dos recursos naturais.",
        "Respeitar as diferencas e cuidar do territorio ajuda a promover justica."
      ],
      tableRows: [
        "Localizacao | Espirito Santo | Regiao Sudeste",
        "Conflito | Terra e recursos naturais | Escreva uma consequencia",
        "Acao positiva | Respeito e cuidado | Escreva uma atitude"
      ]
    };
  }

  return {
    title: `Atividade: ${theme}`,
    context: `Leia as informacoes sobre ${materialBlueprint.content}, observe os apoios visuais e realize as atividades com atencao.`,
    baseText: "",
    didacticBoxes: [
      `Use o exemplo e as pistas visuais para estudar ${materialBlueprint.knowledgeObject}.`,
      materialBlueprint.plannedTasks[0]?.supportRequired[0] ?? "Leia um comando por vez.",
      "Responda no espaco indicado."
    ],
    tableRows: [
      `${materialBlueprint.knowledgeObject} | Apoio visual | Minha resposta`
    ]
  };
}

function buildFallbackVisualElements(request: CreateMissionRequest): string[] {
  const input = request.input;
  const source = normalizeComparable(
    `${input.discipline ?? input.subject ?? ""} ${input.theme ?? input.knowledgeObject ?? ""}`
  );

  if (source.includes("equacao")) {
    return ["balanca de equacao", "pares de equacoes e resultados", "tabela de passos", "caixas de calculo"];
  }

  if (source.includes("progressao") || source.includes("aritmetica")) {
    return ["reta numerica", "setas de regularidade", "tabela simples", "sequencia visual"];
  }

  if (source.includes("matematica")) {
    return ["tabela simples", "blocos de contagem", "caixas de resposta", "organizador visual"];
  }

  if (source.includes("quimica") || source.includes("reacao") || source.includes("transformacao")) {
    return ["laboratorio", "blocos de reagentes", "tabela comparativa", "esquema com setas"];
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
  request: CreateMissionRequest,
  materialBlueprint?: MaterialBlueprint
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
        ...(materialBlueprint?.successCriteria ?? []),
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
  const curriculumReference = input.curriculumReference ??
    "BNCC e Curriculo do Espirito Santo/SEDU-ES quando informado pelo professor.";
  const generatedAnalysis = normalizeStringArray(generated.curricularAnalysis, []);

  return [
    ...generatedAnalysis,
    `Referencia curricular usada para orientar a analise: ${curriculumReference}.`,
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

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
