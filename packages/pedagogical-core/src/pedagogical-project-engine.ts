import type {
  CreateMissionRequest,
  DecisionResult,
  ResolvedContext
} from "@acessa-plus/types";
import type {
  ActivityActionType,
  MaterialBlueprint,
  PlannedTask
} from "./material-blueprint.js";

export type PedagogicalProjectValidationIssue = {
  code: string;
  message: string;
  field: string;
  severity: "ERROR" | "WARNING";
};

export type PedagogicalProjectValidationResult = {
  approved: boolean;
  issues: PedagogicalProjectValidationIssue[];
};

export type PedagogicalProject = {
  generalObjective: string;
  specificObjectives: string[];
  competencies: string[];
  skills: string[];
  knowledgeObject: string;
  content: string;
  studentProfile: string;
  barriers: string[];
  potentialities: string[];
  strategies: string[];
  methodologies: string[];
  resources: string[];
  assistiveTechnology: string[];
  caa: string[];
  libras: string[];
  braille: string[];
  assessmentForm: string;
  successCriteria: string[];
  didacticSequence: string[];
  worksheetCount: number;
  worksheetMap: WorksheetBlueprint[];
};

export type WorksheetBlueprint = {
  sheetNumber: number;
  pedagogicalRole: string;
  title: string;
  objective: string;
  strategy: string;
  methodology: string;
  primaryPattern: PedagogicalActivityPatternId;
  secondaryPattern: PedagogicalActivityPatternId;
  interactionMode: string;
  resources: string[];
  visualPlan: string[];
  supportPlan: string[];
  responsePlan: string;
  visualIdentity: string;
  learningFocus: string;
  contentScope: string;
  contentRequirements: string[];
  forbiddenContent: string[];
  requiredExamples: string[];
  requiredTaskTypes: string[];
  expectedProgression: string;
  editorialPattern: string;
  editorialConstraints: string[];
  accessibilityConstraints: string[];
  validationRules: string[];
  assessmentEvidence: string;
  cognitiveProgression: string;
  actionTypes: ActivityActionType[];
  teacherGuideFocus: string[];
  successCriteria: string[];
  plannedTasks: PlannedTask[];
  qualityScore: number;
  diversityScore: number;
};

export type PedagogicalActivityPatternId =
  | "MARK_ONE"
  | "MARK_MULTIPLE"
  | "CIRCLE"
  | "MATCH_COLUMNS"
  | "CLASSIFY"
  | "COMPLETE_WITH_WORD_BANK"
  | "COMPLETE_SENTENCE"
  | "IMAGE_QUESTION"
  | "ORDER_SEQUENCE"
  | "CUT_AND_PASTE"
  | "TRUE_FALSE_VISUAL"
  | "SOLVED_EXAMPLE"
  | "SHORT_PRODUCTION"
  | "CONTEXT_PROBLEM"
  | "TABLE_COMPLETION"
  | "SELF_ASSESSMENT"
  | "FINAL_CHALLENGE";

export type PedagogicalActivityPattern = {
  id: PedagogicalActivityPatternId;
  objective: string;
  complexity: "LOW" | "MEDIUM" | "HIGH";
  recommendedItems: { min: number; max: number };
  space: "SMALL" | "MEDIUM" | "LARGE";
  suitableProfiles: string[];
  requiresVisual: boolean;
  responseType: string;
  incompatibilities: PedagogicalActivityPatternId[];
  editorialConstraints: string[];
};

export type PedagogicalProjectEngineOutput = {
  validation: PedagogicalProjectValidationResult;
  project: PedagogicalProject;
  worksheetBlueprints: WorksheetBlueprint[];
};

export class PedagogicalProjectError extends Error {
  constructor(readonly issues: PedagogicalProjectValidationIssue[]) {
    super(
      issues.map((issue) => issue.message).join(" ")
    );
    this.name = "PedagogicalProjectError";
  }
}

export class PedagogicalProjectEngine {
  build(input: {
    request: CreateMissionRequest;
    context: ResolvedContext;
    decision: DecisionResult;
    materialBlueprint: MaterialBlueprint;
  }): PedagogicalProjectEngineOutput {
    const validation = validatePedagogicalRequest(input.request);

    if (!validation.approved) {
      throw new PedagogicalProjectError(validation.issues);
    }

    const worksheetCount = input.materialBlueprint.requestedTaskCount;
    const worksheetBlueprints = buildWorksheetBlueprints(
      input.materialBlueprint,
      worksheetCount
    );
    const project: PedagogicalProject = {
      generalObjective: input.materialBlueprint.learningObjective,
      specificObjectives: worksheetBlueprints.map((sheet) => sheet.objective),
      competencies: resolveCompetencies(input.request, input.materialBlueprint),
      skills: input.request.input.skill ? [input.materialBlueprint.skillCode] : [],
      knowledgeObject: input.materialBlueprint.knowledgeObject,
      content: input.materialBlueprint.content,
      studentProfile: input.materialBlueprint.studentProfile,
      barriers: input.materialBlueprint.identifiedBarriers,
      potentialities: resolvePotentialities(input.materialBlueprint),
      strategies: worksheetBlueprints.map((sheet) => sheet.strategy),
      methodologies: worksheetBlueprints.map((sheet) => sheet.methodology),
      resources: uniqueStrings(worksheetBlueprints.flatMap((sheet) => sheet.resources)),
      assistiveTechnology: resolveAssistiveTechnology(input.materialBlueprint),
      caa: resolveCaa(input.materialBlueprint),
      libras: resolveLibras(input.materialBlueprint),
      braille: resolveBraille(input.materialBlueprint),
      assessmentForm: "Avaliacao formativa com observacao da resposta, mediacao necessaria e criterio de sucesso por folha.",
      successCriteria: input.materialBlueprint.successCriteria,
      didacticSequence: worksheetBlueprints.map(
        (sheet) => `Folha ${sheet.sheetNumber}: ${sheet.strategy} - ${sheet.objective}`
      ),
      worksheetCount,
      worksheetMap: worksheetBlueprints
    };

    return {
      validation,
      project,
      worksheetBlueprints
    };
  }
}

export function buildPedagogicalProject(input: {
  request: CreateMissionRequest;
  context: ResolvedContext;
  decision: DecisionResult;
  materialBlueprint: MaterialBlueprint;
}): PedagogicalProjectEngineOutput {
  return new PedagogicalProjectEngine().build(input);
}

function validatePedagogicalRequest(
  request: CreateMissionRequest
): PedagogicalProjectValidationResult {
  const issues: PedagogicalProjectValidationIssue[] = [];
  const discipline = normalizeComparable(request.input.discipline ?? request.input.subject ?? "");
  const skill = normalizeComparable(request.input.skill ?? "");
  const knowledgeObject = normalizeComparable(request.input.knowledgeObject ?? request.input.theme ?? "");
  const grade = normalizeComparable(request.input.gradeYear ?? request.input.yearGrade ?? "");

  addMissingIssue(issues, discipline, "discipline", "Disciplina e obrigatoria para gerar um projeto pedagogico consistente.");
  if (!skill) {
    issues.push({
      code: "CURRICULUM_CONFIRMATION_REQUIRED",
      field: "skill",
      severity: "WARNING",
      message: "A habilidade curricular ainda nao foi confirmada. O material pode ser criado como proposta, mas o guia deve sinalizar revisao docente antes do uso oficial."
    });
  }
  addMissingIssue(issues, knowledgeObject, "knowledgeObject", "Objeto de conhecimento ou conteudo e obrigatorio.");
  addMissingIssue(issues, grade, "gradeYear", "Serie/ano e obrigatorio para adequar linguagem, idade e progressao.");

  const expectedSkillArea = resolveSkillArea(skill);
  const expectedDisciplineArea = resolveDisciplineArea(discipline);

  if (
    expectedSkillArea &&
    expectedDisciplineArea &&
    expectedSkillArea !== expectedDisciplineArea
  ) {
    issues.push({
      code: "CURRICULAR_DISCIPLINE_MISMATCH",
      field: "skill",
      severity: "ERROR",
      message: `Incompatibilidade pedagogica: a habilidade informada pertence a ${expectedSkillArea}, mas a disciplina selecionada foi ${request.input.discipline ?? request.input.subject}.`
    });
  }

  return {
    approved: !issues.some((issue) => issue.severity === "ERROR"),
    issues
  };
}

function buildWorksheetBlueprints(
  materialBlueprint: MaterialBlueprint,
  worksheetCount: number
): WorksheetBlueprint[] {
  return Array.from({ length: worksheetCount }, (_, index) => {
    const sheetNumber = index + 1;
    const sequence = resolveWorksheetSequence(materialBlueprint);
    const template =
      sequence[index % sequence.length] ??
      sequence[0]!;
    const plannedTasks = template.actionTypes.map((actionType, taskIndex) =>
      buildWorksheetPlannedTask(materialBlueprint, actionType, sheetNumber, taskIndex + 1)
    );
    const primaryPattern = template.primaryPattern ?? resolvePrimaryPattern(template.actionTypes[0]);
    const secondaryPattern = template.secondaryPattern ?? resolveSecondaryPattern(template.actionTypes[1], primaryPattern);
    const visualPlan = template.visualPlan ?? resolveVisualPlanFromResources(template.resources);
    const supportPlan = template.supportPlan ?? [
      "comandos diretos",
      "exemplo antes da tarefa complexa",
      "apoio visual funcional"
    ];
    const editorialConstraints = template.editorialConstraints ?? [
      "maximo de tres blocos principais",
      "comandos curtos",
      "espaco de resposta adequado"
    ];
    const accessibilityConstraints = template.accessibilityConstraints ?? [
      "linguagem concreta",
      "pouca informacao simultanea",
      "fonte legivel e contraste adequado"
    ];
    const validationRules = template.validationRules ?? [
      "folha deve ter funcao pedagogica clara",
      "tarefas devem corresponder ao objetivo da folha"
    ];
    const diversityScore = calculateWorksheetDiversityScore(template, plannedTasks);
    const qualityScore = calculateWorksheetQualityScore(template, plannedTasks, diversityScore);

    return {
      sheetNumber,
      pedagogicalRole: template.pedagogicalRole ?? template.learningFocus,
      title: `${materialBlueprint.content}: ${template.title}`,
      objective: `${template.objective} em ${materialBlueprint.content}.`,
      strategy: template.strategy,
      methodology: template.methodology,
      primaryPattern,
      secondaryPattern,
      interactionMode: template.interactionMode ?? "resposta curta com apoio visual",
      resources: uniqueStrings([
        ...template.resources,
        ...materialBlueprint.visualRequirements.slice(0, 2),
        ...materialBlueprint.recommendedSupports.slice(0, 2)
      ]),
      visualPlan,
      supportPlan: adaptSupportPlanForProfile(supportPlan, materialBlueprint),
      responsePlan: template.responsePlan ?? resolvePattern(primaryPattern).responseType,
      visualIdentity: template.visualIdentity,
      learningFocus: template.learningFocus,
      contentScope: template.contentScope,
      contentRequirements: template.contentRequirements ?? [
        materialBlueprint.content,
        materialBlueprint.knowledgeObject
      ],
      forbiddenContent: template.forbiddenContent,
      requiredExamples: template.requiredExamples,
      requiredTaskTypes: template.requiredTaskTypes,
      expectedProgression: template.expectedProgression,
      editorialPattern: template.editorialPattern,
      editorialConstraints,
      accessibilityConstraints: adaptAccessibilityConstraints(accessibilityConstraints, materialBlueprint),
      validationRules: [
        ...validationRules,
        "nao repetir o mesmo molde da folha anterior",
        "validar se o visual tem funcao pedagogica"
      ],
      assessmentEvidence: template.assessmentEvidence,
      cognitiveProgression: template.cognitiveProgression,
      actionTypes: template.actionTypes,
      teacherGuideFocus: template.teacherGuideFocus,
      successCriteria: [
        plannedTasks[0]?.successCriterion ?? `Realiza a proposta da folha ${sheetNumber} com apoio adequado.`,
        `Mantem relacao direta com ${materialBlueprint.knowledgeObject}.`
      ],
      plannedTasks,
      qualityScore,
      diversityScore
    };
  });
}

function buildWorksheetPlannedTask(
  materialBlueprint: MaterialBlueprint,
  actionType: ActivityActionType,
  sheetNumber: number,
  taskOrder: number
): PlannedTask {
  const baseTask =
    materialBlueprint.plannedTasks.find((task) => task.actionType === actionType) ??
    materialBlueprint.plannedTasks[(sheetNumber + taskOrder - 2) % materialBlueprint.plannedTasks.length];

  return {
    order: taskOrder,
    actionType,
    pedagogicalPurpose:
      baseTask?.pedagogicalPurpose ??
      `desenvolver ${materialBlueprint.content} na folha ${sheetNumber}`,
    cognitiveDemand:
      baseTask?.cognitiveDemand ??
      `progressao cognitiva da folha ${sheetNumber}`,
    instructionStyle:
      baseTask?.instructionStyle ??
      "comandos curtos, objetivos e mediados quando necessario",
    responseMode:
      baseTask?.responseMode ??
      "resposta curta, marcacao, pareamento ou producao guiada",
    supportRequired:
      baseTask?.supportRequired ??
      ["instrucoes curtas", "apoio visual funcional", "exemplo resolvido"],
    visualFunction:
      baseTask?.visualFunction ??
      `visual funcional para ${materialBlueprint.content}`,
    successCriterion:
      baseTask?.successCriterion ??
      `estudante realiza a tarefa ${taskOrder} da folha ${sheetNumber} com apoio adequado`
  };
}

type WorksheetTemplate = Omit<
  WorksheetBlueprint,
  | "sheetNumber"
  | "title"
  | "objective"
  | "successCriteria"
  | "plannedTasks"
  | "pedagogicalRole"
  | "primaryPattern"
  | "secondaryPattern"
  | "interactionMode"
  | "visualPlan"
  | "supportPlan"
  | "responsePlan"
  | "contentRequirements"
  | "editorialConstraints"
  | "accessibilityConstraints"
  | "validationRules"
  | "qualityScore"
  | "diversityScore"
> &
Partial<Pick<
  WorksheetBlueprint,
  | "pedagogicalRole"
  | "primaryPattern"
  | "secondaryPattern"
  | "interactionMode"
  | "visualPlan"
  | "supportPlan"
  | "responsePlan"
  | "contentRequirements"
  | "editorialConstraints"
  | "accessibilityConstraints"
  | "validationRules"
>> & {
  title: string;
  objective: string;
};

function resolveWorksheetSequence(materialBlueprint: MaterialBlueprint): WorksheetTemplate[] {
  const source = normalizeComparable([
    materialBlueprint.discipline,
    materialBlueprint.knowledgeObject,
    materialBlueprint.content,
    materialBlueprint.skillCode
  ].join(" "));

  if (source.includes("lingua") && source.includes("substantivo")) {
    return SUBSTANTIVE_WORKSHEET_SEQUENCE;
  }

  if (
    source.includes("lingua") &&
    (
      source.includes("conto") ||
      source.includes("fabula") ||
      source.includes("mito") ||
      source.includes("narrativa") ||
      source.includes("ef06lp04")
    )
  ) {
    return NARRATIVE_WORKSHEET_SEQUENCE;
  }

  return WORKSHEET_SEQUENCE;
}

export const PEDAGOGICAL_ACTIVITY_PATTERNS: PedagogicalActivityPattern[] = [
  createPattern("MARK_ONE", "escolher uma resposta entre poucas alternativas", "LOW", 2, 4, "SMALL", true, "marcacao objetiva"),
  createPattern("MARK_MULTIPLE", "marcar mais de uma resposta correta", "MEDIUM", 3, 5, "MEDIUM", true, "marcacao multipla"),
  createPattern("CIRCLE", "circular elementos relevantes no material", "LOW", 2, 4, "SMALL", true, "circulo ou destaque"),
  createPattern("MATCH_COLUMNS", "relacionar itens de duas colunas", "MEDIUM", 3, 5, "MEDIUM", false, "ligacao entre pares"),
  createPattern("CLASSIFY", "separar itens em categorias claras", "MEDIUM", 4, 8, "MEDIUM", false, "classificacao em grupos"),
  createPattern("COMPLETE_WITH_WORD_BANK", "completar lacunas com banco de palavras", "MEDIUM", 2, 4, "MEDIUM", false, "lacunas com banco de palavras"),
  createPattern("COMPLETE_SENTENCE", "completar frases curtas com sentido", "MEDIUM", 2, 4, "MEDIUM", false, "lacunas em frase"),
  createPattern("IMAGE_QUESTION", "responder a partir de imagem ou cena", "LOW", 1, 3, "LARGE", true, "marcacao ou resposta curta"),
  createPattern("ORDER_SEQUENCE", "ordenar acontecimentos ou etapas", "MEDIUM", 3, 5, "LARGE", true, "sequencia numerada"),
  createPattern("CUT_AND_PASTE", "recortar e colar cartoes", "MEDIUM", 3, 6, "LARGE", true, "recorte e colagem"),
  createPattern("TRUE_FALSE_VISUAL", "julgar afirmacoes com apoio visual", "LOW", 3, 5, "MEDIUM", true, "verdadeiro ou falso"),
  createPattern("SOLVED_EXAMPLE", "analisar exemplo resolvido antes da tarefa", "LOW", 1, 2, "MEDIUM", true, "exemplo guiado"),
  createPattern("SHORT_PRODUCTION", "produzir resposta curta com apoio", "HIGH", 1, 3, "LARGE", false, "producao curta"),
  createPattern("CONTEXT_PROBLEM", "resolver situacao contextualizada", "HIGH", 1, 3, "LARGE", true, "resposta curta contextual"),
  createPattern("TABLE_COMPLETION", "preencher tabela ou quadro", "MEDIUM", 3, 6, "MEDIUM", false, "tabela preenchivel"),
  createPattern("SELF_ASSESSMENT", "registrar autoavaliacao simples", "LOW", 2, 4, "SMALL", true, "checklist visual"),
  createPattern("FINAL_CHALLENGE", "integrar aprendizagens em desafio final", "HIGH", 2, 4, "LARGE", true, "sintese ou producao curta")
];

function createPattern(
  id: PedagogicalActivityPatternId,
  objective: string,
  complexity: PedagogicalActivityPattern["complexity"],
  minItems: number,
  maxItems: number,
  space: PedagogicalActivityPattern["space"],
  requiresVisual: boolean,
  responseType: string
): PedagogicalActivityPattern {
  return {
    id,
    objective,
    complexity,
    recommendedItems: { min: minItems, max: maxItems },
    space,
    suitableProfiles: ["DI", "TEA", "DV", "DA", "TDAH", "AH/SD", "CAA"],
    requiresVisual,
    responseType,
    incompatibilities: [],
    editorialConstraints: [
      "uma acao principal por comando",
      "espaco de resposta proporcional",
      "visual com funcao pedagogica quando solicitado"
    ]
  };
}

function resolvePattern(id: PedagogicalActivityPatternId): PedagogicalActivityPattern {
  return PEDAGOGICAL_ACTIVITY_PATTERNS.find((pattern) => pattern.id === id) ??
    PEDAGOGICAL_ACTIVITY_PATTERNS[0]!;
}

function resolvePrimaryPattern(actionType: ActivityActionType | undefined): PedagogicalActivityPatternId {
  switch (actionType) {
    case "OBSERVE":
      return "IMAGE_QUESTION";
    case "MATCH":
    case "CONNECT":
      return "MATCH_COLUMNS";
    case "CLASSIFY":
      return "CLASSIFY";
    case "ORDER":
      return "ORDER_SEQUENCE";
    case "SOLVE":
      return "CONTEXT_PROBLEM";
    case "CREATE_GUIDED_EXAMPLE":
      return "SHORT_PRODUCTION";
    default:
      return "COMPLETE_WITH_WORD_BANK";
  }
}

function resolveSecondaryPattern(
  actionType: ActivityActionType | undefined,
  primaryPattern: PedagogicalActivityPatternId
): PedagogicalActivityPatternId {
  const candidate = resolvePrimaryPattern(actionType);

  return candidate === primaryPattern ? "MARK_ONE" : candidate;
}

function resolveVisualPlanFromResources(resources: string[]): string[] {
  return resources.length > 0
    ? resources
    : ["quadro visual funcional", "cartoes ou organizador simples"];
}

function adaptSupportPlanForProfile(supportPlan: string[], materialBlueprint: MaterialBlueprint): string[] {
  const profile = normalizeComparable(materialBlueprint.studentProfile);
  const supportLevel = normalizeComparable(materialBlueprint.supportLevel);
  const additions = profile.includes("intelectual") || profile.includes("di") || supportLevel.includes("moderado")
    ? [
        "2 a 4 itens por bloco",
        "uma acao por comando",
        "exemplo antes de tarefa complexa",
        "resposta curta e mediada"
      ]
    : [];

  return uniqueStrings([...supportPlan, ...additions]);
}

function adaptAccessibilityConstraints(values: string[], materialBlueprint: MaterialBlueprint): string[] {
  return uniqueStrings([
    ...values,
    ...materialBlueprint.antiInfantilizationGuidance.slice(0, 2),
    "nao infantilizar linguagem, visual ou contexto"
  ]);
}

function calculateWorksheetDiversityScore(template: WorksheetTemplate, plannedTasks: PlannedTask[]): number {
  const actionDiversity = new Set(plannedTasks.map((task) => task.actionType)).size * 12;
  const responseDiversity = new Set(plannedTasks.map((task) => task.responseMode)).size * 8;
  const visualScore = (template.visualPlan ?? template.resources).length >= 2 ? 20 : 8;
  const patternScore = template.primaryPattern !== template.secondaryPattern ? 20 : 8;

  return Math.min(100, actionDiversity + responseDiversity + visualScore + patternScore);
}

function calculateWorksheetQualityScore(
  template: WorksheetTemplate,
  plannedTasks: PlannedTask[],
  diversityScore: number
): number {
  let score = 48;

  if (template.pedagogicalRole || template.learningFocus) score += 8;
  if (template.primaryPattern || plannedTasks.length > 0) score += 8;
  if ((template.visualPlan ?? template.resources).length > 0) score += 8;
  if ((template.supportPlan ?? []).length > 0 || template.resources.length > 0) score += 6;
  if (template.responsePlan || plannedTasks.some((task) => task.responseMode)) score += 6;
  if ((template.editorialConstraints ?? []).length > 0 || template.editorialPattern) score += 6;
  if (diversityScore >= 70) score += 10;

  return Math.min(100, score);
}

const WORKSHEET_SEQUENCE: WorksheetTemplate[] = [
  {
    title: "leitura guiada e reconhecimento",
    objective: "Reconhecer o conceito central com apoio visual e exemplo guiado",
    strategy: "Leitura guiada, observacao e classificacao inicial",
    methodology: "Mediacao direta com comandos curtos, exemplo resolvido e checagem de compreensao.",
    resources: ["imagem funcional", "quadro de apoio", "exemplo resolvido"],
    visualIdentity: "folha limpa com destaque para conceito, imagem funcional e caixas amplas",
    learningFocus: "reconhecimento inicial",
    contentScope: "conceito central e exemplos concretos",
    forbiddenContent: ["atividade isolada", "exemplos ambiguos"],
    requiredExamples: ["exemplo do conteudo", "contraexemplo simples"],
    requiredTaskTypes: ["observar", "completar", "criar com apoio"],
    expectedProgression: "do reconhecimento visual para resposta curta",
    editorialPattern: "texto curto, quadro de apoio e tarefas guiadas",
    assessmentEvidence: "identifica o conceito em exemplo concreto",
    cognitiveProgression: "lembrar e reconhecer",
    actionTypes: ["OBSERVE", "COMPLETE", "CREATE_GUIDED_EXAMPLE"],
    teacherGuideFocus: ["ativacao de repertorio", "barreiras iniciais", "apoio visual"]
  },
  {
    title: "associacao e organizacao",
    objective: "Relacionar representacoes, conceitos ou respostas com apoio estruturado",
    strategy: "Associacao, recorte simbolico e pareamento",
    methodology: "Organizar cartoes, pares e pistas visuais para reduzir carga de memoria.",
    resources: ["cartoes", "pictogramas", "organizadores visuais"],
    visualIdentity: "grade de associacao com linhas, setas e pares bem separados",
    learningFocus: "associacao e organizacao",
    contentScope: "relacao entre exemplos e significados",
    forbiddenContent: ["pares repetidos", "cartoes genericos"],
    requiredExamples: ["pares concretos", "categorias claras"],
    requiredTaskTypes: ["classificar", "parear", "completar"],
    expectedProgression: "relacionar exemplos antes de aplicar",
    editorialPattern: "cartoes em grade e quadro de organizacao",
    assessmentEvidence: "relaciona exemplos ao significado correto",
    cognitiveProgression: "compreender e relacionar",
    actionTypes: ["CLASSIFY", "MATCH", "COMPLETE"],
    teacherGuideFocus: ["pareamento", "CAA quando necessario", "mediacao por escolha"]
  },
  {
    title: "jogo pedagogico e sequencia",
    objective: "Aplicar o conteudo em uma sequencia curta com resposta ativa",
    strategy: "Jogo, sequencia e producao orientada",
    methodology: "Alternar observacao, resposta curta e producao guiada para manter engajamento.",
    resources: ["trilha visual", "sequencia numerada", "caixas de resposta"],
    visualIdentity: "folha com percurso visual, etapas numeradas e desafio progressivo",
    learningFocus: "sequencia e aplicacao",
    contentScope: "uso ativo do conteudo em percurso curto",
    forbiddenContent: ["repeticao mecanica da folha anterior"],
    requiredExamples: ["sequencia de etapas", "resposta ativa"],
    requiredTaskTypes: ["ligar", "conectar", "completar"],
    expectedProgression: "aplicar com apoio e reduzir pistas",
    editorialPattern: "trilha visual com etapas numeradas",
    assessmentEvidence: "aplica o conteudo em sequencia curta",
    cognitiveProgression: "aplicar com apoio",
    actionTypes: ["MATCH", "CONNECT", "COMPLETE"],
    teacherGuideFocus: ["progressao cognitiva", "autonomia", "generalizacao parcial"]
  },
  {
    title: "problemas contextualizados",
    objective: "Resolver situacoes contextualizadas preservando o objetivo curricular",
    strategy: "Problemas contextualizados e construcao coletiva",
    methodology: "Usar situacoes concretas, perguntas orientadoras e registro passo a passo.",
    resources: ["situacao-problema", "tabela", "espaco de calculo ou registro"],
    visualIdentity: "blocos de problema com contexto, representacao e resposta",
    learningFocus: "uso em contexto",
    contentScope: "situacoes contextualizadas e producao curta",
    forbiddenContent: ["contexto falso", "lacunas sem frase"],
    requiredExamples: ["frase contextualizada", "producao curta"],
    requiredTaskTypes: ["completar", "criar com apoio", "observar"],
    expectedProgression: "aplicar em frase e produzir com apoio",
    editorialPattern: "frases contextualizadas com espaco de resposta",
    assessmentEvidence: "usa o conteudo em contexto coerente",
    cognitiveProgression: "aplicar e analisar",
    actionTypes: ["COMPLETE", "CREATE_GUIDED_EXAMPLE", "OBSERVE"],
    teacherGuideFocus: ["mediação", "criterios de sucesso", "transferencia"]
  },
  {
    title: "avaliacao e generalizacao",
    objective: "Demonstrar aprendizagem em tarefa final com menor apoio",
    strategy: "Avaliacao formativa, generalizacao e autoavaliacao",
    methodology: "Reduzir apoio gradualmente e registrar evidencias de aprendizagem.",
    resources: ["rubrica simples", "autoavaliacao", "desafio final"],
    visualIdentity: "folha de fechamento com tarefa-sintese e autoavaliacao visual",
    learningFocus: "avaliacao e generalizacao",
    contentScope: "atividade integradora com menor apoio",
    forbiddenContent: ["repetir folha inicial", "avaliacao sem producao"],
    requiredExamples: ["identificar", "classificar", "produzir"],
    requiredTaskTypes: ["classificar", "completar", "criar"],
    expectedProgression: "integrar conteudos e produzir resposta final",
    editorialPattern: "atividade integradora e autoavaliacao simples",
    assessmentEvidence: "demonstra aprendizagem em tarefa final",
    cognitiveProgression: "avaliar e criar",
    actionTypes: ["CLASSIFY", "COMPLETE", "CREATE_GUIDED_EXAMPLE"],
    teacherGuideFocus: ["evidencias", "avaliacao formativa", "proximos passos"]
  }
];

const NARRATIVE_WORKSHEET_SEQUENCE: WorksheetTemplate[] = [
  {
    pedagogicalRole: "reconhecimento e ativacao",
    title: "conhecendo as narrativas",
    objective: "Reconhecer conto, fabula e mito por meio de cenas e exemplos concretos",
    strategy: "Observacao de imagens, escolha e marcacao com baixa carga textual",
    methodology: "Apresentar cenas simples, nomear tipos de narrativa e pedir reconhecimento visual.",
    primaryPattern: "IMAGE_QUESTION",
    secondaryPattern: "MARK_ONE",
    interactionMode: "marcar, circular e escolher entre poucas alternativas",
    resources: ["conjunto de imagens narrativas", "cartoes conto fabula mito", "quadro visual de exemplo"],
    visualPlan: ["imagem central com tres cenas", "cartoes visuais de conto, fabula e mito"],
    supportPlan: ["exemplo resolvido", "comando curto", "poucas alternativas"],
    responsePlan: "marcacao objetiva e circulo em elementos da cena",
    visualIdentity: "imagem grande, poucas palavras e alternativas visiveis",
    learningFocus: "reconhecimento de generos narrativos",
    contentScope: "conto, fabula e mito em exemplos concretos",
    contentRequirements: ["conto", "fabula", "mito", "personagem", "cenario"],
    forbiddenContent: ["definicao longa", "producao textual longa", "metadados curriculares"],
    requiredExamples: ["menina na floresta", "animais conversando", "deus ou heroi de mito"],
    requiredTaskTypes: ["observar imagem", "marcar", "circular"],
    expectedProgression: "reconhecer antes de relacionar caracteristicas",
    editorialPattern: "IMAGE_FOCUS",
    editorialConstraints: ["maximo de tres cenas", "baixa carga textual", "alternativas grandes"],
    accessibilityConstraints: ["2 a 4 itens por bloco", "uma acao por comando", "apoio visual funcional"],
    validationRules: ["deve conter imagem ou conjunto visual central", "nao exigir producao longa"],
    assessmentEvidence: "identifica o tipo de narrativa com apoio visual",
    cognitiveProgression: "lembrar e reconhecer",
    actionTypes: ["OBSERVE", "CLASSIFY", "COMPLETE"],
    teacherGuideFocus: ["ativacao de repertorio", "reconhecimento visual", "mediacao por escolha"]
  },
  {
    pedagogicalRole: "relacao e compreensao",
    title: "quem e quem na historia?",
    objective: "Relacionar personagens, cenarios e caracteristicas aos tipos de narrativa",
    strategy: "Pareamento e classificacao com cartoes de elementos narrativos",
    methodology: "Usar cartoes de personagem, lugar e ensinamento para construir relacoes.",
    primaryPattern: "MATCH_COLUMNS",
    secondaryPattern: "CLASSIFY",
    interactionMode: "ligar colunas, classificar e completar com banco de palavras",
    resources: ["cartoes de personagem", "duas colunas", "banco de palavras narrativas"],
    visualPlan: ["duas colunas alinhadas", "cartoes com personagem, cenario e mensagem"],
    supportPlan: ["banco de palavras", "pista visual", "exemplo de pareamento"],
    responsePlan: "ligacao entre pares e classificacao em grupos",
    visualIdentity: "grade de pareamento com linhas e cartoes claros",
    learningFocus: "relacoes entre elementos narrativos",
    contentScope: "personagens, cenarios, acontecimentos e ensinamentos",
    contentRequirements: ["personagem", "cenario", "acontecimento", "ensinamento"],
    forbiddenContent: ["pares repetidos", "caracteristicas ambiguas"],
    requiredExamples: ["personagem", "lugar", "problema", "ensinamento"],
    requiredTaskTypes: ["ligar colunas", "classificar", "completar com banco"],
    expectedProgression: "relacionar caracteristicas antes de ordenar acontecimentos",
    editorialPattern: "MATCHING",
    editorialConstraints: ["itens alinhados", "minimo de tres pares reais", "sem alternativas vazias"],
    accessibilityConstraints: ["palavras curtas", "pistas visuais", "espaco amplo para ligacao"],
    validationRules: ["deve ter pelo menos tres pares reais", "nao repetir itens da folha 1"],
    assessmentEvidence: "relaciona elementos narrativos a suas funcoes",
    cognitiveProgression: "compreender e relacionar",
    actionTypes: ["MATCH", "CLASSIFY", "COMPLETE"],
    teacherGuideFocus: ["compreensao de relacoes", "classificacao com apoio", "vocabulos narrativos"]
  },
  {
    pedagogicalRole: "organizacao e sequencia",
    title: "organize os acontecimentos",
    objective: "Organizar comeco, meio e fim de uma narrativa curta",
    strategy: "Sequencia de cenas e ordenacao de acontecimentos",
    methodology: "Apresentar cartoes/cenas, numerar a ordem e completar a estrutura narrativa.",
    primaryPattern: "ORDER_SEQUENCE",
    secondaryPattern: "CUT_AND_PASTE",
    interactionMode: "ordenar, numerar, recortar simbolicamente e completar etapas",
    resources: ["sequencia de cenas", "cartoes com comeco meio fim", "setas de ordem"],
    visualPlan: ["tres cenas numeraveis", "linha de sequencia com setas"],
    supportPlan: ["rotina visual", "numeracao 1 2 3", "pista comeco meio fim"],
    responsePlan: "numeracao de cenas e preenchimento de quadro curto",
    visualIdentity: "cartoes de cena, setas e espaco para ordenar",
    learningFocus: "estrutura narrativa",
    contentScope: "comeco, meio, fim, problema e solucao",
    contentRequirements: ["comeco", "meio", "fim", "problema", "solucao"],
    forbiddenContent: ["sequencia sem imagens", "texto longo sem apoio"],
    requiredExamples: ["inicio da historia", "acontecimento principal", "final"],
    requiredTaskTypes: ["ordenar cenas", "numerar", "completar etapas"],
    expectedProgression: "organizar acontecimentos antes de interpretar mensagem",
    editorialPattern: "SEQUENCE",
    editorialConstraints: ["cartoes grandes", "setas claras", "sem excesso de texto"],
    accessibilityConstraints: ["pouca informacao simultanea", "etapas numeradas", "comando objetivo"],
    validationRules: ["deve conter ordem narrativa", "deve diferenciar comeco meio e fim"],
    assessmentEvidence: "ordena acontecimentos em sequencia coerente",
    cognitiveProgression: "organizar e sequenciar",
    actionTypes: ["ORDER", "CONNECT", "COMPLETE"],
    teacherGuideFocus: ["organizacao temporal", "estrutura narrativa", "mediacao por cenas"]
  },
  {
    pedagogicalRole: "aplicacao contextualizada",
    title: "qual e a mensagem?",
    objective: "Identificar mensagem ou ensinamento em uma narrativa curta",
    strategy: "Leitura curta, escolha justificada e producao breve",
    methodology: "Usar microtexto narrativo com apoio visual e perguntas de sentido.",
    primaryPattern: "CONTEXT_PROBLEM",
    secondaryPattern: "SHORT_PRODUCTION",
    interactionMode: "ler texto curto, escolher mensagem e escrever frase curta",
    resources: ["microconto ilustrado", "banco de mensagens", "quadro de resposta curta"],
    visualPlan: ["cena contextual", "quadro mensagem da historia", "banco de palavras"],
    supportPlan: ["texto curto", "banco de palavras", "frase iniciada"],
    responsePlan: "escolha justificada e resposta curta",
    visualIdentity: "texto curto com imagem de contexto e linhas amplas",
    learningFocus: "interpretacao de mensagem",
    contentScope: "mensagem, ensinamento e sentido da narrativa",
    contentRequirements: ["mensagem", "ensinamento", "personagem", "acontecimento"],
    forbiddenContent: ["pergunta abstrata sem apoio", "producao longa"],
    requiredExamples: ["ajuda", "cuidado", "respeito", "aprendizagem"],
    requiredTaskTypes: ["ler cena", "marcar mensagem", "produzir frase curta"],
    expectedProgression: "aplicar compreensao em situacao contextualizada",
    editorialPattern: "PRODUCTION",
    editorialConstraints: ["microtexto curto", "linhas amplas", "uma pergunta por bloco"],
    accessibilityConstraints: ["frase iniciada", "vocabulos concretos", "resposta curta"],
    validationRules: ["deve conter mensagem da narrativa", "producao deve ser curta"],
    assessmentEvidence: "identifica mensagem e registra justificativa curta",
    cognitiveProgression: "aplicar e interpretar",
    actionTypes: ["OBSERVE", "COMPLETE", "CREATE_GUIDED_EXAMPLE"],
    teacherGuideFocus: ["interpretacao com apoio", "mensagem da narrativa", "producao curta"]
  },
  {
    pedagogicalRole: "sintese e avaliacao",
    title: "desafio final",
    objective: "Integrar reconhecimento, sequencia e mensagem em uma tarefa final com menor apoio",
    strategy: "Desafio integrador com autoavaliacao simples",
    methodology: "Reduzir pistas, solicitar sintese curta e registrar autoavaliacao visual.",
    primaryPattern: "FINAL_CHALLENGE",
    secondaryPattern: "SELF_ASSESSMENT",
    interactionMode: "classificar, ordenar, produzir frase curta e autoavaliar",
    resources: ["checklist visual", "quadro de sintese", "estrela de autoavaliacao"],
    visualPlan: ["quadro integrador", "checklist visual", "autoavaliacao por marcacao"],
    supportPlan: ["menos pistas", "exemplo apenas se necessario", "checklist simples"],
    responsePlan: "sintese curta, classificacao final e autoavaliacao",
    visualIdentity: "folha final com blocos curtos, checklist e desafio",
    learningFocus: "sintese e avaliacao formativa",
    contentScope: "tipo de narrativa, estrutura, personagem e mensagem",
    contentRequirements: ["tipo de narrativa", "comeco meio fim", "mensagem", "autoavaliacao"],
    forbiddenContent: ["repetir folha inicial", "avaliacao apenas de marcar"],
    requiredExamples: ["conto", "fabula", "mito", "mensagem final"],
    requiredTaskTypes: ["classificar", "ordenar", "produzir", "autoavaliar"],
    expectedProgression: "demonstrar aprendizagem com menor apoio",
    editorialPattern: "FINAL_CHALLENGE",
    editorialConstraints: ["sem repetir estrutura anterior", "menos apoios", "espaco amplo para frase final"],
    accessibilityConstraints: ["autoavaliacao visual", "comando curto", "resposta curta"],
    validationRules: ["deve integrar pelo menos tres conceitos", "deve conter autoavaliacao simples"],
    assessmentEvidence: "demonstra aprendizagem em sintese final com menor apoio",
    cognitiveProgression: "avaliar e criar",
    actionTypes: ["CLASSIFY", "ORDER", "CREATE_GUIDED_EXAMPLE"],
    teacherGuideFocus: ["avaliacao formativa", "autonomia", "proximos passos"]
  }
];

const SUBSTANTIVE_WORKSHEET_SEQUENCE: WorksheetTemplate[] = [
  {
    title: "reconhecimento de substantivos",
    objective: "Reconhecer substantivos em texto curto sem exigir classificacao complexa",
    strategy: "Leitura guiada com destaque visual de nomes de pessoa, lugar, animal e objeto",
    methodology: "Apresentar texto curto, destacar exemplos e pedir identificacao com marcacao visual.",
    resources: ["texto curto com substantivos destacados", "cartoes pessoa lugar animal objeto", "quadro de reconhecimento pessoa lugar animal objeto"],
    visualPlan: ["texto curto com palavras destacadas", "cartoes pessoa lugar animal objeto", "quadro pessoa lugar animal objeto"],
    visualIdentity: "texto curto com palavras destacadas, legenda simples e quadro de reconhecimento",
    learningFocus: "reconhecimento",
    contentScope: "identificar substantivos em texto curto",
    forbiddenContent: ["classificacao proprio/comum complexa", "flexoes", "passo 3", "resposta 7"],
    requiredExamples: ["Ana", "Rex", "praca", "Vitoria", "livro"],
    requiredTaskTypes: ["circular", "sublinhar", "completar quadro"],
    expectedProgression: "do reconhecimento no texto para organizacao em quadro simples",
    editorialPattern: "texto curto, legenda visual e quadro pessoa/lugar/animal/objeto",
    assessmentEvidence: "identifica substantivos no texto com apoio visual",
    cognitiveProgression: "lembrar e reconhecer",
    actionTypes: ["OBSERVE", "COMPLETE", "MATCH"],
    teacherGuideFocus: ["leitura mediada", "identificacao de substantivos", "apoio visual"]
  },
  {
    title: "classificacao em proprios e comuns",
    objective: "Classificar substantivos proprios e comuns usando exemplos inequívocos",
    strategy: "Classificacao com cartoes e pareamento entre palavra e categoria",
    methodology: "Separar nomes proprios com inicial maiuscula de substantivos comuns em minuscula.",
    resources: ["cartoes de palavras proprio comum", "duas colunas proprio comum", "pistas de letra maiuscula"],
    visualPlan: ["cartoes de palavras proprio comum", "duas colunas proprio comum", "pistas de letra maiuscula"],
    visualIdentity: "duas colunas grandes para proprio e comum com cartoes recortaveis",
    learningFocus: "classificacao proprio/comum",
    contentScope: "Ana, Vitoria e Rex como proprios; escola, livro e cachorro como comuns",
    forbiddenContent: ["cachorro como proprio", "escola como lugar proprio", "exemplos ambiguos"],
    requiredExamples: ["Ana", "Vitoria", "Rex", "escola", "livro", "cachorro"],
    requiredTaskTypes: ["classificar", "ligar", "organizar"],
    expectedProgression: "distinguir categorias com exemplos seguros",
    editorialPattern: "quadro de classificacao com cartoes claros",
    assessmentEvidence: "classifica corretamente substantivos proprios e comuns",
    cognitiveProgression: "compreender e classificar",
    actionTypes: ["CLASSIFY", "MATCH", "COMPLETE"],
    teacherGuideFocus: ["conceito de proprio/comum", "evitar ambiguidade", "mediacao por cartoes"]
  },
  {
    title: "flexoes dos substantivos",
    objective: "Reconhecer flexoes de genero e numero em substantivos concretos",
    strategy: "Transformacao guiada de singular/plural e masculino/feminino",
    methodology: "Usar pares concretos e completar transformacoes sem misturar com classificacao proprio/comum.",
    resources: ["quadro de flexoes", "setas de transformacao", "pares de palavras"],
    visualIdentity: "tabela de transformacao com setas e espacos amplos",
    learningFocus: "flexoes",
    contentScope: "genero, numero, singular, plural, masculino e feminino quando aplicavel",
    forbiddenContent: ["apenas classificar proprio/comum", "exemplos sem flexao", "passo 3", "resposta 7"],
    requiredExamples: ["menino/menina", "aluno/alunos", "cidade/cidades", "professor/professora"],
    requiredTaskTypes: ["transformar", "completar", "relacionar"],
    expectedProgression: "do par pronto para completar nova flexao",
    editorialPattern: "quadro de flexoes com setas e lacunas",
    assessmentEvidence: "transforma substantivos em genero ou numero corretamente",
    cognitiveProgression: "aplicar transformacoes",
    actionTypes: ["MATCH", "COMPLETE", "CONNECT"],
    teacherGuideFocus: ["flexao de genero", "flexao de numero", "apoio por pares"]
  },
  {
    title: "uso dos substantivos em contexto",
    objective: "Usar substantivos proprios e comuns em frases contextualizadas",
    strategy: "Completar e produzir frases curtas com apoio semantico",
    methodology: "Partir de frases reais, substituir palavras e produzir frase curta com apoio.",
    resources: ["frases contextualizadas", "banco de palavras", "caixas de producao"],
    visualIdentity: "frases em blocos, banco de palavras e linhas para resposta",
    learningFocus: "uso contextual",
    contentScope: "identificar, substituir e produzir substantivos em frases",
    forbiddenContent: ["contexto ausente", "lacunas soltas", "atividade puramente classificatoria"],
    requiredExamples: ["Mariana", "biblioteca", "escola", "Vitoria", "caderno"],
    requiredTaskTypes: ["completar frase", "substituir substantivo", "produzir frase"],
    expectedProgression: "do completar para criar frase curta",
    editorialPattern: "texto curto, banco de palavras e producao guiada",
    assessmentEvidence: "usa substantivos adequados ao contexto",
    cognitiveProgression: "aplicar em contexto",
    actionTypes: ["COMPLETE", "CREATE_GUIDED_EXAMPLE", "ORDER"],
    teacherGuideFocus: ["uso em contexto", "producao curta", "sentido da frase"]
  },
  {
    title: "aplicacao e avaliacao final",
    objective: "Integrar identificacao, classificacao, flexao e producao de substantivos",
    strategy: "Avaliacao formativa com tarefas variadas e menor apoio",
    methodology: "Reduzir pistas, solicitar classificacao, flexao e producao final com autoavaliacao simples.",
    resources: ["checklist visual", "quadro integrador", "autoavaliacao simples"],
    visualIdentity: "folha final com blocos curtos, checklist e producao final",
    learningFocus: "aplicacao e avaliacao",
    contentScope: "identificar, classificar, flexionar, completar e produzir",
    forbiddenContent: ["repetir folha 1", "apenas observar", "avaliacao sem producao"],
    requiredExamples: ["Ana", "Vitoria", "Rex", "cachorro", "livro", "cidade/cidades"],
    requiredTaskTypes: ["classificar", "flexionar", "produzir", "autoavaliar"],
    expectedProgression: "integrar aprendizagens com menor mediacao",
    editorialPattern: "atividade integradora com checklist de autoavaliacao",
    assessmentEvidence: "demonstra uso correto em identificacao, classificacao, flexao e producao",
    cognitiveProgression: "avaliar e criar",
    actionTypes: ["CLASSIFY", "COMPLETE", "CREATE_GUIDED_EXAMPLE"],
    teacherGuideFocus: ["avaliacao formativa", "evidencias de aprendizagem", "proximos passos"]
  }
];

function addMissingIssue(
  issues: PedagogicalProjectValidationIssue[],
  value: string,
  field: string,
  message: string
): void {
  if (!value.trim()) {
    issues.push({
      code: "MISSING_PEDAGOGICAL_FIELD",
      field,
      severity: "ERROR",
      message
    });
  }
}

function resolveCompetencies(
  request: CreateMissionRequest,
  materialBlueprint: MaterialBlueprint
): string[] {
  return uniqueStrings([
    request.input.skill ?? "",
    materialBlueprint.learningObjective,
    `Competencia relacionada a ${materialBlueprint.knowledgeObject}`
  ]);
}

function resolvePotentialities(materialBlueprint: MaterialBlueprint): string[] {
  return [
    "aprendizagem com apoio visual e organizacao por etapas",
    "resposta curta, pareamento ou producao guiada quando necessario",
    `participacao em tarefas sobre ${materialBlueprint.content}`
  ];
}

function resolveAssistiveTechnology(materialBlueprint: MaterialBlueprint): string[] {
  return uniqueStrings([
    ...materialBlueprint.recommendedSupports.filter((support) =>
      normalizeComparable(support).includes("tecnologia") ||
      normalizeComparable(support).includes("ampliacao") ||
      normalizeComparable(support).includes("visual")
    ),
    "material impresso em A4 com organizacao visual acessivel"
  ]);
}

function resolveCaa(materialBlueprint: MaterialBlueprint): string[] {
  return materialBlueprint.recommendedSupports.some((support) =>
    normalizeComparable(support).includes("caa")
  )
    ? ["cartoes CAA", "pictogramas funcionais", "resposta por escolha"]
    : ["pictogramas funcionais quando necessario"];
}

function resolveLibras(materialBlueprint: MaterialBlueprint): string[] {
  return normalizeComparable(materialBlueprint.studentProfile).includes("libras")
    ? ["apoio visual e mediacao por profissional habilitado em Libras"]
    : ["nao inventar sinais de Libras sem validacao"];
}

function resolveBraille(materialBlueprint: MaterialBlueprint): string[] {
  const profile = normalizeComparable(materialBlueprint.studentProfile);

  return profile.includes("braille") || profile.includes("visual")
    ? ["preparar versao com fonte ampliada, alto contraste e transcricao Braille validada quando solicitado"]
    : ["Braille somente quando solicitado e validado"];
}

function resolveSkillArea(skill: string): string | undefined {
  if (!skill) {
    return undefined;
  }

  if (/\b(lp|ef\d{2}lp|em\d{2}lp)/i.test(skill)) {
    return "linguagens";
  }

  if (/\b(mat|ef\d{2}ma|em\d{2}mat)/i.test(skill)) {
    return "matematica";
  }

  if (/\b(cnt|cie|qui|fis|bio|ef\d{2}ci|em\d{2}cnt)/i.test(skill)) {
    return "ciencias";
  }

  if (/\b(chs|geo|his|ef\d{2}ge|ef\d{2}hi|em\d{2}chs)/i.test(skill)) {
    return "humanas";
  }

  return undefined;
}

function resolveDisciplineArea(discipline: string): string | undefined {
  if (discipline.includes("matematica")) {
    return "matematica";
  }

  if (discipline.includes("portugues") || discipline.includes("lingua")) {
    return "linguagens";
  }

  if (
    discipline.includes("ciencia") ||
    discipline.includes("quimica") ||
    discipline.includes("fisica") ||
    discipline.includes("biologia")
  ) {
    return "ciencias";
  }

  if (
    discipline.includes("historia") ||
    discipline.includes("geografia") ||
    discipline.includes("sociologia") ||
    discipline.includes("filosofia")
  ) {
    return "humanas";
  }

  return undefined;
}

function uniqueStrings(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter((value, index, all) => value && all.indexOf(value) === index);
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
