import { z } from "zod";

export const missionTypeSchema = z.enum([
  "CREATE_LESSON_PLAN",
  "ADAPT_ACTIVITY"
]);

export const missionInputSchema = z.object({
  discipline: z.string().min(1).optional(),
  gradeYear: z.string().min(1).optional(),
  skill: z.string().min(1).optional(),
  knowledgeObject: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  stage: z.string().min(1).optional(),
  yearGrade: z.string().min(1).optional(),
  theme: z.string().min(1).optional(),
  lessonObjective: z.string().min(1).optional(),
  objective: z.string().min(1).optional(),
  specificNeed: z.string().min(1).optional(),
  learningPreference: z.string().min(1).optional(),
  readingWritingLevel: z.string().min(1).optional(),
  availableResources: z.array(z.string().min(1)).optional(),
  expectedProductType: z.string().min(1).optional(),
  activityType: z.string().min(1).optional(),
  questionCount: z.string().min(1).optional(),
  difficultyLevel: z.string().min(1).optional(),
  outputFormat: z.string().min(1).optional(),
  learningLevel: z.string().min(1).optional(),
  originalContent: z.string().min(1).optional(),
  accessibilityNeeds: z.array(z.string().min(1)).optional(),
  contextNotes: z.string().optional()
});

export const createMissionRequestSchema = z
  .object({
    userId: z.string().min(1),
    organizationId: z.string().min(1),
    missionType: missionTypeSchema,
    input: missionInputSchema,
    profileId: z.string().min(1).optional()
  })
  .superRefine((request, context) => {
    if (request.missionType !== "CREATE_LESSON_PLAN") {
      return;
    }

    const requiredFields: Array<keyof typeof request.input> = [
      "discipline",
      "gradeYear",
      "skill",
      "knowledgeObject",
      "theme",
      "lessonObjective",
      "specificNeed",
      "learningPreference",
      "readingWritingLevel",
      "availableResources",
      "expectedProductType"
    ];

    for (const field of requiredFields) {
      const value = request.input[field];

      if (Array.isArray(value) ? value.length === 0 : !value) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Campo obrigatorio para CREATE_LESSON_PLAN: ${field}`,
          path: ["input", field]
        });
      }
    }
  });
