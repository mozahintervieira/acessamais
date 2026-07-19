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
  title: string;
  objective: string;
  strategy: string;
  methodology: string;
  resources: string[];
  visualIdentity: string;
  learningFocus: string;
  contentScope: string;
  forbiddenContent: string[];
  requiredExamples: string[];
  requiredTaskTypes: string[];
  expectedProgression: string;
  editorialPattern: string;
  assessmentEvidence: string;
  cognitiveProgression: string;
  actionTypes: ActivityActionType[];
  teacherGuideFocus: string[];
  successCriteria: string[];
  plannedTasks: PlannedTask[];
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
      skills: [input.materialBlueprint.skillCode],
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
  addMissingIssue(issues, skill, "skill", "Habilidade BNCC ou curricular e obrigatoria para gerar um projeto pedagogico consistente.");
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

    return {
      sheetNumber,
      title: `${materialBlueprint.content}: ${template.title}`,
      objective: `${template.objective} em ${materialBlueprint.content}.`,
      strategy: template.strategy,
      methodology: template.methodology,
      resources: uniqueStrings([
        ...template.resources,
        ...materialBlueprint.visualRequirements.slice(0, 2),
        ...materialBlueprint.recommendedSupports.slice(0, 2)
      ]),
      visualIdentity: template.visualIdentity,
      learningFocus: template.learningFocus,
      contentScope: template.contentScope,
      forbiddenContent: template.forbiddenContent,
      requiredExamples: template.requiredExamples,
      requiredTaskTypes: template.requiredTaskTypes,
      expectedProgression: template.expectedProgression,
      editorialPattern: template.editorialPattern,
      assessmentEvidence: template.assessmentEvidence,
      cognitiveProgression: template.cognitiveProgression,
      actionTypes: template.actionTypes,
      teacherGuideFocus: template.teacherGuideFocus,
      successCriteria: [
        plannedTasks[0]?.successCriterion ?? `Realiza a proposta da folha ${sheetNumber} com apoio adequado.`,
        `Mantem relacao direta com ${materialBlueprint.knowledgeObject}.`
      ],
      plannedTasks
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

type WorksheetTemplate = Omit<WorksheetBlueprint, "sheetNumber" | "title" | "objective" | "successCriteria" | "plannedTasks"> & {
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

  return source.includes("lingua") && source.includes("substantivo")
    ? SUBSTANTIVE_WORKSHEET_SEQUENCE
    : WORKSHEET_SEQUENCE;
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

const SUBSTANTIVE_WORKSHEET_SEQUENCE: WorksheetTemplate[] = [
  {
    title: "reconhecimento de substantivos",
    objective: "Reconhecer substantivos em texto curto sem exigir classificacao complexa",
    strategy: "Leitura guiada com destaque visual de nomes de pessoa, lugar, animal e objeto",
    methodology: "Apresentar texto curto, destacar exemplos e pedir identificacao com marcacao visual.",
    resources: ["texto curto", "cartoes pessoa lugar animal objeto", "quadro de apoio visual"],
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
    resources: ["cartoes de palavras", "duas colunas", "pistas de letra maiuscula"],
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
    request.input.skill ?? materialBlueprint.skillCode,
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
