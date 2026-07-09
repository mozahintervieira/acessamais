import type { CreateMissionRequest } from "@acessa-plus/types";

export const PEDAGOGICAL_ADAPTATION_RULES = [
  "Preservar sempre o objetivo de aprendizagem e a habilidade curricular.",
  "Para Deficiencia Intelectual: linguagem simples, frases curtas, apoio visual, exemplo resolvido, progressao de dificuldade e poucos comandos por vez.",
  "Para TEA: rotina visual, previsibilidade, instrucoes objetivas, organizacao por etapas e reducao de ambiguidades.",
  "Para Deficiencia Visual: fonte ampliada, alto contraste, descricao textual, imagens ampliadas e preparacao para material tatil ou Braille quando solicitado.",
  "Para Deficiencia Auditiva ou Libras: linguagem visual, comandos objetivos, apoio por imagens e Libras apenas quando houver seguranca.",
  "Para TDAH: comandos curtos, organizacao em blocos, foco visual, atividades rapidas e progressivas.",
  "Para Altas Habilidades/Superdotacao: desafios adicionais, investigacao, criacao, autonomia e aprofundamento.",
  "Para CAA: comandos simples, pictogramas descritos, escolhas por marcacao e formas alternativas de resposta."
] as const;

export function buildAdaptationProfileText(
  input: CreateMissionRequest["input"]
): string {
  const profile = input.adaptationProfile;

  if (!profile?.enabled) {
    return "sem adaptacao especifica selecionada";
  }

  return [
    `publico-alvo/necessidade especifica: ${profile.targetAudience ?? input.specificNeed ?? "nao informado"}`,
    `perfil de aprendizagem: ${profile.learningProfile ?? input.readingWritingLevel ?? "nao informado"}`,
    `apoios necessarios: ${profile.supports?.join(", ") || "nao informados"}`
  ].join("; ");
}
