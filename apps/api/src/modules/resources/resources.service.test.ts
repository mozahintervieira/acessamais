import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { InMemoryResourcesRepository } from "./in-memory-resources.repository.js";
import { ResourcesService } from "./resources.service.js";

function createService(): {
  repository: InMemoryResourcesRepository;
  service: ResourcesService;
} {
  const repository = new InMemoryResourcesRepository();
  repository.registerResource("resource_1", "org_1", {
    discipline: "Lingua Portuguesa",
    gradeYear: "5 ano",
    skill: "Identificar informacoes explicitas em textos.",
    specificNeed: "Deficiencia intelectual"
  });

  return {
    repository,
    service: new ResourcesService(repository)
  };
}

describe("ResourcesService", () => {
  it("creates incremental resource versions without overwriting history", async () => {
    const { service } = createService();
    const first = await service.createVersion({
      organizationId: "org_1",
      resourceId: "resource_1",
      contentJson: {
        objectives: ["Objetivo original"]
      }
    });
    const second = await service.createVersion({
      organizationId: "org_1",
      resourceId: "resource_1",
      contentJson: {
        objectives: ["Objetivo revisado"]
      }
    });
    const versions = await service.listVersions("org_1", "resource_1");

    expect(first.versionNumber).toBe(1);
    expect(second.versionNumber).toBe(2);
    expect(versions).toHaveLength(2);
    expect(versions[1]?.contentText).toContain("Objetivo original");
    expect(versions[0]?.contentText).toContain("Objetivo revisado");
  });

  it("filters versions by organization", async () => {
    const { service } = createService();
    await service.createVersion({
      organizationId: "org_1",
      resourceId: "resource_1",
      contentJson: {
        objectives: ["Objetivo original"]
      }
    });

    await expect(
      service.createVersion({
        organizationId: "org_2",
        resourceId: "resource_1",
        contentJson: {
          objectives: ["Acesso indevido"]
        }
      })
    ).rejects.toThrow("Resource not found for this organization.");
    await expect(service.listVersions("org_2", "resource_1")).resolves.toEqual(
      []
    );
  });

  it("rejects edits that break the plan structure", async () => {
    const { service } = createService();

    await expect(
      service.createVersion({
        organizationId: "org_1",
        resourceId: "resource_1",
        contentJson: {
          objectives: "texto solto"
        }
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("uses provided contentText when available", async () => {
    const { service } = createService();
    const version = await service.createVersion({
      organizationId: "org_1",
      resourceId: "resource_1",
      contentJson: {
        objectives: ["Objetivo revisado"]
      },
      contentText: "Texto revisado pelo professor"
    });

    expect(version.contentText).toBe("Texto revisado pelo professor");
  });

  it("lists reusable resources with metadata filters", async () => {
    const { repository, service } = createService();
    repository.registerResource("resource_2", "org_1", {
      discipline: "Matematica",
      gradeYear: "5 ano",
      skill: "Resolver problemas",
      specificNeed: "TEA"
    });
    await service.createVersion({
      organizationId: "org_1",
      resourceId: "resource_1",
      contentJson: {
        objectives: ["Ler noticia"]
      },
      contentText: "Atividade sobre genero textual noticia"
    });
    await service.createVersion({
      organizationId: "org_1",
      resourceId: "resource_2",
      contentJson: {
        objectives: ["Resolver problema"]
      },
      contentText: "Atividade de matematica"
    });

    const resources = await service.listResources({
      organizationId: "org_1",
      discipline: "lingua portuguesa",
      specificNeed: "deficiencia"
    });

    expect(resources).toHaveLength(1);
    expect(resources[0]?.id).toBe("resource_1");
  });

  it("searches reusable resources by contentText", async () => {
    const { service } = createService();
    await service.createVersion({
      organizationId: "org_1",
      resourceId: "resource_1",
      contentJson: {
        objectives: ["Ler noticia"]
      },
      contentText: "Atividade sobre genero textual noticia"
    });

    const resources = await service.listResources({
      organizationId: "org_1",
      q: "noticia"
    });

    expect(resources).toHaveLength(1);
  });

  it("does not list resources from another organization", async () => {
    const { service } = createService();
    await service.createVersion({
      organizationId: "org_1",
      resourceId: "resource_1",
      contentJson: {
        objectives: ["Ler noticia"]
      }
    });

    const resources = await service.listResources({
      organizationId: "org_2"
    });

    expect(resources).toEqual([]);
  });

  it("keeps legacy resources listable when metadata is incomplete", async () => {
    const repository = new InMemoryResourcesRepository();
    repository.registerResource("legacy_resource", "org_1");
    const service = new ResourcesService(repository);
    await service.createVersion({
      organizationId: "org_1",
      resourceId: "legacy_resource",
      contentJson: {
        objectives: ["Objetivo antigo"]
      }
    });

    const resources = await service.listResources({
      organizationId: "org_1"
    });

    expect(resources).toHaveLength(1);
    expect(resources[0]?.id).toBe("legacy_resource");
  });
});
