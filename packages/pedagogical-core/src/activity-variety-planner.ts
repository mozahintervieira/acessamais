import type { CreateMissionRequest } from "@acessa-plus/types";
import type {
  ActivityActionType,
  FunctionalLearningLevel,
  PlannedTask
} from "./material-blueprint.js";
import type { BarrierAndAccessPlan } from "./barrier-access-resolver.js";

export class ActivityVarietyPlanner {
  plan(input: {
    request: CreateMissionRequest;
    functionalLearningLevel: FunctionalLearningLevel;
    accessPlan: BarrierAndAccessPlan;
    requestedTaskCount: number;
  }): PlannedTask[] {
    const sequence = resolveActionSequence(input.request, input.requestedTaskCount);

    return sequence.map((actionType, index) =>
      buildTask({
        actionType,
        order: index + 1,
        request: input.request,
        functionalLearningLevel: input.functionalLearningLevel,
        accessPlan: input.accessPlan,
        isLast: index === sequence.length - 1
      })
    );
  }
}

function resolveActionSequence(
  request: CreateMissionRequest,
  requestedTaskCount: number
): ActivityActionType[] {
  const source = normalizeComparable(
    `${request.input.discipline ?? request.input.subject ?? ""} ${request.input.theme ?? ""} ${request.input.knowledgeObject ?? ""} ${request.input.skill ?? ""}`
  );
  const count = Math.min(Math.max(requestedTaskCount, 1), 10);

  if (
    source.includes("matematica") &&
    (source.includes("equacao") || source.includes("equacoes"))
  ) {
    return takeDistinct(
      ["OBSERVE", "MATCH", "COMPLETE", "SOLVE", "CREATE_GUIDED_EXAMPLE"],
      count
    );
  }

  if (source.includes("matematica")) {
    return takeDistinct(["OBSERVE", "IDENTIFY", "COMPLETE", "SOLVE", "APPLY"], count);
  }

  if (source.includes("portugues") || source.includes("lingua")) {
    return takeDistinct(["OBSERVE", "IDENTIFY", "ORDER", "COMPLETE", "PRODUCE"], count);
  }

  if (source.includes("geografia") || source.includes("historia")) {
    return takeDistinct(["OBSERVE", "IDENTIFY", "COMPARE", "CLASSIFY", "APPLY"], count);
  }

  if (source.includes("quimica") || source.includes("ciencia")) {
    return takeDistinct(["OBSERVE", "CLASSIFY", "MATCH", "COMPLETE", "APPLY"], count);
  }

  return takeDistinct(["OBSERVE", "IDENTIFY", "MATCH", "COMPLETE", "APPLY"], count);
}

function takeDistinct(
  preferred: ActivityActionType[],
  count: number
): ActivityActionType[] {
  const fallback: ActivityActionType[] = [
    "COMPARE",
    "CHOOSE",
    "MARK",
    "CONNECT",
    "EXPLAIN",
    "PRODUCE",
    "CREATE_GUIDED_EXAMPLE"
  ];
  const sequence = [...preferred];

  for (const action of fallback) {
    if (sequence.length >= count) {
      break;
    }

    if (!sequence.includes(action)) {
      sequence.push(action);
    }
  }

  return sequence.slice(0, count);
}

function buildTask(input: {
  actionType: ActivityActionType;
  order: number;
  request: CreateMissionRequest;
  functionalLearningLevel: FunctionalLearningLevel;
  accessPlan: BarrierAndAccessPlan;
  isLast: boolean;
}): PlannedTask {
  const content = input.request.input.theme ?? input.request.input.knowledgeObject ?? "conteudo estudado";
  const supportRequired = resolveSupportForOrder(input.order, input.accessPlan);

  return {
    order: input.order,
    actionType: input.actionType,
    pedagogicalPurpose: resolvePedagogicalPurpose(input.actionType, content),
    cognitiveDemand: resolveCognitiveDemand(input.actionType),
    instructionStyle:
      input.order <= 2
        ? "comando curto, direto e com apoio visivel"
        : input.isLast
          ? "comando curto com menor apoio e aplicacao contextualizada"
          : "comando em passos numerados com pratica guiada",
    responseMode: resolveResponseMode(input.actionType, input.functionalLearningLevel),
    supportRequired,
    visualFunction: resolveVisualFunction(input.actionType, input.request),
    successCriterion: resolveSuccessCriterion(input.actionType, content)
  };
}

function resolveSupportForOrder(
  order: number,
  accessPlan: BarrierAndAccessPlan
): string[] {
  if (order === 1) {
    return accessPlan.recommendedSupports.slice(0, 5);
  }

  if (order === 2) {
    return accessPlan.recommendedSupports.slice(0, 4);
  }

  return accessPlan.recommendedSupports.slice(0, 3);
}

function resolvePedagogicalPurpose(
  actionType: ActivityActionType,
  content: string
): string {
  const purposes: Record<ActivityActionType, string> = {
    OBSERVE: `ativar repertorio inicial e reconhecer representacao visual de ${content}`,
    IDENTIFY: `identificar elementos essenciais de ${content}`,
    MATCH: `parear representacoes e respostas relacionadas a ${content}`,
    CONNECT: `ligar informacoes equivalentes para reduzir abstracao`,
    CLASSIFY: `classificar exemplos e nao exemplos de ${content}`,
    ORDER: `organizar etapas em sequencia logica`,
    COMPLETE: `completar lacunas usando pistas visuais e passos`,
    CHOOSE: `selecionar resposta adequada entre alternativas`,
    MARK: `registrar escolha por marcacao objetiva`,
    COMPARE: `comparar representacoes para perceber semelhancas e diferencas`,
    SOLVE: `resolver tarefa com pratica guiada e registro do raciocinio`,
    APPLY: `aplicar o conceito em situacao contextualizada`,
    EXPLAIN: `explicar a resposta com apoio verbal, visual ou escrito`,
    PRODUCE: `produzir resposta curta a partir do conceito estudado`,
    CREATE_GUIDED_EXAMPLE: `criar exemplo guiado preservando o objetivo de aprendizagem`
  };

  return purposes[actionType];
}

function resolveCognitiveDemand(actionType: ActivityActionType): string {
  const demand: Record<ActivityActionType, string> = {
    OBSERVE: "lembrar e reconhecer",
    IDENTIFY: "lembrar e compreender",
    MATCH: "compreender por pareamento",
    CONNECT: "compreender relacoes",
    CLASSIFY: "analisar criterios simples",
    ORDER: "compreender sequencia",
    COMPLETE: "aplicar com apoio",
    CHOOSE: "compreender e decidir",
    MARK: "reconhecer e selecionar",
    COMPARE: "analisar semelhancas e diferencas",
    SOLVE: "aplicar procedimento",
    APPLY: "aplicar em contexto",
    EXPLAIN: "explicar com mediacao",
    PRODUCE: "produzir resposta orientada",
    CREATE_GUIDED_EXAMPLE: "criar com apoio"
  };

  return demand[actionType];
}

function resolveResponseMode(
  actionType: ActivityActionType,
  functionalLevel: FunctionalLearningLevel
): string {
  if (actionType === "MATCH" || actionType === "CONNECT") {
    return "ligar ou parear";
  }

  if (actionType === "CHOOSE" || actionType === "MARK") {
    return "marcar alternativa";
  }

  if (actionType === "COMPLETE") {
    return "completar lacunas ou caixas";
  }

  if (actionType === "CREATE_GUIDED_EXAMPLE") {
    return "criar exemplo com modelo e resposta curta";
  }

  return functionalLevel.responseMode;
}

function resolveVisualFunction(
  actionType: ActivityActionType,
  request: CreateMissionRequest
): string {
  const source = normalizeComparable(
    `${request.input.discipline ?? ""} ${request.input.theme ?? ""} ${request.input.knowledgeObject ?? ""}`
  );

  if (source.includes("equacao") || source.includes("equacoes")) {
    if (actionType === "OBSERVE") {
      return "representar igualdade e valor desconhecido com balanca de equacao";
    }

    if (actionType === "MATCH") {
      return "reduzir abstracao pareando equacoes e resultados em cartoes";
    }

    if (actionType === "COMPLETE") {
      return "organizar passos e lacunas em tabela visual";
    }

    if (actionType === "SOLVE") {
      return "apoiar resolucao com caixas de calculo e setas";
    }

    return "contextualizar a criacao de uma equacao simples com apoio visual";
  }

  return "apoiar compreensao do conceito e orientar a forma de resposta";
}

function resolveSuccessCriterion(
  actionType: ActivityActionType,
  content: string
): string {
  const criteria: Record<ActivityActionType, string> = {
    OBSERVE: `estudante reconhece visualmente o elemento central de ${content}`,
    IDENTIFY: `estudante identifica a informacao solicitada com apoio adequado`,
    MATCH: `estudante pareia corretamente pelo menos a maioria dos itens`,
    CONNECT: `estudante liga informacoes relacionadas com coerencia`,
    CLASSIFY: `estudante usa criterio simples para classificar exemplos`,
    ORDER: `estudante organiza etapas em ordem coerente`,
    COMPLETE: `estudante completa lacunas mantendo sentido pedagogico`,
    CHOOSE: `estudante escolhe alternativa coerente com o comando`,
    MARK: `estudante marca a resposta correta com autonomia possivel`,
    COMPARE: `estudante aponta semelhanca ou diferenca relevante`,
    SOLVE: `estudante resolve com registro de passos ou resposta final correta`,
    APPLY: `estudante aplica o conceito em nova situacao com mediacao proporcional`,
    EXPLAIN: `estudante explica usando fala, escrita curta, desenho ou marcacao`,
    PRODUCE: `estudante produz resposta curta vinculada ao conceito`,
    CREATE_GUIDED_EXAMPLE: `estudante cria exemplo guiado sem perder o objetivo curricular`
  };

  return criteria[actionType];
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
