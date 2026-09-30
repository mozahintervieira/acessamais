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
  guidedReading?: {
    title?: string;
    text?: string;
    keyIdea?: string;
    imageKind?: string;
    imageAlt?: string;
  };
  workedExample?: {
    title?: string;
    problem?: string;
    steps?: string[];
    answer?: string;
    check?: string;
  };
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
  guidedReading?: RenderableStudentSheet["guidedReading"];
  workedExample?: RenderableStudentSheet["workedExample"];
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

type ResolvedStudentSheet = Omit<
  Required<RenderableStudentSheet>,
  "guidedReading" | "workedExample"
> & {
  guidedReading: Required<NonNullable<RenderableStudentSheet["guidedReading"]>>;
  workedExample: Required<NonNullable<RenderableStudentSheet["workedExample"]>>;
};

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

      <div className="studentIdentityLine" aria-label="Identificação do estudante">
        <span>Nome: <i /></span>
        <span>Turma: <i /></span>
        <span>Data: <i /></span>
      </div>

      <section className="editorialTitleRow">
        <div>
          <h2>{sheet.title}</h2>
          {sheet.context ? <p><strong>Sua missão:</strong> {sheet.context}</p> : null}
        </div>
      </section>

      {sheet.guidedReading.text ? (
        <GuidedLearningPanel
          guidedReading={sheet.guidedReading}
          workedExample={sheet.workedExample}
        />
      ) : null}

      {!sheet.guidedReading.text && (sheet.didacticBoxes[0] || sheet.instructions.length > 0) ? (
        <div className="studentStartGrid">
          {sheet.didacticBoxes[0] ? (
            <section className="editorialTipBox">
              <span aria-hidden="true">!</span>
              <p>{sheet.didacticBoxes[0]}</p>
            </section>
          ) : null}

          {sheet.instructions.length > 0 ? (
            <section className="studentInstructions">
              <strong>Antes de começar</strong>
              <ul>
                {sheet.instructions.slice(0, compact ? 2 : 3).map((instruction) => (
                  <li key={instruction}>{instruction}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {!sheet.guidedReading.text && sheet.baseText ? (
        <section className="studentBaseText">
          <strong>Texto de apoio</strong>
          <p>{sheet.baseText}</p>
        </section>
      ) : null}

      {sheet.guidedReading.text && sheet.instructions.length > 0 ? (
        <section className="studentInstructionStrip" aria-label="Como realizar a atividade">
          <strong>Como realizar</strong>
          <div>
            {sheet.instructions.slice(0, compact ? 2 : 3).map((instruction, index) => (
              <span key={instruction}><b>{index + 1}</b>{instruction}</span>
            ))}
          </div>
        </section>
      ) : null}

      {sheet.visualElements.length > 0 && sheet.questions.length === 0 ? (
        <StudentVisualResources items={sheet.visualElements} />
      ) : null}

      {!sheet.guidedReading.text && sheet.didacticBoxes.length > 1 ? (
        <section className="worksheetBoxes">
          {sheet.didacticBoxes.slice(1, compact ? 3 : 4).map((box) => (
            <div key={box}>
              <strong>{supportBoxLabel(box)}</strong>
              <p>{supportBoxText(box)}</p>
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

      <footer>ACESSA+ · educação inclusiva na prática · @mozahintervieira</footer>
    </article>
  );
}

function GuidedLearningPanel({
  guidedReading,
  workedExample
}: {
  guidedReading: Required<NonNullable<RenderableStudentSheet["guidedReading"]>>;
  workedExample: Required<NonNullable<RenderableStudentSheet["workedExample"]>>;
}): React.ReactElement {
  const isEquationVisual = normalize(guidedReading.imageKind).includes("equation");

  return (
    <section className="guidedLearningPanel" aria-label="Leitura guiada e exemplo resolvido">
      <div className="guidedReadingCard">
        <div className="guidedReadingCopy">
          <span className="guidedSectionLabel">Leitura guiada</span>
          <h3>{guidedReading.title}</h3>
          <p>{guidedReading.text}</p>
          {guidedReading.keyIdea ? (
            <div className="guidedKeyIdea"><b>Ideia-chave</b>{guidedReading.keyIdea}</div>
          ) : null}
        </div>
        {isEquationVisual ? (
          <figure className="guidedSupportImage">
            <img src="/equation-balance-support-v1.png" alt={guidedReading.imageAlt} />
            <figcaption>Os dois lados precisam manter o mesmo valor.</figcaption>
          </figure>
        ) : null}
      </div>

      {workedExample.problem ? (
        <div className="workedExampleCard">
          <div className="workedExampleCopy">
            <span className="guidedSectionLabel example">Exemplo resolvido</span>
            <h3>{workedExample.title}</h3>
            <div className="workedExampleProblem">{workedExample.problem}</div>
            <ol>
              {workedExample.steps.map((step, index) => (
                <li key={step}><b>{index + 1}</b><span>{step}</span></li>
              ))}
            </ol>
            <div className="workedExampleAnswer">
              <strong>{workedExample.answer}</strong>
              {workedExample.check ? <span>{workedExample.check}</span> : null}
            </div>
          </div>
          {isEquationVisual ? (
            <img
              aria-hidden="true"
              className="workedExampleStudent"
              src="/math-student-guide-v1.png"
              alt=""
            />
          ) : null}
        </div>
      ) : null}
    </section>
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
        {isMathRepresentation(representation) ? (
          <EquationVisual expression={representation} />
        ) : (
          <ObservationTextVisual text={representation} />
        )}
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
  const contextPrompt = studentTaskDataText(textValue(data.contextPrompt), 96);
  const values = stringList(data.availableValues)
    .map((value) => studentTaskDataText(value, 48))
    .filter(Boolean);
  const steps = stringList(data.constructionSteps)
    .map((value) => studentTaskDataText(value, 72))
    .filter(Boolean);
  const fields = stringList(data.fieldsToComplete)
    .map((value) => studentTaskDataText(value, 40))
    .filter((value) => value && normalize(value) !== "p/c");

  if (!contextPrompt || values.length === 0 || fields.length === 0) {
    return <InvalidTaskRenderer question={question} />;
  }

  return (
    <QuestionFrame question={question}>
      <div className="guidedExampleVisual dynamicTaskVisual">
        <strong>{contextPrompt}</strong>
        {values.slice(0, 3).map((value) => <span key={value}>{value}</span>)}
      </div>
      {steps.length > 0 ? (
        <div className="studentMiniSteps">
          {steps.slice(0, 2).map((step) => <span key={step}>{step}</span>)}
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
  const command = studentCommandText(question.command);
  const support = studentSupportText(question.support);

  return (
    <div>
      <p>{command}</p>
      {support ? <small>{support}</small> : null}
      {children}
    </div>
  );
}

function ObservationTextVisual({ text }: { text: string }): React.ReactElement {
  return (
    <div className="textObservationVisual" aria-label={text}>
      <span>{text}</span>
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

function isMathRepresentation(value: string): boolean {
  return /[=+\-×÷*/]|\b\d+\b/.test(value);
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

function StudentVisualResources({ items }: { items: string[] }): React.ReactElement | null {
  const visuals = items.filter(isFunctionalVisualResource).slice(0, 3);

  if (visuals.length === 0) {
    return null;
  }

  return (
    <section className="visualResourceGrid" aria-label="Recursos visuais da atividade">
      {visuals.map((item) => (
        <div className="visualResourceCard picture" aria-label={item} key={item}>
          <FunctionalVisualIcon label={item} />
          <span>{item}</span>
        </div>
      ))}
    </section>
  );
}

function FunctionalVisualIcon({ label }: { label: string }): React.ReactElement {
  const kind = normalize(label);

  if (kind.includes("tabela") || kind.includes("quadro")) {
    return (
      <svg className="svgVisual visualIconTable" viewBox="0 0 120 90" role="img" aria-label={label}>
        <rect x="18" y="18" width="84" height="54" rx="8" />
        <path d="M18 36 H102 M18 54 H102 M46 18 V72 M74 18 V72" />
      </svg>
    );
  }

  if (kind.includes("sequencia") || kind.includes("linha do tempo")) {
    return (
      <svg className="svgVisual visualIconSequence" viewBox="0 0 120 90" role="img" aria-label={label}>
        <path d="M20 45 H100" />
        <circle cx="28" cy="45" r="10" />
        <circle cx="60" cy="45" r="10" />
        <circle cx="92" cy="45" r="10" />
      </svg>
    );
  }

  if (kind.includes("balanca")) {
    return (
      <svg className="svgVisual visualIconBalance" viewBox="0 0 120 90" role="img" aria-label={label}>
        <path d="M60 18 V70 M34 34 H86" />
        <path d="M34 34 L22 58 H46 Z M86 34 L74 58 H98 Z" />
      </svg>
    );
  }

  return (
    <svg className="svgVisual visualIconCards" viewBox="0 0 120 90" role="img" aria-label={label}>
      <rect x="20" y="22" width="30" height="42" rx="6" />
      <rect x="45" y="18" width="30" height="42" rx="6" />
      <rect x="70" y="26" width="30" height="42" rx="6" />
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

function resolveRenderableStudentSheet(plan: StudentSheetPlan): ResolvedStudentSheet {
  const source = plan.studentSheet ?? {};
  const title = sanitizeStudentTitle(source.title ?? plan.worksheetTitle ?? "Atividade");
  const baseText = sanitizeLongStudentText(source.baseText ?? plan.baseText ?? "", 900);
  const normalizedSheetIdentity = normalize([
    plan.subject,
    title,
    source.context,
    baseText,
    JSON.stringify(source.questions ?? plan.questions ?? [])
  ].filter(Boolean).join(" "));
  const isEquationSheet = normalizedSheetIdentity.includes("equac") ||
    normalizedSheetIdentity.includes("valor de x") ||
    normalizedSheetIdentity.includes("descubra o valor de x");

  return {
    title,
    context: sanitizeStudentContext(source.context ?? plan.context ?? ""),
    instructions: sanitizeStudentList(source.instructions ?? plan.instructions ?? [], 4),
    baseText,
    guidedReading: resolveGuidedReading(
      source.guidedReading ?? plan.guidedReading,
      baseText,
      isEquationSheet
    ),
    workedExample: resolveWorkedExample(
      source.workedExample ?? plan.workedExample,
      isEquationSheet
    ),
    didacticBoxes: sanitizeSupportBoxes(source.didacticBoxes ?? plan.didacticBoxes ?? []),
    visualElements: sanitizeVisualElements(source.visualElements ?? plan.visualElements ?? []),
    tableRows: sanitizeTableRows(source.tableRows ?? plan.tableRows ?? []),
    questions: source.questions ?? plan.questions ?? []
  };
}

function resolveGuidedReading(
  value: RenderableStudentSheet["guidedReading"],
  baseText: string,
  isEquationSheet: boolean
): Required<NonNullable<RenderableStudentSheet["guidedReading"]>> {
  const defaultText = isEquationSheet
    ? "Uma equação é uma igualdade com um valor desconhecido. Pense nela como uma balança: os dois lados precisam representar a mesma quantidade. Para descobrir x, fazemos a mesma transformação nos dois lados e, no final, substituímos o valor encontrado para conferir."
    : baseText;

  return {
    title: sanitizeLongStudentText(
      value?.title ?? (isEquationSheet ? "Equação é uma balança em equilíbrio" : "Vamos compreender"),
      90
    ),
    text: sanitizeLongStudentText(value?.text ?? defaultText, 900),
    keyIdea: sanitizeLongStudentText(
      value?.keyIdea ?? (isEquationSheet
        ? "O sinal de igual mostra que o valor do lado esquerdo é o mesmo do lado direito."
        : ""),
      220
    ),
    imageKind: isEquationSheet ? "equation-balance" : normalize(value?.imageKind ?? ""),
    imageAlt: sanitizeLongStudentText(
      value?.imageAlt ?? (isEquationSheet
        ? "Balança em equilíbrio com uma caixa marcada com x e peças de contagem."
        : ""),
      180
    )
  };
}

function resolveWorkedExample(
  value: RenderableStudentSheet["workedExample"],
  isEquationSheet: boolean
): Required<NonNullable<RenderableStudentSheet["workedExample"]>> {
  const defaultSteps = isEquationSheet
    ? [
        "Retire 3 dos dois lados: 2x + 3 - 3 = 11 - 3.",
        "Simplifique a igualdade: 2x = 8.",
        "Divida os dois lados por 2: x = 4."
      ]
    : [];

  return {
    title: sanitizeLongStudentText(
      value?.title ?? (isEquationSheet ? "Vamos resolver juntos" : ""),
      90
    ),
    problem: sanitizeLongStudentText(
      value?.problem ?? (isEquationSheet ? "Resolva: 2x + 3 = 11" : ""),
      180
    ),
    steps: sanitizeStudentList(value?.steps ?? defaultSteps, 5),
    answer: sanitizeLongStudentText(
      value?.answer ?? (isEquationSheet ? "Resposta: x = 4" : ""),
      140
    ),
    check: sanitizeLongStudentText(
      value?.check ?? (isEquationSheet
        ? "Conferindo: 2 × 4 + 3 = 8 + 3 = 11. A igualdade está correta."
        : ""),
      220
    )
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

function sanitizeStudentTitle(value: string): string {
  const firstPart = value.split(":")[0]?.trim() ?? value.trim();
  const title = firstPart || "Atividade";

  if (!isStudentTitleValid(title)) {
    return "Atividade";
  }

  return title.length > 60 ? `${title.slice(0, 57).trimEnd()}...` : title;
}

function isStudentTitleValid(value: string): boolean {
  const comparable = normalize(value);

  if (!value || value.length > 90) {
    return false;
  }

  return !internalTextPatterns().some((pattern) => comparable.includes(pattern));
}

function sanitizeStudentContext(value: string): string {
  const text = value.trim();

  if (!text || text.length > 150 || isInternalText(text)) {
    return "";
  }

  return text;
}

function sanitizeLongStudentText(value: string, maxLength: number): string {
  const text = value.trim().replace(/\s+/g, " ");

  if (!text || isInternalText(text)) {
    return "";
  }

  return text.length > maxLength
    ? `${text.slice(0, maxLength - 3).trimEnd()}...`
    : text;
}

function sanitizeStudentList(values: string[], limit: number): string[] {
  return uniqueValues(values)
    .map((value) => value.trim())
    .filter((value) => value && !isInternalText(value) && value.length <= 120)
    .slice(0, limit);
}

function sanitizeSupportBoxes(values: string[]): string[] {
  return sanitizeStudentList(values, 4)
    .filter((value) => /lembrete|banco|exemplo|pista|dica|palavra|observe/i.test(value));
}

function sanitizeVisualElements(values: string[]): string[] {
  return uniqueValues(values)
    .filter(isFunctionalVisualResource)
    .slice(0, 3);
}

function sanitizeTableRows(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter((value) => value && !isInternalText(value))
    .filter((value) => !/\b(FOCO|ESCOPO|EVIDENCIA|OBSERVE|MATCH|CLASSIFY|COMPLETE|CONNECT|CREATE_GUIDED_EXAMPLE)\b/i.test(value))
    .slice(0, 3);
}

function supportBoxLabel(value: string): string {
  const [label] = value.split(":");
  const normalized = normalize(label ?? "");

  if (normalized.includes("banco")) return "Banco de palavras";
  if (normalized.includes("exemplo")) return "Exemplo";
  if (normalized.includes("pista")) return "Pista";
  if (normalized.includes("dica")) return "Dica";

  return "Lembrete";
}

function supportBoxText(value: string): string {
  const [, ...rest] = value.split(":");
  const text = rest.join(":").trim();

  return text || value;
}

function studentCommandText(value: string): string {
  const text = value.trim();
  const comparable = normalize(text);

  if (comparable.includes("observe o recurso visual sobre")) {
    return "Observe o recurso visual e responda a pergunta.";
  }

  if (comparable.includes("pareie cada representacao")) {
    return "Ligue cada item ao seu significado.";
  }

  if (comparable.includes("crie um exemplo simples de")) {
    return "Crie um exemplo simples seguindo o modelo.";
  }

  if (text.length > 130) {
    return `${text.slice(0, 120).trimEnd()}...`;
  }

  return text;
}

function studentSupportText(value?: string): string {
  const text = value?.trim() ?? "";

  if (!text || isInternalText(text) || /instrucoes curtas|passos numerados/i.test(text)) {
    return "";
  }

  const visualSupport = /balan[cç]a|blocos?|caixas?|pictograma|reta num[eé]rica|apoio visual/i.test(text);
  const cleaned = text.replace(/\s*;\s*/g, " e ").replace(/\.$/, "");
  const editorialText = visualSupport && !/^apoio visual\s*:/i.test(cleaned)
    ? `Apoio visual: ${cleaned}.`
    : text;

  return editorialText.length > 110
    ? `${editorialText.slice(0, 105).trimEnd()}...`
    : editorialText;
}

function studentTaskDataText(value: string, maxLength: number): string {
  const text = value.trim();

  if (!text || isInternalText(text) || /instrucoes curtas|instruções curtas|passos numerados/i.test(text)) {
    return "";
  }

  const deduplicated = removeRepeatedSegment(text);

  return deduplicated.length > maxLength ? `${deduplicated.slice(0, maxLength - 3).trimEnd()}...` : deduplicated;
}

function removeRepeatedSegment(value: string): string {
  const halves = value.split(":").map((part) => part.trim()).filter(Boolean);
  const first = halves[0];
  const second = halves[1];

  if (first && second && normalize(first) === normalize(second)) {
    return first;
  }

  return value;
}

function isFunctionalVisualResource(value: string): boolean {
  const comparable = normalize(value);

  if (
    !comparable ||
    comparable.includes("generico") ||
    comparable.includes("placeholder") ||
    comparable.includes("representar conceitos abstratos") ||
    comparable.includes("usar visual") ||
    comparable.includes("boa separacao visual") ||
    comparable === "organizador visual" ||
    comparable === "quadro de apoio visual" ||
    comparable === "apoio visual funcional"
  ) {
    return false;
  }

  return [
    "banco de palavras",
    "quadro",
    "tabela",
    "sequencia",
    "linha do tempo",
    "mapa",
    "balanca",
    "blocos",
    "cartoes",
    "pictogramas",
    "organizador",
    "exemplo"
  ].some((term) => comparable.includes(term));
}

function isInternalText(value: string): boolean {
  const comparable = normalize(value);

  return internalTextPatterns().some((pattern) => comparable.includes(pattern));
}

function internalTextPatterns(): string[] {
  return [
    "essa combinacao trabalha",
    "demonstrar aprendizagem",
    "objetivo curricular",
    "habilidade",
    "expectativa de aprendizagem",
    "capacidade do estudante",
    "progressao esperada",
    "evidencia esperada",
    "a folha utiliza",
    "para promover",
    "foco da folha",
    "foco | escopo",
    "assessment",
    "pedagogical",
    "blueprint",
    "actiontype",
    "plannedtask",
    "classify",
    "match",
    "connect",
    "complete",
    "create_guided_example"
  ];
}

function uniqueValues(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index);
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
