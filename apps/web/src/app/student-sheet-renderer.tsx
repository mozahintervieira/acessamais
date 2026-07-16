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
  taskData?: Record<string, unknown>;
  taskDataStatus?: "VALID" | "INVALID";
  taskDataIssue?: string;
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
  const data = question.taskData ?? {};
  const representation = textValue(data.representation);
  const prompt = textValue(data.question);
  const options = stringList(data.options);

  if (!representation || !prompt || options.length === 0) {
    return <InvalidTaskRenderer question={question} />;
  }

  return (
    <QuestionFrame question={question}>
      <div className="questionVisual dynamicTaskVisual observe">
        <EquationVisual expression={representation} />
        <strong>{prompt}</strong>
      </div>
      <div className="answerChoiceGrid">
        {options.map((option) => (
          <span className="choiceBox" key={option}>
            <i />
            {option}
          </span>
        ))}
      </div>
    </QuestionFrame>
  );
}

function MatchingRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  const data = question.taskData ?? {};
  const leftItems = stringList(data.leftItems);
  const rightItems = stringList(data.rightItems);
  const instruction = textValue(data.connectionInstruction);

  if (leftItems.length === 0 || rightItems.length === 0) {
    return <InvalidTaskRenderer question={question} />;
  }

  return (
    <QuestionFrame question={question}>
      {instruction ? <small>{instruction}</small> : null}
      <div className="matchingArea dynamicTaskVisual">
        {leftItems.slice(0, 4).map((left, index) => (
          <React.Fragment key={`${left}-${index}`}>
            <span>{left}</span>
            <b />
            <span>{rightItems[index] ?? ""}</span>
          </React.Fragment>
        ))}
      </div>
    </QuestionFrame>
  );
}

function CompletionRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  const data = question.taskData ?? {};
  const statements = stringList(data.statements);
  const supportSteps = stringList(data.supportSteps);

  if (statements.length === 0) {
    return <InvalidTaskRenderer question={question} />;
  }

  return (
    <QuestionFrame question={question}>
      {supportSteps.length > 0 ? (
        <div className="studentMiniSteps">
          {supportSteps.slice(0, 3).map((step) => <span key={step}>{step}</span>)}
        </div>
      ) : null}
      <div className="fillBlankArea dynamicTaskVisual">
        {statements.slice(0, 4).map((statement) => (
          <span key={statement}>{statement}</span>
        ))}
      </div>
    </QuestionFrame>
  );
}

function SolveRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  const data = question.taskData ?? {};
  const problemContext = textValue(data.problemContext);
  const equation = textValue(data.equation);
  const steps = stringList(data.guidedSteps);

  if (!problemContext || !equation) {
    return <InvalidTaskRenderer question={question} />;
  }

  return (
    <QuestionFrame question={question}>
      <div className="questionVisual dynamicTaskVisual solve">
        <p>{problemContext}</p>
        <EquationVisual expression={equation} />
      </div>
      {steps.length > 0 ? (
        <div className="studentMiniSteps">
          {steps.slice(0, 3).map((step) => <span key={step}>{step}</span>)}
        </div>
      ) : null}
      <div className="premiumAnswerLines"><span /><span /><span /></div>
    </QuestionFrame>
  );
}

function ClassificationRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  const data = question.taskData ?? {};
  const items = stringList(data.items);
  const categories = stringList(data.categories);

  if (items.length === 0 || categories.length === 0) {
    return <InvalidTaskRenderer question={question} />;
  }

  return (
    <QuestionFrame question={question}>
      <div className="answerChoiceGrid dynamicTaskVisual">
        {categories.map((label) => (
          <span className="choiceBox" key={label}>
            <i />
            {label}
          </span>
        ))}
      </div>
      <div className="studentMiniSteps">
        {items.slice(0, 5).map((item) => <span key={item}>{item}</span>)}
      </div>
    </QuestionFrame>
  );
}

function GuidedCreationRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  const data = question.taskData ?? {};
  const contextPrompt = textValue(data.contextPrompt);
  const values = stringList(data.availableValues);
  const steps = stringList(data.constructionSteps);
  const fields = stringList(data.fieldsToComplete);

  if (!contextPrompt || values.length === 0 || fields.length === 0) {
    return <InvalidTaskRenderer question={question} />;
  }

  return (
    <QuestionFrame question={question}>
      <div className="guidedExampleVisual dynamicTaskVisual">
        <strong>{contextPrompt}</strong>
        {values.slice(0, 6).map((value) => <span key={value}>{value}</span>)}
      </div>
      {steps.length > 0 ? (
        <div className="studentMiniSteps">
          {steps.slice(0, 3).map((step) => <span key={step}>{step}</span>)}
        </div>
      ) : null}
      <div className="fillBlankArea">
        {fields.slice(0, 4).map((field) => <span key={field}>{field}: ______</span>)}
      </div>
    </QuestionFrame>
  );
}

function OrderingRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  const items = stringList(question.taskData?.items);

  if (items.length === 0) {
    return <InvalidTaskRenderer question={question} />;
  }

  return (
    <QuestionFrame question={question}>
      <div className="sequenceVisual dynamicTaskVisual">
        {items.slice(0, 5).map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </QuestionFrame>
  );
}

function ConnectionRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  const data = question.taskData ?? {};
  const sourceItems = stringList(data.sourceItems);
  const targetItems = stringList(data.targetItems);

  if (sourceItems.length === 0 || targetItems.length === 0) {
    return <InvalidTaskRenderer question={question} />;
  }

  return (
    <QuestionFrame question={question}>
      <div className="matchingArea dynamicTaskVisual">
        {sourceItems.slice(0, 4).map((source, index) => (
          <React.Fragment key={`${source}-${index}`}>
            <span>{source}</span>
            <b />
            <span>{targetItems[index] ?? ""}</span>
          </React.Fragment>
        ))}
      </div>
    </QuestionFrame>
  );
}

function GenericTaskRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  return (
    <QuestionFrame question={question}>
      <InvalidTaskRenderer question={question} />
    </QuestionFrame>
  );
}

function InvalidTaskRenderer({ question }: { question: StudentSheetQuestion }): React.ReactElement {
  return (
    <div className="studentTaskIssue" data-task-issue={question.taskDataIssue ?? "INCOMPLETE_TASK_DATA"}>
      <strong>Tarefa aguardando dados concretos.</strong>
      <span>{question.taskDataIssue ?? "INCOMPLETE_TASK_DATA"}</span>
    </div>
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

function EquationVisual({ expression }: { expression: string }): React.ReactElement {
  const parts = expression.split("=");

  return (
    <div className="equationVisual" aria-label={expression}>
      <span>{parts[0]?.trim() ?? expression}</span>
      <b>=</b>
      <span>{parts[1]?.trim() ?? ""}</span>
    </div>
  );
}

function ConceptVisual({ label }: { label: string }): React.ReactElement {
  return (
    <svg className="svgVisual conceptVisual" viewBox="0 0 160 96" role="img" aria-label={label}>
      <rect x="18" y="20" width="124" height="56" rx="14" />
      <path d="M48 48 H112" />
      <path d="M92 36 L112 48 L92 60" />
      <circle cx="42" cy="48" r="9" />
    </svg>
  );
}

function StudentVisualResources({ items }: { items: string[] }): React.ReactElement {
  return (
    <section className="visualResourceGrid" aria-label="Recursos visuais da atividade">
      {items.slice(0, 4).map((item) => (
        <div className="visualResourceCard picture" aria-label={item} key={item}>
          <ConceptVisual label={item} />
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

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
