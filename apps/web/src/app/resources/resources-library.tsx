"use client";

import { useEffect, useState } from "react";

type ResourceListItem = {
  id: string;
  missionId?: string;
  type: string;
  title: string;
  status: string;
  metadata: {
    discipline?: string;
    gradeYear?: string;
    skill?: string;
    specificNeed?: string;
    accessibilityTags?: string[];
    pedagogicalTags?: string[];
  };
  latestVersion?: {
    versionNumber: number;
    contentText: string;
    createdAt: string;
  };
  createdAt: string;
};

type Filters = {
  q: string;
  discipline: string;
  gradeYear: string;
  skill: string;
  specificNeed: string;
};

const organizationId = "demo-organization";

export function ResourcesLibrary(): React.ReactElement {
  const [filters, setFilters] = useState<Filters>({
    q: "",
    discipline: "",
    gradeYear: "",
    skill: "",
    specificNeed: ""
  });
  const [resources, setResources] = useState<ResourceListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void loadResources();
  }, []);

  async function loadResources(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        organizationId
      });

      for (const [key, value] of Object.entries(filters)) {
        if (value.trim()) {
          params.set(key, value.trim());
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"}/resources?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Nao foi possivel carregar os recursos.");
      }

      setResources((await response.json()) as ResourceListItem[]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro inesperado ao carregar recursos."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function updateFilter(field: keyof Filters, value: string): void {
    setFilters((current) => ({
      ...current,
      [field]: value
    }));
  }

  return (
    <main className="missionShell">
      <section className="missionIntro">
        <p className="eyebrow">Banco Inteligente inicial</p>
        <h1>Recursos reutilizaveis</h1>
        <p className="lead">
          Encontre planejamentos salvos, filtre por metadados pedagogicos e
          reutilize materiais ja versionados pela plataforma.
        </p>
        <div className="actionRow">
          <a className="primaryLink" href="/planning/new">
            Criar nova missao
          </a>
          <a className="textLink" href="/missions">
            Ver missoes
          </a>
        </div>
      </section>

      <section className="listPanel" id="filtros">
        <div className="panelHeader">
          <div>
            <p className="panelLabel">Filtros pedagogicos</p>
            <h2>Buscar no acervo</h2>
          </div>
          <span className="countBadge">{resources.length} recursos</span>
        </div>
        <div className="filterGrid">
          <Field
            label="Busca em texto"
            value={filters.q}
            onChange={(value) => updateFilter("q", value)}
          />
          <Field
            label="Disciplina"
            value={filters.discipline}
            onChange={(value) => updateFilter("discipline", value)}
          />
          <Field
            label="Serie/ano"
            value={filters.gradeYear}
            onChange={(value) => updateFilter("gradeYear", value)}
          />
          <Field
            label="Habilidade"
            value={filters.skill}
            onChange={(value) => updateFilter("skill", value)}
          />
          <Field
            label="Necessidade"
            value={filters.specificNeed}
            onChange={(value) => updateFilter("specificNeed", value)}
          />
          <button className="primaryButton" type="button" onClick={loadResources}>
            {isLoading ? "Buscando..." : "Buscar recursos"}
          </button>
        </div>
      </section>

      <section className="listPanel" id="recursos">
        <div className="panelHeader">
          <div>
            <p className="panelLabel">Recursos versionados</p>
            <h2>Resultados reutilizaveis</h2>
          </div>
        </div>
        {error ? <p className="formError">{error}</p> : null}
        {isLoading ? <p className="emptyState">Buscando recursos...</p> : null}
        {!isLoading && resources.length === 0 ? (
          <p className="emptyState">
            Nenhum recurso encontrado. Ajuste os filtros ou crie uma nova
            missao para ampliar o Banco Inteligente.
          </p>
        ) : null}
        <div className="missionCards">
          {resources.map((resource) => (
            <article className="missionCard" key={resource.id}>
              <span className="cardMeta">{resource.type}</span>
              <strong>{resource.title}</strong>
              <div className="resourceFacts">
                <span>{resource.metadata.discipline ?? "Disciplina nao informada"}</span>
                <span>{resource.metadata.gradeYear ?? "Serie nao informada"}</span>
                <span>{resource.metadata.specificNeed ?? "Necessidade nao informada"}</span>
              </div>
              <p className="helperText">
                {resource.metadata.skill ?? "Habilidade nao informada"}
              </p>
              <TagList
                tags={[
                  ...(resource.metadata.pedagogicalTags ?? []),
                  ...(resource.metadata.accessibilityTags ?? [])
                ]}
              />
              {resource.latestVersion ? (
                <p className="resourceExcerpt">
                  {resource.latestVersion.contentText.slice(0, 260)}
                </p>
              ) : null}
              <div className="cardFooter">
                <small>
                  {resource.latestVersion
                    ? `Versao ${resource.latestVersion.versionNumber}`
                    : "Sem versao"}
                </small>
                {resource.missionId ? (
                  <a className="textLink" href={`/missions/${resource.missionId}`}>
                    Abrir recurso
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
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

function TagList({ tags }: { tags: string[] }): React.ReactElement | null {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="tagList">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}
