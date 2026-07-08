"use client";

import { useEffect, useState } from "react";
import {
  getLocalMission,
  saveLocalResourceVersion,
  type LocalContentJson
} from "../../demo-local-store";
import { VisualResourceGrid } from "../../visual-resource-grid";

type MissionDetail = {
  id: string;
  missionType: string;
  status: string;
  input: Record<string, unknown>;
  createdAt: string;
  resources: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    versions: Array<{
      id: string;
      versionNumber: number;
      contentJson: {
        studentSheet?: StudentSheet;
        teacherGuide?: TeacherGuide;
        objectives?: string[];
        expectedOutputs?: string[];
        methodologicalConstraints?: string[];
        validationCriteria?: string[];
        lessonFlow?: string[];
        adaptedActivities?: string[];
        accessibilitySupports?: string[];
        assessment?: string[];
        teacherReport?: string[];
        reuseSuggestions?: string[];
        worksheetTitle?: string;
        skillCode?: string;
        baseText?: string;
        instructions?: string[];
        questions?: Array<{
          command: string;
          support?: string;
          answerSpace?: string;
        }>;
        visualElements?: string[];
        adaptationNotes?: string[];
      };
      contentText: string;
      validationStatus: string;
      createdAt: string;
    }>;
  }>;
};

const organizationId = "demo-organization";

type StudentSheet = {
  title?: string;
  context?: string;
  instructions?: string[];
  baseText?: string;
  didacticBoxes?: string[];
  visualElements?: string[];
  tableRows?: string[];
  questions?: Array<{
    command: string;
    support?: string;
    answerSpace?: string;
  }>;
};

type TeacherGuide = {
  skillCode?: string;
  knowledgeObject?: string;
  objectives?: string[];
  methodology?: string[];
  adaptations?: string[];
  duaPrinciples?: string[];
  assessmentCriteria?: string[];
  applicationSuggestions?: string[];
};

type EditablePlan = {
  objectives: string[];
  expectedOutputs: string[];
  methodologicalConstraints: string[];
  validationCriteria: string[];
};

export function MissionDetailView({
  missionId
}: {
  missionId: string;
}): React.ReactElement {
  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [editablePlan, setEditablePlan] = useState<EditablePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [showTeacherGuide, setShowTeacherGuide] = useState(false);

  useEffect(() => {
    void loadMission();
  }, [missionId]);

  async function loadMission(nextSelectedVersionId?: string): Promise<void> {
      try {
        setError(null);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "/api"}/missions/${missionId}?organizationId=${organizationId}`
        );

        if (!response.ok) {
          throw new Error("Nao foi possivel carregar a missao.");
        }

        applyMissionDetail((await response.json()) as MissionDetail, nextSelectedVersionId);
      } catch (caughtError) {
        const localMission = getLocalMission(missionId);

        if (localMission?.resources?.length) {
          applyMissionDetail(localMission as MissionDetail, nextSelectedVersionId);
        } else {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Erro inesperado ao carregar missao."
          );
        }
      } finally {
        setIsLoading(false);
      }
    }

  function applyMissionDetail(
    detail: MissionDetail,
    nextSelectedVersionId?: string
  ): void {
    const selectedVersion =
      detail.resources[0]?.versions.find(
        (item) => item.id === nextSelectedVersionId
      ) ?? detail.resources[0]?.versions[0];

    setMission(detail);
    setSelectedVersionId(selectedVersion?.id ?? null);
    setEditablePlan(toEditablePlan(selectedVersion?.contentJson));
  }

  async function saveNewVersion(): Promise<void> {
    if (!resource || !editablePlan) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "/api"}/resources/${resource.id}/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            organizationId,
            contentJson: {
              ...version?.contentJson,
              objectives: editablePlan.objectives,
              expectedOutputs: editablePlan.expectedOutputs,
              methodologicalConstraints: editablePlan.methodologicalConstraints,
              validationCriteria: editablePlan.validationCriteria
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error("Nao foi possivel salvar nova versao.");
      }

      const saved = (await response.json()) as { id: string; versionNumber: number };
      setMessage(`Versao ${saved.versionNumber} salva com sucesso.`);
      await loadMission(saved.id);
    } catch (caughtError) {
      const localVersion = saveLocalResourceVersion({
        resourceId: resource.id,
        contentJson: {
          ...version?.contentJson,
          objectives: editablePlan.objectives,
          expectedOutputs: editablePlan.expectedOutputs,
          methodologicalConstraints: editablePlan.methodologicalConstraints,
          validationCriteria: editablePlan.validationCriteria
        } as LocalContentJson
      });

      if (localVersion) {
        setMessage(`Versao ${localVersion.versionNumber} salva com sucesso.`);
        await loadMission(localVersion.id);
      } else {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Erro inesperado ao salvar versao."
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  const resource = mission?.resources[0];
  const version =
    resource?.versions.find((item) => item.id === selectedVersionId) ??
    resource?.versions[0];

  return (
    <main className="missionShell">
      <section className="missionIntro">
        <p className="eyebrow">Editor de material</p>
        <h1>{resource?.title ?? "Missao salva"}</h1>
        <p className="lead">
          Revise a atividade A4, imprima, copie, exporte e salve uma nova
          versao sem perder o historico.
        </p>
        <div className="actionRow">
          <a className="textLink" href="/missions">
            Voltar para missoes
          </a>
          <a className="textLink secondaryLink" href="/resources">
            Buscar recursos
          </a>
        </div>
      </section>

      {isLoading ? (
        <section className="resultPanel">
          <p className="emptyState">Carregando missao...</p>
        </section>
      ) : null}
      {error ? <section className="resultPanel formError">{error}</section> : null}
      {message ? <section className="resultPanel successMessage">{message}</section> : null}

      {mission && resource && version ? (
        <section className="missionDetailGrid">
          <aside className="resultPanel">
            <p className="resultStatus">{formatStatus(mission.status)}</p>
            <ResultBlock title="Documento">
              <div className="detailFacts">
                <span>{formatMissionType(mission.missionType)}</span>
                <span>{new Date(mission.createdAt).toLocaleString("pt-BR")}</span>
              </div>
            </ResultBlock>
            <ResultBlock title="Historico de versoes">
              <p className="helperText">
                Selecione uma versao para revisar. Ao salvar, uma nova versao
                sera criada.
              </p>
              <div className="versionList">
                {resource.versions.map((item) => (
                  <button
                    className={
                      item.id === version.id ? "versionButton active" : "versionButton"
                    }
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedVersionId(item.id);
                      setEditablePlan(toEditablePlan(item.contentJson));
                    }}
                  >
                    Versao {item.versionNumber}
                    <small>
                      {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </small>
                  </button>
                ))}
              </div>
            </ResultBlock>
          </aside>

          <section className="editorPanel">
            <div className="panelHeader">
              <div>
                <p className="panelLabel">Versao atual</p>
                <h2>Atividade pronta para impressao</h2>
              </div>
              <span className="countBadge">v{version.versionNumber}</span>
            </div>
            <div className="exportBar inlineExport">
              <button type="button" onClick={() => window.print()}>PDF/imprimir</button>
              <button type="button" onClick={() => downloadWord(resource.title, version.contentText)}>Exportar Word</button>
              <button type="button" onClick={() => window.print()}>Imagem A4</button>
              <button type="button" onClick={() => setShowTeacherGuide((current) => !current)}>
                {showTeacherGuide ? "Ver folha do estudante" : "Ver guia do professor"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(version.contentText);
                  setCopyMessage("Material copiado.");
                }}
              >
                Copiar
              </button>
              <button type="button" onClick={saveNewVersion}>Salvar</button>
            </div>
            {copyMessage ? <p className="successMessage">{copyMessage}</p> : null}
            {showTeacherGuide ? (
              <TeacherGuideView content={version.contentJson} />
            ) : (
              <StudentSheetView content={version.contentJson} title={resource.title} />
            )}
            {editablePlan ? (
              <div className="editorGrid editSurface">
                <div>
                  <p className="panelLabel">Campos editaveis</p>
                  <h3>Guia do professor</h3>
                </div>
                <EditableList
                  label="Objetivos pedagogicos"
                  value={editablePlan.objectives}
                  onChange={(items) =>
                    setEditablePlan({ ...editablePlan, objectives: items })
                  }
                />
                <EditableList
                  label="Produto esperado para sala de aula"
                  value={editablePlan.expectedOutputs}
                  onChange={(items) =>
                    setEditablePlan({ ...editablePlan, expectedOutputs: items })
                  }
                />
                <EditableList
                  label="Cuidados pedagogicos"
                  value={editablePlan.methodologicalConstraints}
                  onChange={(items) =>
                    setEditablePlan({
                      ...editablePlan,
                      methodologicalConstraints: items
                    })
                  }
                />
                <EditableList
                  label="Criterios de qualidade"
                  value={editablePlan.validationCriteria}
                  onChange={(items) =>
                    setEditablePlan({
                      ...editablePlan,
                      validationCriteria: items
                    })
                  }
                />
                <button
                  className="primaryButton"
                  disabled={isSaving}
                  type="button"
                  onClick={saveNewVersion}
                >
                  {isSaving ? "Salvando..." : "Salvar nova versao"}
                </button>
              </div>
            ) : null}
          </section>
        </section>
      ) : null}
    </main>
  );
}

function StudentSheetView({
  content,
  title
}: {
  content: MissionDetail["resources"][number]["versions"][number]["contentJson"];
  title: string;
}): React.ReactElement {
  const sheet = resolveStudentSheet(content, title);

  return (
    <article className="a4Sheet savedDocument">
      <header className="a4Header">
        <strong>Atividade</strong>
        <span>Pronta para imprimir</span>
      </header>
      <h2>{sheet.title}</h2>
      {sheet.context ? <p className="a4Instruction">{sheet.context}</p> : null}
      {sheet.instructions.length > 0 ? (
        <section className="baseText">
          <strong>Como fazer</strong>
          <ul>
            {sheet.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {sheet.baseText ? (
        <section className="baseText">
          <strong>Texto-base</strong>
          <p>{sheet.baseText}</p>
        </section>
      ) : null}
      {sheet.didacticBoxes.length > 0 ? (
        <section className="adaptationBox">
          <strong>Quadro de apoio</strong>
          <ul>
            {sheet.didacticBoxes.map((box) => (
              <li key={box}>{box}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <VisualResourceGrid compact items={sheet.visualElements} />
      {sheet.tableRows.length > 0 ? (
        <table className="worksheetTable">
          <tbody>
            {sheet.tableRows.map((row) => (
              <tr key={row}>
                <td>{row}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <ol className="questionList">
        {sheet.questions.map((question, index) => (
          <li key={`${question.command}-${index}`}>
            <p>{question.command}</p>
            {question.support ? <small>{question.support}</small> : null}
            <div className="answerLines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </li>
        ))}
      </ol>
      <footer>acessa+ | educacao inclusiva na pratica - @mozahintervieira</footer>
    </article>
  );
}

function TeacherGuideView({
  content
}: {
  content: MissionDetail["resources"][number]["versions"][number]["contentJson"];
}): React.ReactElement {
  const guide = resolveTeacherGuide(content);

  return (
    <article className="teacherGuide">
      <header>
        <span>Guia do professor</span>
        <h2>Informacoes pedagogicas do material</h2>
      </header>
      <GuideSection title="Habilidade curricular" items={[guide.skillCode]} />
      <GuideSection title="Objeto de conhecimento" items={[guide.knowledgeObject]} />
      <GuideSection title="Objetivos pedagogicos" items={guide.objectives} />
      <GuideSection title="Metodologia sugerida" items={guide.methodology} />
      <GuideSection title="Adaptacoes realizadas" items={guide.adaptations} />
      <GuideSection title="Principios do DUA" items={guide.duaPrinciples} />
      <GuideSection title="Criterios de avaliacao" items={guide.assessmentCriteria} />
      <GuideSection title="Sugestoes de aplicacao" items={guide.applicationSuggestions} />
    </article>
  );
}

function GuideSection({ title, items }: { title: string; items: Array<string | undefined> }): React.ReactElement | null {
  const cleanItems = items.filter((item): item is string => Boolean(item?.trim()));

  if (cleanItems.length === 0) {
    return null;
  }

  return (
    <section>
      <strong>{title}</strong>
      <ul>
        {cleanItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function resolveStudentSheet(
  content: MissionDetail["resources"][number]["versions"][number]["contentJson"],
  title: string
): Required<StudentSheet> {
  return {
    title: content.studentSheet?.title ?? content.worksheetTitle ?? title,
    context: content.studentSheet?.context ?? "",
    instructions: content.studentSheet?.instructions ?? content.instructions ?? ["Leia com atencao e responda no espaco indicado."],
    baseText: content.studentSheet?.baseText ?? content.baseText ?? "",
    didacticBoxes: content.studentSheet?.didacticBoxes ?? [],
    visualElements: content.studentSheet?.visualElements ?? content.visualElements ?? [],
    tableRows: content.studentSheet?.tableRows ?? [],
    questions: content.studentSheet?.questions ?? content.questions ?? []
  };
}

function resolveTeacherGuide(
  content: MissionDetail["resources"][number]["versions"][number]["contentJson"]
): Required<TeacherGuide> {
  return {
    skillCode: content.teacherGuide?.skillCode ?? content.skillCode ?? "Nao informada",
    knowledgeObject: content.teacherGuide?.knowledgeObject ?? "Nao informado",
    objectives: content.teacherGuide?.objectives ?? content.objectives ?? [],
    methodology: content.teacherGuide?.methodology ?? content.methodologicalConstraints ?? [],
    adaptations: content.teacherGuide?.adaptations ?? content.adaptationNotes ?? [],
    duaPrinciples: content.teacherGuide?.duaPrinciples ?? [],
    assessmentCriteria: content.teacherGuide?.assessmentCriteria ?? content.validationCriteria ?? [],
    applicationSuggestions: content.teacherGuide?.applicationSuggestions ?? content.reuseSuggestions ?? []
  };
}

function formatMissionType(value: string): string {
  const labels: Record<string, string> = {
    CREATE_LESSON_PLAN: "Atividade pronta para impressao",
    ADAPT_ACTIVITY: "Material adaptado"
  };

  return labels[value] ?? "Recurso pedagogico";
}

function formatStatus(value: string): string {
  const labels: Record<string, string> = {
    COMPLETED: "Pronto para revisar",
    NEEDS_REVIEW: "Precisa de revisao",
    DRAFT: "Rascunho"
  };

  return labels[value] ?? "Em revisao";
}

function toEditablePlan(
  contentJson: MissionDetail["resources"][number]["versions"][number]["contentJson"] | undefined
): EditablePlan {
  return {
    objectives: contentJson?.objectives ?? [],
    expectedOutputs: contentJson?.expectedOutputs ?? [],
    methodologicalConstraints: contentJson?.methodologicalConstraints ?? [],
    validationCriteria: contentJson?.validationCriteria ?? []
  };
}

function EditableList({
  label,
  value,
  onChange
}: {
  label: string;
  value: string[];
  onChange: (items: string[]) => void;
}): React.ReactElement {
  return (
    <label className="field fieldWide">
      <span>{label}</span>
      <textarea
        rows={4}
        value={value.join("\n")}
        onChange={(event) =>
          onChange(
            event.currentTarget.value
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean)
          )
        }
      />
    </label>
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

function downloadWord(title: string, contentText: string): void {
  const blob = new Blob([contentText], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.doc`;
  link.click();
  URL.revokeObjectURL(url);
}

function ReadOnlySection({
  title,
  items
}: {
  title: string;
  items: string[];
}): React.ReactElement | null {
  if (items.length === 0) {
    return null;
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
