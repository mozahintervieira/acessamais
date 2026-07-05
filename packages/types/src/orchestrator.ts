import type { MissionSnapshot } from "./missions.js";

export type OrchestrationRequest = {
  mission: MissionSnapshot;
  userId: string;
  organizationId: string;
};

export type OrchestrationStatus = "DRAFT" | "WARNING" | "FAILED";

export type OrchestrationResult = {
  missionId: string;
  resourceId?: string;
  versionId?: string;
  status: OrchestrationStatus;
  validationSummary: {
    pedagogicalScore?: number;
    accessibilityScore?: number;
    legalRiskScore?: number;
    warnings: string[];
  };
  nextActions: Array<"EDIT" | "SAVE" | "REGENERATE" | "VALIDATE">;
};
