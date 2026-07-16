import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildMaterialBlueprint,
  ContextResolver,
  DecisionEngine,
  KnowledgeRegistry,
  PedagogicalValidator
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
      taskDataStatus: string;
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
    expect(questions.filter((question) => question.taskDataStatus === "VALID").map((question) => question.actionType)).toEqual([
      "CREATE_GUIDED_EXAMPLE"
    ]);
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
            pedagogicalPurpose: "reconhecer o valor desconhecido",
            taskDataStatus: "VALID",
            taskData: {
              actionType: "OBSERVE",
              representation: "3 + x = 7",
              question: "Qual numero ocupa o lugar de x?",
              options: ["2", "4", "10"],
              correctOption: "4",
              visualDescription: "equacao simples com valor desconhecido"
            }
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
            pedagogicalPurpose: "relacionar representacoes",
            taskDataStatus: "VALID",
            taskData: {
              actionType: "MATCH",
              leftItems: ["x + 2 = 6", "x + 5 = 8", "x - 2 = 5"],
              rightItems: ["4", "3", "7"],
              correctPairs: [
                { left: "x + 2 = 6", right: "4" },
                { left: "x + 5 = 8", right: "3" },
                { left: "x - 2 = 5", right: "7" }
              ],
              connectionInstruction: "Ligue cada equacao ao valor de x."
            }
          }
        ]
      }
    };
    const html = renderToStaticMarkup(React.createElement(StudentSheetRenderer, { plan }));

    expect(html).toContain("3 + x");
    expect(html).toContain("Qual numero ocupa o lugar de x?");
    expect(html).toContain("x + 2 = 6");
    expect(html).toContain("x + 5 = 8");
    expect(html).toContain("x - 2 = 5");
    expect(html).not.toContain("Progressao aritmetica");
    expect(html).not.toContain("P.A.");
    expect(html).not.toContain("2, 5, 8, 11");
    expect(html).not.toContain("SIM");
    expect(html).not.toContain("NAO");
    expect(html).not.toContain("LER");
    expect(html).not.toContain("OK");
    expect(html).not.toContain("PROBLEMA");
    expect(html).not.toContain("EQUACAO</span><span>RESPOSTA");
  });

  it("keeps concrete taskData for the required equation sequence and validates it", () => {
    const { request, blueprint } = createBlueprint();
    const sheet = buildStudentSheet(
      {
        studentSheet: {
          title: "Equacoes do primeiro grau",
          questions: [
            {
              plannedTaskOrder: 1,
              actionType: "OBSERVE",
              command: "Observe a equacao e marque o valor de x.",
              taskData: {
                actionType: "OBSERVE",
                representation: "3 + x = 7",
                question: "Qual numero ocupa o lugar de x?",
                options: ["2", "4", "10"],
                correctOption: "4",
                visualDescription: "equacao simples com valor desconhecido"
              }
            },
            {
              plannedTaskOrder: 2,
              actionType: "MATCH",
              command: "Ligue cada equacao ao valor correto.",
              taskData: {
                actionType: "MATCH",
                leftItems: ["x + 2 = 6", "x + 5 = 8", "x - 2 = 5"],
                rightItems: ["4", "3", "7"],
                correctPairs: [
                  { left: "x + 2 = 6", right: "4" },
                  { left: "x + 5 = 8", right: "3" },
                  { left: "x - 2 = 5", right: "7" }
                ],
                connectionInstruction: "Ligue cada equacao ao valor de x."
              }
            },
            {
              plannedTaskOrder: 3,
              actionType: "COMPLETE",
              command: "Complete as equacoes.",
              taskData: {
                actionType: "COMPLETE",
                statements: ["x + 3 = 9, entao x = ___", "x - 4 = 6, entao x = ___"],
                blanks: ["x", "x"],
                expectedAnswers: ["6", "10"],
                supportSteps: ["Veja o numero que falta.", "Confira substituindo x."]
              }
            },
            {
              plannedTaskOrder: 4,
              actionType: "SOLVE",
              command: "Resolva a situacao-problema.",
              taskData: {
                actionType: "SOLVE",
                problemContext: "Uma caixa tinha algumas canetas. Depois recebeu 3 e ficou com 8.",
                equation: "x + 3 = 8",
                guidedSteps: ["Observe o total.", "Retire 3 do total.", "Escreva o valor de x."],
                answer: "5",
                calculationSpace: "linhas para calculo"
              }
            },
            {
              plannedTaskOrder: 5,
              actionType: "CREATE_GUIDED_EXAMPLE",
              command: "Crie uma equacao simples.",
              taskData: {
                actionType: "CREATE_GUIDED_EXAMPLE",
                contextPrompt: "Monte uma equacao com um numero inicial, uma quantidade acrescentada e um total.",
                availableValues: ["2", "3", "5", "7", "10"],
                constructionSteps: ["Escolha x.", "Escolha quanto somar.", "Escreva o total."],
                fieldsToComplete: ["valor inicial", "quantidade acrescentada", "total"],
                exampleAnswer: "x + 2 = 7, entao x = 5"
              }
            }
          ]
        },
        teacherGuide: {
          curricularAnalysis: ["A atividade trabalha equacoes do primeiro grau."],
          methodology: ["Mediacao com apoios visuais."],
          adaptations: ["Apoio moderado para DI."],
          assessmentCriteria: ["Criterio de sucesso: identifica valor de x."],
          applicationSuggestions: ["Aplicar com leitura mediada."]
        },
        visualElements: ["equacao com balanca", "pares de equacao e resultado"]
      },
      request,
      blueprint
    );
    const questions = sheet.questions as Array<{ taskDataStatus: string }>;
    const report = new PedagogicalValidator().validate(
      { studentSheet: sheet },
      blueprint
    );
    const html = renderToStaticMarkup(
      React.createElement(StudentSheetRenderer, {
        plan: { subject: "Matematica", grade: "6 ano", studentSheet: sheet as StudentSheetPlan["studentSheet"] }
      })
    );

    expect(questions.every((question) => question.taskDataStatus === "VALID")).toBe(true);
    expect(report.issues.map((issue) => issue.code)).not.toContain("INCOMPLETE_TASK_DATA");
    expect(report.issues.map((issue) => issue.code)).not.toContain("MISSING_MATCH_PAIRS");
    expect(html).toContain("3 + x");
    expect(html).toContain("x + 2 = 6");
    expect(html).toContain("x + 3 = 9");
    expect(html).toContain("Uma caixa tinha algumas canetas");
    expect(html).toContain("valor inicial");
    expect(html).not.toContain("Progressao Aritmetica");
    expect(html).not.toContain("paisagem");
    expect(html).not.toContain("SIM");
    expect(html).not.toContain("LER");
  });

  it("adds a concrete guided example fallback when the AI leaves CREATE_GUIDED_EXAMPLE incomplete", () => {
    const { request, blueprint } = createBlueprint();
    const sheet = buildStudentSheet(
      {
        studentSheet: {
          title: "Equacoes do primeiro grau",
          questions: [
            {
              plannedTaskOrder: 5,
              actionType: "CREATE_GUIDED_EXAMPLE",
              command: "Crie uma equacao simples.",
              taskData: {
                actionType: "CREATE_GUIDED_EXAMPLE",
                contextPrompt: "Crie sua equacao."
              }
            }
          ]
        }
      },
      request,
      blueprint
    );
    const guided = (sheet.questions as Array<{
      actionType: string;
      taskDataStatus: string;
      taskDataIssue: string;
      taskData?: {
        contextPrompt?: string;
        availableValues?: string[];
        constructionSteps?: string[];
        fieldsToComplete?: string[];
        exampleAnswer?: string;
      };
    }>).find((question) => question.actionType === "CREATE_GUIDED_EXAMPLE");
    const html = renderToStaticMarkup(
      React.createElement(StudentSheetRenderer, {
        plan: { subject: "Matematica", grade: "6 ano", studentSheet: sheet as StudentSheetPlan["studentSheet"] }
      })
    );

    expect(guided?.taskDataStatus).toBe("VALID");
    expect(guided?.taskDataIssue).toBe("");
    expect(guided?.taskData?.contextPrompt).toBe("Crie uma equacao simples usando os valores disponiveis.");
    expect(guided?.taskData?.availableValues?.length).toBeGreaterThanOrEqual(3);
    expect(guided?.taskData?.constructionSteps).toEqual([
      "Escolha o valor desconhecido.",
      "Escolha a operacao.",
      "Complete a equacao.",
      "Resolva para conferir."
    ]);
    expect(guided?.taskData?.fieldsToComplete).toEqual([
      "valor desconhecido",
      "operacao",
      "numero conhecido",
      "resultado"
    ]);
    expect(guided?.taskData?.exampleAnswer).toMatch(/x [+-] \d+ = -?\d+, entao x = \d+/);
    expect(JSON.stringify(guided?.taskData)).not.toMatch(/valor 1|item A|complete aqui|placeholder|paisagem/i);
    expect(html).toContain("valor desconhecido");
    expect(html).toContain("numero conhecido");
    expect(html).toContain("Crie uma equacao simples usando os valores disponiveis.");
  });

  it("keeps the full equation sequence valid when only CREATE_GUIDED_EXAMPLE is incomplete", () => {
    const { request, blueprint } = createBlueprint();
    const sheet = buildStudentSheet(
      {
        studentSheet: {
          title: "Equacoes do primeiro grau",
          questions: [
            {
              plannedTaskOrder: 1,
              actionType: "OBSERVE",
              command: "Observe a equacao e marque o valor de x.",
              taskData: {
                actionType: "OBSERVE",
                representation: "3 + x = 7",
                question: "Qual numero ocupa o lugar de x?",
                options: ["2", "4", "10"],
                correctOption: "4",
                visualDescription: "equacao simples com valor desconhecido"
              }
            },
            {
              plannedTaskOrder: 2,
              actionType: "MATCH",
              command: "Ligue cada equacao ao valor correto.",
              taskData: {
                actionType: "MATCH",
                leftItems: ["x + 2 = 6", "x + 5 = 8", "x - 2 = 5"],
                rightItems: ["4", "3", "7"],
                correctPairs: [
                  { left: "x + 2 = 6", right: "4" },
                  { left: "x + 5 = 8", right: "3" },
                  { left: "x - 2 = 5", right: "7" }
                ],
                connectionInstruction: "Ligue cada equacao ao valor de x."
              }
            },
            {
              plannedTaskOrder: 3,
              actionType: "COMPLETE",
              command: "Complete as equacoes.",
              taskData: {
                actionType: "COMPLETE",
                statements: ["x + 3 = 9, entao x = ___", "x - 4 = 6, entao x = ___"],
                blanks: ["x", "x"],
                expectedAnswers: ["6", "10"],
                supportSteps: ["Veja o numero que falta.", "Confira substituindo x."]
              }
            },
            {
              plannedTaskOrder: 4,
              actionType: "SOLVE",
              command: "Resolva a situacao-problema.",
              taskData: {
                actionType: "SOLVE",
                problemContext: "Uma caixa tinha algumas canetas. Depois recebeu 3 e ficou com 8.",
                equation: "x + 3 = 8",
                guidedSteps: ["Observe o total.", "Retire 3 do total.", "Escreva o valor de x."],
                answer: "5",
                calculationSpace: "linhas para calculo"
              }
            },
            {
              plannedTaskOrder: 5,
              actionType: "CREATE_GUIDED_EXAMPLE",
              command: "Crie uma equacao simples.",
              taskData: {
                actionType: "CREATE_GUIDED_EXAMPLE",
                contextPrompt: "Crie sua equacao."
              }
            }
          ]
        }
      },
      request,
      blueprint
    );
    const questions = sheet.questions as Array<{
      actionType: string;
      taskDataStatus: string;
      taskDataIssue: string;
      taskData?: {
        availableValues?: string[];
        exampleAnswer?: string;
      };
    }>;
    const guided = questions.find((question) => question.actionType === "CREATE_GUIDED_EXAMPLE");
    const html = renderToStaticMarkup(
      React.createElement(StudentSheetRenderer, {
        plan: { subject: "Matematica", grade: "6 ano", studentSheet: sheet as StudentSheetPlan["studentSheet"] }
      })
    );

    expect(questions.map((question) => question.taskDataStatus)).toEqual([
      "VALID",
      "VALID",
      "VALID",
      "VALID",
      "VALID"
    ]);
    expect(questions.map((question) => question.taskDataIssue)).toEqual(["", "", "", "", ""]);
    expect(guided?.taskData?.availableValues?.join(" ")).toMatch(/valor desconhecido: \d+/);
    expect(guided?.taskData?.availableValues?.join(" ")).toMatch(/numero conhecido: \d+/);
    expect(guided?.taskData?.exampleAnswer).toMatch(/x [+-] \d+ = -?\d+, entao x = \d+/);
    expect(html).toContain("Crie uma equacao simples usando os valores disponiveis.");
    expect(html).not.toContain("Tarefa aguardando dados concretos");
    expect(html).not.toContain("MISSING_GUIDED_CREATION_DATA");
    expect(html).not.toContain("Progressao Aritmetica");
    expect(html).not.toContain("SIM");
    expect(html).not.toContain("LER");
  });

  it("preserves complete CREATE_GUIDED_EXAMPLE taskData returned by the AI", () => {
    const { request, blueprint } = createBlueprint();
    const aiTaskData = {
      actionType: "CREATE_GUIDED_EXAMPLE",
      contextPrompt: "Monte uma equacao sobre figurinhas.",
      availableValues: ["valor desconhecido: 6", "operacao: +", "numero conhecido: 3", "resultado: 9"],
      constructionSteps: ["Escolha x.", "Some 3.", "Confira o total."],
      fieldsToComplete: ["x", "numero somado", "total"],
      exampleAnswer: "x + 3 = 9, entao x = 6"
    };
    const sheet = buildStudentSheet(
      {
        studentSheet: {
          questions: [
            {
              plannedTaskOrder: 5,
              actionType: "CREATE_GUIDED_EXAMPLE",
              command: "Crie uma equacao simples.",
              taskData: aiTaskData
            }
          ]
        }
      },
      request,
      blueprint
    );
    const guided = (sheet.questions as Array<{
      actionType: string;
      taskData?: Record<string, unknown>;
    }>).find((question) => question.actionType === "CREATE_GUIDED_EXAMPLE");

    expect(guided?.taskData).toEqual(aiTaskData);
  });

  it("does not apply guided example fallback to other actionTypes", () => {
    const { request, blueprint } = createBlueprint();
    const sheet = buildStudentSheet(
      {
        studentSheet: {
          questions: [
            {
              plannedTaskOrder: 2,
              actionType: "MATCH",
              command: "Ligue cada equacao ao resultado.",
              taskData: {
                actionType: "MATCH",
                leftItems: ["x + 2 = 6"]
              }
            }
          ]
        }
      },
      request,
      blueprint
    );
    const match = (sheet.questions as Array<{
      actionType: string;
      taskDataStatus: string;
      taskDataIssue: string;
      taskData?: Record<string, unknown>;
    }>).find((question) => question.actionType === "MATCH");

    expect(match?.taskDataStatus).toBe("INVALID");
    expect(match?.taskDataIssue).toBe("MISSING_MATCH_PAIRS");
    expect(match?.taskData).toBeUndefined();
  });
});
