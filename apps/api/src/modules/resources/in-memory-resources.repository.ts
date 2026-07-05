import type {
  CreateResourceVersionInput,
  ResourceListItem,
  ResourceSearchInput,
  ResourceVersionResult,
  ResourcesRepository
} from "./resources.repository.js";

export class InMemoryResourcesRepository implements ResourcesRepository {
  private readonly versions = new Map<string, ResourceVersionResult[]>();
  private readonly resourceOrganizations = new Map<string, string>();
  private readonly metadata = new Map<string, Record<string, unknown>>();

  registerResource(
    resourceId: string,
    organizationId: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.resourceOrganizations.set(resourceId, organizationId);
    this.metadata.set(resourceId, metadata);
  }

  async createVersion(
    input: CreateResourceVersionInput
  ): Promise<ResourceVersionResult | null> {
    const organizationId = this.resourceOrganizations.get(input.resourceId);

    if (organizationId !== input.organizationId) {
      return null;
    }

    const current = this.versions.get(input.resourceId) ?? [];
    const next: ResourceVersionResult = {
      id: `version_${current.length + 1}`,
      resourceId: input.resourceId,
      versionNumber: current.length + 1,
      contentJson: input.contentJson,
      contentText: input.contentText ?? "",
      validationStatus: "PENDING",
      createdAt: new Date().toISOString()
    };

    this.versions.set(input.resourceId, [next, ...current]);

    return next;
  }

  async listVersions(
    organizationId: string,
    resourceId: string
  ): Promise<ResourceVersionResult[]> {
    if (this.resourceOrganizations.get(resourceId) !== organizationId) {
      return [];
    }

    return this.versions.get(resourceId) ?? [];
  }

  async listResources(input: ResourceSearchInput): Promise<ResourceListItem[]> {
    return [...this.resourceOrganizations.entries()]
      .filter(([, organizationId]) => organizationId === input.organizationId)
      .map(([resourceId]) => {
        const versions = this.versions.get(resourceId) ?? [];
        const latestVersion = versions[0];

        return {
          id: resourceId,
          type: "LESSON_PLAN",
          title: "Planejamento inclusivo",
          status: "DRAFT",
          metadata: this.metadata.get(resourceId) ?? {},
          latestVersion,
          createdAt: latestVersion?.createdAt ?? new Date(0).toISOString()
        };
      })
      .filter((resource) => {
        const text = resource.latestVersion?.contentText ?? "";
        const metadata = resource.metadata as Record<string, unknown>;

        return (
          matches(metadata.discipline, input.discipline) &&
          matches(metadata.gradeYear, input.gradeYear) &&
          matches(metadata.skill, input.skill) &&
          matches(metadata.specificNeed, input.specificNeed) &&
          matches(text, input.q)
        );
      });
  }
}

function matches(value: unknown, filter: string | undefined): boolean {
  if (!filter) {
    return true;
  }

  return String(value ?? "")
    .toLocaleLowerCase("pt-BR")
    .includes(filter.toLocaleLowerCase("pt-BR"));
}
