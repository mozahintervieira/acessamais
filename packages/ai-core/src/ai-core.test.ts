import { describe, expect, it } from "vitest";
import {
  generateJsonWithConfiguredProvider,
  NoopAiProviderAdapter,
  OpenAiResponsesJsonAdapter,
  redactPersonalData
} from "./index.js";

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

  it("uses noop generation when no OpenAI key is configured", async () => {
    const response = await generateJsonWithConfiguredProvider({
      purpose: "LESSON_PLAN_GENERATION",
      systemPrompt: "Gere JSON.",
      userPayload: { pedido: "atividade" },
      outputSchemaName: "PedagogicalPlan"
    });

    expect(response.provider).toBe("noop");
    expect(response.warnings.length).toBeGreaterThan(0);
  });

  it("parses structured JSON from OpenAI responses", async () => {
    const adapter = new OpenAiResponsesJsonAdapter({
      apiKey: "test-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            output_text: "{\"studentSheet\":{\"title\":\"Atividade\"}}",
            usage: {
              input_tokens: 10,
              output_tokens: 5
            }
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
    });
    const response = await adapter.generate<{ studentSheet: { title: string } }>({
      purpose: "LESSON_PLAN_GENERATION",
      structuredContext: {
        systemPrompt: "Gere JSON.",
        userPayload: { pedido: "atividade" }
      },
      outputSchemaName: "PedagogicalPlan",
      safetyLevel: "STANDARD"
    });

    expect(response.provider).toBe("openai-responses");
    expect(response.output.studentSheet.title).toBe("Atividade");
    expect(response.usage?.inputTokens).toBe(10);
  });
});
