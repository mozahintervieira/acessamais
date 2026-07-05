import type { ResolvedContext } from "./context.js";
import type { KnowledgeApplicationResult } from "./knowledge.js";

export type DecisionStage =
  | "CONTEXT"
  | "OBJECTIVE"
  | "CONSTRAINTS"
  | "EXPECTED_PRODUCT";

export type DecisionInput = {
  context: ResolvedContext;
  activeKnowledgeIds: string[];
};

export type DecisionResult = {
  stages: Record<DecisionStage, string[]>;
  knowledgeApplications: KnowledgeApplicationResult[];
  objectives: string[];
  constraints: string[];
  expectedProducts: string[];
  warnings: string[];
  canProceedToPedagogicalEngine: boolean;
};
