"use client";

import { useState } from "react";
import type { CreateMissionRequest, MissionType } from "@acessa-plus/types";

type TaskKey = "lesson" | "activity" | "report";
type StepKey = "essentials" | "learning" | "output";

type MissionResult = {
  missionId: string;
  resourceId: string;
  versionId: string;
  status: "COMPLETED" | "NEEDS_REVIEW";
  context: {
    completeness: string;
    detectedSignals: string[];
    missingFields: string[];
  };
  pedagogicalPlan: {
    objectives: string[];
    expectedOutputs: string[];
    methodologicalConstraints: string[];
    validationCriteria: string[];
    warnings: string[];
    lessonFlow?: string[];
    adaptedActivities?: string[];
    accessibilitySupports?: string[];
    assessment?: string[];
    teacherReport?: string[];
    reuseSuggestions?: string[];
    protocolApplications: Array<{
      knowledgeId: string;
      knowledgeVersion: string;
      knowledgeType: string;
    }>;
  };
};

type FormState = {
  discipline: string;
  gradeYear: string;
  skill: string;
  knowledgeObject: string;
  theme: string;
  lessonObjective: string;
  specificNeed: string;
  learningPreference: string;
  readingWritingLevel: string;
  availableResources: string;
  expectedProductType: string;
};

const taskOptions: Array<{
  key: TaskKey;
  title: string;
  label: string;
  description: string;
  product: string;
  missionType: MissionType;
}> = [
  {
    key: "lesson",
    label: "Planejamento",
    title: "Plano de aula inclusivo",
    description: "Para sair com objetivo, percurso, acessibilidade e avaliacao.",
    product: "Plano de aula inclusivo",
    missionType: "CREATE_LESSON_PLAN"
  },
  {
    key: "activity",
    label: "Atividade",
    title: "Atividade adaptada",
    description: "Para gerar comandos, apoios, recursos e evidencias de aprendizagem.",
    product: "Atividade adaptada com orientacoes ao professor",
    missionType: "ADAPT_ACTIVITY"
  },
  {
    key: "report",
    label: "Relatorio",
    title: "Relatorio pedagogico de apoio",
    description: "Para registrar objetivos, apoios utilizados e criterios de acompanhamento.",
    product: "Relatorio pedagogico com plano de acompanhamento",
    missionType: "CREATE_LESSON_PLAN"
  }
];

const steps: Array<{ key: StepKey; title: string; description: string }> = [
  {
    key: "essentials",
    title: "1. Essencial",
    description: "O minimo para entender a tarefa."
  },
  {
    key: "learning",
    title: "2. Aprendizagem",
    description: "Como tornar o material acessivel."
  },
  {
    key: "output",
    title: "3. Documento",
    description: "O que sera entregue ao professor."
  }
];

const initialState: FormState = {
  discipline: "Lingua Portuguesa",
  gradeYear: "5 ano",
  skill: "Identificar informacoes explicitas em textos.",
  knowledgeObject: "Leitura e interpretacao",
  theme: "Genero textual noticia",
  lessonObjective: "Compreender a estrutura de uma noticia.",
  specificNeed: "Deficiencia intelectual",
  learningPreference: "Aprende melhor com imagens, exemplos concretos e comandos curtos.",
  readingWritingLevel: "Le frases curtas com apoio visual.",
  availableResources: "cartazes, tablet, imagens impressas",
  expectedProductType: "Plano de aula inclusivo"
};

export function LessonPlanMissionForm(): React.ReactElement {
  const [form, setForm] = useState<FormState>(initialState);
  const [selectedTask, setSelectedTask] = useState<TaskKey>("lesson");
  const [activeStep, setActiveStep] = useState<StepKey>("essentials");
  const [result, setResult] = useState<MissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const task =
    taskOptions.find((option) => option.key === selectedTask) ?? taskOptions[0]!;

  async function submitMission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const request: CreateMissionRequest = {
      userId: "demo-teacher",
      organizationId: "demo-organization",
      missionType: task.missionType,
      input: {
        ...form,
        expectedProductType: task.product,
        contextNotes: `Tarefa escolhida: ${task.title}`,
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

        throw new Error(payload?.message ?? "Nao foi possivel gerar o documento.");
      }

      setResult((await response.json()) as MissionResult);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro inesperado ao gerar documento."
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
        expectedProductType: option.product
      }));
    }
  }

  function updateField(field: keyof FormState, value: string): void {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  return (
    <main className="missionShell creatorShell">
      <section className="missionIntro creatorIntro">
        <p className="eyebrow">Estudio pedagogico</p>
        <h1>O que deseja criar hoje?</h1>
        <p className="lead">
          Escolha a tarefa, informe o essencial e receba um documento
          profissional para revisar, salvar e reutilizar.
        </p>
      </section>

      <section className="creatorLayout">
        <form className="creatorPanel" onSubmit={submitMission}>
          <section className="taskChooser" aria-label="Escolha da tarefa">
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
                <small>{option.description}</small>
              </button>
            ))}
          </section>

          <nav className="stepNav" aria-label="Etapas do documento">
            {steps.map((step) => (
              <button
                className={step.key === activeStep ? "stepPill active" : "stepPill"}
                key={step.key}
                type="button"
                onClick={() => setActiveStep(step.key)}
              >
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </button>
            ))}
          </nav>

          <section className="formStage">
            {activeStep === "essentials" ? (
              <>
                <Field
                  label="Disciplina"
                  value={form.discipline}
                  onChange={(value) => updateField("discipline", value)}
                />
                <Field
                  label="Serie/ano"
                  value={form.gradeYear}
                  onChange={(value) => updateField("gradeYear", value)}
                />
                <Field
                  label="Tema da aula ou material"
                  value={form.theme}
                  onChange={(value) => updateField("theme", value)}
                />
                <Field
                  label="Necessidade pedagogica"
                  value={form.specificNeed}
                  onChange={(value) => updateField("specificNeed", value)}
                />
              </>
            ) : null}

            {activeStep === "learning" ? (
              <>
                <TextArea
                  label="Objetivo de aprendizagem"
                  value={form.lessonObjective}
                  onChange={(value) => updateField("lessonObjective", value)}
                />
                <TextArea
                  label="Como o estudante aprende melhor"
                  value={form.learningPreference}
                  onChange={(value) => updateField("learningPreference", value)}
                />
                <Field
                  label="Nivel de leitura/escrita"
                  value={form.readingWritingLevel}
                  onChange={(value) => updateField("readingWritingLevel", value)}
                />
              </>
            ) : null}

            {activeStep === "output" ? (
              <>
                <TextArea
                  label="Habilidade ou descritor"
                  value={form.skill}
                  onChange={(value) => updateField("skill", value)}
                />
                <Field
                  label="Objeto de conhecimento"
                  value={form.knowledgeObject}
                  onChange={(value) => updateField("knowledgeObject", value)}
                />
                <Field
                  label="Recursos disponiveis"
                  value={form.availableResources}
                  onChange={(value) => updateField("availableResources", value)}
                />
              </>
            ) : null}
          </section>

          <div className="formCommandBar">
            <div>
              <span>Entrega selecionada</span>
              <strong>{task.product}</strong>
            </div>
            <button className="primaryButton" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Gerando documento..." : "Gerar documento"}
            </button>
          </div>

          {error ? <p className="formError">{error}</p> : null}
        </form>

        <MissionResultPanel form={form} result={result} taskTitle={task.title} />
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
      <input
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
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
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function MissionResultPanel({
  form,
  result,
  taskTitle
}: {
  form: FormState;
  result: MissionResult | null;
  taskTitle: string;
}): React.ReactElement {
  if (!result) {
    return (
      <aside className="documentPreview emptyDocument">
        <div className="documentToolbar">
          <span>Previa do documento</span>
          <b>Rascunho</b>
        </div>
        <article className="documentPaper">
          <p className="documentKicker">ACESSA+</p>
          <h2>{taskTitle}</h2>
          <div className="documentMeta">
            <span>{form.discipline}</span>
            <span>{form.gradeYear}</span>
            <span>{form.specificNeed}</span>
          </div>
          <p>
            Ao gerar, o documento aparecera aqui com estrutura profissional,
            secoes pedagogicas e link para revisao da versao salva.
          </p>
        </article>
      </aside>
    );
  }

  const plan = result.pedagogicalPlan;

  return (
    <aside className="documentPreview" aria-live="polite">
      <div className="documentToolbar">
        <span>Documento gerado</span>
        <b>{result.status}</b>
      </div>
      <article className="documentPaper">
        <p className="documentKicker">ACESSA+ | Inteligencia Inclusiva</p>
        <h2>{taskTitle}</h2>
        <div className="documentMeta">
          <span>{form.discipline}</span>
          <span>{form.gradeYear}</span>
          <span>{form.specificNeed}</span>
        </div>

        <DocumentSection title="Objetivo" items={plan.objectives} />
        <DocumentSection title="Percurso da aula" items={plan.lessonFlow ?? []} />
        <DocumentSection
          title="Atividades e adaptacoes"
          items={plan.adaptedActivities ?? []}
        />
        <DocumentSection
          title="Apoios de acessibilidade"
          items={plan.accessibilitySupports ?? []}
        />
        <DocumentSection title="Avaliacao" items={plan.assessment ?? []} />
        <DocumentSection
          title="Relatorio ao professor"
          items={plan.teacherReport ?? []}
        />
        <DocumentSection
          title="Criterios de validacao"
          items={plan.validationCriteria}
        />

        <footer className="documentFooter">
          <a className="primaryLink" href={`/missions/${result.missionId}`}>
            Abrir editor do documento
          </a>
          <span>ResourceVersion salva: {result.versionId.slice(0, 18)}</span>
        </footer>
      </article>
    </aside>
  );
}

function DocumentSection({
  title,
  items
}: {
  title: string;
  items: string[];
}): React.ReactElement {
  if (items.length === 0) {
    return (
      <section className="documentSection">
        <h3>{title}</h3>
        <p>Secao pronta para revisao do professor.</p>
      </section>
    );
  }

  return (
    <section className="documentSection">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
