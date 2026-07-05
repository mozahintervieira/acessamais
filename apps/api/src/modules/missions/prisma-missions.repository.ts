import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@acessa-plus/database";
import { PrismaService } from "../database/prisma.service.js";
import type {
  MissionDetail,
  MissionListItem,
  MissionsRepository,
  PersistMissionInput,
  PersistedMissionResult
} from "./missions.repository.js";
import { buildResourceMetadata } from "../resources/resource-metadata.js";

@Injectable()
export class PrismaMissionsRepository implements MissionsRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async persistMission(
    input: PersistMissionInput
  ): Promise<PersistedMissionResult> {
    await this.ensureDemoScope(input.request.organizationId, input.request.userId);

    const result = await this.prisma.$transaction(async (tx) => {
      const mission = await tx.mission.create({
        data: {
          organizationId: input.request.organizationId,
          createdByUserId: input.request.userId,
          type: input.request.missionType,
          status: input.status === "COMPLETED" ? "COMPLETED" : "FAILED",
          input: input.request.input as Prisma.InputJsonValue,
          profileContext: {
            context: input.context
          } as Prisma.InputJsonValue
        }
      });
      const resource = await tx.resource.create({
        data: {
          organizationId: input.request.organizationId,
          createdByUserId: input.request.userId,
          missionId: mission.id,
          type: "LESSON_PLAN",
          title: this.resolveTitle(input),
          status: "DRAFT",
          metadata: buildResourceMetadata({
            request: input.request,
            context: input.context,
            decision: input.decision,
            knowledgeApplications: input.pedagogicalPlan.protocolApplications
          }) as Prisma.InputJsonValue
        }
      });
      const version = await tx.resourceVersion.create({
        data: {
          resourceId: resource.id,
          versionNumber: 1,
          contentJson: input.pedagogicalPlan as Prisma.InputJsonValue,
          contentText: input.contentText,
          validationStatus: "PENDING"
        }
      });

      return {
        missionId: mission.id,
        resourceId: resource.id,
        versionId: version.id
      };
    });

    return result;
  }

  async listMissions(organizationId: string): Promise<MissionListItem[]> {
    const missions = await this.prisma.mission.findMany({
      where: {
        organizationId
      },
      include: {
        resources: {
          take: 1,
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return missions.map((mission) => ({
      id: mission.id,
      missionType: mission.type,
      status: mission.status,
      title: mission.resources[0]?.title ?? "Missao sem recurso",
      resourceId: mission.resources[0]?.id,
      createdAt: mission.createdAt.toISOString()
    }));
  }

  async getMissionDetail(
    organizationId: string,
    missionId: string
  ): Promise<MissionDetail | null> {
    const mission = await this.prisma.mission.findFirst({
      where: {
        id: missionId,
        organizationId
      },
      include: {
        resources: {
          orderBy: {
            createdAt: "desc"
          },
          include: {
            versions: {
              orderBy: {
                versionNumber: "desc"
              }
            }
          }
        }
      }
    });

    if (!mission) {
      return null;
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
          versionNumber: version.versionNumber,
          contentJson: version.contentJson,
          contentText: version.contentText,
          validationStatus: version.validationStatus,
          createdAt: version.createdAt.toISOString()
        }))
      }))
    };
  }

  private async ensureDemoScope(
    organizationId: string,
    userId: string
  ): Promise<void> {
    await this.prisma.organization.upsert({
      where: {
        id: organizationId
      },
      update: {},
      create: {
        id: organizationId,
        name: "Organizacao demonstracao",
        type: "INDEPENDENT"
      }
    });
    await this.prisma.user.upsert({
      where: {
        id: userId
      },
      update: {
        organizationId
      },
      create: {
        id: userId,
        organizationId,
        name: "Professor demonstracao",
        email: `${userId}@demo.acessa.local`,
        role: "TEACHER"
      }
    });
  }

  private resolveTitle(input: PersistMissionInput): string {
    return input.request.input.theme
      ? `Planejamento inclusivo: ${input.request.input.theme}`
      : "Planejamento inclusivo";
  }
}
