import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  RESOURCES_REPOSITORY,
  type CreateResourceVersionInput,
  type EditablePedagogicalPlan,
  type ResourceListItem,
  type ResourceSearchInput,
  type ResourceVersionResult,
  type ResourcesRepository
} from "./resources.repository.js";

@Injectable()
export class ResourcesService {
  constructor(
    @Inject(RESOURCES_REPOSITORY)
    private readonly resourcesRepository: ResourcesRepository
  ) {}

  async createVersion(input: unknown): Promise<ResourceVersionResult> {
    const parsed = this.parseCreateVersionInput(input);
    const contentText =
      parsed.contentText?.trim() || this.buildContentText(parsed.contentJson);
    const version = await this.resourcesRepository.createVersion({
      ...parsed,
      contentText
    });

    if (!version) {
      throw new NotFoundException("Resource not found for this organization.");
    }

    return version;
  }

  async listVersions(
    organizationId: string,
    resourceId: string
  ): Promise<ResourceVersionResult[]> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required.");
    }

    return this.resourcesRepository.listVersions(organizationId, resourceId);
  }

  async listResources(query: unknown): Promise<ResourceListItem[]> {
    const parsed = this.parseSearchInput(query);

    return this.resourcesRepository.listResources(parsed);
  }

  private parseCreateVersionInput(input: unknown): CreateResourceVersionInput {
    if (!this.isRecord(input)) {
      throw new BadRequestException("Invalid resource version request.");
    }

    const organizationId = input.organizationId;
    const resourceId = input.resourceId;
    const contentJson = input.contentJson;
    const contentText = input.contentText;

    if (typeof organizationId !== "string" || organizationId.length === 0) {
      throw new BadRequestException("organizationId is required.");
    }

    if (typeof resourceId !== "string" || resourceId.length === 0) {
      throw new BadRequestException("resourceId is required.");
    }

    if (!this.isEditablePlan(contentJson)) {
      throw new BadRequestException("contentJson must be a valid editable plan.");
    }

    if (contentText !== undefined && typeof contentText !== "string") {
      throw new BadRequestException("contentText must be a string.");
    }

    return {
      organizationId,
      resourceId,
      contentJson,
      contentText
    };
  }

  private parseSearchInput(input: unknown): ResourceSearchInput {
    if (!this.isRecord(input)) {
      throw new BadRequestException("Invalid resource search request.");
    }

    const organizationId = input.organizationId;

    if (typeof organizationId !== "string" || organizationId.length === 0) {
      throw new BadRequestException("organizationId is required.");
    }

    return {
      organizationId,
      discipline: optionalString(input.discipline),
      gradeYear: optionalString(input.gradeYear),
      skill: optionalString(input.skill),
      specificNeed: optionalString(input.specificNeed),
      q: optionalString(input.q)
    };
  }

  private isEditablePlan(value: unknown): value is EditablePedagogicalPlan {
    if (!this.isRecord(value)) {
      return false;
    }

    return [
      "objectives",
      "expectedOutputs",
      "methodologicalConstraints",
      "validationCriteria"
    ].every((key) => {
      const field = value[key];

      return (
        field === undefined ||
        (Array.isArray(field) &&
          field.every((item) => typeof item === "string"))
      );
    });
  }

  private buildContentText(contentJson: EditablePedagogicalPlan): string {
    const lines = [
      `Objetivo: ${this.join(contentJson.objectives)}`,
      `Produto esperado: ${this.join(contentJson.expectedOutputs)}`,
      `Restricoes: ${this.join(contentJson.methodologicalConstraints)}`,
      `Validacao: ${this.join(contentJson.validationCriteria)}`
    ];

    return lines.filter((line) => !line.endsWith(": ")).join("\n");
  }

  private join(items: string[] | undefined): string {
    return items?.map((item) => item.trim()).filter(Boolean).join("; ") ?? "";
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
