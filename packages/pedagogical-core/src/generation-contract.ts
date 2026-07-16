export const CURRICULAR_ANALYSIS_STEPS = [
  "Ler a habilidade BNCC, descritor ou habilidade curricular como fonte principal de verdade.",
  "Identificar o verbo cognitivo, o objeto de conhecimento, a competencia exigida e a evidencia observavel de aprendizagem.",
  "Separar tema ou palavra-chave da competencia real que precisa ser avaliada.",
  "Planejar questoes e tarefas que exijam diretamente essa competencia.",
  "Descartar internamente qualquer tarefa que apenas mencione o tema sem avaliar a habilidade.",
  "Reconstruir a atividade antes da resposta final se o alinhamento curricular estiver fraco."
] as const;

export type ResourceGenerationType =
  | "ADAPTED_ACTIVITY"
  | "LESSON_PLAN"
  | "ASSESSMENT"
  | "PEI"
  | "ACCESSIBLE_RESOURCE";

export const RESOURCE_GENERATION_TYPES = [
  "ADAPTED_ACTIVITY",
  "LESSON_PLAN",
  "ASSESSMENT",
  "PEI",
  "ACCESSIBLE_RESOURCE"
] as const satisfies readonly ResourceGenerationType[];

export const TASK_DATA_OUTPUT_CONTRACT = {
  regraGeral:
    "Cada objeto em studentSheet.questions deve conter taskData completo e concreto conforme actionType. O frontend nao inventa conteudo; se taskData vier incompleto, a tarefa sera invalidada.",
  proibicoes: [
    "nao usar imagem de paisagem como recurso pedagogico",
    "nao usar placeholder visual sem relacao com o conceito",
    "nao criar alternativas vazias",
    "nao pedir pareamento sem itens reais dos dois lados",
    "nao pedir lacunas sem enunciado matematico completo",
    "nao pedir uso de blocos, balanca ou pictogramas sem dados concretos para renderizacao",
    "nao repetir a mesma representacao em varias tarefas",
    "nao inserir Progressao Aritmetica quando o objeto for equacoes"
  ],
  porActionType: {
    OBSERVE:
      "{ actionType: 'OBSERVE', representation, question, options, correctOption, visualDescription }",
    MATCH:
      "{ actionType: 'MATCH', leftItems, rightItems, correctPairs, connectionInstruction }",
    COMPLETE:
      "{ actionType: 'COMPLETE', statements, blanks, expectedAnswers, supportSteps }",
    SOLVE:
      "{ actionType: 'SOLVE', problemContext, equation, guidedSteps, answer, calculationSpace }",
    CLASSIFY:
      "{ actionType: 'CLASSIFY', items, categories, expectedClassification }",
    ORDER:
      "{ actionType: 'ORDER', items, correctOrder }",
    CONNECT:
      "{ actionType: 'CONNECT', sourceItems, targetItems, correctConnections }",
    CREATE_GUIDED_EXAMPLE:
      "{ actionType: 'CREATE_GUIDED_EXAMPLE', contextPrompt, availableValues, constructionSteps, fieldsToComplete, exampleAnswer }"
  },
  regraParaEquacoesSimples:
    "Quando o conteudo for equacoes do primeiro grau, usar equacoes simples e corretas, como x + 3 = 7, x + 2 = 6, x - 2 = 5, sempre com resultado verificavel e adequado ao ano, perfil e apoio solicitado."
} as const;

export const ADAPTED_ACTIVITY_OUTPUT_CONTRACT = {
  studentSheet: {
    title: "titulo para o estudante, sem codigo BNCC",
    context: "contexto curto para o estudante",
    instructions: "array de instrucoes para o estudante",
    baseText: "texto-base quando necessario",
    didacticBoxes: "array de quadros de apoio para o estudante",
    visualElements:
      "array de intencoes visuais renderizaveis, sem prefixos descritivos iniciados por imagem, icone, pictograma ou desenho",
    tableRows: "array no formato coluna1 | coluna2 | coluna3",
    questions:
      "array de objetos, um para cada plannedTask do MaterialBlueprint, preservando a mesma ordem. Cada objeto deve conter { plannedTaskOrder, actionType, pedagogicalPurpose, cognitiveDemand, responseMode, supportRequired, visualFunction, successCriterion, instruction, content, command, support, answerSpace, taskData }. taskData e obrigatorio e deve seguir TASK_DATA_OUTPUT_CONTRACT para o actionType. command e instruction devem ser apropriados ao estudante; support deve ser pista pedagogica curta, nunca descricao de imagem, icone, desenho, bloco ou pictograma"
  },
  teacherGuide: {
    skillCode: "habilidade BNCC ou curricular",
    knowledgeObject: "objeto de conhecimento",
    curricularAnalysis:
      "array com compreensao da habilidade, competencia exigida, evidencia esperada e checagem de alinhamento",
    objectives: "array de objetivos pedagogicos",
    methodology: "array de orientacoes metodologicas",
    adaptations: "array de adaptacoes realizadas",
    duaPrinciples: "array de principios do DUA aplicados",
    assessmentCriteria: "array de criterios de avaliacao",
    applicationSuggestions: "array de sugestoes de aplicacao"
  },
  subject: "string com disciplina ou area do conhecimento inferida",
  grade: "string com ano/serie quando informado ou inferido",
  worksheetTitle: "string com titulo da atividade",
  skillCode: "string com codigo/texto da habilidade",
  learningObjective: "string com objetivo de aprendizagem",
  curricularAnalysis:
    "array de strings com analise da habilidade, competencia exigida e evidencia de aprendizagem",
  context: "string com contexto pedagogico inicial da atividade",
  baseText: "string com texto-base curto quando necessario",
  instructions: "array de strings com instrucoes claras para estudante",
  questions:
    "array de objetos, um para cada plannedTask do MaterialBlueprint, com { plannedTaskOrder, actionType, pedagogicalPurpose, cognitiveDemand, responseMode, supportRequired, visualFunction, successCriterion, instruction, content, command, support, answerSpace, taskData }. taskData e obrigatorio e deve seguir TASK_DATA_OUTPUT_CONTRACT para o actionType. Nao trocar o conteudo informado pelo professor por outro tema. support deve ser pista pedagogica curta, nunca descricao textual de imagem",
  visualElements:
    "array de nomes semanticos para recursos visuais renderizaveis",
  didacticBoxes:
    "array de strings com quadros de apoio, lembretes ou conceitos-chave",
  tableRows:
    "array de strings no formato coluna1 | coluna2 | coluna3 para montar tabela pedagogica",
  graphicOrganizers:
    "array de strings com organizadores graficos sugeridos",
  methodologyTips:
    "array de strings com orientacoes objetivas para o professor",
  difficultyProgression:
    "array de strings descrevendo progressao de dificuldade",
  adaptationNotes: "array de strings explicando adaptacoes aplicadas",
  answerKey: "array de strings com gabarito ou criterios para professor",
  objectives: "array de strings",
  expectedOutputs: "array de strings",
  methodologicalConstraints: "array de strings",
  validationCriteria:
    "array de strings, incluindo criterio explicito de alinhamento direto com a competencia curricular",
  warnings: "array de strings",
  lessonFlow: "array de strings",
  adaptedActivities: "array de strings",
  accessibilitySupports: "array de strings",
  assessment: "array de strings",
  teacherReport: "array de strings",
  reuseSuggestions: "array de strings"
} as const;

export const PEDAGOGICAL_RESOURCE_OUTPUT_CONTRACT =
  ADAPTED_ACTIVITY_OUTPUT_CONTRACT;

export const PEI_OUTPUT_CONTRACT = {
  studentProfile: {
    pedagogicalDescription:
      "descricao pedagogica do estudante, sem rotulo medico desnecessario",
    schoolStage: "etapa, ano ou serie quando informado",
    communicationProfile:
      "formas de comunicacao, incluindo fala, gestos, CAA, Libras ou outros apoios",
    learningProfile:
      "como o estudante aprende melhor, com preferencias, ritmo e necessidades pedagogicas",
    autonomyProfile:
      "nivel de autonomia nas atividades escolares e apoios necessarios"
  },
  educationalNeeds:
    "array de necessidades educacionais especificas observaveis no contexto pedagogico",
  strengthsAndInterests:
    "array com potencialidades, interesses, repertorios ja consolidados e motivadores",
  barriersToLearning:
    "array de barreiras curriculares, comunicacionais, sensoriais, atitudinais, fisicas ou tecnologicas",
  annualGoals:
    "array de metas anuais pedagogicas, funcionais e acessiveis, alinhadas ao curriculo e ao desenvolvimento do estudante",
  shortTermObjectives:
    "array de objetivos de curto prazo mensuraveis, com progressao gradual e evidencia observavel",
  pedagogicalStrategies:
    "array de estrategias pedagogicas inclusivas, com DUA, mediacao, recursos concretos, metodologias ativas e adaptacao curricular quando necessaria",
  accessibilityResources:
    "array de recursos de acessibilidade, incluindo fonte ampliada, alto contraste, recursos tateis, apoios visuais, pictogramas, Libras, Braille ou audiodescricao quando pertinente",
  assistiveTechnology:
    "array de tecnologias assistivas possiveis, como CAA, pranchas de comunicacao, tablets, leitores de tela, ampliadores, materiais tateis, engrossadores, caneta 3D, impressora 3D ou outros recursos pertinentes",
  familySchoolPartnership:
    "array de acoes objetivas para parceria familia-escola, respeitando privacidade, corresponsabilidade e comunicacao clara",
  evaluationCriteria:
    "array de criterios de avaliacao formativa, evidencias de aprendizagem, formas alternativas de resposta e acompanhamento individualizado",
  monitoringPlan:
    "array com frequencia de acompanhamento, registros, revisoes, responsaveis pedagogicos e indicadores de evolucao",
  teacherGuidance:
    "array de orientacoes praticas para professores, AEE e equipe pedagogica, considerando DI, TEA, DV, DA, TDAH, AH/SD, CAA, Libras, Braille, DUA, tecnologia assistiva e adaptacao curricular"
} as const;
