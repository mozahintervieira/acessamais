"use client";

import { useEffect, useState } from "react";
import { listLocalMissions } from "../demo-local-store";

type MissionListItem = {
  id: string;
  missionType: string;
  status: string;
  title: string;
  resourceId?: string;
  createdAt: string;
};

const organizationId = "demo-organization";

export function MissionsList(): React.ReactElement {
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMissions(): Promise<void> {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "/api"}/missions?organizationId=${organizationId}`
        );

        if (!response.ok) {
          throw new Error("Nao foi possivel carregar os materiais.");
        }

        const apiMissions = (await response.json()) as MissionListItem[];
        setMissions(mergeMissions(apiMissions, listLocalMissions()));
      } catch (caughtError) {
        const localMissions = listLocalMissions();

        if (localMissions.length > 0) {
          setMissions(localMissions);
        } else {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Erro inesperado ao carregar materiais."
          );
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadMissions();
  }, []);

  return (
    <main className="missionShell">
      <section className="missionIntro">
        <p className="eyebrow">Meus materiais</p>
        <h1>Atividades e recursos salvos</h1>
        <p className="lead">
          Retome atividades A4, materiais adaptados, avaliacoes e recursos
          versionados sem perder o historico.
        </p>
        <div className="actionRow">
          <a className="primaryLink" href="/">
            Criar atividade A4
          </a>
          <a className="textLink" href="/resources">
            Abrir Banco Inteligente
          </a>
        </div>
      </section>

      <section className="listPanel">
        <div className="panelHeader">
          <div>
            <p className="panelLabel">Materiais por organizacao</p>
            <h2>Recursos registrados</h2>
          </div>
          <span className="countBadge">{missions.length} itens</span>
        </div>

        {isLoading ? <p className="emptyState">Carregando materiais...</p> : null}
        {error ? <p className="formError">{error}</p> : null}
        {!isLoading && missions.length === 0 ? (
          <p className="emptyState">
            Nenhum material salvo ainda. Crie a primeira atividade A4 para
            iniciar o Banco Inteligente.
          </p>
        ) : null}

        <div className="missionCards">
          {missions.map((mission) => (
            <a className="missionCard" href={`/missions/${mission.id}`} key={mission.id}>
              <span className="cardMeta">{formatMissionType(mission.missionType)}</span>
              <strong>{mission.title}</strong>
              <div className="cardFooter">
                <small>{formatStatus(mission.status)}</small>
                <small>{new Date(mission.createdAt).toLocaleString("pt-BR")}</small>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

function mergeMissions(
  apiMissions: MissionListItem[],
  localMissions: MissionListItem[]
): MissionListItem[] {
  const apiIds = new Set(apiMissions.map((mission) => mission.id));

  return [
    ...apiMissions,
    ...localMissions.filter((mission) => !apiIds.has(mission.id))
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function formatMissionType(value: string): string {
  const labels: Record<string, string> = {
    CREATE_LESSON_PLAN: "Atividade pronta para impressão",
    ADAPT_ACTIVITY: "Material adaptado"
  };

  return labels[value] ?? "Recurso pedagógico";
}

function formatStatus(value: string): string {
  const labels: Record<string, string> = {
    COMPLETED: "Pronto para revisar",
    NEEDS_REVIEW: "Precisa de revisão",
    DRAFT: "Rascunho"
  };

  return labels[value] ?? "Em revisão";
}
