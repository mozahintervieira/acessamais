export type KnowledgeAssetType =
  | "PROTOCOL"
  | "CURRICULUM"
  | "LEGISLATION"
  | "SCIENTIFIC_EVIDENCE"
  | "INSTITUTIONAL_GUIDELINE"
  | "TEACHER_STRATEGY";

export type KnowledgeAssetStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type KnowledgeAsset = {
  id: string;
  name: string;
  version: string;
  type: KnowledgeAssetType;
  scope: string[];
  status: KnowledgeAssetStatus;
  authority?: string;
  metadata?: Record<string, unknown>;
};

export type KnowledgeApplicationResult = {
  knowledgeId: string;
  knowledgeVersion: string;
  knowledgeType: KnowledgeAssetType;
  appliedCriteria: string[];
  recommendations: string[];
  constraints: string[];
  confidence: number;
  warnings: string[];
};
