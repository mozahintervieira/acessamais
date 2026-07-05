import type {
  CreateMissionRequest,
  DecisionResult,
  PedagogicalPlan,
  ResolvedContext
} from "@acessa-plus/types";

export type PersistMissionInput = {
  request: CreateMissionRequest;
  context: ResolvedContext;
  decision: DecisionResult;
  pedagogicalPlan: PedagogicalPlan;
  contentText: string;
  status: "COMPLETED" | "NEEDS_REVIEW";
};

export type PersistedMissionResult = {
  missionId: string;
  resourceId: string;
  versionId: string;
};

export type MissionListItem = {
  id: string;
  missionType: string;
  status: string;
  title: string;
  resourceId?: string;
  createdAt: string;
};

export type MissionDetail = {
  id: string;
  organizationId: string;
  createdByUserId: string;
  missionType: string;
  status: string;
  input: unknown;
  createdAt: string;
  resources: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    metadata: unknown;
    versions: Array<{
      id: string;
      versionNumber: number;
      contentJson: unknown;
      contentText: string;
      validationStatus: string;
      createdAt: string;
    }>;
  }>;
};

export interface MissionsRepository {
  persistMission(input: PersistMissionInput): Promise<PersistedMissionResult>;
  listMissions(organizationId: string): Promise<MissionListItem[]>;
  getMissionDetail(
    organizationId: string,
    missionId: string
  ): Promise<MissionDetail | null>;
}

export const MISSIONS_REPOSITORY = Symbol("MISSIONS_REPOSITORY");
