import { describe, expect, it } from "vitest";
import type {
  CreateMissionRequest,
  DecisionResult,
  ResourceDraft
} from "./index.js";

describe("shared domain contracts", () => {
  it("keeps mission input independent from UI and infrastructure", () => {
    const request: CreateMissionRequest = {
      userId: "user_1",
      organizationId: "org_1",
      missionType: "CREATE_LESSON_PLAN",
      input: {
        subject: "Lingua Portuguesa",
        stage: "Ensino Fundamental"
      }
    };

    expect(request.missionType).toBe("CREATE_LESSON_PLAN");
  });

  it("allows resource metadata to evolve through protocol applications", () => {
    const draft: ResourceDraft = {
      organizationId: "org_1",
      createdByUserId: "user_1",
      type: "LESSON_PLAN",
      title: "Planejamento inicial",
      metadata: {
        protocolApplications: [
          {
            protocolId: "metodo-acessa",
            protocolVersion: "0.1.0",
            criteriaUsed: ["mission-structured-before-generation"]
          }
        ]
      },
      content: {}
    };

    expect(draft.metadata.protocolApplications?.[0]?.protocolId).toBe(
      "metodo-acessa"
    );
  });

  it("represents decisions before pedagogical planning", () => {
    const decision: DecisionResult = {
      stages: {
        CONTEXT: ["Context resolved before normalization."],
        OBJECTIVE: ["Reduce planning time."],
        CONSTRAINTS: ["Do not call AI directly."],
        EXPECTED_PRODUCT: ["Editable pedagogical plan."]
      },
      knowledgeApplications: [],
      objectives: ["Reduce planning time."],
      constraints: ["Do not call AI directly."],
      expectedProducts: ["Editable pedagogical plan."],
      warnings: [],
      canProceedToPedagogicalEngine: true
    };

    expect(decision.canProceedToPedagogicalEngine).toBe(true);
  });
});
