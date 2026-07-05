import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { CreateMissionRequest } from "@acessa-plus/types";
import { InMemoryMissionsRepository } from "./in-memory-missions.repository.js";
import { MissionsService } from "./missions.service.js";

const validLessonPlanMission: CreateMissionRequest = {
  userId: "user_1",
  organizationId: "org_1",
  missionType: "CREATE_LESSON_PLAN",
  input: {
    discipline: "Lingua Portuguesa",
    gradeYear: "5 ano",
    skill: "Identificar informacoes explicitas em textos.",
    knowledgeObject: "Leitura e interpretacao",
    theme: "Noticia",
    lessonObjective: "Compreender a estrutura de uma noticia.",
    specificNeed: "Deficiencia intelectual",
    learningPreference: "Aprende melhor com imagens e exemplos concretos.",
    readingWritingLevel: "Le frases curtas com apoio.",
    availableResources: ["cartazes", "tablet"],
    expectedProductType: "Plano de aula inclusivo"
  }
};

describe("MissionsService", () => {
  it("executes and persists a complete CREATE_LESSON_PLAN mission", async () => {
    const repository = new InMemoryMissionsRepository();
    const service = new MissionsService(repository);
    const result = await service.execute(validLessonPlanMission);

    expect(result.status).toBe("COMPLETED");
    expect(result.missionId).toBe("mission_1");
    expect(result.resourceId).toBe("resource_1");
    expect(result.versionId).toBe("version_1");
    expect(result.context.completeness).toBe("COMPLETE");
    expect(result.decision.stages.EXPECTED_PRODUCT).toEqual([
      "Plano de aula inclusivo"
    ]);
    expect(result.pedagogicalPlan.objectives).toEqual([
      "Compreender a estrutura de uma noticia."
    ]);
    expect(result.pedagogicalPlan.protocolApplications).toHaveLength(3);
  });

  it("rejects incomplete guided lesson planning missions", async () => {
    const service = new MissionsService(new InMemoryMissionsRepository());

    await expect(
      service.execute({
        userId: "user_1",
        organizationId: "org_1",
        missionType: "CREATE_LESSON_PLAN",
        input: {
          discipline: "Matematica"
        }
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("lists persisted missions only for the requested organization", async () => {
    const service = new MissionsService(new InMemoryMissionsRepository());
    await service.execute(validLessonPlanMission);
    await service.execute({
      ...validLessonPlanMission,
      organizationId: "org_2",
      userId: "user_2"
    });

    const list = await service.list("org_1");

    expect(list).toHaveLength(1);
    expect(list[0]?.title).toBe("Planejamento inclusivo: Noticia");
  });

  it("returns mission detail with resource version content text", async () => {
    const service = new MissionsService(new InMemoryMissionsRepository());
    const created = await service.execute(validLessonPlanMission);

    const detail = await service.getById("org_1", created.missionId);

    expect(detail.resources[0]?.versions[0]?.contentText).toContain(
      "Objetivo: Compreender a estrutura de uma noticia."
    );
  });

  it("does not return mission detail across organizations", async () => {
    const service = new MissionsService(new InMemoryMissionsRepository());
    const created = await service.execute(validLessonPlanMission);

    await expect(service.getById("org_2", created.missionId)).rejects.toThrow(
      "Mission not found for this organization."
    );
  });
});
