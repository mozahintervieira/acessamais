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
    knowledgeObject?: string;
    theme?: string;
    activityType?: string;
    specificNeed?: string;
    learningLevel?: string;
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
  knowledgeObject: string;
  theme: string;
  activityType: string;
  specificNeed: string;
  learningLevel: string;
  teacher: string;
  favorites: string;
  mostUsed: string;
};

export function ResourcesLibrary(): React.ReactElement {
  const [filters, setFilters] = useState<Filters>({
    q: "",
    discipline: "",
    gradeYear: "",
    skill: "",
    knowledgeObject: "",
    theme: "",
    activityType: "",
    specificNeed: "",
    learningLevel: "",
    teacher: "",
    favorites: "",
    mostUsed: ""
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
      const params = new URLSearchParams();

      for (const [key, value] of Object.entries(filters)) {
        if (value.trim()) {
          params.set(key, value.trim());
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "/api"}/resources?${params.toString()}`
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nao foi possivel carregar os materiais.");
      }

      setResources((await response.json()) as ResourceListItem[]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro inesperado ao carregar materiais."
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
    <main className="missionShell libraryShell">
      <section className="missionIntro libraryHero">
        <p className="eyebrow">Biblioteca Pedagogica</p>
        <h1>Materiais inclusivos prontos para reutilizar</h1>
        <p className="lead">
          Encontre atividades A4, avaliacoes, materiais adaptados e recursos
          de acessibilidade por disciplina, habilidade, tema, perfil e nivel de aprendizagem.
        </p>
        <div className="actionRow">
          <a className="primaryLink" href="/planning/new">
            Criar atividade A4
          </a>
          <a className="textLink" href="/planning/new">
            Adaptar material
          </a>
        </div>
      </section>

      <section className="listPanel" id="filtros">
        <div className="panelHeader">
          <div>
            <p className="panelLabel">Filtros do acervo</p>
            <h2>Buscar atividades</h2>
          </div>
          <span className="countBadge">{resources.length} materiais</span>
        </div>
        <div className="filterGrid richFilterGrid">
          <Field label="Busca em texto" value={filters.q} onChange={(value) => updateFilter("q", value)} />
          <Field label="Disciplina" value={filters.discipline} onChange={(value) => updateFilter("discipline", value)} />
          <Field label="Ano/serie" value={filters.gradeYear} onChange={(value) => updateFilter("gradeYear", value)} />
          <Field label="BNCC" value={filters.skill} onChange={(value) => updateFilter("skill", value)} />
          <Field label="Objeto de conhecimento" value={filters.knowledgeObject} onChange={(value) => updateFilter("knowledgeObject", value)} />
          <Field label="Tema" value={filters.theme} onChange={(value) => updateFilter("theme", value)} />
          <Field label="Tipo de material" value={filters.activityType} onChange={(value) => updateFilter("activityType", value)} />
          <Field label="Deficiencia/perfil" value={filters.specificNeed} onChange={(value) => updateFilter("specificNeed", value)} />
          <Field label="Nivel de aprendizagem" value={filters.learningLevel} onChange={(value) => updateFilter("learningLevel", value)} />
          <Field label="Professor" value={filters.teacher} onChange={(value) => updateFilter("teacher", value)} />
          <Field label="Favoritos" value={filters.favorites} onChange={(value) => updateFilter("favorites", value)} />
          <Field label="Mais usados" value={filters.mostUsed} onChange={(value) => updateFilter("mostUsed", value)} />
          <button className="primaryButton" type="button" onClick={loadResources}>
            {isLoading ? "Buscando..." : "Buscar materiais"}
          </button>
        </div>
      </section>

      <section className="listPanel" id="recursos">
        <div className="panelHeader">
          <div>
            <p className="panelLabel">Acervo versionado</p>
            <h2>Materiais prontos para sala de aula</h2>
          </div>
        </div>
        {error ? <p className="formError">{error}</p> : null}
        {isLoading ? <p className="emptyState">Buscando materiais...</p> : null}
        {!isLoading && resources.length === 0 ? (
          <p className="emptyState">
            Seu acervo pedagogico ainda esta comecando. Crie ou salve o
            primeiro material.
          </p>
        ) : null}
        <div className="libraryResourceGrid">
          {resources.map((resource) => (
            <article className="missionCard libraryResourceCard" key={resource.id}>
              <div className="resourceThumbnail" aria-hidden="true">
                <span>{getSubjectInitial(resource.metadata.discipline)}</span>
                <small>{resource.metadata.gradeYear ?? "A4"}</small>
              </div>
              <div className="libraryCardHeader">
                <span className="cardMeta">{resource.metadata.activityType ?? formatResourceType(resource.type)}</span>
                <button
                  aria-label="Marcar como favorito"
                  className="favoriteButton"
                  type="button"
                >
                  ☆
                </button>
              </div>
              <strong>{resource.title}</strong>
              <div className="resourceFacts">
                <span>{resource.metadata.discipline ?? "Disciplina nao informada"}</span>
                <span>{resource.metadata.gradeYear ?? "Ano/serie nao informado"}</span>
                <span>{resource.metadata.theme ?? "Tema nao informado"}</span>
                <span>{resource.metadata.specificNeed ?? "Sem necessidade especifica"}</span>
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
                  {resource.latestVersion.contentText.slice(0, 280)}
                </p>
              ) : null}
              <div className="cardFooter">
                <small>
                  {resource.latestVersion
                    ? `Versao ${resource.latestVersion.versionNumber}`
                    : "Sem versao"}
                </small>
                <div className="resourceActions">
                  {resource.missionId ? (
                    <a className="textLink" href={`/missions/${resource.missionId}`}>
                      Abrir
                    </a>
                  ) : null}
                  <button type="button" onClick={() => copyResourceText(resource)}>
                    Duplicar
                  </button>
                  <a href="/planning/new">Criar semelhante</a>
                  <button type="button" onClick={() => downloadResourceText(resource)}>
                    Baixar
                  </button>
                </div>
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
      <input value={value} onChange={(event) => onChange(event.currentTarget.value)} />
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

function formatResourceType(value: string): string {
  const labels: Record<string, string> = {
    LESSON_PLAN: "Atividade pronta para impressao",
    ADAPTED_ACTIVITY: "Material adaptado",
    ASSESSMENT: "Avaliacao",
    RESOURCE: "Recurso pedagogico"
  };

  return labels[value] ?? "Recurso pedagogico";
}

function getSubjectInitial(value?: string): string {
  return (value?.trim().charAt(0) || "A").toUpperCase();
}

function copyResourceText(resource: ResourceListItem): void {
  const text = resource.latestVersion?.contentText || resource.title;

  void navigator.clipboard?.writeText(text);
}

function downloadResourceText(resource: ResourceListItem): void {
  const text = [
    resource.title,
    resource.metadata.discipline,
    resource.metadata.gradeYear,
    resource.metadata.skill,
    "",
    resource.latestVersion?.contentText
  ]
    .filter(Boolean)
    .join("\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${resource.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "material-acessa-plus"}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
