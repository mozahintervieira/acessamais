import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@acessa-plus/database";
import { PrismaService } from "../database/prisma.service.js";
import type {
  CreateResourceVersionInput,
  ResourceListItem,
  ResourceSearchInput,
  ResourceVersionResult,
  ResourcesRepository
} from "./resources.repository.js";
import {
  normalizeComparable,
  type ResourceMetadata
} from "./resource-metadata.js";

@Injectable()
export class PrismaResourcesRepository implements ResourcesRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async createVersion(
    input: CreateResourceVersionInput
  ): Promise<ResourceVersionResult | null> {
    const result = await this.prisma.$transaction(async (tx) => {
      const resource = await tx.resource.findFirst({
        where: {
          id: input.resourceId,
          organizationId: input.organizationId
        },
        select: {
          id: true
        }
      });

      if (!resource) {
        return null;
      }

      const latestVersion = await tx.resourceVersion.findFirst({
        where: {
          resourceId: resource.id
        },
        orderBy: {
          versionNumber: "desc"
        },
        select: {
          versionNumber: true
        }
      });
      const version = await tx.resourceVersion.create({
        data: {
          resourceId: resource.id,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          contentJson: input.contentJson as Prisma.InputJsonValue,
          contentText: input.contentText ?? "",
          validationStatus: "PENDING"
        }
      });

      return version;
    });

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      resourceId: result.resourceId,
      versionNumber: result.versionNumber,
      contentJson: result.contentJson,
      contentText: result.contentText,
      validationStatus: result.validationStatus,
      createdAt: result.createdAt.toISOString()
    };
  }

  async listVersions(
    organizationId: string,
    resourceId: string
  ): Promise<ResourceVersionResult[]> {
    const resource = await this.prisma.resource.findFirst({
      where: {
        id: resourceId,
        organizationId
      },
      include: {
        versions: {
          orderBy: {
            versionNumber: "desc"
          }
        }
      }
    });

    if (!resource) {
      return [];
    }

    return resource.versions.map((version) => ({
      id: version.id,
      resourceId: version.resourceId,
      versionNumber: version.versionNumber,
      contentJson: version.contentJson,
      contentText: version.contentText,
      validationStatus: version.validationStatus,
      createdAt: version.createdAt.toISOString()
    }));
  }

  async listResources(input: ResourceSearchInput): Promise<ResourceListItem[]> {
    const resources = await this.prisma.resource.findMany({
      where: {
        organizationId: input.organizationId,
        ...(input.q
          ? {
              versions: {
                some: {
                  contentText: {
                    contains: input.q,
                    mode: "insensitive"
                  }
                }
              }
            }
          : {})
      },
      include: {
        versions: {
          take: 1,
          orderBy: {
            versionNumber: "desc"
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return resources
      .filter((resource) =>
        matchesMetadataFilters(resource.metadata, {
          discipline: input.discipline,
          gradeYear: input.gradeYear,
          skill: input.skill,
          specificNeed: input.specificNeed
        })
      )
      .map((resource) => ({
        id: resource.id,
        missionId: resource.missionId ?? undefined,
        type: resource.type,
        title: resource.title,
        status: resource.status,
        metadata: resource.metadata,
        latestVersion: resource.versions[0]
          ? {
              id: resource.versions[0].id,
              resourceId: resource.versions[0].resourceId,
              versionNumber: resource.versions[0].versionNumber,
              contentJson: resource.versions[0].contentJson,
              contentText: resource.versions[0].contentText,
              validationStatus: resource.versions[0].validationStatus,
              createdAt: resource.versions[0].createdAt.toISOString()
            }
          : undefined,
        createdAt: resource.createdAt.toISOString()
      }));
  }
}

function matchesMetadataFilters(
  metadata: Prisma.JsonValue,
  filters: {
    discipline?: string;
    gradeYear?: string;
    skill?: string;
    specificNeed?: string;
  }
): boolean {
  if (!isResourceMetadata(metadata)) {
    return true;
  }

  return (
    matches(metadata.discipline, filters.discipline) &&
    matches(metadata.gradeYear, filters.gradeYear) &&
    matches(metadata.skill, filters.skill) &&
    matches(metadata.specificNeed, filters.specificNeed)
  );
}

function matches(value: unknown, filter: string | undefined): boolean {
  if (!filter) {
    return true;
  }

  return normalizeComparable(String(value ?? "")).includes(
    normalizeComparable(filter)
  );
}

function isResourceMetadata(value: unknown): value is ResourceMetadata {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
