import type {
  ContextResolutionRequest,
  MissionInput,
  ResolvedContext
} from "@acessa-plus/types";

const REQUIRED_LESSON_PLAN_FIELDS: Array<keyof MissionInput> = [
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

export class ContextResolver {
  resolve(request: ContextResolutionRequest): ResolvedContext {
    const missingFields = this.resolveRequiredFields(request.rawInput).filter(
      (field) => {
        const value = request.rawInput[field];

        return Array.isArray(value) ? value.length === 0 : !value;
      }
    );
    const detectedSignals = this.detectSignals(request.rawInput);

    return {
      missionType: request.missionType,
      rawInput: request.rawInput,
      organizationId: request.organizationId,
      userId: request.userId,
      studentProfile: request.studentProfile,
      schoolProfile: request.schoolProfile,
      availableKnowledgeIds: request.availableKnowledgeIds ?? [],
      detectedSignals,
      missingFields,
      completeness: this.resolveCompleteness(missingFields, detectedSignals)
    };
  }

  private detectSignals(input: MissionInput): string[] {
    const signals = new Set<string>();

    if (input.discipline ?? input.subject) {
      signals.add("discipline-present");
    }

    if (input.gradeYear ?? input.stage ?? input.yearGrade) {
      signals.add("grade-year-present");
    }

    if (input.lessonObjective ?? input.objective) {
      signals.add("objective-explicit");
    }

    if (input.skill) {
      signals.add("curriculum-skill-present");
    }

    if (input.knowledgeObject) {
      signals.add("knowledge-object-present");
    }

    if (input.originalContent) {
      signals.add("source-content-present");
    }

    if (input.specificNeed || (input.accessibilityNeeds?.length ?? 0) > 0) {
      signals.add("specific-need-present");
    }

    if (input.learningPreference) {
      signals.add("learning-preference-present");
    }

    if (input.expectedProductType) {
      signals.add("expected-product-present");
    }

    return [...signals];
  }

  private resolveRequiredFields(input: MissionInput): Array<keyof MissionInput> {
    if (
      input.discipline ||
      input.gradeYear ||
      input.skill ||
      input.knowledgeObject ||
      input.lessonObjective ||
      input.expectedProductType
    ) {
      return REQUIRED_LESSON_PLAN_FIELDS;
    }

    return ["objective"];
  }

  private resolveCompleteness(
    missingFields: string[],
    detectedSignals: string[]
  ): ResolvedContext["completeness"] {
    if (missingFields.length === 0) {
      return "COMPLETE";
    }

    if (detectedSignals.length >= 2) {
      return "PARTIAL";
    }

    return "INSUFFICIENT";
  }
}
