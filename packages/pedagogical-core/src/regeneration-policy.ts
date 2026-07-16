import {
  type ResourceGenerationType
} from "./generation-contract.js";
import { resolveGenerationContract } from "./generation-contract-registry.js";
import type { MaterialBlueprint } from "./material-blueprint.js";
import type {
  GeneratedPedagogicalMaterial,
  PedagogicalValidationIssue,
  PedagogicalValidationReport
} from "./pedagogical-validator.js";

const MAX_REGENERATION_ATTEMPTS = 1;

export type PedagogicalCorrectionPrompt = {
  systemPrompt: string;
  userPayload: Record<string, unknown>;
  outputSchemaName: "AcessaPlusPedagogicalResource";
};

export type RegenerationPolicyInput = {
  materialBlueprint: MaterialBlueprint;
  originalOutput: GeneratedPedagogicalMaterial;
  validationReport: PedagogicalValidationReport;
  attempt: number;
  generationType?: ResourceGenerationType;
};

export type RegenerationDecision = {
  shouldRegenerate: boolean;
  reason: string;
  maxAttempts: number;
  correctionPrompt?: PedagogicalCorrectionPrompt;
};

export type RegenerationCandidate<TOutput> = {
  attempt: number;
  output: TOutput;
  report: PedagogicalValidationReport;
};

export type RegenerationSelection<TOutput> = {
  selected: RegenerationCandidate<TOutput>;
  attempts: Array<RegenerationCandidate<TOutput>>;
  belowStandard: boolean;
};

export class RegenerationPolicy {
  decide(input: RegenerationPolicyInput): RegenerationDecision {
    if (input.validationReport.approved) {
      return {
        shouldRegenerate: false,
        reason: "Material aprovado pelo PedagogicalValidator.",
        maxAttempts: MAX_REGENERATION_ATTEMPTS
      };
    }

    if (input.attempt >= MAX_REGENERATION_ATTEMPTS) {
      return {
        shouldRegenerate: false,
        reason: "Limite de uma regeneracao corretiva ja foi atingido.",
        maxAttempts: MAX_REGENERATION_ATTEMPTS
      };
    }

    return {
      shouldRegenerate: true,
      reason: "Material reprovado; uma correcao orientada pelo relatorio sera solicitada.",
      maxAttempts: MAX_REGENERATION_ATTEMPTS,
      correctionPrompt: buildPedagogicalCorrectionPrompt(input)
    };
  }
}

export function buildPedagogicalCorrectionPrompt(
  input: RegenerationPolicyInput
): PedagogicalCorrectionPrompt {
  const contract = resolveGenerationContract(input.generationType).contract;
  const correctionInstructions = buildCorrectionInstructions(
    input.validationReport.issues
  );

  return {
    systemPrompt:
      "Voce e o Motor Pedagogico corretivo do ACESSA+. Corrija somente os pontos reprovados pelo PedagogicalValidator, preservando as partes aprovadas. Nao altere o objetivo pedagogico, a habilidade, o conteudo, o numero de tarefas, nem o contrato final studentSheet/teacherGuide. Responda somente JSON valido, sem markdown.",
    userPayload: {
      tarefa:
        "Corrigir uma geracao pedagogica ja criada, usando o MaterialBlueprint e o relatorio de validacao. Nao refazer todo o material quando apenas partes especificas estiverem inadequadas.",
      tentativa: input.attempt + 1,
      limiteDeTentativas: MAX_REGENERATION_ATTEMPTS,
      preservarObrigatoriamente: [
        "partes aprovadas",
        "objetivo pedagogico",
        "habilidade curricular",
        "conteudo",
        "numero de tarefas",
        "studentSheet",
        "teacherGuide",
        "contrato publico atual"
      ],
      materialBlueprint: input.materialBlueprint,
      saidaOriginal: input.originalOutput,
      relatorioDoValidator: input.validationReport,
      instrucoesDeCorrecao: correctionInstructions,
      contrato: contract
    },
    outputSchemaName: "AcessaPlusPedagogicalResource"
  };
}

export function selectRegenerationOutput<TOutput>(
  first: RegenerationCandidate<TOutput>,
  second?: RegenerationCandidate<TOutput>
): RegenerationSelection<TOutput> {
  if (!second) {
    return {
      selected: first,
      attempts: [first],
      belowStandard: !first.report.approved
    };
  }

  const selected =
    second.report.approved || second.report.totalScore >= first.report.totalScore
      ? second
      : first;

  return {
    selected,
    attempts: [first, second],
    belowStandard: !selected.report.approved
  };
}

function buildCorrectionInstructions(
  issues: PedagogicalValidationIssue[]
): string[] {
  const instructions = new Set<string>();

  for (const issue of issues) {
    switch (issue.code) {
      case "MISSING_PLANNED_TASK":
        instructions.add(
          "Recriar a studentSheet com uma tarefa para cada plannedTask do MaterialBlueprint, sem omitir nenhuma ordem."
        );
        break;
      case "ACTION_TYPE_MISMATCH":
        instructions.add(
          "Corrigir cada tarefa para preservar exatamente o actionType planejado no MaterialBlueprint."
        );
        break;
      case "RESPONSE_MODE_MISMATCH":
        instructions.add(
          "Ajustar a forma de resposta de cada tarefa para respeitar o responseMode planejado."
        );
        break;
      case "VISUAL_FUNCTION_MISSING":
        instructions.add(
          "Vincular cada tarefa a um recurso visual com funcao pedagogica explicita, preservando visualFunction."
        );
        break;
      case "CONTENT_BOUNDARY_VIOLATION":
        instructions.add(
          "Reconstruir o conteudo dentro do objeto de conhecimento solicitado, sem trocar tema, disciplina ou habilidade."
        );
        break;
      case "INCOMPATIBLE_FALLBACK":
        instructions.add(
          "Remover qualquer fallback incompativel, como Progressao Aritmetica em pedido de equacoes, e preservar o conteudo informado."
        );
        break;
      case "FINAL_SHEET_REPETITION":
        instructions.add(
          "Diferenciar as tarefas finais usando acoes, formas de resposta e recursos visuais distintos."
        );
        break;
      case "EXCESSIVE_REPETITION":
        instructions.add(
          "Substituir tarefas repetidas por acoes pedagogicas distintas, mantendo quantidade, objetivo, habilidade e conteudo."
        );
        instructions.add(
          "Usar variedade real: observar, parear, completar, resolver, aplicar ou criar exemplo guiado conforme o MaterialBlueprint."
        );
        break;
      case "WEAK_PROGRESSION":
        instructions.add(
          "Reorganizar as tarefas do maior apoio para menor apoio, incluindo aplicacao ou generalizacao ao final."
        );
        break;
      case "SEVERE_INFANTILIZATION":
        instructions.add(
          "Adequar linguagem, exemplos e recursos visuais a idade e a serie, sem aumentar desnecessariamente a complexidade textual."
        );
        instructions.add(
          "Manter linguagem simples e respeitosa, sem termos infantis, diminutivos ou tom inadequado para adolescente ou jovem."
        );
        break;
      case "DECORATIVE_VISUALS":
        instructions.add(
          "Substituir elementos decorativos por visuais com funcao pedagogica explicita, como balanca, tabela, setas, blocos, mapa, linha do tempo ou organizador visual."
        );
        break;
      case "BLUEPRINT_IGNORED":
        instructions.add(
          "Reconstruir as tarefas seguindo cada plannedTask do MaterialBlueprint, respeitando ordem, actionType, forma de resposta, apoio e criterio de sucesso."
        );
        break;
      case "TASK_COUNT_MISMATCH":
        instructions.add(
          "Ajustar a quantidade de tarefas para corresponder exatamente ao requestedTaskCount do MaterialBlueprint."
        );
        break;
      case "INCOMPLETE_TASK_DATA":
        instructions.add(
          "Completar taskData de cada tarefa de acordo com seu actionType, usando conteudo concreto do tema, sem placeholders."
        );
        break;
      case "GENERIC_PLACEHOLDER":
        instructions.add(
          "Remover placeholders, imagens de paisagem e descricoes genericas; substituir por dados renderizaveis relacionados ao conteudo curricular."
        );
        break;
      case "MISSING_MATCH_PAIRS":
        instructions.add(
          "Para tarefas MATCH, preencher leftItems, rightItems e correctPairs com pelo menos tres pares reais, coerentes e verificaveis."
        );
        break;
      case "MISSING_COMPLETION_DATA":
        instructions.add(
          "Para tarefas COMPLETE, preencher statements, blanks, expectedAnswers e supportSteps com lacunas reais e respostas esperadas."
        );
        break;
      case "MISSING_PROBLEM_CONTEXT":
        instructions.add(
          "Para tarefas SOLVE, preencher problemContext, equation, guidedSteps, answer e calculationSpace com uma situacao-problema concreta."
        );
        break;
      case "MISSING_GUIDED_CREATION_DATA":
        instructions.add(
          "Para tarefas CREATE_GUIDED_EXAMPLE, preencher contextPrompt, availableValues, constructionSteps, fieldsToComplete e exampleAnswer."
        );
        break;
      case "INVALID_MATH_CONTENT":
        instructions.add(
          "Corrigir os numeros das equacoes simples para que cada equacao tenha resultado matematicamente correto e verificavel."
        );
        break;
      case "VISUAL_CONTENT_MISMATCH":
        instructions.add(
          "Alinhar instrucao visual e taskData: se pedir blocos, balanca, cartoes, lacunas ou pares, fornecer os dados concretos para renderizar esse recurso."
        );
        break;
      case "CURRICULAR_MISALIGNMENT":
        instructions.add(
          "Reforcar alinhamento direto com habilidade, objetivo e objeto de conhecimento, sem trocar o conteudo central."
        );
        break;
      case "LANGUAGE_INADEQUATE":
        instructions.add(
          "Reduzir comandos longos, usar frases objetivas e organizar instrucoes em passos curtos."
        );
        break;
      case "PROFILE_IGNORED":
        instructions.add(
          "Aplicar apoios coerentes com o perfil funcional, barreiras identificadas e nivel de apoio previsto."
        );
        break;
      case "UNCLEAR_INSTRUCTIONS":
        instructions.add(
          "Reescrever comandos pouco claros para que cada tarefa indique acao, apoio e forma de resposta."
        );
        break;
      case "WEAK_TEACHER_GUIDE":
        instructions.add(
          "Completar o guia do professor com barreiras, apoios, mediacao docente e criterios de sucesso."
        );
        break;
    }
  }

  if (instructions.size === 0) {
    instructions.add(
      "Corrigir apenas os pontos indicados pelo relatorio, preservando as partes pedagogicamente adequadas."
    );
  }

  return [...instructions];
}
