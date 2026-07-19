import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildMaterialBlueprint,
  buildPedagogicalProject,
  ContextResolver,
  DecisionEngine,
  KnowledgeRegistry,
  PedagogicalValidator
} from "@acessa-plus/pedagogical-core";
import type { CreateMissionRequest } from "@acessa-plus/types";
import { buildStudentSheet, buildWorksheetsFromBlueprints } from "./api/demo-store";
import { buildWordExportText, resolveWorksheetCollection } from "./product-studio";
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
    context,
    decision,
    blueprint: buildMaterialBlueprint(request, context, decision)
  };
}

function createPortugueseSubstantiveRequest(): CreateMissionRequest {
  return {
    userId: "professor-demo",
    organizationId: "organizacao-demo",
    missionType: "ADAPT_ACTIVITY",
    input: {
      rawPrompt:
        "Crie 5 folhas A4 de Lingua Portuguesa sobre substantivos proprios e comuns, funcoes e flexoes dos substantivos, para estudante com DI e apoio moderado.",
      discipline: "Lingua Portuguesa",
      gradeYear: "6 ano",
      skill: "EF06LP04/ES",
      knowledgeObject: "substantivos",
      theme: "substantivos proprios e comuns; funcoes e flexoes dos substantivos",
      lessonObjective: "Identificar, classificar, flexionar e usar substantivos em frases curtas.",
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
        supports: ["apoio moderado", "recursos visuais", "frases curtas"]
      }
    }
  };
}

function createBlueprintForRequest(request: CreateMissionRequest) {
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
    context,
    decision,
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
    expect(questions.every((question) => question.taskDataStatus === "VALID")).toBe(true);
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

  it("adds concrete fallbacks for OBSERVE, MATCH, COMPLETE and SOLVE when AI taskData is incomplete", () => {
    const { request, blueprint } = createBlueprint();
    const sheet = buildStudentSheet(
      {
        studentSheet: {
          title: "Equacoes do primeiro grau",
          questions: [
            {
              plannedTaskOrder: 1,
              actionType: "OBSERVE",
              command: "Observe a equacao.",
              taskData: { actionType: "OBSERVE", question: "Qual e o valor de x?" }
            },
            {
              plannedTaskOrder: 2,
              actionType: "MATCH",
              command: "Ligue cada equacao ao resultado.",
              taskData: { actionType: "MATCH", leftItems: ["x + 2 = 6"] }
            },
            {
              plannedTaskOrder: 3,
              actionType: "COMPLETE",
              command: "Complete as lacunas.",
              taskData: { actionType: "COMPLETE", statements: ["x + 3 = 9, entao x = ___"] }
            },
            {
              plannedTaskOrder: 4,
              actionType: "SOLVE",
              command: "Resolva a situacao-problema.",
              taskData: { actionType: "SOLVE", equation: "x + 3 = 8" }
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
        representation?: string;
        question?: string;
        options?: string[];
        correctOption?: string;
        leftItems?: string[];
        rightItems?: string[];
        correctPairs?: Array<{ left: string; right: string }>;
        statements?: string[];
        blanks?: string[];
        expectedAnswers?: string[];
        problemContext?: string;
        equation?: string;
        guidedSteps?: string[];
        answer?: string;
        contextPrompt?: string;
        exampleAnswer?: string;
      };
    }>;
    const observe = questions.find((question) => question.actionType === "OBSERVE");
    const match = questions.find((question) => question.actionType === "MATCH");
    const complete = questions.find((question) => question.actionType === "COMPLETE");
    const solve = questions.find((question) => question.actionType === "SOLVE");

    expect(questions.map((question) => question.taskDataStatus)).toEqual([
      "VALID",
      "VALID",
      "VALID",
      "VALID",
      "VALID"
    ]);
    expect(questions.map((question) => question.taskDataIssue)).toEqual(["", "", "", "", ""]);
    expect(observe?.taskData?.representation).toMatch(/x [+-] \d+ = -?\d+/);
    expect(observe?.taskData?.question).toBe("Qual numero ocupa o lugar de x?");
    expect(observe?.taskData?.options).toContain(observe?.taskData?.correctOption);
    expect(match?.taskData?.leftItems).toHaveLength(3);
    expect(match?.taskData?.rightItems).toHaveLength(3);
    expect(match?.taskData?.correctPairs).toHaveLength(3);
    expect(complete?.taskData?.statements?.join(" ")).toMatch(/___/);
    expect(complete?.taskData?.expectedAnswers?.length).toBeGreaterThanOrEqual(2);
    expect(solve?.taskData?.problemContext).toMatch(/caixa/i);
    expect(solve?.taskData?.equation).toMatch(/x [+-] \d+ = -?\d+/);
    expect(solve?.taskData?.guidedSteps?.length).toBeGreaterThanOrEqual(3);
    expect(solve?.taskData?.answer).toMatch(/^\d+$/);
    expect(JSON.stringify(questions)).not.toMatch(/valor 1|item A|complete aqui|placeholder|paisagem|Progressao|P\.A\.|\bSIM\b|\bNAO\b|\bLER\b|\bOK\b/i);
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

  it("uses the planned actionType fallback without crossing actionTypes", () => {
    const { request, blueprint } = createBlueprint();
    const sheet = buildStudentSheet(
      {
        studentSheet: {
          questions: [
            {
              plannedTaskOrder: 2,
              actionType: "OBSERVE",
              command: "Observe a equacao.",
              taskData: {
                actionType: "OBSERVE",
                question: "Qual e o valor de x?"
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

    expect(match?.taskDataStatus).toBe("VALID");
    expect(match?.taskDataIssue).toBe("");
    expect(match?.taskData?.actionType).toBe("MATCH");
    expect(match?.taskData).toHaveProperty("leftItems");
    expect(match?.taskData).not.toHaveProperty("representation");
  });

  it("builds five distinct printable worksheets from the WorksheetBlueprint collection", () => {
    const { request, context, decision, blueprint } = createBlueprint();
    const projectOutput = buildPedagogicalProject({
      request,
      context,
      decision,
      materialBlueprint: blueprint
    });
    const worksheets = buildWorksheetsFromBlueprints(
      {},
      request,
      blueprint,
      projectOutput.project,
      projectOutput.worksheetBlueprints
    );
    const titles = worksheets.map((worksheet) => worksheet.title);
    const renderedSheets = worksheets.map((worksheet) =>
      renderToStaticMarkup(
        React.createElement(StudentSheetRenderer, {
          plan: {
            subject: "Matematica",
            grade: "6 ano",
            studentSheet: worksheet.studentSheet as StudentSheetPlan["studentSheet"]
          }
        })
      )
    );

    expect(worksheets).toHaveLength(5);
    expect(new Set(titles).size).toBe(5);
    expect(worksheets.map((worksheet) => worksheet.worksheetOrder)).toEqual([1, 2, 3, 4, 5]);
    expect(worksheets.every((worksheet) => worksheet.validationStatus === "VALID")).toBe(true);
    expect(worksheets.every((worksheet) => worksheet.validationIssues.length === 0)).toBe(true);
    expect(worksheets.every((worksheet) =>
      Array.isArray(worksheet.studentSheet.questions) &&
      worksheet.studentSheet.questions.length >= 3
    )).toBe(true);
    expect(JSON.stringify(worksheets)).not.toMatch(/Progressao Aritmetica|P\.A\.|placeholder|paisagem/i);
    expect(renderedSheets.join(" ")).not.toContain("Tarefa aguardando dados concretos");
    expect(renderedSheets.join(" ")).not.toMatch(/\bSIM\b|\bNAO\b|\bLER\b|\bOK\b/i);
  });

  it("keeps worksheet navigation and Word export compatible with the multi-sheet contract", () => {
    const { request, context, decision, blueprint } = createBlueprint();
    const projectOutput = buildPedagogicalProject({
      request,
      context,
      decision,
      materialBlueprint: blueprint
    });
    const worksheets = buildWorksheetsFromBlueprints(
      {},
      request,
      blueprint,
      projectOutput.project,
      projectOutput.worksheetBlueprints
    );
    const plan = {
      subject: "Matematica",
      grade: "6 ano",
      studentSheet: worksheets[0]?.studentSheet as StudentSheetPlan["studentSheet"],
      teacherGuide: worksheets[0]?.teacherGuide,
      worksheets
    };
    const resolved = resolveWorksheetCollection(plan);
    const exported = buildWordExportText(plan, resolved, true);

    expect(resolved).toHaveLength(5);
    expect(exported).toContain("FOLHA 1");
    expect(exported).toContain("FOLHA 5");
    expect(exported.split("--- QUEBRA DE FOLHA ---")).toHaveLength(5);
  });

  it("builds editorial Portuguese substantive worksheets with correct lexical classification", () => {
    const setup = createBlueprintForRequest(createPortugueseSubstantiveRequest());
    const projectOutput = buildPedagogicalProject({
      request: setup.request,
      context: setup.context,
      decision: setup.decision,
      materialBlueprint: setup.blueprint
    });
    const worksheets = buildWorksheetsFromBlueprints(
      {},
      setup.request,
      setup.blueprint,
      projectOutput.project,
      projectOutput.worksheetBlueprints
    );
    const serialized = JSON.stringify(worksheets);
    const classificationQuestions = (worksheets[1]?.studentSheet.questions ?? []) as Array<{
      actionType?: string;
      taskData?: {
        expectedClassification?: Array<{ item: string; category: string }>;
      };
    }>;
    const classificationQuestion = classificationQuestions.find((question) =>
      question.actionType === "CLASSIFY"
    );
    const classifications = classificationQuestion?.taskData?.expectedClassification ?? [];

    expect(worksheets).toHaveLength(5);
    expect(worksheets.every((worksheet) => worksheet.validationStatus === "VALID")).toBe(true);
    expect(classifications).toContainEqual({ item: "cachorro", category: "substantivo comum" });
    expect(classifications).toContainEqual({ item: "Rex", category: "substantivo proprio" });
    expect(classifications).toContainEqual({ item: "Ana", category: "substantivo proprio" });
    expect(classifications).toContainEqual({ item: "Vitoria", category: "substantivo proprio" });
    expect(classifications).toContainEqual({ item: "escola", category: "substantivo comum" });
    expect(classifications).toContainEqual({ item: "livro", category: "substantivo comum" });
    expect(serialized).not.toMatch(/passo 3|resposta 7|valor desconhecido|opera[cç][aã]o|numero conhecido/i);
    expect(serialized).not.toMatch(/CONCEPTUAL_CLASSIFICATION_ERROR|GENERIC_LANGUAGE_FALLBACK|CROSS_DISCIPLINE_FALLBACK/i);
  });

  it("differentiates the five Portuguese substantive worksheets by editorial purpose and content", () => {
    const setup = createBlueprintForRequest(createPortugueseSubstantiveRequest());
    const projectOutput = buildPedagogicalProject({
      request: setup.request,
      context: setup.context,
      decision: setup.decision,
      materialBlueprint: setup.blueprint
    });
    const worksheets = buildWorksheetsFromBlueprints(
      {},
      setup.request,
      setup.blueprint,
      projectOutput.project,
      projectOutput.worksheetBlueprints
    );
    const signatures = worksheets.map((worksheet) => {
      const questions = (worksheet.studentSheet.questions ?? []) as Array<{ actionType?: string }>;

      return questions.map((question) => question.actionType).join(">");
    });
    const sheetTexts = worksheets.map((worksheet) => JSON.stringify(worksheet.studentSheet));

    expect(new Set(signatures).size).toBe(5);
    expect(sheetTexts[2]).toMatch(/menino|menina|aluno|alunos|cidade|cidades|professor|professora/i);
    expect(sheetTexts[3]).toMatch(/Mariana|biblioteca|frase curta/i);
    expect(sheetTexts[4]).toMatch(/frase final|singular|plural|proprio|comum/i);
    expect(worksheets[2]?.title).toContain("flexoes");
    expect(worksheets[3]?.title).toContain("contexto");
    expect(worksheets[4]?.title).toContain("avaliacao");
  });
});
