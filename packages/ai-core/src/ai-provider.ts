import type { AiGatewayRequest, AiGatewayResponse } from "@acessa-plus/types";

export interface AiProviderAdapter {
  readonly id: string;
  generate<TOutput>(request: AiGatewayRequest): Promise<AiGatewayResponse<TOutput>>;
}

export class NoopAiProviderAdapter implements AiProviderAdapter {
  readonly id = "noop";

  async generate<TOutput>(
    request: AiGatewayRequest
  ): Promise<AiGatewayResponse<TOutput>> {
    return {
      provider: this.id,
      model: "none",
      output: {
        purpose: request.purpose,
        message: "AI provider not configured in Ciclo 1."
      } as TOutput,
      warnings: ["No external AI provider is connected in this foundation cycle."]
    };
  }
}
