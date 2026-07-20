import type {
  CreateMissionRequest,
  DecisionResult,
  ResolvedContext
} from "@acessa-plus/types";
import { ActivityVarietyPlanner } from "./activity-variety-planner.js";
import { BarrierAndAccessResolver } from "./barrier-access-resolver.js";
import { LearningLevelResolver } from "./learning-level-resolver.js";
import type { MaterialBlueprint } from "./material-blueprint.js";

export class MaterialBlueprintBuilder {
  constructor(
    private readonly learningLevelResolver = new LearningLevelResolver(),
    private readonly barrierAndAccessResolver = new BarrierAndAccessResolver(),
    private readonly activityVarietyPlanner = new ActivityVarietyPlanner()
  ) {}

  build(
    request: CreateMissionRequest,
    context: ResolvedContext,
    decision: DecisionResult
  ): MaterialBlueprint {
    const functionalLearningLevel = this.learningLevelResolver.resolve(
      request,
      context
    );
    const accessPlan = this.barrierAndAccessResolver.resolve(
      request,
      functionalLearningLevel
    );
    const requestedTaskCount = resolveRequestedTaskCount(request);
    const plannedTasks = this.activityVarietyPlanner.plan({
      request,
      functionalLearningLevel,
      accessPlan,
      requestedTaskCount
    });

    return {
      resourceType: request.input.expectedProductType ?? decision.expectedProducts[0] ?? "Recurso pedagogico",
      discipline: request.input.discipline ?? request.input.subject ?? "disciplina nao informada",
      schoolStage: functionalLearningLevel.schoolStage,
      grade: functionalLearningLevel.grade,
      skillCode: request.input.skill ?? "habilidade nao informada",
      learningObjective:
        request.input.lessonObjective ??
        request.input.objective ??
        decision.objectives[0] ??
        "objetivo pedagogico a confirmar",
      knowledgeObject:
        request.input.knowledgeObject ??
        request.input.theme ??
        "objeto de conhecimento nao informado",
      content:
        request.input.theme ??
        request.input.knowledgeObject ??
        request.input.rawPrompt ??
        "conteudo nao informado",
      studentProfile:
        request.input.specificNeed ??
        request.input.adaptationProfile?.targetAudience ??
        "perfil pedagogico nao informado",
      functionalLearningLevel,
      identifiedBarriers: accessPlan.identifiedBarriers,
      recommendedSupports: accessPlan.recommendedSupports,
      supportLevel: resolveSupportLevel(request),
      requestedTaskCount,
      plannedTasks,
      responseModes: accessPlan.responseModes,
      visualRequirements: accessPlan.visualRequirements,
      successCriteria: plannedTasks.map((task) => task.successCriterion),
      antiInfantilizationGuidance: [
        "Nao infantilizar estudantes adolescentes ou adultos.",
        "Manter tema, linguagem e exemplos compativeis com a serie escolar.",
        "Simplificar acesso e resposta quando necessario, sem reduzir automaticamente o objetivo curricular.",
        "Nao transformar diagnostico em perfil completo do estudante."
      ],
      teacherMediationGuidance: accessPlan.teacherMediationGuidance
    };
  }
}

export function buildMaterialBlueprint(
  request: CreateMissionRequest,
  context: ResolvedContext,
  decision: DecisionResult
): MaterialBlueprint {
  return new MaterialBlueprintBuilder().build(request, context, decision);
}

function resolveRequestedTaskCount(request: CreateMissionRequest): number {
  const parsed = typeof request.input.questionCount === "number"
    ? request.input.questionCount
    : Number.parseInt(request.input.questionCount ?? "5", 10);

  if (!Number.isFinite(parsed)) {
    return 5;
  }

  return Math.min(Math.max(parsed, 1), 10);
}

function resolveSupportLevel(request: CreateMissionRequest): string {
  const supports = request.input.adaptationProfile?.supports ?? [];
  const explicit = supports.find((item) =>
    normalizeComparable(item).includes("apoio")
  );

  return explicit ?? request.input.learningPreference ?? "apoio a definir pelo professor";
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
