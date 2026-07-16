import type { CreateMissionRequest, ResolvedContext } from "@acessa-plus/types";
import type { FunctionalLearningLevel } from "./material-blueprint.js";

export class LearningLevelResolver {
  resolve(
    request: CreateMissionRequest,
    context?: ResolvedContext
  ): FunctionalLearningLevel {
    const input = request.input;
    const learningProfile = normalize(
      input.adaptationProfile?.learningProfile ?? input.readingWritingLevel
    );
    const supportLevel = normalize(
      input.adaptationProfile?.supports?.join(", ") ?? input.learningPreference
    );
    const uncertaintyNotes: string[] = [];

    if (!learningProfile) {
      uncertaintyNotes.push(
        "Nivel funcional nao informado; usar inferencia conservadora sem reduzir a serie escolar."
      );
    }

    if (!input.readingWritingLevel && !input.adaptationProfile?.learningProfile) {
      uncertaintyNotes.push(
        "Nivel de leitura e escrita ausente; propor comandos curtos e resposta multimodal."
      );
    }

    return {
      schoolStage: resolveSchoolStage(input.gradeYear ?? input.yearGrade ?? context?.rawInput.stage),
      grade: input.gradeYear ?? input.yearGrade ?? "serie nao informada",
      readingLevel: resolveReadingLevel(learningProfile),
      writingLevel: resolveWritingLevel(learningProfile),
      comprehensionLevel: resolveComprehensionLevel(learningProfile),
      abstractionLevel: resolveAbstractionLevel(request),
      workingMemory: resolveWorkingMemory(request),
      autonomy: supportLevel?.toLowerCase().includes("moderado")
        ? "autonomia parcial com mediacao planejada"
        : supportLevel?.toLowerCase().includes("intenso")
          ? "autonomia reduzida, com mediacao frequente"
          : "autonomia a observar durante a atividade",
      attention: supportLevel?.toLowerCase().includes("tdah")
        ? "necessita blocos curtos, foco visual e pausas breves"
        : "necessita organizacao clara por etapas",
      communication: resolveCommunication(request),
      responseMode: resolveResponseMode(request),
      uncertaintyNotes
    };
  }
}

function resolveSchoolStage(value: string | undefined): string {
  const normalized = normalizeComparable(value);

  if (normalized.includes("medio")) {
    return "Ensino Medio";
  }

  if (normalized.includes("fundamental")) {
    return "Ensino Fundamental";
  }

  return value ?? "etapa nao informada";
}

function resolveReadingLevel(value: string | undefined): string {
  const normalized = normalizeComparable(value);

  if (normalized.includes("pre") || normalized.includes("nao leitor")) {
    return "pre-leitor ou leitura por mediacao";
  }

  if (normalized.includes("inicial")) {
    return "leitor inicial";
  }

  if (normalized.includes("desenvolvimento")) {
    return "leitor em desenvolvimento";
  }

  if (normalized.includes("funcional")) {
    return "leitor funcional";
  }

  return "nivel de leitura nao informado";
}

function resolveWritingLevel(value: string | undefined): string {
  const normalized = normalizeComparable(value);

  if (normalized.includes("pre") || normalized.includes("inicial")) {
    return "registro curto, marcacao, completacao e escrita apoiada";
  }

  if (normalized.includes("funcional") || normalized.includes("consolidacao")) {
    return "registro escrito funcional com apoio quando necessario";
  }

  return "forma de escrita a confirmar; priorizar respostas alternativas";
}

function resolveComprehensionLevel(value: string | undefined): string {
  const normalized = normalizeComparable(value);

  if (normalized.includes("inicial") || normalized.includes("pre")) {
    return "compreensao favorecida por exemplo, imagem funcional e comando direto";
  }

  return "compreensao apoiada por organizacao visual e checagem de entendimento";
}

function resolveAbstractionLevel(request: CreateMissionRequest): string {
  const source = normalizeComparable(
    `${request.input.specificNeed ?? ""} ${request.input.adaptationProfile?.targetAudience ?? ""} ${request.input.theme ?? ""} ${request.input.knowledgeObject ?? ""}`
  );

  if (source.includes("deficiencia intelectual") || source.includes("di")) {
    return "abstracao deve ser mediada por representacao concreta, visual ou contextual";
  }

  return "abstracao a calibrar conforme respostas do estudante";
}

function resolveWorkingMemory(request: CreateMissionRequest): string {
  const source = normalizeComparable(
    `${request.input.specificNeed ?? ""} ${request.input.adaptationProfile?.targetAudience ?? ""}`
  );

  if (source.includes("deficiencia intelectual") || source.includes("di")) {
    return "reduzir carga de memoria de trabalho com passos numerados e exemplo visivel";
  }

  return "manter instrucoes segmentadas para reduzir sobrecarga cognitiva";
}

function resolveCommunication(request: CreateMissionRequest): string {
  const supports = normalizeComparable(
    request.input.adaptationProfile?.supports?.join(" ") ??
      request.input.accessibilityNeeds?.join(" ")
  );

  if (supports.includes("caa")) {
    return "resposta por CAA, apontar, marcar ou selecionar quando necessario";
  }

  if (supports.includes("libras")) {
    return "apoio visual e Libras somente com validacao humana";
  }

  return "comunicacao escolar por fala, marcacao, escrita curta ou mediacao";
}

function resolveResponseMode(request: CreateMissionRequest): string {
  const source = normalizeComparable(
    `${request.input.specificNeed ?? ""} ${request.input.adaptationProfile?.targetAudience ?? ""} ${request.input.adaptationProfile?.supports?.join(" ") ?? ""}`
  );

  if (source.includes("deficiencia intelectual") || source.includes("di")) {
    return "marcar, ligar, completar, escolher e escrever respostas curtas";
  }

  if (source.includes("visual") || source.includes("dv")) {
    return "resposta oral, escrita ampliada, marcacao com alto contraste ou mediacao";
  }

  return "resposta escrita, oral, por marcacao ou por producao guiada";
}

function normalize(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function normalizeComparable(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
