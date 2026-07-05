import type { MissionType } from "./missions.js";
import type { ResolvedContext } from "./context.js";
import type { DecisionResult } from "./decision.js";
import type { KnowledgeApplicationResult } from "./knowledge.js";

export type PedagogicalAnalysisRequest = {
  missionType: MissionType;
  context: ResolvedContext;
  decision: DecisionResult;
};

export type ProtocolApplicationResult = KnowledgeApplicationResult;

export type PedagogicalPlan = {
  intent: MissionType;
  contextCompleteness: ResolvedContext["completeness"];
  objectives: string[];
  expectedOutputs: string[];
  protocolApplications: ProtocolApplicationResult[];
  methodologicalConstraints: string[];
  validationCriteria: string[];
  warnings: string[];
};
