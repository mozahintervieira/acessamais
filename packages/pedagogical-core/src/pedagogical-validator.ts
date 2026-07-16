import type { ActivityActionType, MaterialBlueprint } from "./material-blueprint.js";

export type PedagogicalValidationScores = {
  curricularAlignment: number;
  activityVariety: number;
  pedagogicalProgression: number;
  accessibility: number;
  languageAdequacy: number;
  visualPedagogy: number;
  antiInfantilization: number;
  practicalUsability: number;
};

export type PedagogicalValidationIssue = {
  code:
    | "TASK_COUNT_MISMATCH"
    | "MISSING_PLANNED_TASK"
    | "ACTION_TYPE_MISMATCH"
    | "RESPONSE_MODE_MISMATCH"
    | "VISUAL_FUNCTION_MISSING"
    | "CONTENT_BOUNDARY_VIOLATION"
    | "INCOMPATIBLE_FALLBACK"
    | "FINAL_SHEET_REPETITION"
    | "EXCESSIVE_REPETITION"
    | "WEAK_PROGRESSION"
    | "LANGUAGE_INADEQUATE"
    | "SEVERE_INFANTILIZATION"
    | "DECORATIVE_VISUALS"
    | "PROFILE_IGNORED"
    | "CURRICULAR_MISALIGNMENT"
    | "UNCLEAR_INSTRUCTIONS"
    | "WEAK_TEACHER_GUIDE"
    | "BLUEPRINT_IGNORED";
  severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKER";
  message: string;
};

export type PedagogicalValidationReport = {
  approved: boolean;
  totalScore: number;
  scores: PedagogicalValidationScores;
  issues: PedagogicalValidationIssue[];
  recommendations: string[];
};

type GeneratedQuestion = {
  plannedTaskOrder?: number;
  actionType?: ActivityActionType;
  pedagogicalPurpose?: string;
  cognitiveDemand?: string;
  responseMode?: string;
  supportRequired?: string[];
  visualFunction?: string;
  successCriterion?: string;
  instruction?: string;
  content?: string;
  command: string;
  support?: string;
  answerSpace?: string;
};

type GeneratedStudentSheet = {
  title?: string;
  context?: string;
  instructions?: string[];
  baseText?: string;
  didacticBoxes?: string[];
  visualElements?: string[];
  tableRows?: string[];
  questions?: GeneratedQuestion[];
};

type GeneratedTeacherGuide = {
  skillCode?: string;
  knowledgeObject?: string;
  curricularAnalysis?: string[];
  objectives?: string[];
  methodology?: string[];
  adaptations?: string[];
  duaPrinciples?: string[];
  assessmentCriteria?: string[];
  applicationSuggestions?: string[];
};

export type GeneratedPedagogicalMaterial = {
  studentSheet?: GeneratedStudentSheet;
  teacherGuide?: GeneratedTeacherGuide;
  questions?: GeneratedQuestion[];
  visualElements?: string[];
  didacticBoxes?: string[];
  tableRows?: string[];
};

const APPROVAL_THRESHOLD = 80;

export class PedagogicalValidator {
  validate(
    material: GeneratedPedagogicalMaterial,
    blueprint: MaterialBlueprint
  ): PedagogicalValidationReport {
    const questions = resolveQuestions(material);
    const teacherGuide = material.teacherGuide ?? {};
    const visualElements = resolveVisualElements(material);
    const issues: PedagogicalValidationIssue[] = [];
    const recommendations = new Set<string>();
    const detectedActions = questions.map((question) =>
      question.actionType ?? inferActionType(question.command)
    );
    validateBlueprintCorrespondence(
      questions,
      visualElements,
      material,
      blueprint,
      issues,
      recommendations
    );
    const scores: PedagogicalValidationScores = {
      curricularAlignment: scoreCurricularAlignment(material, blueprint, issues, recommendations),
      activityVariety: scoreActivityVariety(questions, detectedActions, blueprint, issues, recommendations),
      pedagogicalProgression: scoreProgression(detectedActions, blueprint, issues, recommendations),
      accessibility: scoreAccessibility(material, blueprint, issues, recommendations),
      languageAdequacy: scoreLanguageAdequacy(material, blueprint, issues, recommendations),
      visualPedagogy: scoreVisualPedagogy(visualElements, blueprint, issues, recommendations),
      antiInfantilization: scoreAntiInfantilization(material, blueprint, issues, recommendations),
      practicalUsability: scorePracticalUsability(material, teacherGuide, blueprint, issues, recommendations)
    };
    const totalScore = Math.round(
      Object.values(scores).reduce((sum, score) => sum + score, 0) /
        Object.keys(scores).length
    );
    const hasBlockingIssue = issues.some((issue) => issue.severity === "BLOCKER");

    return {
      approved: totalScore >= APPROVAL_THRESHOLD && !hasBlockingIssue,
      totalScore,
      scores,
      issues,
      recommendations: [...recommendations]
    };
  }
}

function resolveQuestions(material: GeneratedPedagogicalMaterial): GeneratedQuestion[] {
  return (material.studentSheet?.questions ?? material.questions ?? [])
    .map((question) => ({
      plannedTaskOrder: Number.isFinite(Number(question.plannedTaskOrder))
        ? Number(question.plannedTaskOrder)
        : undefined,
      actionType: isActivityActionType(question.actionType) ? question.actionType : undefined,
      pedagogicalPurpose: normalizeOptionalString(question.pedagogicalPurpose),
      cognitiveDemand: normalizeOptionalString(question.cognitiveDemand),
      responseMode: normalizeOptionalString(question.responseMode),
      supportRequired: Array.isArray(question.supportRequired)
        ? normalizeStringArray(question.supportRequired)
        : undefined,
      visualFunction: normalizeOptionalString(question.visualFunction),
      successCriterion: normalizeOptionalString(question.successCriterion),
      instruction: normalizeOptionalString(question.instruction),
      content: normalizeOptionalString(question.content),
      command: normalizeString(question.command),
      support: normalizeOptionalString(question.support),
      answerSpace: normalizeOptionalString(question.answerSpace)
    }))
    .filter((question) => question.command.length > 0);
}

function resolveVisualElements(material: GeneratedPedagogicalMaterial): string[] {
  return normalizeStringArray(
    material.studentSheet?.visualElements ?? material.visualElements ?? []
  );
}

function validateBlueprintCorrespondence(
  questions: GeneratedQuestion[],
  visualElements: string[],
  material: GeneratedPedagogicalMaterial,
  blueprint: MaterialBlueprint,
  issues: PedagogicalValidationIssue[],
  recommendations: Set<string>
): void {
  const byOrder = new Map(
    questions
      .filter((question) => question.plannedTaskOrder)
      .map((question) => [question.plannedTaskOrder, question])
  );

  for (const plannedTask of blueprint.plannedTasks) {
    const question = byOrder.get(plannedTask.order) ?? questions[plannedTask.order - 1];

    if (!question) {
      addIssue(
        issues,
        "MISSING_PLANNED_TASK",
        "BLOCKER",
        `A plannedTask ${plannedTask.order} desapareceu da folha final.`
      );
      recommendations.add("Reconstruir a studentSheet com uma tarefa para cada plannedTask.");
      continue;
    }

    if (question.plannedTaskOrder !== undefined && question.plannedTaskOrder !== plannedTask.order) {
      addIssue(
        issues,
        "BLUEPRINT_IGNORED",
        "BLOCKER",
        `A tarefa ${plannedTask.order} nao preserva a ordem planejada.`
      );
    }

    if ((question.actionType ?? inferActionType(question.command)) !== plannedTask.actionType) {
      addIssue(
        issues,
        "ACTION_TYPE_MISMATCH",
        "BLOCKER",
        `A tarefa ${plannedTask.order} nao preserva o actionType ${plannedTask.actionType}.`
      );
      recommendations.add("Preservar actionType, responseMode e visualFunction de cada plannedTask.");
    }

    if (
      question.responseMode &&
      !normalizeComparable(question.responseMode).includes(
        normalizeComparable(coreResponseTerm(plannedTask.responseMode))
      )
    ) {
      addIssue(
        issues,
        "RESPONSE_MODE_MISMATCH",
        "HIGH",
        `A tarefa ${plannedTask.order} mudou a forma de resposta planejada.`
      );
    }

    if (!question.visualFunction || !visualFunctionAppears(question.visualFunction, visualElements, question)) {
      addIssue(
        issues,
        "VISUAL_FUNCTION_MISSING",
        "BLOCKER",
        `A funcao visual da tarefa ${plannedTask.order} nao aparece na folha final.`
      );
      recommendations.add("Vincular cada visual a uma visualFunction do MaterialBlueprint.");
    }
  }

  if (hasIncompatibleFallback(material, blueprint)) {
    addIssue(
      issues,
      "INCOMPATIBLE_FALLBACK",
      "BLOCKER",
      "A folha final substituiu o conteudo solicitado por fallback incompativel."
    );
    recommendations.add("Remover fallback incompativel e preservar disciplina, objeto e conteudo do professor.");
  }

  if (contentBoundaryViolated(material, blueprint)) {
    addIssue(
      issues,
      "CONTENT_BOUNDARY_VIOLATION",
      "BLOCKER",
      "O material saiu dos limites do objeto de conhecimento solicitado."
    );
  }

  const repeatedCommands = mostFrequentRatio(
    questions.map((question) => normalizeComparable(question.command))
  );

  if (questions.length > 1 && repeatedCommands >= 0.4) {
    addIssue(
      issues,
      "FINAL_SHEET_REPETITION",
      "BLOCKER",
      "Duas ou mais tarefas finais foram convertidas no mesmo exercicio sem justificativa."
    );
  }
}

function scoreCurricularAlignment(
  material: GeneratedPedagogicalMaterial,
  blueprint: MaterialBlueprint,
  issues: PedagogicalValidationIssue[],
  recommendations: Set<string>
): number {
  const text = normalizeComparable(materialText(material));
  const skillTerms = importantTerms(blueprint.skillCode);
  const objectiveTerms = importantTerms(blueprint.learningObjective);
  const contentTerms = importantTerms(blueprint.content);
  const knowledgeTerms = importantTerms(blueprint.knowledgeObject);
  const matched = countMatches(text, [
    ...skillTerms,
    ...objectiveTerms,
    ...contentTerms,
    ...knowledgeTerms
  ]);
  const expected = Math.max(Math.min(contentTerms.length + objectiveTerms.length, 6), 2);

  if (matched < 2) {
    addIssue(
      issues,
      "CURRICULAR_MISALIGNMENT",
      "HIGH",
      "O material nao evidencia alinhamento suficiente com habilidade, objetivo ou conteudo."
    );
    recommendations.add("Reforcar no material tarefas que evidenciem diretamente a habilidade e o objetivo.");
    return 55;
  }

  return matched >= expected ? 95 : 78;
}

function scoreActivityVariety(
  questions: GeneratedQuestion[],
  detectedActions: ActivityActionType[],
  blueprint: MaterialBlueprint,
  issues: PedagogicalValidationIssue[],
  recommendations: Set<string>
): number {
  if (questions.length !== blueprint.requestedTaskCount) {
    addIssue(
      issues,
      "TASK_COUNT_MISMATCH",
      "HIGH",
      `Quantidade de tarefas geradas (${questions.length}) difere da solicitada (${blueprint.requestedTaskCount}).`
    );
    recommendations.add("Ajustar a quantidade de tarefas para corresponder ao blueprint.");
  }

  const distinctActions = new Set(detectedActions);
  const repeatedRatio = mostFrequentRatio(detectedActions);

  if (questions.length > 1 && (distinctActions.size < 3 || repeatedRatio >= 0.7)) {
    addIssue(
      issues,
      "EXCESSIVE_REPETITION",
      "BLOCKER",
      "Ha repeticao excessiva de atividades; a quantidade solicitada virou variacoes do mesmo exercicio."
    );
    recommendations.add("Combinar observar, parear, completar, resolver e aplicar em vez de repetir o mesmo comando.");
    return 35;
  }

  if (distinctActions.size < Math.min(4, blueprint.requestedTaskCount)) {
    addIssue(
      issues,
      "EXCESSIVE_REPETITION",
      "MEDIUM",
      "A variedade de acoes pedagogicas esta abaixo do esperado."
    );
    recommendations.add("Aumentar variedade de formas de resposta e tipos de tarefa.");
    return 68;
  }

  return 95;
}

function scoreProgression(
  detectedActions: ActivityActionType[],
  blueprint: MaterialBlueprint,
  issues: PedagogicalValidationIssue[],
  recommendations: Set<string>
): number {
  const plannedActions = blueprint.plannedTasks.map((task) => task.actionType);
  const orderMatches = detectedActions.filter(
    (action, index) => action === plannedActions[index]
  ).length;
  const includesEarlySupport = detectedActions.slice(0, 2).some((action) =>
    ["OBSERVE", "IDENTIFY", "MATCH", "CONNECT"].includes(action)
  );
  const includesApplication = detectedActions.some((action) =>
    ["SOLVE", "APPLY", "EXPLAIN", "PRODUCE", "CREATE_GUIDED_EXAMPLE"].includes(action)
  );

  if (orderMatches === 0) {
    addIssue(
      issues,
      "BLUEPRINT_IGNORED",
      "BLOCKER",
      "Nenhuma tarefa gerada corresponde a ordem planejada no MaterialBlueprint."
    );
    recommendations.add("Reconstruir a sequencia respeitando as plannedTasks do blueprint.");
    return 35;
  }

  if (!includesEarlySupport || !includesApplication) {
    addIssue(
      issues,
      "WEAK_PROGRESSION",
      "HIGH",
      "A sequencia nao mostra progressao clara do apoio inicial para aplicacao."
    );
    recommendations.add("Organizar a atividade do reconhecimento para a aplicacao contextualizada.");
    return 55;
  }

  if (orderMatches < Math.ceil(plannedActions.length / 2)) {
    addIssue(
      issues,
      "BLUEPRINT_IGNORED",
      "HIGH",
      "A ordem das tarefas se afasta do MaterialBlueprint."
    );
    recommendations.add("Respeitar a ordem das plannedTasks no material final.");
    return 68;
  }

  return 95;
}

function scoreAccessibility(
  material: GeneratedPedagogicalMaterial,
  blueprint: MaterialBlueprint,
  issues: PedagogicalValidationIssue[],
  recommendations: Set<string>
): number {
  const text = normalizeComparable(materialText(material));
  const supportMatches = blueprint.recommendedSupports.filter((support) =>
    text.includes(normalizeComparable(coreSupportTerm(support)))
  ).length;
  const profileTerms = importantTerms(blueprint.studentProfile);
  const profileMentioned =
    profileTerms.length === 0 || profileTerms.some((term) => text.includes(term));

  if (!profileMentioned && supportMatches < 2) {
    addIssue(
      issues,
      "PROFILE_IGNORED",
      "HIGH",
      "O material nao demonstra respeito suficiente ao perfil pedagogico e aos apoios previstos."
    );
    recommendations.add("Incluir apoios coerentes com o perfil funcional e com as barreiras identificadas.");
    return 58;
  }

  return supportMatches >= 3 ? 94 : 76;
}

function scoreLanguageAdequacy(
  material: GeneratedPedagogicalMaterial,
  blueprint: MaterialBlueprint,
  issues: PedagogicalValidationIssue[],
  recommendations: Set<string>
): number {
  const commands = resolveQuestions(material).map((question) => question.command);
  const longCommands = commands.filter((command) => wordCount(command) > 28).length;
  const text = normalizeComparable(commands.join(" "));
  const isHighSchool = normalizeComparable(blueprint.grade).includes("medio");
  const hasHighSchoolLanguage =
    !isHighSchool || !/(bebe|criancinha|desenhinho|fofinho|amiguinho)/.test(text);

  if (longCommands > Math.max(1, Math.floor(commands.length / 2))) {
    addIssue(
      issues,
      "LANGUAGE_INADEQUATE",
      "HIGH",
      "As instrucoes estao longas para o nivel funcional previsto."
    );
    recommendations.add("Reduzir comandos e organizar instrucoes em passos curtos.");
    return 60;
  }

  if (!hasHighSchoolLanguage) {
    addIssue(
      issues,
      "SEVERE_INFANTILIZATION",
      "BLOCKER",
      "A linguagem infantiliza estudante de Ensino Medio."
    );
    recommendations.add("Manter linguagem simples, mas compativel com adolescente ou jovem.");
    return 20;
  }

  return 92;
}

function scoreVisualPedagogy(
  visualElements: string[],
  blueprint: MaterialBlueprint,
  issues: PedagogicalValidationIssue[],
  recommendations: Set<string>
): number {
  const visualText = normalizeComparable(visualElements.join(" "));
  const functionalTerms = [
    "balanca",
    "tabela",
    "seta",
    "bloco",
    "mapa",
    "linha do tempo",
    "cartao",
    "organizador",
    "reta",
    "grafico",
    "ciclo"
  ];
  const decorativeTerms = ["estrela", "personagem sorrindo", "decoracao", "enfeite"];
  const hasFunctionalVisual =
    functionalTerms.some((term) => visualText.includes(term));
  const hasOnlyDecorative =
    visualElements.length > 0 &&
    visualElements.every((item) =>
      decorativeTerms.some((term) => normalizeComparable(item).includes(term))
    );

  if (visualElements.length === 0 || hasOnlyDecorative || !hasFunctionalVisual) {
    addIssue(
      issues,
      "DECORATIVE_VISUALS",
      "BLOCKER",
      "Os recursos visuais estao ausentes ou parecem apenas decorativos."
    );
    recommendations.add("Usar recursos visuais com funcao pedagogica explicita, como balanca, tabela, setas ou blocos.");
    return 35;
  }

  return 94;
}

function scoreAntiInfantilization(
  material: GeneratedPedagogicalMaterial,
  blueprint: MaterialBlueprint,
  issues: PedagogicalValidationIssue[],
  recommendations: Set<string>
): number {
  const text = normalizeComparable(materialText(material));
  const severePatterns = [
    "criancinha",
    "bebe",
    "fofinho",
    "amiguinho",
    "parabens campeaozinho",
    "atividade para criancinhas"
  ];
  const severe = severePatterns.some((pattern) => text.includes(pattern));
  const isHighSchool = normalizeComparable(blueprint.grade).includes("medio");

  if (severe && isHighSchool) {
    addIssue(
      issues,
      "SEVERE_INFANTILIZATION",
      "BLOCKER",
      "Foram encontrados termos de infantilizacao grave para estudante do Ensino Medio."
    );
    recommendations.add("Substituir linguagem infantilizada por linguagem objetiva e respeitosa.");
    return 10;
  }

  return 96;
}

function scorePracticalUsability(
  material: GeneratedPedagogicalMaterial,
  guide: GeneratedTeacherGuide,
  blueprint: MaterialBlueprint,
  issues: PedagogicalValidationIssue[],
  recommendations: Set<string>
): number {
  const questions = resolveQuestions(material);
  const clearInstructions = questions.every((question) => question.command.length >= 8);
  const answerSpaces = questions.filter((question) => question.answerSpace).length;
  const guideText = normalizeComparable(
    [
      ...(guide.curricularAnalysis ?? []),
      ...(guide.methodology ?? []),
      ...(guide.adaptations ?? []),
      ...(guide.assessmentCriteria ?? []),
      ...(guide.applicationSuggestions ?? [])
    ].join(" ")
  );
  const guideCoversRequired =
    ["barreira", "apoio", "mediacao", "criterio"].filter((term) =>
      guideText.includes(term)
    ).length >= 3;

  if (!clearInstructions) {
    addIssue(
      issues,
      "UNCLEAR_INSTRUCTIONS",
      "HIGH",
      "Ha comandos pouco claros ou vazios."
    );
    recommendations.add("Garantir comandos claros, objetivos e aplicaveis em sala.");
  }

  if (!guideCoversRequired) {
    addIssue(
      issues,
      "WEAK_TEACHER_GUIDE",
      "HIGH",
      "O guia do professor nao explica suficientemente barreiras, apoios, mediacao e criterios."
    );
    recommendations.add("Detalhar no guia barreiras previstas, apoios, mediacao e criterios de sucesso.");
  }

  if (answerSpaces < Math.max(1, Math.floor(questions.length / 2))) {
    recommendations.add("Indicar espacos de resposta ou formas alternativas de registro.");
    return 76;
  }

  return clearInstructions && guideCoversRequired ? 93 : 68;
}

function inferActionType(command: string): ActivityActionType {
  const text = normalizeComparable(command);

  if (/\b(observe|olhe|analise)\b/.test(text)) {
    return "OBSERVE";
  }

  if (/\b(pareie|relacione|associe)\b/.test(text)) {
    return "MATCH";
  }

  if (/\b(ligue|conecte)\b/.test(text)) {
    return "CONNECT";
  }

  if (/\b(classifique|separe)\b/.test(text)) {
    return "CLASSIFY";
  }

  if (/\b(ordene|organize|sequencia)\b/.test(text)) {
    return "ORDER";
  }

  if (/\b(complete|preencha)\b/.test(text)) {
    return "COMPLETE";
  }

  if (/\b(escolha|selecione)\b/.test(text)) {
    return "CHOOSE";
  }

  if (/\b(marque|assinale|circule)\b/.test(text)) {
    return "MARK";
  }

  if (/\b(compare|diferenca|semelhanca)\b/.test(text)) {
    return "COMPARE";
  }

  if (/\b(resolva|calcule|encontre o valor)\b/.test(text)) {
    return "SOLVE";
  }

  if (/\b(aplique|use em uma situacao|situacao-problema)\b/.test(text)) {
    return "APPLY";
  }

  if (/\b(explique|justifique)\b/.test(text)) {
    return "EXPLAIN";
  }

  if (/\b(produza|escreva uma resposta)\b/.test(text)) {
    return "PRODUCE";
  }

  if (/\b(crie|elabore|invente)\b/.test(text)) {
    return "CREATE_GUIDED_EXAMPLE";
  }

  if (/\b(identifique|aponte)\b/.test(text)) {
    return "IDENTIFY";
  }

  return "IDENTIFY";
}

function isActivityActionType(value: unknown): value is ActivityActionType {
  return typeof value === "string" && [
    "OBSERVE",
    "IDENTIFY",
    "MATCH",
    "CONNECT",
    "CLASSIFY",
    "ORDER",
    "COMPLETE",
    "CHOOSE",
    "MARK",
    "COMPARE",
    "SOLVE",
    "APPLY",
    "EXPLAIN",
    "PRODUCE",
    "CREATE_GUIDED_EXAMPLE"
  ].includes(value);
}

function coreResponseTerm(value: string): string {
  return value.split(",")[0]?.split(" ou ")[0]?.split(" e ")[0] ?? value;
}

function visualFunctionAppears(
  visualFunction: string,
  visualElements: string[],
  question: GeneratedQuestion
): boolean {
  const visualText = normalizeComparable([
    visualFunction,
    ...visualElements,
    question.command,
    question.support,
    question.answerSpace
  ].filter(Boolean).join(" "));
  const functionTerms = importantTerms(visualFunction).filter((term) =>
    !["apoiar", "reduzir", "representar", "organizar", "contextualizar"].includes(term)
  );

  return functionTerms.length === 0 || functionTerms.some((term) => visualText.includes(term));
}

function hasIncompatibleFallback(
  material: GeneratedPedagogicalMaterial,
  blueprint: MaterialBlueprint
): boolean {
  const text = normalizeComparable(materialText(material));
  const requested = normalizeComparable(`${blueprint.knowledgeObject} ${blueprint.content}`);
  const requestsEquation = requested.includes("equacao") || requested.includes("equacoes");
  const hasPaFallback =
    text.includes("progressao aritmetica") ||
    text.includes("p.a.") ||
    text.includes(" razao ") ||
    text.includes("sequencia numerica");

  return requestsEquation && hasPaFallback;
}

function contentBoundaryViolated(
  material: GeneratedPedagogicalMaterial,
  blueprint: MaterialBlueprint
): boolean {
  const text = normalizeComparable(materialText(material));
  const contentTerms = importantTerms(`${blueprint.knowledgeObject} ${blueprint.content}`);
  const matched = countMatches(text, contentTerms);

  return contentTerms.length > 0 && matched === 0;
}

function importantTerms(value: string): string[] {
  const stopwords = new Set([
    "de",
    "do",
    "da",
    "dos",
    "das",
    "e",
    "a",
    "o",
    "as",
    "os",
    "um",
    "uma",
    "para",
    "por",
    "com",
    "que",
    "possam",
    "ser"
  ]);

  return normalizeComparable(value)
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length >= 4 && !stopwords.has(term))
    .slice(0, 10);
}

function countMatches(text: string, terms: string[]): number {
  return new Set(terms.filter((term) => text.includes(term))).size;
}

function mostFrequentRatio(values: string[]): number {
  if (values.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Math.max(...counts.values()) / values.length;
}

function coreSupportTerm(value: string): string {
  return value.split(",")[0]?.split(" ")[0] ?? value;
}

function materialText(material: GeneratedPedagogicalMaterial): string {
  const sheet = material.studentSheet ?? {};
  const guide = material.teacherGuide ?? {};

  return [
    sheet.title,
    sheet.context,
    sheet.baseText,
    ...(sheet.instructions ?? []),
    ...(sheet.didacticBoxes ?? []),
    ...(sheet.visualElements ?? []),
    ...(sheet.tableRows ?? []),
    ...resolveQuestions(material).flatMap((question) => [
      question.actionType,
      question.pedagogicalPurpose,
      question.cognitiveDemand,
      question.responseMode,
      ...(question.supportRequired ?? []),
      question.visualFunction,
      question.successCriterion,
      question.instruction,
      question.content,
      question.command,
      question.support,
      question.answerSpace
    ]),
    guide.skillCode,
    guide.knowledgeObject,
    ...(guide.curricularAnalysis ?? []),
    ...(guide.objectives ?? []),
    ...(guide.methodology ?? []),
    ...(guide.adaptations ?? []),
    ...(guide.duaPrinciples ?? []),
    ...(guide.assessmentCriteria ?? []),
    ...(guide.applicationSuggestions ?? [])
  ]
    .filter(Boolean)
    .join(" ");
}

function addIssue(
  issues: PedagogicalValidationIssue[],
  code: PedagogicalValidationIssue["code"],
  severity: PedagogicalValidationIssue["severity"],
  message: string
): void {
  if (!issues.some((issue) => issue.code === code && issue.message === message)) {
    issues.push({ code, severity, message });
  }
}

function normalizeString(value: string | undefined): string {
  return value?.trim() ?? "";
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function normalizeStringArray(value: string[]): string[] {
  return value.map((item) => item.trim()).filter(Boolean);
}

function normalizeComparable(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function wordCount(value: string): number {
  return value.split(/\s+/g).filter(Boolean).length;
}
