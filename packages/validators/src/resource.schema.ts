import { z } from "zod";

export const resourceTypeSchema = z.enum(["LESSON_PLAN", "ADAPTED_ACTIVITY"]);

export const resourceMetadataSchema = z
  .object({
    subject: z.string().optional(),
    stage: z.string().optional(),
    yearGrade: z.string().optional(),
    protocolApplications: z
      .array(
        z.object({
          protocolId: z.string().min(1),
          protocolVersion: z.string().min(1),
          criteriaUsed: z.array(z.string().min(1))
        })
      )
      .optional(),
    accessibilityTags: z.array(z.string()).optional(),
    cognitiveTargets: z.array(z.string()).optional(),
    sourceMissionId: z.string().optional()
  })
  .passthrough();

export const resourceDraftSchema = z.object({
  organizationId: z.string().min(1),
  createdByUserId: z.string().min(1),
  type: resourceTypeSchema,
  title: z.string().min(1),
  metadata: resourceMetadataSchema,
  content: z.unknown()
});
