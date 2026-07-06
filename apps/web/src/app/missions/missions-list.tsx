"use client";

import { useEffect, useState } from "react";

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
          throw new Error("Nao foi possivel carregar as missoes.");
        }

        setMissions((await response.json()) as MissionListItem[]);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Erro inesperado ao carregar missoes."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadMissions();
  }, []);

  return (
    <main className="missionShell">
      <section className="missionIntro">
        <p className="eyebrow">Historico de trabalho</p>
        <h1>Missoes salvas</h1>
        <p className="lead">
          Retome planejamentos, abra o recurso gerado e preserve o historico de
          cada material sem sobrescrever versoes anteriores.
        </p>
        <div className="actionRow">
          <a className="primaryLink" href="/planning/new">
            Criar nova missao
          </a>
          <a className="textLink" href="/resources">
            Buscar recursos
          </a>
        </div>
      </section>

      <section className="listPanel">
        <div className="panelHeader">
          <div>
            <p className="panelLabel">Missoes por organizacao</p>
            <h2>Planejamentos registrados</h2>
          </div>
          <span className="countBadge">{missions.length} itens</span>
        </div>

        {isLoading ? <p className="emptyState">Carregando missoes...</p> : null}
        {error ? <p className="formError">{error}</p> : null}
        {!isLoading && missions.length === 0 ? (
          <p className="emptyState">
            Nenhuma missao salva ainda. Crie o primeiro planejamento para iniciar
            o Banco Inteligente.
          </p>
        ) : null}

        <div className="missionCards">
          {missions.map((mission) => (
            <a className="missionCard" href={`/missions/${mission.id}`} key={mission.id}>
              <span className="cardMeta">{mission.missionType}</span>
              <strong>{mission.title}</strong>
              <div className="cardFooter">
                <small>{mission.status}</small>
                <small>{new Date(mission.createdAt).toLocaleString("pt-BR")}</small>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
