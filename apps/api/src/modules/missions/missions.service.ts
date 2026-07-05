import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  CreateMissionRequest,
  DecisionResult,
  PedagogicalPlan,
  ResolvedContext
} from "@acessa-plus/types";
import { createMissionRequestSchema } from "@acessa-plus/validators";
import {
  ContextResolver,
  DecisionEngine,
  KnowledgeRegistry,
  MinimalPedagogicalEngine
} from "@acessa-plus/pedagogical-core";
import {
  MISSIONS_REPOSITORY,
  type MissionDetail,
  type MissionListItem,
  type MissionsRepository
} from "./missions.repository.js";

export type MissionExecutionResult = {
  missionId: string;
  resourceId: string;
  versionId: string;
  missionType: CreateMissionRequest["missionType"];
  status: "COMPLETED" | "NEEDS_REVIEW";
  context: ResolvedContext;
  decision: DecisionResult;
  pedagogicalPlan: PedagogicalPlan;
};

@Injectable()
export class MissionsService {
  constructor(
    @Inject(MISSIONS_REPOSITORY)
    private readonly missionsRepository: MissionsRepository
  ) {}

  async execute(rawRequest: CreateMissionRequest): Promise<MissionExecutionResult> {
    const parsed = createMissionRequestSchema.safeParse(rawRequest);

    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid mission request.",
        issues: parsed.error.issues
      });
    }

    const request = parsed.data;
    const knowledgeRegistry = this.createInitialKnowledgeRegistry();
    const activeKnowledgeIds = knowledgeRegistry
      .listActive()
      .map((asset) => asset.id);
    const context = new ContextResolver().resolve({
      missionType: request.missionType,
      rawInput: {
        ...request.input,
        subject: request.input.subject ?? request.input.discipline,
        yearGrade: request.input.yearGrade ?? request.input.gradeYear,
        objective: request.input.objective ?? request.input.lessonObjective,
        accessibilityNeeds:
          request.input.accessibilityNeeds ??
          (request.input.specificNeed ? [request.input.specificNeed] : undefined)
      },
      organizationId: request.organizationId,
      userId: request.userId,
      availableKnowledgeIds: activeKnowledgeIds
    });
    const decision = new DecisionEngine(knowledgeRegistry).decide({
      context,
      activeKnowledgeIds
    });
    const pedagogicalPlan = new MinimalPedagogicalEngine().analyze({
      missionType: request.missionType,
      context,
      decision
    });
    const status = decision.canProceedToPedagogicalEngine
      ? "COMPLETED"
      : "NEEDS_REVIEW";
    const contentText = this.buildContentText({
      request,
      context,
      decision,
      pedagogicalPlan
    });
    const persisted = await this.missionsRepository.persistMission({
      request,
      context,
      decision,
      pedagogicalPlan,
      contentText,
      status
    });

    return {
      ...persisted,
      missionType: request.missionType,
      status,
      context,
      decision,
      pedagogicalPlan
    };
  }

  async list(organizationId: string): Promise<MissionListItem[]> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required.");
    }

    return this.missionsRepository.listMissions(organizationId);
  }

  async getById(
    organizationId: string,
    missionId: string
  ): Promise<MissionDetail> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required.");
    }

    const mission = await this.missionsRepository.getMissionDetail(
      organizationId,
      missionId
    );

    if (!mission) {
      throw new NotFoundException("Mission not found for this organization.");
    }

    return mission;
  }

  private createInitialKnowledgeRegistry(): KnowledgeRegistry {
    const registry = new KnowledgeRegistry();

    registry.register({
      id: "metodo-acessa",
      name: "Metodo ACESSA+",
      version: "0.1.0",
      type: "PROTOCOL",
      scope: ["mission", "planning", "inclusion"],
      status: "ACTIVE"
    });

    registry.register({
      id: "dua",
      name: "Desenho Universal para Aprendizagem",
      version: "0.1.0",
      type: "PROTOCOL",
      scope: ["accessibility", "pedagogy"],
      status: "ACTIVE"
    });

    registry.register({
      id: "lgpd-educacional",
      name: "LGPD Educacional",
      version: "0.1.0",
      type: "LEGISLATION",
      scope: ["privacy", "security"],
      status: "ACTIVE"
    });

    return registry;
  }

  private buildContentText(input: {
    request: CreateMissionRequest;
    context: ResolvedContext;
    decision: DecisionResult;
    pedagogicalPlan: PedagogicalPlan;
  }): string {
    const missionInput = input.request.input;
    const lines = [
      `Missao: ${input.request.missionType}`,
      `Disciplina: ${missionInput.discipline ?? missionInput.subject ?? ""}`,
      `Serie/ano: ${missionInput.gradeYear ?? missionInput.yearGrade ?? ""}`,
      `Habilidade: ${missionInput.skill ?? ""}`,
      `Objeto de conhecimento: ${missionInput.knowledgeObject ?? ""}`,
      `Tema: ${missionInput.theme ?? ""}`,
      `Objetivo: ${input.pedagogicalPlan.objectives.join("; ")}`,
      `Necessidade especifica: ${missionInput.specificNeed ?? ""}`,
      `Como aprende melhor: ${missionInput.learningPreference ?? ""}`,
      `Nivel de leitura/escrita: ${missionInput.readingWritingLevel ?? ""}`,
      `Recursos disponiveis: ${
        missionInput.availableResources?.join(", ") ?? ""
      }`,
      `Produto esperado: ${input.pedagogicalPlan.expectedOutputs.join("; ")}`,
      `Completude do contexto: ${input.context.completeness}`,
      `Restricoes: ${input.pedagogicalPlan.methodologicalConstraints.join("; ")}`,
      `Validacao: ${input.pedagogicalPlan.validationCriteria.join("; ")}`
    ];

    return lines.filter((line) => !line.endsWith(": ")).join("\n");
  }
}
