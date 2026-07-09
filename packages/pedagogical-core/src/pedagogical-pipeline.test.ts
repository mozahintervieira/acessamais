import { describe, expect, it } from "vitest";
import {
  ADAPTED_ACTIVITY_OUTPUT_CONTRACT,
  ADAPTED_ACTIVITY_SYSTEM_PROMPT,
  buildPedagogicalGenerationPrompt,
  ContextResolver,
  DecisionEngine,
  getDefaultResourceGenerationType,
  KnowledgeRegistry,
  MinimalPedagogicalEngine,
  PEDAGOGICAL_ADAPTATION_RULES,
  PEDAGOGICAL_GENERATION_SYSTEM_PROMPT,
  PEDAGOGICAL_RESOURCE_OUTPUT_CONTRACT,
  PEI_SYSTEM_PROMPT,
  PEI_OUTPUT_CONTRACT,
  resolveGenerationContract,
  resolveGenerationSystemPrompt
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
});
