"use client";

import { useEffect, useState } from "react";

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
        objectives?: string[];
        expectedOutputs?: string[];
        methodologicalConstraints?: string[];
        validationCriteria?: string[];
      };
      contentText: string;
      validationStatus: string;
      createdAt: string;
    }>;
  }>;
};

const organizationId = "demo-organization";

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

        const detail = (await response.json()) as MissionDetail;
        const version =
          detail.resources[0]?.versions.find(
            (item) => item.id === nextSelectedVersionId
          ) ?? detail.resources[0]?.versions[0];

        setMission(detail);
        setSelectedVersionId(version?.id ?? null);
        setEditablePlan(toEditablePlan(version?.contentJson));
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Erro inesperado ao carregar missao."
        );
      } finally {
        setIsLoading(false);
      }
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
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro inesperado ao salvar versao."
      );
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
        <p className="eyebrow">Detalhe da missao</p>
        <h1>{resource?.title ?? "Missao salva"}</h1>
        <p className="lead">
          Revise a versao atual, edite campos estruturados e salve uma nova
          versao preservando todo o historico do recurso.
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
            <p className="resultStatus">Status da missao: {mission.status}</p>
            <ResultBlock title="Missao">
              <div className="detailFacts">
                <span>{mission.missionType}</span>
                <span>{new Date(mission.createdAt).toLocaleString("pt-BR")}</span>
              </div>
            </ResultBlock>
            <ResultBlock title="Entrada do professor">
              <dl className="inputList">
                {Object.entries(mission.input).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
                  </div>
                ))}
              </dl>
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

          <section className="resultPanel">
            <div className="panelHeader">
              <div>
                <p className="panelLabel">Versao atual</p>
                <h2>Planejamento salvo</h2>
              </div>
              <span className="countBadge">v{version.versionNumber}</span>
            </div>
            {editablePlan ? (
              <div className="editorGrid">
                <EditableList
                  label="Objetivos"
                  value={editablePlan.objectives}
                  onChange={(items) =>
                    setEditablePlan({ ...editablePlan, objectives: items })
                  }
                />
                <EditableList
                  label="Produto esperado"
                  value={editablePlan.expectedOutputs}
                  onChange={(items) =>
                    setEditablePlan({ ...editablePlan, expectedOutputs: items })
                  }
                />
                <EditableList
                  label="Restricoes metodologicas"
                  value={editablePlan.methodologicalConstraints}
                  onChange={(items) =>
                    setEditablePlan({
                      ...editablePlan,
                      methodologicalConstraints: items
                    })
                  }
                />
                <EditableList
                  label="Criterios de validacao"
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
            <ResultBlock title="Texto simples indexavel">
              <p className="helperText">
                Este texto alimenta a busca simples do Banco Inteligente no MVP.
              </p>
              <pre className="contentText">{version.contentText}</pre>
            </ResultBlock>
          </section>
        </section>
      ) : null}
    </main>
  );
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
