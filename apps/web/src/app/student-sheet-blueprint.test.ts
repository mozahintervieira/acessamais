import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildMaterialBlueprint,
  ContextResolver,
  DecisionEngine,
  KnowledgeRegistry
} from "@acessa-plus/pedagogical-core";
import type { CreateMissionRequest } from "@acessa-plus/types";
import { buildStudentSheet } from "./api/demo-store";
import {
  resolveRendererKind,
  StudentSheetRenderer,
  type StudentSheetPlan
} from "./student-sheet-renderer";

function createEquationRequest(): CreateMissionRequest {
  return {
    userId: "professor-demo",
    organizationId: "organizacao-demo",
    missionType: "ADAPT_ACTIVITY",
    input: {
      rawPrompt:
        "Crie 5 atividades de Matematica sobre equacoes do primeiro grau para estudante com DI e apoio moderado.",
      discipline: "Matematica",
      gradeYear: "6 ano",
      skill: "Resolver problemas que possam ser representados por equacoes do primeiro grau.",
      knowledgeObject: "Equacoes do primeiro grau",
      theme: "Equacoes do primeiro grau",
      lessonObjective: "Resolver equacoes simples identificando o valor desconhecido.",
      specificNeed: "Deficiencia Intelectual",
      readingWritingLevel: "Leitor inicial",
      expectedProductType: "Atividade Adaptada",
      activityType: "Atividade Adaptada",
      questionCount: "5",
      outputFormat: "Folha A4 e guia do professor",
      adaptationProfile: {
        enabled: true,
        targetAudience: "Deficiencia Intelectual",
        learningProfile: "Leitor inicial",
        supports: ["apoio moderado", "elementos visuais", "exemplo resolvido"]
      }
    }
  };
}

function createBlueprint() {
  const request = createEquationRequest();
  const registry = new KnowledgeRegistry();

  registry.register({
    id: "metodo-acessa",
    name: "Metodo ACESSA+",
    version: "0.1.0",
    type: "PROTOCOL",
    scope: ["cognitive-model"],
    status: "ACTIVE"
  });

  const context = new ContextResolver().resolve({
    missionType: request.missionType,
    rawInput: request.input,
    organizationId: request.organizationId,
    userId: request.userId,
    availableKnowledgeIds: ["metodo-acessa"]
  });
  const decision = new DecisionEngine(registry).decide({
    context,
    activeKnowledgeIds: context.availableKnowledgeIds
  });

  return {
    request,
    blueprint: buildMaterialBlueprint(request, context, decision)
  };
}

describe("MaterialBlueprint as studentSheet source of truth", () => {
  it("builds the studentSheet by plannedTask order and preserves task metadata", () => {
    const { request, blueprint } = createBlueprint();
    const sheet = buildStudentSheet(
      {
        studentSheet: {
          title: "Equacoes do primeiro grau",
          questions: [
            {
              plannedTaskOrder: 4,
              actionType: "SOLVE",
              command: "Resolva a situacao-problema.",
              visualFunction: "apoiar resolucao com caixas de calculo e setas"
            }
          ]
        }
      },
      request,
      blueprint
    );
    const questions = sheet.questions as Array<{
      plannedTaskOrder: number;
      actionType: string;
      visualFunction: string;
      content: string;
    }>;

    expect(questions).toHaveLength(5);
    expect(questions.map((question) => question.plannedTaskOrder)).toEqual([1, 2, 3, 4, 5]);
    expect(questions.map((question) => question.actionType)).toEqual([
      "OBSERVE",
      "MATCH",
      "COMPLETE",
      "SOLVE",
      "CREATE_GUIDED_EXAMPLE"
    ]);
    expect(questions.every((question) => question.visualFunction.length > 0)).toBe(true);
    expect(questions.every((question) => question.content.includes("Equacoes"))).toBe(true);
  });

  it("uses an equations fallback without replacing it with Progressao Aritmetica", () => {
    const { request, blueprint } = createBlueprint();
    const sheet = buildStudentSheet({}, request, blueprint);
    const serialized = JSON.stringify(sheet);

    expect(serialized).toContain("Equacoes do primeiro grau");
    expect(serialized).not.toContain("Progressao aritmetica");
    expect(serialized).not.toContain("P.A.");
  });

  it("chooses renderer structure from actionType", () => {
    expect(resolveRendererKind({ actionType: "MATCH", command: "Resolva." })).toBe("match");
    expect(resolveRendererKind({ actionType: "COMPLETE", command: "Resolva." })).toBe("complete");
    expect(resolveRendererKind({ actionType: "SOLVE", command: "Resolva a equacao." })).toBe("solve");
    expect(resolveRendererKind({ actionType: "CREATE_GUIDED_EXAMPLE", command: "Crie." })).toBe("guided");
  });

  it("renders only studentSheet data without hardcoded worksheet content", () => {
    const plan: StudentSheetPlan = {
      subject: "Matematica",
      grade: "6 ano",
      studentSheet: {
        title: "Equacoes do primeiro grau",
        context: "Resolva equacoes simples usando pistas visuais.",
        instructions: ["Leia o comando.", "Use o apoio indicado."],
        didacticBoxes: ["Dica do backend."],
        visualElements: ["balanca de equacao criada pelo backend"],
        tableRows: ["Situacao | Registro | Resposta"],
        questions: [
          {
            plannedTaskOrder: 1,
            actionType: "OBSERVE",
            command: "Observe a representacao e identifique o valor desconhecido.",
            content: "Equacoes do primeiro grau",
            visualFunction: "representar igualdade com apoio visual",
            responseMode: "responder em linha curta",
            supportRequired: ["pista visual"],
            answerSpace: "duas linhas",
            pedagogicalPurpose: "reconhecer o valor desconhecido"
          },
          {
            plannedTaskOrder: 2,
            actionType: "MATCH",
            command: "Ligue cada equacao ao valor correto.",
            content: "Equacoes do primeiro grau",
            visualFunction: "parear equacao e resultado informado pelo backend",
            responseMode: "ligar pares",
            supportRequired: ["cartoes do backend"],
            answerSpace: "pares para ligar",
            pedagogicalPurpose: "relacionar representacoes"
          }
        ]
      }
    };
    const html = renderToStaticMarkup(React.createElement(StudentSheetRenderer, { plan }));

    expect(html).toContain("representar igualdade com apoio visual");
    expect(html).toContain("ligar pares");
    expect(html).toContain("duas linhas");
    expect(html).toContain("reconhecer o valor desconhecido");
    expect(html).not.toContain("Progressao aritmetica");
    expect(html).not.toContain("P.A.");
    expect(html).not.toContain("2, 5, 8, 11");
    expect(html).not.toContain("SIM");
    expect(html).not.toContain("NAO");
    expect(html).not.toContain("LER");
    expect(html).not.toContain("OK");
    expect(html).not.toContain("x + 2 = 6");
    expect(html).not.toContain("PROBLEMA");
    expect(html).not.toContain("EQUACAO</span><span>RESPOSTA");
  });
});
