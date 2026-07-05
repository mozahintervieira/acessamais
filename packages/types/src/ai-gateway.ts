export type AiGatewayPurpose =
  | "LESSON_PLAN_GENERATION"
  | "ACTIVITY_ADAPTATION"
  | "VALIDATION_SUPPORT";

export type AiGatewayRequest = {
  purpose: AiGatewayPurpose;
  structuredContext: unknown;
  outputSchemaName: string;
  safetyLevel: "STANDARD" | "SENSITIVE";
};

export type AiGatewayResponse<TOutput = unknown> = {
  provider: string;
  model: string;
  output: TOutput;
  warnings: string[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCost?: number;
  };
};
