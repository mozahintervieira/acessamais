import type {
  DecisionInput,
  DecisionResult,
  KnowledgeApplicationResult
} from "@acessa-plus/types";
import { KnowledgeRegistry } from "./knowledge-registry.js";

export class DecisionEngine {
  constructor(private readonly knowledge: KnowledgeRegistry) {}

  decide(input: DecisionInput): DecisionResult {
    const knowledgeApplications = input.activeKnowledgeIds.flatMap((id) =>
      this.applyKnowledge(id)
    );
    const objectives = this.resolveObjectives(input);
    const constraints = this.resolveConstraints(input, knowledgeApplications);
    const expectedProducts = this.resolveExpectedProducts(input);
    const warnings = this.resolveWarnings(input, knowledgeApplications);

    return {
      stages: {
        CONTEXT: this.describeContext(input),
        OBJECTIVE: objectives,
        CONSTRAINTS: constraints,
        EXPECTED_PRODUCT: expectedProducts
      },
      knowledgeApplications,
      objectives,
      constraints,
      expectedProducts,
      warnings,
      canProceedToPedagogicalEngine:
        input.context.completeness !== "INSUFFICIENT"
    };
  }

  private applyKnowledge(assetId: string): KnowledgeApplicationResult[] {
    const asset = this.knowledge.getActive(assetId);

    if (!asset) {
      return [];
    }

    return [
      {
        knowledgeId: asset.id,
        knowledgeVersion: asset.version,
        knowledgeType: asset.type,
        appliedCriteria: [],
        recommendations: [],
        constraints: [],
        confidence: 0,
        warnings: [
          "Knowledge asset registered; detailed criteria will evolve in later cycles."
        ]
      }
    ];
  }

  private describeContext(input: DecisionInput): string[] {
    return [
      `Mission type: ${input.context.missionType}`,
      `Context completeness: ${input.context.completeness}`,
      ...input.context.detectedSignals
    ];
  }

  private resolveObjectives(input: DecisionInput): string[] {
    const objective =
      input.context.rawInput.lessonObjective ?? input.context.rawInput.objective;

    if (objective) {
      return [objective];
    }

    return [
      "Clarify the pedagogical objective before generation or proceed with human review."
    ];
  }

  private resolveConstraints(
    input: DecisionInput,
    applications: KnowledgeApplicationResult[]
  ): string[] {
    const constraints = [
      "Resolve context before mission normalization.",
      "Define objective, constraints and expected product before generation.",
      "Do not call AI directly from the interface or pedagogical domain."
    ];

    if (input.context.missingFields.length > 0) {
      constraints.push(
        `Missing fields must be reviewed: ${input.context.missingFields.join(", ")}.`
      );
    }

    if (applications.length === 0) {
      constraints.push("No active knowledge asset was applied.");
    }

    return constraints;
  }

  private resolveExpectedProducts(input: DecisionInput): string[] {
    if (input.context.rawInput.expectedProductType) {
      return [input.context.rawInput.expectedProductType];
    }

    if (input.context.missionType === "CREATE_LESSON_PLAN") {
      return ["Editable inclusive lesson plan"];
    }

    return ["Editable adapted activity"];
  }

  private resolveWarnings(
    input: DecisionInput,
    applications: KnowledgeApplicationResult[]
  ): string[] {
    const warnings: string[] = [];

    if (input.context.completeness === "INSUFFICIENT") {
      warnings.push("Context is insufficient for pedagogical interpretation.");
    }

    if (applications.length === 0) {
      warnings.push("No active knowledge asset matched this decision.");
    }

    return warnings;
  }
}
