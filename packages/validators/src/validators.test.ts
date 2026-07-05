import { describe, expect, it } from "vitest";
import { createMissionRequestSchema, resourceDraftSchema } from "./index.js";

describe("shared validators", () => {
  it("accepts an extensible mission request", () => {
    const parsed = createMissionRequestSchema.parse({
      userId: "user_1",
      organizationId: "org_1",
      missionType: "ADAPT_ACTIVITY",
      input: {
        originalContent: "Leia o texto e responda.",
        accessibilityNeeds: ["DI", "TEA"]
      }
    });

    expect(parsed.missionType).toBe("ADAPT_ACTIVITY");
  });

  it("requires guided lesson planning fields for CREATE_LESSON_PLAN", () => {
    const parsed = createMissionRequestSchema.parse({
      userId: "user_1",
      organizationId: "org_1",
      missionType: "CREATE_LESSON_PLAN",
      input: {
        discipline: "Lingua Portuguesa",
        gradeYear: "5 ano",
        skill: "Identificar informacoes explicitas em textos.",
        knowledgeObject: "Leitura e interpretacao",
        theme: "Noticia",
        lessonObjective: "Compreender a estrutura de uma noticia.",
        specificNeed: "Deficiencia intelectual",
        learningPreference: "Aprende melhor com imagens e exemplos concretos.",
        readingWritingLevel: "Le frases curtas com apoio.",
        availableResources: ["cartazes", "tablet"],
        expectedProductType: "Plano de aula inclusivo"
      }
    });

    expect(parsed.input.discipline).toBe("Lingua Portuguesa");
  });

  it("keeps resource metadata extensible", () => {
    const parsed = resourceDraftSchema.parse({
      organizationId: "org_1",
      createdByUserId: "user_1",
      type: "ADAPTED_ACTIVITY",
      title: "Atividade adaptada",
      metadata: {
        futureProtocolField: true
      },
      content: {}
    });

    expect(parsed.metadata.futureProtocolField).toBe(true);
  });
});
