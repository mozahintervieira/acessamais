"use client";

import { useState } from "react";
import type { CreateMissionRequest } from "@acessa-plus/types";

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
  decision: {
    stages: Record<string, string[]>;
    warnings: string[];
  };
  pedagogicalPlan: {
    objectives: string[];
    expectedOutputs: string[];
    methodologicalConstraints: string[];
    validationCriteria: string[];
    warnings: string[];
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
  const [result, setResult] = useState<MissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitMission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const request: CreateMissionRequest = {
      userId: "demo-teacher",
      organizationId: "demo-organization",
      missionType: "CREATE_LESSON_PLAN",
      input: {
        ...form,
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
        throw new Error("Nao foi possivel executar a missao.");
      }

      setResult((await response.json()) as MissionResult);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro inesperado ao executar a missao."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField(field: keyof FormState, value: string): void {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  return (
    <main className="missionShell">
      <section className="missionIntro">
        <p className="eyebrow">Nova missao</p>
        <h1>Criar planejamento inclusivo</h1>
        <p className="lead">
          Informe os dados que voce ja conhece sobre a aula e sobre a forma de
          aprendizagem do estudante. O ACESSA+ organiza a missao sem exigir
          prompt engineering.
        </p>
      </section>

      <section className="missionLayout">
        <form className="guidedForm" onSubmit={submitMission}>
          <FormSection
            title="1. Contexto pedagogico"
            description="Dados curriculares que preservam a intencao da aula."
          >
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
              label="Objeto de conhecimento"
              value={form.knowledgeObject}
              onChange={(value) => updateField("knowledgeObject", value)}
            />
            <Field
              label="Tema"
              value={form.theme}
              onChange={(value) => updateField("theme", value)}
            />
            <TextArea
              label="Habilidade"
              value={form.skill}
              onChange={(value) => updateField("skill", value)}
            />
          </FormSection>

          <FormSection
            title="2. Objetivo da aula"
            description="O que o estudante deve aprender ou demonstrar ao final."
          >
            <TextArea
              label="Objetivo da aula"
              value={form.lessonObjective}
              onChange={(value) => updateField("lessonObjective", value)}
            />
          </FormSection>

          <FormSection
            title="3. Acessibilidade e restricoes"
            description="Informacoes pedagogicas para personalizacao sem criar perfil medico."
          >
            <Field
              label="Deficiencia/necessidade especifica"
              value={form.specificNeed}
              onChange={(value) => updateField("specificNeed", value)}
            />
            <Field
              label="Nivel de leitura/escrita"
              value={form.readingWritingLevel}
              onChange={(value) => updateField("readingWritingLevel", value)}
            />
            <TextArea
              label="Como o estudante aprende melhor"
              value={form.learningPreference}
              onChange={(value) => updateField("learningPreference", value)}
            />
          </FormSection>

          <FormSection
            title="4. Produto esperado"
            description="Recursos disponiveis e formato que o professor precisa receber."
          >
            <Field
              label="Recursos disponiveis"
              value={form.availableResources}
              onChange={(value) => updateField("availableResources", value)}
            />
            <Field
              label="Tipo de produto esperado"
              value={form.expectedProductType}
              onChange={(value) => updateField("expectedProductType", value)}
            />
          </FormSection>

          <button className="primaryButton" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Executando missao..." : "Gerar planejamento"}
          </button>

          {error ? <p className="formError">{error}</p> : null}
        </form>

        <MissionResultPanel result={result} />
      </section>
    </main>
  );
}

function FormSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <fieldset className="formSection">
      <legend>{title}</legend>
      <p>{description}</p>
      <div className="sectionGrid">{children}</div>
    </fieldset>
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
        rows={3}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function MissionResultPanel({
  result
}: {
  result: MissionResult | null;
}): React.ReactElement {
  if (!result) {
    return (
      <aside className="resultPanel">
        <p className="panelLabel">Previa da missao</p>
        <h2>Resultado estruturado</h2>
        <p className="emptyState">
          O planejamento aparecera aqui apos a execucao. Ele tambem sera salvo
          como Resource e ResourceVersion para revisao e reutilizacao.
        </p>
      </aside>
    );
  }

  return (
    <aside className="resultPanel" aria-live="polite">
      <p className="resultStatus">Missao {result.status}</p>
      <h2>Plano estruturado</h2>
      <a className="textLink" href={`/missions/${result.missionId}`}>
        Abrir missao salva
      </a>

      <ResultBlock title="Contexto">
        <p>Completude: {result.context.completeness}</p>
        <List items={result.context.detectedSignals} />
      </ResultBlock>

      <ResultBlock title="Objetivo">
        <List items={result.pedagogicalPlan.objectives} />
      </ResultBlock>

      <ResultBlock title="Restricoes">
        <List items={result.pedagogicalPlan.methodologicalConstraints} />
      </ResultBlock>

      <ResultBlock title="Produto esperado">
        <List items={result.pedagogicalPlan.expectedOutputs} />
      </ResultBlock>

      <ResultBlock title="Validacao">
        <List items={result.pedagogicalPlan.validationCriteria} />
      </ResultBlock>

      <ResultBlock title="Conhecimentos aplicados">
        <List
          items={result.pedagogicalPlan.protocolApplications.map(
            (application) =>
              `${application.knowledgeId}@${application.knowledgeVersion} (${application.knowledgeType})`
          )}
        />
      </ResultBlock>
    </aside>
  );
}

function ResultBlock({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="resultBlock">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }): React.ReactElement {
  if (items.length === 0) {
    return <p>Nenhum item registrado.</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
