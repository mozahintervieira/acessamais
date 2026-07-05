export type ResourceType = "LESSON_PLAN" | "ADAPTED_ACTIVITY";

export type ResourceStatus = "DRAFT" | "VALIDATED" | "ARCHIVED";

export type ValidationStatus = "PENDING" | "PASSED" | "WARNING" | "FAILED";

export type ResourceMetadata = {
  subject?: string;
  stage?: string;
  yearGrade?: string;
  protocolApplications?: Array<{
    protocolId: string;
    protocolVersion: string;
    criteriaUsed: string[];
  }>;
  accessibilityTags?: string[];
  cognitiveTargets?: string[];
  sourceMissionId?: string;
};

export type ResourceDraft = {
  organizationId: string;
  createdByUserId: string;
  type: ResourceType;
  title: string;
  metadata: ResourceMetadata;
  content: unknown;
};
