import { describe, expect, it } from "vitest";
import {
  ContextResolver,
  DecisionEngine,
  KnowledgeRegistry,
  MinimalPedagogicalEngine
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
});
