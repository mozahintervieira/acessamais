import type { MissionInput, MissionType } from "./missions.js";

export type ContextCompleteness = "COMPLETE" | "PARTIAL" | "INSUFFICIENT";

export type ResolvedContext = {
  missionType: MissionType;
  rawInput: MissionInput;
  organizationId?: string;
  userId?: string;
  studentProfile?: unknown;
  schoolProfile?: unknown;
  availableKnowledgeIds: string[];
  detectedSignals: string[];
  missingFields: string[];
  completeness: ContextCompleteness;
};

export type ContextResolutionRequest = {
  missionType: MissionType;
  rawInput: MissionInput;
  organizationId?: string;
  userId?: string;
  studentProfile?: unknown;
  schoolProfile?: unknown;
  availableKnowledgeIds?: string[];
};
