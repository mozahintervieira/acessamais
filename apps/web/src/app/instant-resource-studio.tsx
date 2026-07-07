"use client";

import { useMemo, useState } from "react";
import type { CreateMissionRequest, MissionType } from "@acessa-plus/types";

type WorksheetQuestion = {
  command: string;
  support?: string;
  answerSpace?: string;
};

type WorksheetPlan = {
  worksheetTitle?: string;
  subject?: string;
  grade?: string;
  skillCode?: string;
  learningObjective?: string;
  baseText?: string;
  instructions?: string[];
  questions?: WorksheetQuestion[];
  visualElements?: string[];
  adaptationNotes?: string[];
};

type MissionResult = {
  missionId: string;
  resourceId: string;
  status: "COMPLETED" | "NEEDS_REVIEW";
  pedagogicalPlan: WorksheetPlan;
};

const defaultPrompt =
  "Crie uma atividade de Matematica para estudante com Deficiencia Intelectual sobre equacoes do primeiro grau usando a habilidade BNCC EM13MAT401. Gere uma folha A4 pronta para imprimir.";

const quickSuggestions = [
  {
    label: "Printable Activity",
    prompt:
      "Crie uma atividade pronta para impressao em A4 de Ciencias sobre ecossistemas para o 7 ano, com 6 questoes, texto-base curto e espacos para resposta."
  },
  {
    label: "Adapt Existing Activity",
    prompt:
      "Adapte uma atividade de leitura sobre noticia para um estudante autista, com comandos objetivos, rotina visual e menor carga de escrita."
  },
  {
    label: "Assessment",
    prompt:
      "Gere uma avaliacao de Matematica sobre porcentagem para o 8 ano, com questoes progressivas e gabarito para o professor."
  },
  {
    label: "Lesson Plan",
    prompt:
      "Crie um plano de aula curto com atividade imprimivel sobre povos indigenas para o Ensino Medio."
  },
  {
    label: "PEI",
    prompt:
      "Gere um PEI pedagogico para estudante com dificuldade de leitura, com objetivos, apoios e evidencias de aprendizagem."
  },
  {
    label: "LIBRAS",
    prompt:
      "Crie um material com apoio em Libras sobre sinais de saudacao para estudante surdo."
  },
  {
    label: "Braille",
    prompt:
      "Prepare uma atividade de Geografia sobre mapas para estudante com deficiencia visual, com orientacoes para Braille e recurso tatil."
  },
  {
    label: "Communication Board",
    prompt:
      "Crie uma prancha de comunicacao CAA para rotina de sala de aula com pictogramas descritos e comandos simples."
  }
];

const adaptationOptions = ["DI", "TEA", "DV", "DA", "TDAH", "AH/SD", "LIBRAS", "Braille", "CAA"];

export function InstantResourceStudio(): React.ReactElement {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [editablePlan, setEditablePlan] = useState<WorksheetPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAdaptations, setShowAdaptations] = useState(false);
  const [followUp, setFollowUp] = useState<string | null>(null);

  const activePlan = editablePlan ?? result?.pedagogicalPlan ?? null;
  const canExport = Boolean(activePlan);

  async function generateResource(nextPrompt = prompt, missionType: MissionType = "CREATE_LESSON_PLAN"): Promise<void> {
    const trimmedPrompt = nextPrompt.trim();

    setMessage(null);
    setError(null);

    if (trimmedPrompt.length < 18) {
      setFollowUp("Informe pelo menos o tema e o tipo de material. Exemplo: atividade de Ciencias sobre ecossistemas para 7 ano.");
      return;
    }

    setFollowUp(null);
    setIsGenerating(true);

    const request: CreateMissionRequest = {
      userId: "demo-teacher",
      organizationId: "demo-organization",
      missionType,
      input: {
        rawPrompt: trimmedPrompt,
        expectedProductType: "Recurso pedagogico pronto para uso",
        outputFormat: "A4 pronto para impressao",
        contextNotes:
          "Interpretar a solicitacao em linguagem natural e gerar um recurso educacional visualmente organizado, pronto para sala de aula."
      }
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/missions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nao foi possivel gerar o recurso.");
      }

      const payload = (await response.json()) as MissionResult;
      setResult(payload);
      setEditablePlan(payload.pedagogicalPlan);
      setIsEditing(false);
      setShowAdaptations(false);
      setMessage("Recurso gerado. Voce ja pode editar, adaptar ou exportar.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erro inesperado ao gerar recurso.");
    } finally {
      setIsGenerating(false);
    }
  }

  function improveResource(): void {
    const improvedPrompt = `${prompt}\n\nMelhore o material gerado: deixe mais bonito, mais claro, mais organizado pedagogicamente, com comandos objetivos, melhor distribuicao visual em A4 e maior qualidade editorial.`;
    setPrompt(improvedPrompt);
    void generateResource(improvedPrompt);
  }

  function adaptResource(option: string): void {
    const adaptedPrompt = `${prompt}\n\nAdapte automaticamente este recurso para ${option}, preservando o objetivo de aprendizagem, aplicando acessibilidade, DUA, linguagem clara e apoios pedagogicos adequados.`;
    setPrompt(adaptedPrompt);
    void generateResource(adaptedPrompt, "ADAPT_ACTIVITY");
  }

  function copyResource(): void {
    const text = activePlan ? buildCopyText(activePlan) : "";

    if (!text) {
      return;
    }

    void navigator.clipboard.writeText(text);
    setMessage("Recurso copiado.");
  }

  function exportWord(): void {
    const text = activePlan ? buildCopyText(activePlan) : "";
    const blob = new Blob([text], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "recurso-acessa-plus.doc";
    link.click();
    URL.revokeObjectURL(url);
  }

  function shareResource(): void {
    const text = activePlan
      ? `ACESSA+ - ${activePlan.worksheetTitle ?? "recurso pedagogico"}\n${window.location.href}`
      : window.location.href;

    void navigator.clipboard.writeText(text);
    setMessage("Link da demonstracao copiado.");
  }

  function updatePlanField(field: keyof WorksheetPlan, value: string): void {
    setEditablePlan((current) => ({
      ...(current ?? {}),
      [field]: value
    }));
  }

  function updateQuestions(value: string): void {
    setEditablePlan((current) => ({
      ...(current ?? {}),
      questions: value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ command: line }))
    }));
  }

  const questionText = useMemo(
    () => (activePlan?.questions ?? []).map((question) => question.command).join("\n"),
    [activePlan]
  );

  return (
    <main className="aiStudioShell">
      <section className="aiHero" aria-labelledby="studio-title">
        <p className="studioEyebrow">ACESSA+ cria recursos pedagogicos em segundos</p>
        <h1 id="studio-title">O que voce deseja criar hoje?</h1>
        <p className="studioLead">
          Digite uma frase. Receba uma atividade, avaliacao, PEI ou recurso acessivel com aparencia profissional.
        </p>

        <form
          className="promptComposer"
          onSubmit={(event) => {
            event.preventDefault();
            void generateResource();
          }}
        >
          <textarea
            aria-label="Descreva o recurso pedagogico que deseja criar"
            value={prompt}
            placeholder="Create a Mathematics activity for a student with Intellectual Disability about first-degree equations using BNCC skill EM13MAT401. Generate an A4 printable worksheet."
            onChange={(event) => setPrompt(event.currentTarget.value)}
          />
          <button className="generateButton" disabled={isGenerating} type="submit">
            {isGenerating ? "GERANDO..." : "GENERATE"}
          </button>
        </form>

        {followUp ? <p className="followUpQuestion">{followUp}</p> : null}

        <div className="suggestionRail" aria-label="Sugestoes rapidas">
          {quickSuggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => setPrompt(suggestion.prompt)}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </section>

      <section className={activePlan ? "studioResult visible" : "studioResult"} aria-live="polite">
        <div className="resultActions" aria-label="Acoes do recurso gerado">
          <button type="button" disabled={!canExport} onClick={() => setIsEditing((current) => !current)}>
            Edit
          </button>
          <button type="button" disabled={!canExport || isGenerating} onClick={improveResource}>
            Improve
          </button>
          <button type="button" disabled={!canExport} onClick={() => setShowAdaptations((current) => !current)}>
            Adapt
          </button>
          <a className={canExport && result ? "" : "disabledLink"} href={result ? `/missions/${result.missionId}` : "/missions"}>
            Save
          </a>
          <button type="button" disabled={!canExport} onClick={() => window.print()}>
            Export PDF
          </button>
          <button type="button" disabled={!canExport} onClick={exportWord}>
            Export Word
          </button>
          <button type="button" disabled={!canExport} onClick={() => window.print()}>
            Export PNG
          </button>
          <button type="button" disabled={!canExport} onClick={shareResource}>
            Share
          </button>
        </div>

        {showAdaptations ? (
          <div className="adaptPanel">
            {adaptationOptions.map((option) => (
              <button key={option} type="button" onClick={() => adaptResource(option)}>
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {message ? <p className="successMessage">{message}</p> : null}
        {error ? <p className="formError">{error}</p> : null}

        {isEditing && activePlan ? (
          <section className="quickEditor" aria-label="Edicao rapida">
            <label>
              <span>Titulo</span>
              <input value={activePlan.worksheetTitle ?? ""} onChange={(event) => updatePlanField("worksheetTitle", event.currentTarget.value)} />
            </label>
            <label>
              <span>Objetivo</span>
              <input value={activePlan.learningObjective ?? ""} onChange={(event) => updatePlanField("learningObjective", event.currentTarget.value)} />
            </label>
            <label>
              <span>Questoes</span>
              <textarea rows={5} value={questionText} onChange={(event) => updateQuestions(event.currentTarget.value)} />
            </label>
          </section>
        ) : null}

        {activePlan ? <PrintableWorksheet plan={activePlan} /> : <EmptyPreview isGenerating={isGenerating} />}
      </section>
    </main>
  );
}

function EmptyPreview({ isGenerating }: { isGenerating: boolean }): React.ReactElement {
  return (
    <article className="emptyWorksheet">
      <span>{isGenerating ? "Criando recurso..." : "Seu material aparecera aqui"}</span>
      <strong>{isGenerating ? "Organizando a folha A4" : "Uma frase pode virar uma atividade pronta para sala."}</strong>
      <p>
        O ACESSA+ transforma uma necessidade pedagogica em material visual, imprimivel e adaptavel.
      </p>
    </article>
  );
}

function PrintableWorksheet({ plan }: { plan: WorksheetPlan }): React.ReactElement {
  const questions =
    plan.questions && plan.questions.length > 0
      ? plan.questions
      : [{ command: "Responda a questao proposta no espaco indicado." }];

  return (
    <article className="premiumA4Sheet">
      <header className="premiumA4Header">
        <strong>{plan.subject ?? "Recurso pedagogico"}</strong>
        <span>{plan.skillCode ?? "Habilidade curricular indicada pelo professor"}</span>
      </header>

      <section className="worksheetTitleBlock">
        <h2>{plan.worksheetTitle ?? "Atividade pronta para impressao"}</h2>
        <p>{plan.learningObjective ?? "Objetivo de aprendizagem organizado a partir da solicitacao do professor."}</p>
      </section>

      {(plan.instructions ?? []).length > 0 ? (
        <section className="worksheetInstructions">
          <strong>Instrucoes</strong>
          <ul>
            {(plan.instructions ?? []).map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {plan.baseText ? (
        <section className="worksheetBaseText">
          <strong>Texto-base</strong>
          <p>{plan.baseText}</p>
        </section>
      ) : null}

      {(plan.visualElements ?? []).length > 0 ? (
        <section className="worksheetVisuals" aria-label="Elementos visuais sugeridos">
          {(plan.visualElements ?? []).slice(0, 4).map((visual) => (
            <div key={visual}>{visual}</div>
          ))}
        </section>
      ) : (
        <section className="worksheetVisuals" aria-label="Espacos para elementos visuais">
          <div>Imagem ou recurso visual</div>
          <div>Exemplo resolvido</div>
        </section>
      )}

      <ol className="premiumQuestions">
        {questions.map((question, index) => (
          <li key={`${question.command}-${index}`}>
            <p>{question.command}</p>
            {question.support ? <small>{question.support}</small> : null}
            <div className="premiumAnswerLines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </li>
        ))}
      </ol>

      {(plan.adaptationNotes ?? []).length > 0 ? (
        <section className="worksheetAdaptation">
          <strong>Adaptacao pedagogica aplicada</strong>
          <p>{(plan.adaptationNotes ?? []).join(" ")}</p>
        </section>
      ) : null}

      <footer>acessa+ | educacao inclusiva na pratica - @mozahintervieira</footer>
    </article>
  );
}

function buildCopyText(plan: WorksheetPlan): string {
  return [
    plan.subject ?? "Recurso pedagogico",
    plan.skillCode ?? "",
    plan.worksheetTitle ?? "Atividade pronta para impressao",
    plan.learningObjective ? `Objetivo: ${plan.learningObjective}` : "",
    ...(plan.instructions ?? []).map((instruction) => `Instrucao: ${instruction}`),
    plan.baseText ? `Texto-base: ${plan.baseText}` : "",
    ...(plan.questions ?? []).map((question, index) => `${index + 1}. ${question.command}`),
    "acessa+ | educacao inclusiva na pratica - @mozahintervieira"
  ]
    .filter(Boolean)
    .join("\n\n");
}
