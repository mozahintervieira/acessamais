import type { CreateMissionRequest } from "@acessa-plus/types";
import type { FunctionalLearningLevel } from "./material-blueprint.js";

export type BarrierAndAccessPlan = {
  identifiedBarriers: string[];
  recommendedSupports: string[];
  responseModes: string[];
  visualRequirements: string[];
  teacherMediationGuidance: string[];
};

export class BarrierAndAccessResolver {
  resolve(
    request: CreateMissionRequest,
    functionalLevel: FunctionalLearningLevel
  ): BarrierAndAccessPlan {
    const source = normalizeComparable(
      `${request.input.specificNeed ?? ""} ${request.input.adaptationProfile?.targetAudience ?? ""} ${request.input.adaptationProfile?.supports?.join(" ") ?? ""} ${request.input.theme ?? ""} ${request.input.knowledgeObject ?? ""}`
    );
    const barriers = new Set<string>();
    const supports = new Set<string>();
    const responseModes = new Set<string>();
    const visualRequirements = new Set<string>();
    const mediation = new Set<string>();

    if (source.includes("deficiencia intelectual") || source.includes("di")) {
      addAll(barriers, [
        "abstracao",
        "memoria de trabalho",
        "leitura de comandos",
        "organizacao de etapas",
        "generalizacao",
        "autonomia",
        "excesso de texto",
        "forma de resposta"
      ]);
      addAll(supports, [
        "instrucoes curtas",
        "passos numerados",
        "exemplo resolvido",
        "apoio visual funcional",
        "caixas de resposta",
        "alternativas por marcacao",
        "tabela simples",
        "mediacao docente",
        "reducao de carga textual",
        "repeticao planejada, sem duplicacao mecanica"
      ]);
      addAll(responseModes, [
        "marcar",
        "ligar",
        "completar",
        "resolver com passos",
        "produzir resposta curta"
      ]);
      addAll(visualRequirements, [
        "representar conceitos abstratos com equilibrio, blocos, setas, tabelas ou organizadores",
        "usar visual para apoiar compreensao, nao decoracao",
        "manter boa separacao visual entre comandos e respostas"
      ]);
      addAll(mediation, [
        "ler um comando por vez e checar compreensao antes da resposta",
        "manter exemplo resolvido visivel durante a pratica guiada",
        "reduzir apoio gradualmente sem retirar o objetivo curricular"
      ]);
    }

    if (source.includes("equacao") || source.includes("equacoes")) {
      addAll(barriers, ["compreensao do valor desconhecido", "relacao entre equilibrio e igualdade"]);
      addAll(supports, ["balanca de equacao", "blocos ou caixas para representar valores", "tabela de passos"]);
      addAll(visualRequirements, [
        "usar balanca para representar igualdade",
        "usar lacunas e caixas para o valor desconhecido"
      ]);
    }

    if (source.includes("tea")) {
      addAll(barriers, ["ambiguidade nos comandos", "previsibilidade da rotina"]);
      addAll(supports, ["sequencia visual", "comandos objetivos", "organizacao por etapas"]);
    }

    if (source.includes("tdah")) {
      addAll(barriers, ["manutencao da atencao", "sobrecarga de comandos"]);
      addAll(supports, ["blocos curtos", "foco visual", "tarefas rapidas e progressivas"]);
    }

    if (functionalLevel.uncertaintyNotes.length > 0) {
      supports.add("checagem docente do nivel funcional antes da aplicacao");
      mediation.add("ajustar quantidade de leitura e forma de resposta conforme observacao do professor");
    }

    if (barriers.size === 0) {
      addAll(barriers, ["carga cognitiva", "clareza dos comandos", "evidencia de aprendizagem"]);
    }

    if (supports.size === 0) {
      addAll(supports, ["organizacao visual", "comandos claros", "espaco adequado para resposta"]);
    }

    if (responseModes.size === 0) {
      addAll(responseModes, ["marcar", "completar", "escrever resposta curta"]);
    }

    if (visualRequirements.size === 0) {
      addAll(visualRequirements, ["usar visual funcional alinhado ao conceito estudado"]);
    }

    if (mediation.size === 0) {
      addAll(mediation, ["oferecer mediacao proporcional ao desempenho observado"]);
    }

    return {
      identifiedBarriers: [...barriers],
      recommendedSupports: [...supports],
      responseModes: [...responseModes],
      visualRequirements: [...visualRequirements],
      teacherMediationGuidance: [...mediation]
    };
  }
}

function addAll(target: Set<string>, items: string[]): void {
  for (const item of items) {
    target.add(item);
  }
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
