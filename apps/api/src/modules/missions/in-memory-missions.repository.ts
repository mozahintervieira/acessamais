import type {
  MissionDetail,
  MissionListItem,
  MissionsRepository,
  PersistMissionInput,
  PersistedMissionResult
} from "./missions.repository.js";

export class InMemoryMissionsRepository implements MissionsRepository {
  private readonly missions = new Map<string, MissionDetail>();

  async persistMission(
    input: PersistMissionInput
  ): Promise<PersistedMissionResult> {
    const missionId = `mission_${this.missions.size + 1}`;
    const resourceId = `resource_${this.missions.size + 1}`;
    const versionId = `version_${this.missions.size + 1}`;
    const createdAt = new Date().toISOString();

    this.missions.set(missionId, {
      id: missionId,
      organizationId: input.request.organizationId,
      createdByUserId: input.request.userId,
      missionType: input.request.missionType,
      status: input.status === "COMPLETED" ? "COMPLETED" : "FAILED",
      input: input.request.input,
      createdAt,
      resources: [
        {
          id: resourceId,
          type: "LESSON_PLAN",
          title: this.resolveTitle(input),
          status: "DRAFT",
          metadata: {
            context: input.context,
            decision: input.decision,
            missionType: input.request.missionType
          },
          versions: [
            {
              id: versionId,
              versionNumber: 1,
              contentJson: input.pedagogicalPlan,
              contentText: input.contentText,
              validationStatus: "PENDING",
              createdAt
            }
          ]
        }
      ]
    });

    return { missionId, resourceId, versionId };
  }

  async listMissions(organizationId: string): Promise<MissionListItem[]> {
    return [...this.missions.values()]
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

  async getMissionDetail(
    organizationId: string,
    missionId: string
  ): Promise<MissionDetail | null> {
    const mission = this.missions.get(missionId);

    if (!mission || mission.organizationId !== organizationId) {
      return null;
    }

    return mission;
  }

  private resolveTitle(input: PersistMissionInput): string {
    return input.request.input.theme
      ? `Planejamento inclusivo: ${input.request.input.theme}`
      : "Planejamento inclusivo";
  }
}
