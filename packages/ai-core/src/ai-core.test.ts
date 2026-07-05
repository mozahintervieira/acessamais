import { describe, expect, it } from "vitest";
import { NoopAiProviderAdapter, redactPersonalData } from "./index.js";

describe("ai-core", () => {
  it("keeps the AI provider replaceable", async () => {
    const adapter = new NoopAiProviderAdapter();
    const response = await adapter.generate({
      purpose: "LESSON_PLAN_GENERATION",
      structuredContext: {},
      outputSchemaName: "Empty",
      safetyLevel: "STANDARD"
    });

    expect(response.provider).toBe("noop");
  });

  it("redacts email addresses before provider calls", () => {
    expect(redactPersonalData("aluno@example.com")).toBe("[REDACTED_EMAIL]");
  });
});
