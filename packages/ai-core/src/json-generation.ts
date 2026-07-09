import type {
  AiGatewayPurpose,
  AiGatewayRequest,
  AiGatewayResponse
} from "@acessa-plus/types";
import { NoopAiProviderAdapter, type AiProviderAdapter } from "./ai-provider.js";

export type AiJsonGenerationInput = {
  purpose: AiGatewayPurpose;
  systemPrompt: string;
  userPayload: unknown;
  outputSchemaName: string;
  safetyLevel?: AiGatewayRequest["safetyLevel"];
};

export type AiRuntimeConfig = {
  openAiApiKey?: string;
  openAiModel?: string;
  fetchImpl?: typeof fetch;
};

type OpenAiStructuredContext = {
  systemPrompt: string;
  userPayload: unknown;
  model?: string;
};

type OpenAiResponsesPayload = {
  output_text?: string;
  output?: unknown;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

export async function generateJsonWithConfiguredProvider<TOutput>(
  input: AiJsonGenerationInput,
  config: AiRuntimeConfig = {}
): Promise<AiGatewayResponse<TOutput>> {
  const adapter = config.openAiApiKey
    ? new OpenAiResponsesJsonAdapter({
        apiKey: config.openAiApiKey,
        model: config.openAiModel,
        fetchImpl: config.fetchImpl
      })
    : new NoopAiProviderAdapter();

  return adapter.generate<TOutput>({
    purpose: input.purpose,
    outputSchemaName: input.outputSchemaName,
    safetyLevel: input.safetyLevel ?? "STANDARD",
    structuredContext: {
      systemPrompt: input.systemPrompt,
      userPayload: input.userPayload,
      model: config.openAiModel
    } satisfies OpenAiStructuredContext
  });
}

export class OpenAiResponsesJsonAdapter implements AiProviderAdapter {
  readonly id = "openai-responses";
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly config: {
      apiKey: string;
      model?: string;
      fetchImpl?: typeof fetch;
    }
  ) {
    this.model = config.model ?? "gpt-4.1-mini";
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async generate<TOutput>(
    request: AiGatewayRequest
  ): Promise<AiGatewayResponse<TOutput>> {
    const context = this.parseContext(request.structuredContext);
    const model = context.model ?? this.model;
    const response = await this.fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: context.systemPrompt
          },
          {
            role: "user",
            content: JSON.stringify(context.userPayload)
          }
        ],
        text: {
          format: {
            type: "json_object"
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`O provedor de IA retornou erro ${response.status}: ${errorText}`);
    }

    const payload = (await response.json()) as OpenAiResponsesPayload;
    const outputText = payload.output_text ?? extractOutputText(payload.output);

    if (!outputText) {
      throw new Error("O provedor de IA nao retornou um recurso estruturado.");
    }

    return {
      provider: this.id,
      model,
      output: parseJsonObject(outputText) as TOutput,
      warnings: [],
      usage: {
        inputTokens: payload.usage?.input_tokens,
        outputTokens: payload.usage?.output_tokens
      }
    };
  }

  private parseContext(value: unknown): OpenAiStructuredContext {
    if (
      !isRecord(value) ||
      typeof value.systemPrompt !== "string" ||
      !value.systemPrompt.trim()
    ) {
      throw new Error("Contexto de IA invalido: systemPrompt e obrigatorio.");
    }

    return {
      systemPrompt: value.systemPrompt,
      userPayload: value.userPayload,
      model: typeof value.model === "string" ? value.model : undefined
    };
  }
}

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("A resposta do provedor de IA nao retornou um objeto estruturado.");
  }

  return parsed;
}

function extractOutputText(output: unknown): string | undefined {
  if (!Array.isArray(output)) {
    return undefined;
  }

  return output
    .flatMap((item) =>
      isRecord(item) && Array.isArray(item.content) ? item.content : []
    )
    .map((content) =>
      isRecord(content) && typeof content.text === "string" ? content.text : ""
    )
    .filter(Boolean)
    .join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
