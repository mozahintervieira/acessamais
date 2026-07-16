import type {
  CreateMissionRequest,
  DecisionResult,
  ResolvedContext
} from "@acessa-plus/types";
import {
  buildAdaptationProfileText,
  PEDAGOGICAL_ADAPTATION_RULES
} from "./adaptation-rules.js";
import {
  CURRICULAR_ANALYSIS_STEPS,
  type ResourceGenerationType
} from "./generation-contract.js";
import { resolveGenerationContract } from "./generation-contract-registry.js";
import {
  ADAPTED_ACTIVITY_SYSTEM_PROMPT,
  resolveGenerationSystemPrompt
} from "./generation-system-prompts.js";
import {
  buildMaterialBlueprint
} from "./material-blueprint-builder.js";
import type { MaterialBlueprint } from "./material-blueprint.js";

export const PEDAGOGICAL_GENERATION_SYSTEM_PROMPT =
  ADAPTED_ACTIVITY_SYSTEM_PROMPT;

export type PedagogicalGenerationPrompt = {
  systemPrompt: string;
  userPayload: Record<string, unknown>;
  outputSchemaName: "AcessaPlusPedagogicalResource";
};

export function buildPedagogicalGenerationPrompt(
  request: CreateMissionRequest,
  context: ResolvedContext,
  decision: DecisionResult,
  generationType?: ResourceGenerationType,
  materialBlueprint?: MaterialBlueprint
): PedagogicalGenerationPrompt {
  const contractEntry = resolveGenerationContract(generationType);
  const systemPromptEntry = resolveGenerationSystemPrompt(generationType);
  const blueprint =
    materialBlueprint ?? buildMaterialBlueprint(request, context, decision);

  return {
    systemPrompt: systemPromptEntry.systemPrompt,
    userPayload: {
      tarefa:
        "Analisar primeiro a habilidade curricular e somente depois gerar o recurso educacional solicitado pelo professor em dois documentos separados. O documento principal deve ser a folha do estudante, sem informacoes tecnicas. O guia do professor deve conter as informacoes pedagogicas e tecnicas separadamente.",
      materialBlueprintObrigatorio:
        "O MaterialBlueprint abaixo e obrigatorio. Cada atividade da studentSheet deve corresponder a uma plannedTask, respeitando ordem, actionType, intencao pedagogica, forma de resposta, apoio necessario, funcao visual e criterio de sucesso. Nao substitua o blueprint por lista generica de perguntas.",
      materialBlueprint: blueprint,
      referenciaCurricular:
        "Usar a BNCC como referencia nacional e, quando o professor informar Espirito Santo, SEDU-ES, Curriculo do Espirito Santo ou ano 2026, considerar essa referencia curricular na analise. Se a habilidade estadual for informada, preservar seu codigo e interpretar a competencia antes de criar atividades.",
      etapaObrigatoriaDeAnaliseCurricular: CURRICULAR_ANALYSIS_STEPS,
      perfilInteligenteDeAdaptacao: buildAdaptationProfileText(request.input),
      regrasDeAdaptacao: PEDAGOGICAL_ADAPTATION_RULES,
      contrato: contractEntry.contract,
      pedidoNatural: request.input.rawPrompt,
      mission: request,
      context,
      decision
    },
    outputSchemaName: "AcessaPlusPedagogicalResource"
  };
}
