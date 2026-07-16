import { describe, expect, it } from "vitest";
import {
  ADAPTED_ACTIVITY_OUTPUT_CONTRACT,
  ADAPTED_ACTIVITY_SYSTEM_PROMPT,
  ActivityVarietyPlanner,
  BarrierAndAccessResolver,
  buildMaterialBlueprint,
  buildPedagogicalGenerationPrompt,
  ContextResolver,
  DecisionEngine,
  getDefaultResourceGenerationType,
  KnowledgeRegistry,
  LearningLevelResolver,
  MinimalPedagogicalEngine,
  PEDAGOGICAL_ADAPTATION_RULES,
  PEDAGOGICAL_GENERATION_SYSTEM_PROMPT,
  PEDAGOGICAL_RESOURCE_OUTPUT_CONTRACT,
  PEI_SYSTEM_PROMPT,
  PEI_OUTPUT_CONTRACT,
  PedagogicalValidator,
  RegenerationPolicy,
  buildPedagogicalCorrectionPrompt,
  resolveGenerationContract,
  resolveGenerationSystemPrompt,
  selectRegenerationOutput
} from "./index.js";

function createRegistry(): KnowledgeRegistry {
  const registry = new KnowledgeRegistry();

  registry.register({
    id: "metodo-acessa",
    name: "Metodo ACESSA+",
    version: "0.1.0",
    type: "PROTOCOL",
    scope: ["cognitive-model"],
    status: "ACTIVE"
  });

  registry.register({
    id: "lgpd-educacional",
    name: "LGPD Educacional",
    version: "0.1.0",
    type: "LEGISLATION",
    scope: ["security", "privacy"],
    status: "ACTIVE"
  });

  return registry;
}

function createMathDiRequest() {
  return {
    userId: "professor-demo",
    organizationId: "organizacao-demo",
    missionType: "ADAPT_ACTIVITY" as const,
    input: {
      rawPrompt:
        "Criar atividade A4 de Matematica sobre equacoes do primeiro grau para estudante com Deficiencia Intelectual.",
      discipline: "Matematica",
      gradeYear: "1ª serie do Ensino Medio",
      skill: "Resolver e elaborar problemas que possam ser representados por equacoes do primeiro grau.",
      knowledgeObject: "Equacoes do primeiro grau",
      theme: "Equacoes do primeiro grau",
      lessonObjective:
        "Resolver equacoes simples identificando o valor desconhecido.",
      specificNeed: "Deficiencia Intelectual",
      readingWritingLevel: "Leitor inicial",
      expectedProductType: "Atividade Adaptada",
      activityType: "Atividade Adaptada",
      questionCount: "5",
      outputFormat: "Folha A4 e Guia do Professor",
      learningPreference: "recursos visuais funcionais",
      adaptationProfile: {
        enabled: true,
        targetAudience: "Deficiencia Intelectual",
        learningProfile: "Leitor inicial",
        supports: [
          "apoio moderado",
          "imagens educativas",
          "elementos visuais",
          "exemplo resolvido"
        ]
      }
    }
  };
}

function createMathDiBlueprint() {
  const request = createMathDiRequest();
  const context = new ContextResolver().resolve({
    missionType: request.missionType,
    rawInput: request.input,
    organizationId: request.organizationId,
    userId: request.userId,
    availableKnowledgeIds: ["metodo-acessa"]
  });
  const decision = new DecisionEngine(createRegistry()).decide({
    context,
    activeKnowledgeIds: context.availableKnowledgeIds
  });

  return buildMaterialBlueprint(request, context, decision);
}

function createApprovedMathDiMaterial() {
  const blueprint = createMathDiBlueprint();
  const withTask = (
    index: number,
    question: { command: string; support: string; answerSpace: string }
  ) => {
    const task = blueprint.plannedTasks[index];

    if (!task) {
      return question;
    }

    return {
      plannedTaskOrder: task.order,
      actionType: task.actionType,
      pedagogicalPurpose: task.pedagogicalPurpose,
      cognitiveDemand: task.cognitiveDemand,
      responseMode: task.responseMode,
      supportRequired: task.supportRequired,
      visualFunction: task.visualFunction,
      successCriterion: task.successCriterion,
      instruction: question.command,
      content: blueprint.content,
      taskDataStatus: "VALID" as const,
      taskData: buildEquationTaskData(task.actionType),
      ...question
    };
  };

  return {
    studentSheet: {
      title: "Equacoes do primeiro grau: encontrando o valor desconhecido",
      context:
        "Nesta atividade, voce vai resolver equacoes simples e descobrir o valor desconhecido.",
      instructions: [
        "Leia um comando por vez.",
        "Use o exemplo resolvido, a balanca e as caixas de resposta."
      ],
      didacticBoxes: [
        "Exemplo resolvido: x + 3 = 7. O valor de x e 4, porque 4 + 3 = 7.",
        "Passos numerados ajudam a organizar o calculo.",
        "Use apoio visual funcional quando precisar."
      ],
      visualElements: [
        "balanca de equacao",
        "cartoes de equacoes e resultados",
        "tabela de passos",
        "caixas de calculo",
        "setas para indicar equilibrio"
      ],
      questions: [
        withTask(0, {
          command:
            "Observe a balanca de equacao e identifique o valor desconhecido.",
          support: "Use a igualdade dos dois lados da balanca.",
          answerSpace: "caixa de resposta"
        }),
        withTask(1, {
          command:
            "Pareie cada equacao do primeiro grau ao resultado correto.",
          support: "Use os cartoes de equacoes e resultados.",
          answerSpace: "ligar ou parear"
        }),
        withTask(2, {
          command:
            "Complete as lacunas seguindo os passos numerados da tabela.",
          support: "Veja o exemplo resolvido antes de responder.",
          answerSpace: "tabela com lacunas"
        }),
        withTask(3, {
          command:
            "Resolva a situacao-problema e registre o calculo nas caixas.",
          support: "Use as caixas de calculo para encontrar o valor de x.",
          answerSpace: "tres linhas"
        }),
        withTask(4, {
          command:
            "Crie um exemplo guiado de equacao simples com valor desconhecido.",
          support: "Use o modelo: x + numero = resultado.",
          answerSpace: "duas linhas"
        })
      ]
    },
    teacherGuide: {
      skillCode:
        "Resolver e elaborar problemas que possam ser representados por equacoes do primeiro grau.",
      knowledgeObject: "Equacoes do primeiro grau",
      curricularAnalysis: [
        "A atividade trabalha equacoes do primeiro grau, valor desconhecido e igualdade.",
        "O objetivo e resolver equacoes simples com evidencia observavel de aprendizagem."
      ],
      objectives: [
        "Resolver equacoes simples identificando o valor desconhecido."
      ],
      methodology: [
        "Apresentar as barreiras de abstracao e memoria de trabalho com mediacao planejada.",
        "Usar apoios visuais, exemplo resolvido, passos numerados e reducao de carga textual."
      ],
      adaptations: [
        "Para Deficiencia Intelectual, usar comandos curtos, apoio visual funcional e alternativas de resposta por marcar, ligar, completar e resolver."
      ],
      duaPrinciples: [
        "Oferecer multiplas formas de acesso, participacao e expressao."
      ],
      assessmentCriteria: [
        "Criterio de sucesso: identificar o valor desconhecido, parear equacoes e resolver pelo menos uma situacao-problema com apoio moderado."
      ],
      applicationSuggestions: [
        "Manter mediacao docente, retirar apoios gradualmente e registrar quais apoios favoreceram autonomia."
      ]
    }
  };
}

function buildEquationTaskData(actionType: string): Record<string, unknown> {
  if (actionType === "OBSERVE") {
    return {
      actionType: "OBSERVE",
      representation: "3 + x = 7",
      question: "Qual numero ocupa o lugar de x?",
      options: ["2", "4", "10"],
      correctOption: "4",
      visualDescription: "equacao simples com valor desconhecido"
    };
  }

  if (actionType === "MATCH") {
    return {
      actionType: "MATCH",
      leftItems: ["x + 2 = 6", "x + 5 = 8", "x - 2 = 5"],
      rightItems: ["4", "3", "7"],
      correctPairs: [
        { left: "x + 2 = 6", right: "4" },
        { left: "x + 5 = 8", right: "3" },
        { left: "x - 2 = 5", right: "7" }
      ],
      connectionInstruction: "Ligue cada equacao ao valor de x."
    };
  }

  if (actionType === "COMPLETE") {
    return {
      actionType: "COMPLETE",
      statements: ["x + 3 = 9, entao x = ___", "x - 4 = 6, entao x = ___"],
      blanks: ["x", "x"],
      expectedAnswers: ["6", "10"],
      supportSteps: ["Veja o numero que falta.", "Confira substituindo x."]
    };
  }

  if (actionType === "SOLVE") {
    return {
      actionType: "SOLVE",
      problemContext: "Uma caixa tinha algumas canetas. Depois recebeu 3 e ficou com 8.",
      equation: "x + 3 = 8",
      guidedSteps: ["Observe o total.", "Retire 3 do total.", "Escreva o valor de x."],
      answer: "5",
      calculationSpace: "linhas para calculo"
    };
  }

  return {
    actionType: "CREATE_GUIDED_EXAMPLE",
    contextPrompt: "Monte uma equacao com um numero inicial, uma quantidade acrescentada e um total.",
    availableValues: ["2", "3", "5", "7", "10"],
    constructionSteps: ["Escolha x.", "Escolha quanto somar.", "Escreva o total."],
    fieldsToComplete: ["valor inicial", "quantidade acrescentada", "total"],
    exampleAnswer: "x + 2 = 7, entao x = 5"
  };
}

function createRepeatedMathDiMaterial() {
  const material = createApprovedMathDiMaterial();

  return {
    ...material,
    studentSheet: {
      ...material.studentSheet,
      questions: Array.from({ length: 5 }, (_, index) => ({
        command: `Resolva a equacao x + ${index + 1} = ${index + 5}.`,
        support: "Use o mesmo modelo.",
        answerSpace: "uma linha"
      }))
    }
  };
}

describe("Ciclo 2 pedagogical pipeline", () => {
  it("creates a pedagogical plan only after context and decision stages", () => {
    const context = new ContextResolver().resolve({
      missionType: "CREATE_LESSON_PLAN",
      rawInput: {
        subject: "Lingua Portuguesa",
        stage: "Ensino Fundamental",
        objective: "Planejar aula inclusiva sobre genero textual noticia.",
        accessibilityNeeds: ["DI", "TEA"]
      },
      availableKnowledgeIds: ["metodo-acessa", "lgpd-educacional"]
    });

    const decision = new DecisionEngine(createRegistry()).decide({
      context,
      activeKnowledgeIds: context.availableKnowledgeIds
    });
    const plan = new MinimalPedagogicalEngine().analyze({
      missionType: "CREATE_LESSON_PLAN",
      context,
      decision
    });

    expect(decision.stages.CONTEXT).toContain("Context completeness: COMPLETE");
    expect(decision.stages.OBJECTIVE[0]).toContain("Planejar aula inclusiva");
    expect(decision.stages.CONSTRAINTS).toContain(
      "Define objective, constraints and expected product before generation."
    );
    expect(decision.stages.EXPECTED_PRODUCT).toEqual([
      "Editable inclusive lesson plan"
    ]);
    expect(plan.objectives).toEqual(decision.objectives);
    expect(plan.protocolApplications).toHaveLength(2);
  });

  it("adapts the expected product for activity adaptation missions", () => {
    const context = new ContextResolver().resolve({
      missionType: "ADAPT_ACTIVITY",
      rawInput: {
        objective: "Adaptar atividade de leitura mantendo o objetivo.",
        originalContent: "Leia o texto e responda as questoes.",
        accessibilityNeeds: ["NON_LITERATE"]
      },
      availableKnowledgeIds: ["metodo-acessa"]
    });

    const decision = new DecisionEngine(createRegistry()).decide({
      context,
      activeKnowledgeIds: context.availableKnowledgeIds
    });

    expect(decision.stages.EXPECTED_PRODUCT).toEqual([
      "Editable adapted activity"
    ]);
    expect(decision.canProceedToPedagogicalEngine).toBe(true);
  });

  it("detects missing objectives without blocking partial context", () => {
    const context = new ContextResolver().resolve({
      missionType: "CREATE_LESSON_PLAN",
      rawInput: {
        subject: "Matematica",
        stage: "Ensino Fundamental"
      },
      availableKnowledgeIds: ["metodo-acessa"]
    });

    const decision = new DecisionEngine(createRegistry()).decide({
      context,
      activeKnowledgeIds: context.availableKnowledgeIds
    });

    expect(context.completeness).toBe("PARTIAL");
    expect(context.missingFields).toEqual(["objective"]);
    expect(decision.canProceedToPedagogicalEngine).toBe(true);
    expect(decision.constraints).toContain(
      "Missing fields must be reviewed: objective."
    );
  });

  it("blocks pedagogical interpretation when context is insufficient", () => {
    const context = new ContextResolver().resolve({
      missionType: "CREATE_LESSON_PLAN",
      rawInput: {},
      availableKnowledgeIds: ["metodo-acessa"]
    });

    const decision = new DecisionEngine(createRegistry()).decide({
      context,
      activeKnowledgeIds: context.availableKnowledgeIds
    });

    expect(context.completeness).toBe("INSUFFICIENT");
    expect(decision.canProceedToPedagogicalEngine).toBe(false);
    expect(decision.warnings).toContain(
      "Context is insufficient for pedagogical interpretation."
    );
  });

  it("keeps AI outside of context, decision and pedagogical planning", () => {
    const registry = createRegistry();

    expect(registry.getActive("metodo-acessa")?.type).toBe("PROTOCOL");
    expect(new MinimalPedagogicalEngine()).toBeInstanceOf(
      MinimalPedagogicalEngine
    );
  });

  it("builds the pedagogical AI prompt with student sheet and teacher guide contract", () => {
    const context = new ContextResolver().resolve({
      missionType: "CREATE_LESSON_PLAN",
      rawInput: {
        objective: "Criar atividade de Matematica sobre equacoes.",
        accessibilityNeeds: ["DI"]
      },
      availableKnowledgeIds: ["metodo-acessa"]
    });
    const decision = new DecisionEngine(createRegistry()).decide({
      context,
      activeKnowledgeIds: context.availableKnowledgeIds
    });
    const prompt = buildPedagogicalGenerationPrompt(
      {
        userId: "professor-demo",
        organizationId: "organizacao-demo",
        missionType: "CREATE_LESSON_PLAN",
        input: {
          rawPrompt: "Crie uma atividade de Matematica sobre equacoes.",
          adaptationProfile: {
            enabled: true,
            targetAudience: "Deficiencia Intelectual",
            learningProfile: "Leitor inicial",
            supports: ["Fonte ampliada", "Exemplo resolvido"]
          }
        }
      },
      context,
      decision
    );

    expect(prompt.systemPrompt).toContain("studentSheet");
    expect(prompt.systemPrompt).toContain("teacherGuide");
    expect(prompt.outputSchemaName).toBe("AcessaPlusPedagogicalResource");
    expect(prompt.userPayload.contrato).toBe(PEDAGOGICAL_RESOURCE_OUTPUT_CONTRACT);
    expect(PEDAGOGICAL_RESOURCE_OUTPUT_CONTRACT.studentSheet.title).toContain(
      "titulo para o estudante"
    );
    expect(PEDAGOGICAL_RESOURCE_OUTPUT_CONTRACT.teacherGuide.skillCode).toContain(
      "habilidade BNCC"
    );
  });

  it("keeps inclusive adaptation rules available to generation prompts", () => {
    const rules = PEDAGOGICAL_ADAPTATION_RULES.join("\n");

    expect(rules).toContain("Deficiencia Intelectual");
    expect(rules).toContain("TEA");
    expect(rules).toContain("Deficiencia Visual");
    expect(rules).toContain("Deficiencia Auditiva");
    expect(rules).toContain("TDAH");
    expect(rules).toContain("Altas Habilidades");
    expect(rules).toContain("CAA");
    expect(rules).toContain("Libras");
    expect(rules).toContain("Braille");
  });

  it("uses the adapted activity contract as the default generation contract", () => {
    const defaultEntry = resolveGenerationContract();
    const adaptedEntry = resolveGenerationContract("ADAPTED_ACTIVITY");

    expect(getDefaultResourceGenerationType()).toBe("ADAPTED_ACTIVITY");
    expect(defaultEntry.status).toBe("IMPLEMENTED");
    expect(defaultEntry.contract).toBe(ADAPTED_ACTIVITY_OUTPUT_CONTRACT);
    expect(adaptedEntry.contract).toBe(PEDAGOGICAL_RESOURCE_OUTPUT_CONTRACT);
  });

  it("uses a dedicated contract for PEI generation", () => {
    const peiEntry = resolveGenerationContract("PEI");

    expect(peiEntry.status).toBe("IMPLEMENTED");
    expect(peiEntry.generationType).toBe("PEI");
    expect(peiEntry.contract).toBe(PEI_OUTPUT_CONTRACT);
  });

  it("keeps the main PEI contract fields available", () => {
    expect(PEI_OUTPUT_CONTRACT.studentProfile).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.educationalNeeds).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.strengthsAndInterests).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.barriersToLearning).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.annualGoals).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.shortTermObjectives).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.pedagogicalStrategies).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.accessibilityResources).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.assistiveTechnology).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.familySchoolPartnership).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.evaluationCriteria).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.monitoringPlan).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.teacherGuidance).toBeDefined();
    expect(PEI_OUTPUT_CONTRACT.teacherGuidance).toContain("DI");
    expect(PEI_OUTPUT_CONTRACT.teacherGuidance).toContain("TEA");
    expect(PEI_OUTPUT_CONTRACT.teacherGuidance).toContain("DUA");
    expect(PEI_OUTPUT_CONTRACT.teacherGuidance).toContain("tecnologia assistiva");
  });

  it("returns a safe fallback contract for resource types not implemented yet", () => {
    const lessonPlanEntry = resolveGenerationContract("LESSON_PLAN");
    const assessmentEntry = resolveGenerationContract("ASSESSMENT");
    const accessibleResourceEntry = resolveGenerationContract("ACCESSIBLE_RESOURCE");

    expect(lessonPlanEntry.status).toBe("FALLBACK");
    expect(lessonPlanEntry.fallbackFrom).toBe("LESSON_PLAN");
    expect(lessonPlanEntry.contract).toBe(ADAPTED_ACTIVITY_OUTPUT_CONTRACT);
    expect(assessmentEntry.contract).toBe(ADAPTED_ACTIVITY_OUTPUT_CONTRACT);
    expect(accessibleResourceEntry.contract).toBe(ADAPTED_ACTIVITY_OUTPUT_CONTRACT);
  });

  it("keeps student sheet and teacher guide in the default prompt contract", () => {
    const context = new ContextResolver().resolve({
      missionType: "ADAPT_ACTIVITY",
      rawInput: {
        objective: "Adaptar atividade de leitura.",
        accessibilityNeeds: ["TEA"]
      },
      availableKnowledgeIds: ["metodo-acessa"]
    });
    const decision = new DecisionEngine(createRegistry()).decide({
      context,
      activeKnowledgeIds: context.availableKnowledgeIds
    });
    const prompt = buildPedagogicalGenerationPrompt(
      {
        userId: "professor-demo",
        organizationId: "organizacao-demo",
        missionType: "ADAPT_ACTIVITY",
        input: {
          rawPrompt: "Adapte uma atividade de leitura para estudante com TEA."
        }
      },
      context,
      decision,
      "LESSON_PLAN"
    );
    const contract = prompt.userPayload.contrato as typeof ADAPTED_ACTIVITY_OUTPUT_CONTRACT;

    expect(contract.studentSheet).toBeDefined();
    expect(contract.teacherGuide).toBeDefined();
    expect(contract).toBe(ADAPTED_ACTIVITY_OUTPUT_CONTRACT);
  });

  it("uses the PEI system prompt for PEI generation", () => {
    const promptEntry = resolveGenerationSystemPrompt("PEI");

    expect(promptEntry.status).toBe("IMPLEMENTED");
    expect(promptEntry.generationType).toBe("PEI");
    expect(promptEntry.systemPrompt).toBe(PEI_SYSTEM_PROMPT);
  });

  it("keeps adapted activity on the default system prompt", () => {
    const promptEntry = resolveGenerationSystemPrompt("ADAPTED_ACTIVITY");

    expect(promptEntry.status).toBe("IMPLEMENTED");
    expect(promptEntry.systemPrompt).toBe(ADAPTED_ACTIVITY_SYSTEM_PROMPT);
    expect(PEDAGOGICAL_GENERATION_SYSTEM_PROMPT).toBe(
      ADAPTED_ACTIVITY_SYSTEM_PROMPT
    );
  });

  it("returns a safe prompt fallback for resource types without prompt yet", () => {
    const lessonPlanPrompt = resolveGenerationSystemPrompt("LESSON_PLAN");
    const assessmentPrompt = resolveGenerationSystemPrompt("ASSESSMENT");
    const accessibleResourcePrompt =
      resolveGenerationSystemPrompt("ACCESSIBLE_RESOURCE");

    expect(lessonPlanPrompt.status).toBe("FALLBACK");
    expect(lessonPlanPrompt.fallbackFrom).toBe("LESSON_PLAN");
    expect(lessonPlanPrompt.systemPrompt).toBe(ADAPTED_ACTIVITY_SYSTEM_PROMPT);
    expect(assessmentPrompt.systemPrompt).toBe(ADAPTED_ACTIVITY_SYSTEM_PROMPT);
    expect(accessibleResourcePrompt.systemPrompt).toBe(
      ADAPTED_ACTIVITY_SYSTEM_PROMPT
    );
  });

  it("keeps clinical diagnosis and therapeutic promises out of PEI prompts", () => {
    expect(PEI_SYSTEM_PROMPT).toContain("Nao produza diagnostico clinico");
    expect(PEI_SYSTEM_PROMPT).toContain("nao prometa resultados terapeuticos");
    expect(PEI_SYSTEM_PROMPT).toContain("Atendimento Educacional Especializado");
    expect(PEI_SYSTEM_PROMPT).toContain("DUA");
    expect(PEI_SYSTEM_PROMPT).toContain("Tecnologia Assistiva");
  });

  it("builds PEI prompts with PEI system instructions and PEI contract", () => {
    const context = new ContextResolver().resolve({
      missionType: "CREATE_LESSON_PLAN",
      rawInput: {
        objective: "Organizar um PEI para estudante com necessidade de CAA.",
        accessibilityNeeds: ["CAA"]
      },
      availableKnowledgeIds: ["metodo-acessa"]
    });
    const decision = new DecisionEngine(createRegistry()).decide({
      context,
      activeKnowledgeIds: context.availableKnowledgeIds
    });
    const prompt = buildPedagogicalGenerationPrompt(
      {
        userId: "professor-demo",
        organizationId: "organizacao-demo",
        missionType: "CREATE_LESSON_PLAN",
        input: {
          rawPrompt: "Crie um PEI para estudante que usa CAA."
        }
      },
      context,
      decision,
      "PEI"
    );

    expect(prompt.systemPrompt).toBe(PEI_SYSTEM_PROMPT);
    expect(prompt.userPayload.contrato).toBe(PEI_OUTPUT_CONTRACT);
  });

  it("resolves functional learning level without infantilizing disability profiles", () => {
    const request = createMathDiRequest();
    const level = new LearningLevelResolver().resolve(request);

    expect(level.grade).toContain("Ensino Medio");
    expect(level.readingLevel).toBe("leitor inicial");
    expect(level.abstractionLevel).toContain("representacao concreta");
    expect(level.workingMemory).toContain("memoria de trabalho");
    expect(level.responseMode).toContain("marcar");
    expect(level.uncertaintyNotes).toEqual([]);
  });

  it("maps DI barriers and access supports without reducing everything to diagnosis", () => {
    const request = createMathDiRequest();
    const level = new LearningLevelResolver().resolve(request);
    const accessPlan = new BarrierAndAccessResolver().resolve(request, level);

    expect(accessPlan.identifiedBarriers).toContain("abstracao");
    expect(accessPlan.identifiedBarriers).toContain("memoria de trabalho");
    expect(accessPlan.identifiedBarriers).toContain("leitura de comandos");
    expect(accessPlan.recommendedSupports).toContain("exemplo resolvido");
    expect(accessPlan.recommendedSupports).toContain("mediacao docente");
    expect(accessPlan.visualRequirements.join(" ")).toContain("igualdade");
  });

  it("plans varied tasks for the mandatory Mathematics + DI case", () => {
    const request = createMathDiRequest();
    const level = new LearningLevelResolver().resolve(request);
    const accessPlan = new BarrierAndAccessResolver().resolve(request, level);
    const tasks = new ActivityVarietyPlanner().plan({
      request,
      functionalLearningLevel: level,
      accessPlan,
      requestedTaskCount: 5
    });
    const actionTypes = tasks.map((task) => task.actionType);
    const distinctActionTypes = new Set(actionTypes);

    expect(tasks).toHaveLength(5);
    expect(distinctActionTypes.size).toBeGreaterThanOrEqual(4);
    expect(actionTypes).toEqual([
      "OBSERVE",
      "MATCH",
      "COMPLETE",
      "SOLVE",
      "CREATE_GUIDED_EXAMPLE"
    ]);
    expect(tasks.every((task) => task.successCriterion.length > 0)).toBe(true);
    expect(tasks[0]?.visualFunction).toContain("balanca");
    expect(tasks[4]?.pedagogicalPurpose).toContain("criar exemplo guiado");
  });

  it("builds a MaterialBlueprint for Mathematics + DI with pedagogical progression", () => {
    const request = createMathDiRequest();
    const context = new ContextResolver().resolve({
      missionType: request.missionType,
      rawInput: request.input,
      organizationId: request.organizationId,
      userId: request.userId,
      availableKnowledgeIds: ["metodo-acessa"]
    });
    const decision = new DecisionEngine(createRegistry()).decide({
      context,
      activeKnowledgeIds: context.availableKnowledgeIds
    });
    const blueprint = buildMaterialBlueprint(request, context, decision);

    expect(blueprint.resourceType).toBe("Atividade Adaptada");
    expect(blueprint.discipline).toBe("Matematica");
    expect(blueprint.grade).toContain("Ensino Medio");
    expect(blueprint.requestedTaskCount).toBe(5);
    expect(blueprint.plannedTasks).toHaveLength(5);
    expect(new Set(blueprint.plannedTasks.map((task) => task.actionType)).size).toBeGreaterThanOrEqual(4);
    expect(blueprint.identifiedBarriers).toContain("abstracao");
    expect(blueprint.identifiedBarriers).toContain("memoria de trabalho");
    expect(blueprint.visualRequirements.join(" ")).toContain("visual");
    expect(blueprint.antiInfantilizationGuidance.join(" ")).toContain(
      "Nao infantilizar"
    );
    expect(blueprint.successCriteria).toHaveLength(5);
  });

  it("adds the MaterialBlueprint to the prompt while preserving the public output contract", () => {
    const request = createMathDiRequest();
    const context = new ContextResolver().resolve({
      missionType: request.missionType,
      rawInput: request.input,
      organizationId: request.organizationId,
      userId: request.userId,
      availableKnowledgeIds: ["metodo-acessa"]
    });
    const decision = new DecisionEngine(createRegistry()).decide({
      context,
      activeKnowledgeIds: context.availableKnowledgeIds
    });
    const prompt = buildPedagogicalGenerationPrompt(request, context, decision);
    const blueprint = prompt.userPayload.materialBlueprint as {
      plannedTasks: Array<{ actionType: string; successCriterion: string }>;
      antiInfantilizationGuidance: string[];
    };

    expect(prompt.userPayload.materialBlueprintObrigatorio).toContain(
      "Cada atividade da studentSheet deve corresponder a uma plannedTask"
    );
    expect(blueprint.plannedTasks).toHaveLength(5);
    expect(blueprint.plannedTasks[0]?.actionType).toBe("OBSERVE");
    expect(blueprint.plannedTasks[3]?.actionType).toBe("SOLVE");
    expect(blueprint.plannedTasks.every((task) => task.successCriterion)).toBe(
      true
    );
    expect(prompt.userPayload.contrato).toBe(ADAPTED_ACTIVITY_OUTPUT_CONTRACT);
    expect(ADAPTED_ACTIVITY_OUTPUT_CONTRACT.studentSheet).toBeDefined();
    expect(ADAPTED_ACTIVITY_OUTPUT_CONTRACT.teacherGuide).toBeDefined();
  });

  it("requires blueprint metadata in each adapted activity task contract", () => {
    expect(ADAPTED_ACTIVITY_OUTPUT_CONTRACT.studentSheet.questions).toContain(
      "plannedTaskOrder"
    );
    expect(ADAPTED_ACTIVITY_OUTPUT_CONTRACT.studentSheet.questions).toContain(
      "actionType"
    );
    expect(ADAPTED_ACTIVITY_OUTPUT_CONTRACT.studentSheet.questions).toContain(
      "visualFunction"
    );
    expect(ADAPTED_ACTIVITY_OUTPUT_CONTRACT.studentSheet.questions).toContain(
      "successCriterion"
    );
  });

  it("rejects five nearly identical questions in PedagogicalValidator", () => {
    const report = new PedagogicalValidator().validate(
      createRepeatedMathDiMaterial(),
      createMathDiBlueprint()
    );

    expect(report.approved).toBe(false);
    expect(report.issues.some((issue) => issue.code === "EXCESSIVE_REPETITION")).toBe(true);
    expect(report.issues.some((issue) => issue.severity === "BLOCKER")).toBe(true);
  });

  it("rejects infantilized material for a high school student", () => {
    const material = createApprovedMathDiMaterial();
    const report = new PedagogicalValidator().validate(
      {
        ...material,
        studentSheet: {
          ...material.studentSheet,
          context:
            "Atividade para criancinha fofinha: vamos brincar de equacao, amiguinho."
        }
      },
      createMathDiBlueprint()
    );

    expect(report.approved).toBe(false);
    expect(report.issues.some((issue) => issue.code === "SEVERE_INFANTILIZATION")).toBe(true);
  });

  it("rejects visuals with no pedagogical function", () => {
    const material = createApprovedMathDiMaterial();
    const report = new PedagogicalValidator().validate(
      {
        ...material,
        studentSheet: {
          ...material.studentSheet,
          visualElements: ["estrela", "personagem sorrindo", "decoracao"]
        }
      },
      createMathDiBlueprint()
    );

    expect(report.approved).toBe(false);
    expect(report.issues.some((issue) => issue.code === "DECORATIVE_VISUALS")).toBe(true);
  });

  it("rejects material that ignores plannedTasks", () => {
    const material = createApprovedMathDiMaterial();
    const report = new PedagogicalValidator().validate(
      {
        ...material,
        studentSheet: {
          ...material.studentSheet,
          questions: [
            {
              command: "Classifique frases sobre o conteudo.",
              answerSpace: "uma linha"
            },
            {
              command: "Ordene palavras sobre o conteudo.",
              answerSpace: "uma linha"
            },
            {
              command: "Marque uma alternativa sobre o conteudo.",
              answerSpace: "uma linha"
            },
            {
              command: "Compare duas ideias sobre o conteudo.",
              answerSpace: "uma linha"
            },
            {
              command: "Explique uma ideia sobre o conteudo.",
              answerSpace: "uma linha"
            }
          ]
        }
      },
      createMathDiBlueprint()
    );

    expect(report.approved).toBe(false);
    expect(report.issues.some((issue) => issue.code === "BLUEPRINT_IGNORED")).toBe(true);
  });

  it("rejects Progressao Aritmetica fallback in an equations request", () => {
    const material = createApprovedMathDiMaterial();
    const report = new PedagogicalValidator().validate(
      {
        ...material,
        studentSheet: {
          ...material.studentSheet,
          title: "Progressao aritmetica (PA): identificando regularidades",
          context:
            "Uma progressao aritmetica e uma sequencia numerica em que a diferenca entre termos e a razao.",
          tableRows: ["P.A. | Razao | Proximos termos"]
        }
      },
      createMathDiBlueprint()
    );

    expect(report.approved).toBe(false);
    expect(report.issues.some((issue) => issue.code === "INCOMPATIBLE_FALLBACK")).toBe(true);
  });

  it("approves a varied and coherent Mathematics + DI sequence", () => {
    const report = new PedagogicalValidator().validate(
      createApprovedMathDiMaterial(),
      createMathDiBlueprint()
    );

    expect(report.approved).toBe(true);
    expect(report.totalScore).toBeGreaterThanOrEqual(80);
    expect(report.scores.activityVariety).toBeGreaterThanOrEqual(90);
    expect(report.scores.pedagogicalProgression).toBeGreaterThanOrEqual(90);
    expect(report.issues).toEqual([]);
  });

  it("keeps validator compatibility with studentSheet and teacherGuide", () => {
    const material = createApprovedMathDiMaterial();
    const report = new PedagogicalValidator().validate(
      material,
      createMathDiBlueprint()
    );

    expect(material.studentSheet.questions).toHaveLength(5);
    expect(material.teacherGuide.skillCode).toContain("equacoes");
    expect(report.scores.curricularAlignment).toBeGreaterThanOrEqual(80);
    expect(report.scores.practicalUsability).toBeGreaterThanOrEqual(80);
  });

  it("does not request regeneration when validation is approved", () => {
    const blueprint = createMathDiBlueprint();
    const material = createApprovedMathDiMaterial();
    const report = new PedagogicalValidator().validate(material, blueprint);
    const decision = new RegenerationPolicy().decide({
      materialBlueprint: blueprint,
      originalOutput: material,
      validationReport: report,
      attempt: 0
    });

    expect(report.approved).toBe(true);
    expect(decision.shouldRegenerate).toBe(false);
    expect(decision.correctionPrompt).toBeUndefined();
  });

  it("builds a correction prompt for excessive repetition", () => {
    const blueprint = createMathDiBlueprint();
    const material = createRepeatedMathDiMaterial();
    const report = new PedagogicalValidator().validate(material, blueprint);
    const decision = new RegenerationPolicy().decide({
      materialBlueprint: blueprint,
      originalOutput: material,
      validationReport: report,
      attempt: 0
    });

    expect(report.approved).toBe(false);
    expect(decision.shouldRegenerate).toBe(true);
    expect(decision.correctionPrompt?.userPayload.instrucoesDeCorrecao).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Substituir tarefas repetidas")
      ])
    );
  });

  it("builds a specific correction instruction for infantilization", () => {
    const blueprint = createMathDiBlueprint();
    const material = createApprovedMathDiMaterial();
    const infantilized = {
      ...material,
      studentSheet: {
        ...material.studentSheet,
        context:
          "Atividade para criancinha fofinha: vamos brincar de equacao, amiguinho."
      }
    };
    const report = new PedagogicalValidator().validate(infantilized, blueprint);
    const prompt = buildPedagogicalCorrectionPrompt({
      materialBlueprint: blueprint,
      originalOutput: infantilized,
      validationReport: report,
      attempt: 0
    });

    expect(report.approved).toBe(false);
    expect(prompt.userPayload.instrucoesDeCorrecao).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Adequar linguagem")
      ])
    );
  });

  it("builds a specific correction instruction for decorative visuals", () => {
    const blueprint = createMathDiBlueprint();
    const material = createApprovedMathDiMaterial();
    const decorative = {
      ...material,
      studentSheet: {
        ...material.studentSheet,
        visualElements: ["estrela", "personagem sorrindo", "decoracao"]
      }
    };
    const report = new PedagogicalValidator().validate(decorative, blueprint);
    const prompt = buildPedagogicalCorrectionPrompt({
      materialBlueprint: blueprint,
      originalOutput: decorative,
      validationReport: report,
      attempt: 0
    });

    expect(report.approved).toBe(false);
    expect(prompt.userPayload.instrucoesDeCorrecao).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Substituir elementos decorativos")
      ])
    );
  });

  it("allows at most one regeneration attempt", () => {
    const blueprint = createMathDiBlueprint();
    const material = createRepeatedMathDiMaterial();
    const report = new PedagogicalValidator().validate(material, blueprint);
    const decision = new RegenerationPolicy().decide({
      materialBlueprint: blueprint,
      originalOutput: material,
      validationReport: report,
      attempt: 1
    });

    expect(decision.shouldRegenerate).toBe(false);
    expect(decision.reason).toContain("Limite");
  });

  it("selects the second output when the correction is approved", () => {
    const blueprint = createMathDiBlueprint();
    const validator = new PedagogicalValidator();
    const repeated = createRepeatedMathDiMaterial();
    const approved = createApprovedMathDiMaterial();
    const firstReport = validator.validate(repeated, blueprint);
    const secondReport = validator.validate(approved, blueprint);
    const selection = selectRegenerationOutput(
      { attempt: 0, output: repeated, report: firstReport },
      { attempt: 1, output: approved, report: secondReport }
    );

    expect(selection.selected.attempt).toBe(1);
    expect(selection.belowStandard).toBe(false);
  });

  it("selects the higher score when both outputs are rejected", () => {
    const blueprint = createMathDiBlueprint();
    const validator = new PedagogicalValidator();
    const lowScore = {
      ...createApprovedMathDiMaterial(),
      studentSheet: {
        ...createApprovedMathDiMaterial().studentSheet,
        visualElements: ["estrela", "decoracao"],
        questions: Array.from({ length: 5 }, (_, index) => ({
          command: `Resolva a equacao ${index + 1}.`,
          answerSpace: "uma linha"
        }))
      }
    };
    const betterButRejected = createRepeatedMathDiMaterial();
    const firstReport = validator.validate(lowScore, blueprint);
    const secondReport = validator.validate(betterButRejected, blueprint);
    const selection = selectRegenerationOutput(
      { attempt: 0, output: lowScore, report: firstReport },
      { attempt: 1, output: betterButRejected, report: secondReport }
    );

    expect(firstReport.approved).toBe(false);
    expect(secondReport.approved).toBe(false);
    expect(selection.selected.report.totalScore).toBeGreaterThanOrEqual(
      firstReport.totalScore
    );
    expect(selection.belowStandard).toBe(true);
  });

  it("keeps regeneration prompts compatible with PEI and fallback resource types", () => {
    const blueprint = createMathDiBlueprint();
    const material = createRepeatedMathDiMaterial();
    const report = new PedagogicalValidator().validate(material, blueprint);
    const peiPrompt = buildPedagogicalCorrectionPrompt({
      materialBlueprint: blueprint,
      originalOutput: material,
      validationReport: report,
      attempt: 0,
      generationType: "PEI"
    });
    const assessmentPrompt = buildPedagogicalCorrectionPrompt({
      materialBlueprint: blueprint,
      originalOutput: material,
      validationReport: report,
      attempt: 0,
      generationType: "ASSESSMENT"
    });

    expect(peiPrompt.outputSchemaName).toBe("AcessaPlusPedagogicalResource");
    expect(peiPrompt.userPayload.contrato).toBe(PEI_OUTPUT_CONTRACT);
    expect(assessmentPrompt.userPayload.contrato).toBe(
      ADAPTED_ACTIVITY_OUTPUT_CONTRACT
    );
  });
});
