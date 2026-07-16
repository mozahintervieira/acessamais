"use client";

import React from "react";
import type { RefObject } from "react";

export type StudentSheetQuestion = {
  plannedTaskOrder?: number;
  actionType?: string;
  pedagogicalPurpose?: string;
  cognitiveDemand?: string;
  responseMode?: string;
  supportRequired?: string[];
  visualFunction?: string;
  successCriterion?: string;
  instruction?: string;
  content?: string;
  command: string;
  support?: string;
  answerSpace?: string;
};

export type RenderableStudentSheet = {
  title?: string;
  context?: string;
  instructions?: string[];
  baseText?: string;
  didacticBoxes?: string[];
  visualElements?: string[];
  tableRows?: string[];
  questions?: StudentSheetQuestion[];
};

export type StudentSheetPlan = {
  studentSheet?: RenderableStudentSheet;
  worksheetTitle?: string;
  subject?: string;
  grade?: string;
  context?: string;
  instructions?: string[];
  baseText?: string;
  didacticBoxes?: string[];
  visualElements?: string[];
  tableRows?: string[];
  questions?: StudentSheetQuestion[];
};

type QuestionRendererKind =
  | "observe"
  | "match"
  | "complete"
  | "solve"
  | "classify"
  | "guided"
  | "order"
  | "connect"
  | "generic";

export function StudentSheetRenderer({
  plan,
  sheetRef,
  compact = false
}: {
  plan: StudentSheetPlan;
  sheetRef?: RefObject<HTMLElement | null>;
  compact?: boolean;
}): React.ReactElement {
  const sheet = resolveRenderableStudentSheet(plan);
  const theme = resolveSubjectTheme(plan.subject ?? sheet.title);

  return (
    <article ref={sheetRef} className={`productA4 editorialA4 ${theme.className}`}>
      <header className="studentSheetHeader editorialHeader">
        <strong>{theme.label}</strong>
        <span>{plan.grade ?? "Folha A4 pronta para imprimir"}</span>
      </header>

      <section className="editorialTitleRow">
        <div>
          <span className="activityRibbon">Atividade pronta para imprimir</span>
          <h2>{sheet.title}</h2>
          {sheet.context ? <p>{sheet.context}</p> : null}
        </div>
        <SheetVisualSummary sheet={sheet} />
      </section>

      {sheet.didacticBoxes[0] ? (
        <section className="editorialTipBox">
          <span aria-hidden="true">!</span>
          <p>{sheet.didacticBoxes[0]}</p>
        </section>
      ) : null}

      {sheet.instructions.length > 0 ? (
        <section className="studentInstructions">
          <strong>Como realizar</strong>
          <ul>
            {sheet.instructions.slice(0, compact ? 2 : 4).map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {sheet.baseText ? (
        <section className="studentBaseText">
          <strong>Texto de apoio</strong>
          <p>{sheet.baseText}</p>
        </section>
      ) : null}

      {sheet.visualElements.length > 0 ? <StudentVisualResources items={sheet.visualElements} /> : null}

      {sheet.didacticBoxes.length > 1 ? (
        <section className="worksheetBoxes">
          {sheet.didacticBoxes.slice(1, compact ? 3 : 4).map((box) => (
            <div key={box}>
              <strong>Apoio</strong>
              <p>{box}</p>
            </div>
          ))}
        </section>
      ) : null}

      {sheet.tableRows.length > 0 ? <StudentDataTable rows={sheet.tableRows} /> : null}

      <ol className="premiumQuestions editorialActivities">
        {sheet.questions.slice(0, compact ? 4 : 10).map((question, index) => (
          <li className="activityCard" key={`${question.plannedTaskOrder ?? index}-${question.command}`}>
            <span className="activityNumber">{index + 1}</span>
            <QuestionByAction question={question} />
          </li>
        ))}
      </ol>

      <footer>acessa+ | educacao inclusiva na pratica - @mozahintervieira</footer>
    </article>
  );
}

export function resolveRendererKind(question: StudentSheetQuestion): QuestionRendererKind {
  const actionType = normalize(question.actionType ?? "");

  if (actionType === "observe") return "observe";
  if (actionType === "match") return "match";
  if (actionType === "complete") return "complete";
  if (actionType === "solve") return "solve";
  if (actionType === "classify") return "classify";
  if (actionType === "create_guided_example") return "guided";
  if (actionType === "order") return "order";
  if (actionType === "connect") return "connect";

  return "generic";
}

function QuestionByAction({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  const kind = resolveRendererKind(question);

  if (kind === "observe") return <ObservationRenderer question={question} />;
  if (kind === "match") return <MatchingRenderer question={question} />;
  if (kind === "complete") return <CompletionRenderer question={question} />;
  if (kind === "solve") return <SolveRenderer question={question} />;
  if (kind === "classify") return <ClassificationRenderer question={question} />;
  if (kind === "guided") return <GuidedCreationRenderer question={question} />;
  if (kind === "order") return <OrderingRenderer question={question} />;
  if (kind === "connect") return <ConnectionRenderer question={question} />;

  return <GenericTaskRenderer question={question} />;
}

function ObservationRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  return (
    <QuestionFrame question={question}>
      <VisualFunctionPanel question={question} variant="observe" />
      <AnswerArea question={question} />
    </QuestionFrame>
  );
}

function MatchingRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  return (
    <QuestionFrame question={question}>
      <div className="matchingArea dynamicTaskVisual" aria-hidden="true">
        <span>{shortText(question.content, "Item")}</span>
        <b />
        <span>{shortText(question.responseMode, "Resposta")}</span>
        <span>{shortText(question.visualFunction, "Pista visual")}</span>
        <b />
        <span>{shortText(question.successCriterion, "Criterio")}</span>
      </div>
      <AnswerArea question={question} />
    </QuestionFrame>
  );
}

function CompletionRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  return (
    <QuestionFrame question={question}>
      <div className="fillBlankArea dynamicTaskVisual" aria-hidden="true">
        <span>{shortText(question.content, "Conteudo")}</span>
        <span>{shortText(question.visualFunction, "Apoio visual")}</span>
        <span>{shortText(question.answerSpace, "Resposta")}</span>
      </div>
      <AnswerArea question={question} />
    </QuestionFrame>
  );
}

function SolveRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  return (
    <QuestionFrame question={question}>
      <VisualFunctionPanel question={question} variant="solve" />
      <AnswerArea question={question} />
    </QuestionFrame>
  );
}

function ClassificationRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  return (
    <QuestionFrame question={question}>
      <div className="answerChoiceGrid dynamicTaskVisual" aria-hidden="true">
        {buildDynamicLabels(question, 3).map((label) => (
          <span className="choiceBox" key={label}>
            <i />
            {label}
          </span>
        ))}
      </div>
      <AnswerArea question={question} />
    </QuestionFrame>
  );
}

function GuidedCreationRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  return (
    <QuestionFrame question={question}>
      <div className="guidedExampleVisual dynamicTaskVisual" aria-hidden="true">
        <span>{shortText(question.pedagogicalPurpose, "Modelo")}</span>
        <span>{shortText(question.responseMode, "Como responder")}</span>
        <span>{shortText(question.successCriterion, "Como conferir")}</span>
      </div>
      <AnswerArea question={question} />
    </QuestionFrame>
  );
}

function OrderingRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  return (
    <QuestionFrame question={question}>
      <div className="sequenceVisual dynamicTaskVisual" aria-hidden="true">
        {buildDynamicLabels(question, 4).map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <AnswerArea question={question} />
    </QuestionFrame>
  );
}

function ConnectionRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  return (
    <QuestionFrame question={question}>
      <div className="matchingArea dynamicTaskVisual" aria-hidden="true">
        <span>{shortText(question.content, "Informacao")}</span>
        <b />
        <span>{shortText(question.visualFunction, "Relacao")}</span>
        <span>{shortText(question.pedagogicalPurpose, "Ideia")}</span>
        <b />
        <span>{shortText(question.responseMode, "Resposta")}</span>
      </div>
      <AnswerArea question={question} />
    </QuestionFrame>
  );
}

function GenericTaskRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  return (
    <QuestionFrame question={question}>
      <VisualFunctionPanel question={question} variant="generic" />
      <AnswerArea question={question} />
    </QuestionFrame>
  );
}

function QuestionFrame({
  question,
  children
}: {
  question: StudentSheetQuestion;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      data-answer-space={question.answerSpace}
      data-pedagogical-purpose={question.pedagogicalPurpose}
      data-response-mode={question.responseMode}
      data-visual-function={question.visualFunction}
    >
      <p>{question.command}</p>
      {question.support ? <small>{question.support}</small> : null}
      {children}
    </div>
  );
}

function VisualFunctionPanel({
  question,
  variant
}: {
  question: StudentSheetQuestion;
  variant: string;
}): React.ReactElement {
  return (
    <div className={`questionVisual dynamicTaskVisual ${variant}`} aria-hidden="true">
      <svg viewBox="0 0 420 120">
        <rect x="18" y="18" width="384" height="84" rx="18" />
        <path d="M54 78 C96 36 142 36 184 78" />
        <path d="M218 78 C260 36 306 36 348 78" />
        <circle cx="210" cy="60" r="10" />
      </svg>
      <div className="visualCaption">
        {shortText(question.visualFunction, question.responseMode ?? question.pedagogicalPurpose ?? "Apoio visual")}
      </div>
    </div>
  );
}

function AnswerArea({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  const mode = normalize(`${question.answerSpace ?? ""} ${question.responseMode ?? ""}`);

  if (mode.includes("marcar") || mode.includes("alternativa") || mode.includes("escolha")) {
    return (
      <div className="answerChoiceGrid" aria-hidden="true">
        {buildDynamicLabels(question, 3).map((label) => (
          <span className="choiceBox" key={label}>
            <i />
            {label}
          </span>
        ))}
      </div>
    );
  }

  if (mode.includes("ligar") || mode.includes("parear") || mode.includes("pares")) {
    return (
      <div className="matchingArea" aria-hidden="true">
        <span />
        <b />
        <span />
        <span />
        <b />
        <span />
      </div>
    );
  }

  if (mode.includes("lacuna") || mode.includes("caixa") || mode.includes("completar")) {
    return (
      <div className="fillBlankArea" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    );
  }

  return <div className="premiumAnswerLines"><span /><span /><span /></div>;
}

function StudentVisualResources({ items }: { items: string[] }): React.ReactElement {
  return (
    <section className="visualResourceGrid" aria-label="Recursos visuais da atividade">
      {items.slice(0, 4).map((item) => (
        <div className="visualResourceCard picture" aria-label={item} key={item}>
          <svg className="svgVisual genericPictureVisual" viewBox="0 0 160 96" role="img" aria-label={item}>
            <rect x="18" y="16" width="124" height="64" rx="14" />
            <path d="M32 68 L62 42 L88 58 L112 34 L136 68 Z" />
            <circle cx="48" cy="38" r="10" />
          </svg>
          <span>{item}</span>
        </div>
      ))}
    </section>
  );
}

function SheetVisualSummary({ sheet }: { sheet: Required<RenderableStudentSheet> }): React.ReactElement {
  const label =
    sheet.visualElements[0] ??
    sheet.questions[0]?.visualFunction ??
    sheet.questions[0]?.responseMode ??
    "recurso visual";

  return (
    <svg className="worksheetHeroIllustration" viewBox="0 0 220 160" role="img" aria-label={label}>
      <rect x="24" y="28" width="172" height="104" rx="22" />
      <path d="M52 104 C80 54 118 54 146 104" />
      <path d="M76 116 H164" />
      <circle cx="154" cy="62" r="12" />
    </svg>
  );
}

function StudentDataTable({ rows }: { rows: string[] }): React.ReactElement {
  return (
    <section className="studentTable" aria-label="Tabela da atividade">
      {rows.slice(0, 5).map((row) => {
        const cells = row.split("|").map((cell) => cell.trim()).filter(Boolean);

        return (
          <div key={row}>
            <span>{cells[0] ?? row}</span>
            <span>{cells[1] ?? ""}</span>
            <span>{cells[2] ?? ""}</span>
          </div>
        );
      })}
    </section>
  );
}

function resolveRenderableStudentSheet(plan: StudentSheetPlan): Required<RenderableStudentSheet> {
  const source = plan.studentSheet ?? {};

  return {
    title: source.title ?? plan.worksheetTitle ?? "Atividade pronta para imprimir",
    context: source.context ?? plan.context ?? "",
    instructions: source.instructions ?? plan.instructions ?? [],
    baseText: source.baseText ?? plan.baseText ?? "",
    didacticBoxes: source.didacticBoxes ?? plan.didacticBoxes ?? [],
    visualElements: source.visualElements ?? plan.visualElements ?? [],
    tableRows: source.tableRows ?? plan.tableRows ?? [],
    questions: source.questions ?? plan.questions ?? []
  };
}

function resolveSubjectTheme(subject?: string): { className: string; label: string } {
  const normalized = normalize(subject ?? "");

  if (normalized.includes("matematica") || normalized.includes("equacao")) {
    return { className: "subjectMath", label: "Matematica" };
  }

  if (
    normalized.includes("quimica") ||
    normalized.includes("ciencia") ||
    normalized.includes("biologia") ||
    normalized.includes("fisica")
  ) {
    return { className: "subjectScience", label: subject ?? "Ciencias" };
  }

  if (
    normalized.includes("geografia") ||
    normalized.includes("historia") ||
    normalized.includes("territorio") ||
    normalized.includes("brasil")
  ) {
    return { className: "subjectGeo", label: subject ?? "Geografia" };
  }

  return { className: "subjectLanguage", label: subject ?? "Lingua Portuguesa" };
}

function buildDynamicLabels(question: StudentSheetQuestion, count: number): string[] {
  const candidates = [
    question.content,
    question.visualFunction,
    question.responseMode,
    question.answerSpace,
    question.pedagogicalPurpose,
    question.successCriterion
  ]
    .map((item) => shortText(item, ""))
    .filter(Boolean);

  return Array.from({ length: count }, (_, index) => candidates[index] ?? `Opcao ${index + 1}`);
}

function shortText(value: string | undefined, fallback: string): string {
  const clean = value?.trim();

  if (!clean) {
    return fallback;
  }

  return clean.length > 38 ? `${clean.slice(0, 35).trim()}...` : clean;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
