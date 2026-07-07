"use client";

import { useEffect, useMemo, useState } from "react";
import type { CreateMissionRequest, MissionType } from "@acessa-plus/types";

type TaskKey =
  | "printable"
  | "adapted"
  | "assessment"
  | "sequence"
  | "lesson"
  | "pei"
  | "report"
  | "game"
  | "caa"
  | "libras"
  | "braille";

type StepKey = "curriculum" | "activity" | "accessibility";

type WorksheetQuestion = {
  command: string;
  support?: string;
  answerSpace?: string;
};

type MissionResult = {
  missionId: string;
  resourceId: string;
  versionId: string;
  status: "COMPLETED" | "NEEDS_REVIEW";
  pedagogicalPlan: {
    worksheetTitle?: string;
    skillCode?: string;
    baseText?: string;
    instructions?: string[];
    questions?: WorksheetQuestion[];
    visualElements?: string[];
    adaptationNotes?: string[];
    answerKey?: string[];
    validationCriteria: string[];
  };
};

type FormState = {
  discipline: string;
  gradeYear: string;
  skill: string;
  knowledgeObject: string;
  theme: string;
  lessonObjective: string;
  activityType: string;
  questionCount: string;
  difficultyLevel: string;
  specificNeed: string;
  readingWritingLevel: string;
  learningPreference: string;
  availableResources: string;
  outputFormat: string;
};

const taskOptions: Array<{
  key: TaskKey;
  title: string;
  label: string;
  product: string;
  missionType: MissionType;
}> = [
  {
    key: "printable",
    label: "Principal",
    title: "Atividade pronta para impressao",
    product: "Atividade A4 pronta para impressao",
    missionType: "CREATE_LESSON_PLAN"
  },
  {
    key: "adapted",
    label: "Inclusao",
    title: "Atividade adaptada",
    product: "Atividade A4 adaptada",
    missionType: "ADAPT_ACTIVITY"
  },
  {
    key: "assessment",
    label: "Avaliacao",
    title: "Avaliacao",
    product: "Avaliacao A4 pronta para impressao",
    missionType: "CREATE_LESSON_PLAN"
  },
  {
    key: "sequence",
    label: "Sequencia",
    title: "Sequencia didatica",
    product: "Sequencia didatica com atividades A4",
    missionType: "CREATE_LESSON_PLAN"
  },
  {
    key: "lesson",
    label: "Apoio",
    title: "Plano de aula",
    product: "Plano de aula com atividade A4",
    missionType: "CREATE_LESSON_PLAN"
  },
  {
    key: "pei",
    label: "AEE",
    title: "PEI",
    product: "PEI com recurso pedagogico",
    missionType: "CREATE_LESSON_PLAN"
  },
  {
    key: "report",
    label: "Registro",
    title: "Relatorio pedagogico",
    product: "Relatorio pedagogico",
    missionType: "CREATE_LESSON_PLAN"
  },
  {
    key: "game",
    label: "Ludico",
    title: "Jogo pedagogico",
    product: "Jogo pedagogico imprimivel",
    missionType: "CREATE_LESSON_PLAN"
  },
  {
    key: "caa",
    label: "CAA",
    title: "CAA",
    product: "Atividade com CAA",
    missionType: "ADAPT_ACTIVITY"
  },
  {
    key: "libras",
    label: "Libras",
    title: "Material em Libras",
    product: "Material com apoio em Libras",
    missionType: "ADAPT_ACTIVITY"
  },
  {
    key: "braille",
    label: "Braille",
    title: "Material em Braille",
    product: "Material preparado para Braille",
    missionType: "ADAPT_ACTIVITY"
  }
];

const steps: Array<{ key: StepKey; title: string }> = [
  { key: "curriculum", title: "1. Curriculo" },
  { key: "activity", title: "2. Atividade" },
  { key: "accessibility", title: "3. Acessibilidade" }
];

const initialState: FormState = {
  discipline: "Lingua Portuguesa",
  gradeYear: "5 ano",
  skill: "EF15LP03 - Localizar informacoes explicitas em textos.",
  knowledgeObject: "Leitura e interpretacao",
  theme: "Genero textual noticia",
  lessonObjective: "Identificar informacoes explicitas em uma noticia curta.",
  activityType: "Interpretacao de texto com questoes objetivas e discursivas",
  questionCount: "6",
  difficultyLevel: "Intermediario",
  specificNeed: "Deficiencia intelectual",
  readingWritingLevel: "Le frases curtas com apoio visual.",
  learningPreference: "Aprende melhor com imagens, exemplos concretos e comandos curtos.",
  availableResources: "imagens impressas, lapis de cor, tablet",
  outputFormat: "A4 pronto para impressao"
};

export function LessonPlanMissionForm(): React.ReactElement {
  const [form, setForm] = useState<FormState>(initialState);
  const [selectedTask, setSelectedTask] = useState<TaskKey>("printable");
  const [activeStep, setActiveStep] = useState<StepKey>("curriculum");
  const [result, setResult] = useState<MissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const task = useMemo(
    () => taskOptions.find((option) => option.key === selectedTask) ?? taskOptions[0]!,
    [selectedTask]
  );

  useEffect(() => {
    const taskParam = new URLSearchParams(window.location.search).get("task");

    if (isTaskKey(taskParam)) {
      selectTask(taskParam);
    }
  }, []);

  async function submitMission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setCopyMessage(null);

    const request: CreateMissionRequest = {
      userId: "demo-teacher",
      organizationId: "demo-organization",
      missionType: task.missionType,
      input: {
        ...form,
        expectedProductType: task.product,
        contextNotes: `Criar ${task.title} no formato ${form.outputFormat}.`,
        availableResources: form.availableResources
          .split(",")
          .map((resource) => resource.trim())
          .filter(Boolean)
      }
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "/api"}/missions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(request)
        }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        throw new Error(payload?.message ?? "Nao foi possivel gerar a atividade.");
      }

      setResult((await response.json()) as MissionResult);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro inesperado ao gerar atividade."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectTask(nextTask: TaskKey): void {
    const option = taskOptions.find((item) => item.key === nextTask);

    setSelectedTask(nextTask);
    if (option) {
      setForm((current) => ({
        ...current,
        expectedProductType: option.product,
        outputFormat: "A4 pronto para impressao"
      }));
    }
  }

  function updateField(field: keyof FormState, value: string): void {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function copyActivity(): Promise<void> {
    const text = result ? buildCopyText(form, result) : "";

    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopyMessage("Atividade copiada.");
  }

  function downloadWord(): void {
    const text = result ? buildCopyText(form, result) : "";
    const blob = new Blob([text], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "atividade-acessa-plus.doc";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="missionShell creatorShell">
      <section className="missionIntro creatorIntro">
        <p className="eyebrow">Criador de material pedagogico</p>
        <h1>Crie atividades prontas para impressao em segundos.</h1>
        <p className="lead">
          Da habilidade curricular a atividade A4 pronta para sala de aula.
          Planeje menos. Ensine mais.
        </p>
      </section>

      <section className="creatorLayout">
        <form className="creatorPanel" onSubmit={submitMission}>
          <section className="taskChooser taskChooserMany" aria-label="Tipo de material">
            {taskOptions.map((option) => (
              <button
                className={
                  option.key === selectedTask ? "taskChoice active" : "taskChoice"
                }
                key={option.key}
                type="button"
                onClick={() => selectTask(option.key)}
              >
                <span>{option.label}</span>
                <strong>{option.title}</strong>
              </button>
            ))}
          </section>

          <nav className="stepNav" aria-label="Etapas da atividade">
            {steps.map((step) => (
              <button
                className={step.key === activeStep ? "stepPill active" : "stepPill"}
                key={step.key}
                type="button"
                onClick={() => setActiveStep(step.key)}
              >
                <strong>{step.title}</strong>
              </button>
            ))}
          </nav>

          <section className="formStage">
            {activeStep === "curriculum" ? (
              <>
                <Field label="Disciplina" value={form.discipline} onChange={(value) => updateField("discipline", value)} />
                <Field label="Ano/serie" value={form.gradeYear} onChange={(value) => updateField("gradeYear", value)} />
                <TextArea label="Habilidade BNCC ou curriculo" value={form.skill} onChange={(value) => updateField("skill", value)} />
                <Field label="Objeto de conhecimento" value={form.knowledgeObject} onChange={(value) => updateField("knowledgeObject", value)} />
                <Field label="Tema/conteudo" value={form.theme} onChange={(value) => updateField("theme", value)} />
              </>
            ) : null}

            {activeStep === "activity" ? (
              <>
                <TextArea label="Objetivo da atividade" value={form.lessonObjective} onChange={(value) => updateField("lessonObjective", value)} />
                <Field label="Tipo de atividade desejada" value={form.activityType} onChange={(value) => updateField("activityType", value)} />
                <Field label="Quantidade de questoes" value={form.questionCount} onChange={(value) => updateField("questionCount", value)} />
                <Field label="Nivel de dificuldade" value={form.difficultyLevel} onChange={(value) => updateField("difficultyLevel", value)} />
                <Field label="Formato de saida" value={form.outputFormat} onChange={(value) => updateField("outputFormat", value)} />
              </>
            ) : null}

            {activeStep === "accessibility" ? (
              <>
                <Field label="Necessidade especifica/deficiencia" value={form.specificNeed} onChange={(value) => updateField("specificNeed", value)} />
                <Field label="Nivel de leitura/escrita do estudante" value={form.readingWritingLevel} onChange={(value) => updateField("readingWritingLevel", value)} />
                <TextArea label="Como o estudante aprende melhor" value={form.learningPreference} onChange={(value) => updateField("learningPreference", value)} />
                <Field label="Recursos disponiveis" value={form.availableResources} onChange={(value) => updateField("availableResources", value)} />
              </>
            ) : null}
          </section>

          <div className="formCommandBar">
            <div>
              <span>Material selecionado</span>
              <strong>{task.product}</strong>
            </div>
            <button className="primaryButton" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Gerando atividade..." : "Gerar atividade A4"}
            </button>
          </div>

          {error ? <p className="formError">{error}</p> : null}
        </form>

        <A4Preview
          form={form}
          result={result}
          taskTitle={task.title}
          onCopy={copyActivity}
          onPrint={() => window.print()}
          onWord={downloadWord}
          copyMessage={copyMessage}
        />
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): React.ReactElement {
  return (
    <label className="field">
      <span>{label}</span>
      <input required value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): React.ReactElement {
  return (
    <label className="field fieldWide">
      <span>{label}</span>
      <textarea required rows={4} value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

function A4Preview({
  form,
  result,
  taskTitle,
  onCopy,
  onPrint,
  onWord,
  copyMessage
}: {
  form: FormState;
  result: MissionResult | null;
  taskTitle: string;
  onCopy: () => void;
  onPrint: () => void;
  onWord: () => void;
  copyMessage: string | null;
}): React.ReactElement {
  const worksheet = result?.pedagogicalPlan;
  const questions = worksheet?.questions ?? buildPreviewQuestions(form.questionCount);

  return (
    <aside className="a4Workspace" aria-live="polite">
      <div className="exportBar">
        <button type="button" onClick={onPrint}>PDF/imprimir</button>
        <button type="button" onClick={onWord} disabled={!result}>Word</button>
        <button type="button" onClick={onPrint}>Imagem A4</button>
        <button type="button" onClick={onCopy} disabled={!result}>Copiar</button>
        <a className="saveButton" href={result ? `/missions/${result.missionId}` : "/missions"}>Salvar</a>
      </div>
      {copyMessage ? <p className="successMessage">{copyMessage}</p> : null}

      <article className="a4Sheet">
        <header className="a4Header">
          <strong>{form.discipline}</strong>
          <span>{worksheet?.skillCode ?? form.skill}</span>
        </header>
        <h2>{worksheet?.worksheetTitle ?? taskTitle}</h2>
        <p className="a4Instruction">
          {(worksheet?.instructions ?? [
            "Leia com atencao e responda no espaco indicado.",
            "Use apoio visual, concreto ou leitura mediada quando necessario."
          ]).join(" ")}
        </p>
        {worksheet?.baseText ? (
          <section className="baseText">
            <strong>Texto-base</strong>
            <p>{worksheet.baseText}</p>
          </section>
        ) : null}
        {(worksheet?.visualElements ?? []).length > 0 ? (
          <div className="visualRow">
            {(worksheet?.visualElements ?? []).slice(0, 3).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
        <ol className="questionList">
          {questions.map((question, index) => (
            <li key={`${question.command}-${index}`}>
              <p>{question.command}</p>
              {question.support ? <small>{question.support}</small> : null}
              <div className="answerLines" aria-hidden="true">
                <span />
                <span />
              </div>
            </li>
          ))}
        </ol>
        {(worksheet?.adaptationNotes ?? []).length > 0 ? (
          <section className="adaptationBox">
            <strong>Adaptacao aplicada</strong>
            <ul>
              {(worksheet?.adaptationNotes ?? []).map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <footer>acessa+ | educacao inclusiva na pratica - @mozahintervieira</footer>
      </article>
    </aside>
  );
}

function buildPreviewQuestions(questionCount: string): WorksheetQuestion[] {
  const count = Math.min(Math.max(Number.parseInt(questionCount, 10) || 4, 1), 10);

  return Array.from({ length: count }, (_, index) => ({
    command: `${index + 1}. Questao ${index + 1} aparecera aqui apos a geracao.`,
    support: "Espaco reservado para resposta do estudante."
  }));
}

function buildCopyText(form: FormState, result: MissionResult): string {
  const worksheet = result.pedagogicalPlan;
  const questions = worksheet.questions ?? [];

  return [
    form.discipline,
    worksheet.skillCode ?? form.skill,
    worksheet.worksheetTitle ?? "Atividade A4",
    worksheet.baseText ? `Texto-base: ${worksheet.baseText}` : "",
    ...questions.map((question, index) => `${index + 1}. ${question.command}`),
    "acessa+ | educacao inclusiva na pratica - @mozahintervieira"
  ]
    .filter(Boolean)
    .join("\n\n");
}

function isTaskKey(value: string | null): value is TaskKey {
  return taskOptions.some((option) => option.key === value);
}
