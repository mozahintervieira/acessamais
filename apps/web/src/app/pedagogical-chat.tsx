"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Curriculum = {
  checkedAt: string;
  sources: Array<{ title: string; url: string }>;
  status?: string;
  year?: number;
};
type Turn = {
  role: "user" | "assistant";
  content: string;
  curriculum?: Curriculum;
};
type Project = {
  id: string;
  name: string;
  turns: Turn[];
  document: string;
  updatedAt: string;
};

const storageKey = "acessa-plus-pedagogical-workspace-v1";
const starterProject: Project = {
  id: "primeiro-projeto",
  name: "Meu primeiro projeto",
  turns: [],
  document: "",
  updatedAt: new Date(0).toISOString(),
};
const starters = [
  {
    icon: "✦",
    label: "Criar atividade",
    prompt: "Crie uma atividade inclusiva pronta para o estudante sobre ",
  },
  {
    icon: "◇",
    label: "Adaptar material",
    prompt:
      "Adapte este material considerando as barreiras e os apoios do estudante: ",
  },
  {
    icon: "◎",
    label: "Planejar aula",
    prompt:
      "Crie um plano de aula inclusivo, alinhado ao currículo vigente, sobre ",
  },
  {
    icon: "⌕",
    label: "Pesquisa curricular",
    prompt:
      "Consulte o Currículo do Espírito Santo vigente e identifique possibilidades de trabalho para ",
  },
];

export function PedagogicalChat(): React.ReactElement {
  const [projects, setProjects] = useState<Project[]>([starterProject]);
  const [activeId, setActiveId] = useState(starterProject.id);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [documentOpen, setDocumentOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const sending = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const dialogue = useRef<HTMLDivElement>(null);
  const activeProject = useMemo(
    () =>
      projects.find((project) => project.id === activeId) ??
      projects[0] ??
      starterProject,
    [activeId, projects],
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          projects?: Project[];
          activeId?: string;
        };
        if (Array.isArray(parsed.projects) && parsed.projects.length) {
          setProjects(parsed.projects);
          setActiveId(
            parsed.projects.some((project) => project.id === parsed.activeId)
              ? parsed.activeId!
              : parsed.projects[0].id,
          );
        }
      }
    } catch {
      // A área continua utilizável mesmo quando o navegador bloqueia o armazenamento local.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ projects, activeId }),
      );
    } catch {
      /* preserva a sessão atual */
    }
  }, [activeId, hydrated, projects]);

  useEffect(() => {
    dialogue.current?.scrollTo({
      top: dialogue.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeProject.turns, busy]);

  function updateActive(updater: (project: Project) => Project): void {
    setProjects((current) =>
      current.map((project) =>
        project.id === activeProject.id ? updater(project) : project,
      ),
    );
  }

  function createProject(): void {
    const name = window
      .prompt(
        "Nome do novo projeto pedagógico",
        `Projeto ${projects.length + 1}`,
      )
      ?.trim();
    if (!name) return;
    const project: Project = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.slice(0, 80),
      turns: [],
      document: "",
      updatedAt: new Date().toISOString(),
    };
    setProjects((current) => [project, ...current]);
    setActiveId(project.id);
    setDraft("");
    setError("");
  }

  function newConversation(): void {
    if (
      activeProject.turns.length &&
      !window.confirm(
        "Iniciar uma nova conversa neste projeto? O material do editor será preservado.",
      )
    )
      return;
    updateActive((project) => ({
      ...project,
      turns: [],
      updatedAt: new Date().toISOString(),
    }));
    setDraft("");
    setError("");
  }

  async function send(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (sending.current || !draft.trim()) return;
    const content = draft.trim();
    const next: Turn[] = [...activeProject.turns, { role: "user", content }];
    const projectId = activeProject.id;
    sending.current = true;
    setBusy(true);
    setError("");
    updateActive((project) => ({
      ...project,
      turns: next,
      updatedAt: new Date().toISOString(),
    }));
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const payload = await response.json();
      if (
        !response.ok ||
        typeof payload.reply !== "string" ||
        !payload.reply.trim()
      )
        throw new Error(
          payload.message ||
            "Não foi possível receber a resposta. Tente novamente.",
        );
      const assistantTurn: Turn = {
        role: "assistant",
        content: payload.reply,
        curriculum: payload.curriculum,
      };
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? {
                ...project,
                turns: [...next, assistantTurn],
                document: payload.reply,
                updatedAt: new Date().toISOString(),
              }
            : project,
        ),
      );
      setDraft("");
      setDocumentOpen(true);
    } catch (caught) {
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? {
                ...project,
                turns: project.turns.slice(0, -1),
                updatedAt: new Date().toISOString(),
              }
            : project,
        ),
      );
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível receber a resposta.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
      input.current?.focus();
    }
  }

  async function copyDocument(): Promise<void> {
    if (!activeProject.document) return;
    try {
      await navigator.clipboard.writeText(activeProject.document);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(
        "O navegador não permitiu copiar automaticamente. Selecione o texto no editor e copie manualmente.",
      );
    }
  }

  function downloadDocument(): void {
    if (!activeProject.document) return;
    const blob = new Blob([activeProject.document], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(activeProject.name)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function printDocument(): void {
    if (!activeProject.document) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.opener = null;
    printWindow.document.write(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(activeProject.name)}</title><style>@page{margin:18mm}body{font:11pt/1.6 Georgia,serif;color:#152337;max-width:180mm;margin:auto}h1{font:700 20pt Arial,sans-serif;border-bottom:2px solid #2458a6;padding-bottom:10px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><h1>${escapeHtml(activeProject.name)}</h1><pre>${escapeHtml(activeProject.document)}</pre><script>window.onload=()=>window.print()<\/script></body></html>`,
    );
    printWindow.document.close();
  }

  return (
    <main
      className={`mindShell studioShell${sidebarOpen ? " sidebarIsOpen" : ""}${documentOpen ? " documentIsOpen" : ""}`}
    >
      <aside className="studioSidebar" aria-label="Projetos pedagógicos">
        <div className="studioSidebarTop">
          <button
            className="studioIconButton"
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label={sidebarOpen ? "Recolher projetos" : "Abrir projetos"}
          >
            ☰
          </button>
          {sidebarOpen ? <strong>Laboratório</strong> : null}
        </div>
        {sidebarOpen ? (
          <>
            <button
              className="studioNewProject"
              type="button"
              onClick={createProject}
            >
              <span>＋</span> Novo projeto
            </button>
            <div className="studioSpecialist">
              <span className="studioSpecialistAvatar">A+</span>
              <div>
                <small>Especialista ativo</small>
                <strong>Professor AEE</strong>
              </div>
              <i aria-label="Ativo" />
            </div>
            <nav className="studioProjectList" aria-label="Seus projetos">
              <span>Projetos</span>
              {projects.map((project) => (
                <button
                  className={project.id === activeProject.id ? "active" : ""}
                  type="button"
                  key={project.id}
                  onClick={() => {
                    setActiveId(project.id);
                    setDraft("");
                    setError("");
                  }}
                >
                  <span aria-hidden="true">◇</span>
                  <div>
                    <strong>{project.name}</strong>
                    <small>
                      {project.turns.length
                        ? `${project.turns.length} mensagens`
                        : "Projeto vazio"}
                    </small>
                  </div>
                </button>
              ))}
            </nav>
            <div className="studioCurriculumStatus">
              <i aria-hidden="true">✓</i>
              <div>
                <strong>Currículo ES {new Date().getFullYear()}</strong>
                <small>Consulta oficial a cada geração</small>
              </div>
            </div>
            <p className="studioLocalNote">
              Projetos salvos neste navegador. Evite dados identificáveis dos
              estudantes.
            </p>
          </>
        ) : null}
      </aside>

      <section
        className="studioConversation"
        aria-label="Conversa com o ACESSA+"
      >
        <header className="studioConversationHeader">
          <div>
            <small>Projeto atual</small>
            <h1>{activeProject.name}</h1>
          </div>
          <div className="studioHeaderActions">
            <span>
              <i /> Roteamento pedagógico
            </span>
            <button type="button" onClick={newConversation}>
              ＋ Nova conversa
            </button>
            <button
              className="studioIconButton"
              type="button"
              onClick={() => setDocumentOpen((value) => !value)}
              aria-label={documentOpen ? "Fechar editor" : "Abrir editor"}
            >
              ▱
            </button>
          </div>
        </header>
        <div
          className="studioDialogue"
          ref={dialogue}
          aria-live="polite"
          aria-busy={busy}
        >
          {!activeProject.turns.length ? (
            <section className="studioEmptyState">
              <p className="mindKicker">
                <span aria-hidden="true" /> Mente pedagógica ACESSA+
              </p>
              <h2>O que vamos construir?</h2>
              <p>
                Converse naturalmente. O ACESSA+ organiza o pedido, consulta o
                currículo vigente e entrega o material no editor.
              </p>
              <div className="studioStarterGrid">
                {starters.map((starter) => (
                  <button
                    type="button"
                    key={starter.label}
                    onClick={() => {
                      setDraft(starter.prompt);
                      input.current?.focus();
                    }}
                  >
                    <span>{starter.icon}</span>
                    <strong>{starter.label}</strong>
                    <small>Começar com este fluxo</small>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            activeProject.turns.map((turn, index) => (
              <article
                className={`studioTurn ${turn.role}`}
                key={`${turn.role}-${index}`}
              >
                <span>{turn.role === "user" ? "Você" : "A+"}</span>
                <div>
                  <strong>
                    {turn.role === "user" ? "Professor" : "ACESSA+"}
                  </strong>
                  <p>
                    {turn.role === "assistant" && turn.content.length > 1200
                      ? `${turn.content.slice(0, 420).trim()}…`
                      : turn.content}
                  </p>
                  {turn.role === "assistant" && turn.content.length > 1200 ? (
                    <button
                      className="studioOpenDocument"
                      type="button"
                      onClick={() => setDocumentOpen(true)}
                    >
                      Abrir material completo no editor →
                    </button>
                  ) : null}
                  {turn.curriculum?.sources?.length ? (
                    <details>
                      <summary>Fontes curriculares consultadas</summary>
                      <ul>
                        {turn.curriculum.sources.map((source) => (
                          <li key={source.url}>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {source.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              </article>
            ))
          )}
          {busy ? (
            <article className="studioTurn assistant thinking">
              <span>A+</span>
              <div>
                <strong>ACESSA+</strong>
                <p>
                  <i />
                  <i />
                  <i /> Consultando, planejando e revisando...
                </p>
              </div>
            </article>
          ) : null}
        </div>
        <form className="studioComposer" onSubmit={(event) => void send(event)}>
          <label htmlFor="pedagogical-chat-input">
            Fale com a mente pedagógica
          </label>
          <textarea
            id="pedagogical-chat-input"
            ref={input}
            value={draft}
            maxLength={12000}
            readOnly={busy}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ex.: Crie uma sequência didática de Ciências para o 7º ano, com leitura guiada, exemplo resolvido e apoio para um estudante que precisa de comandos curtos..."
            aria-describedby="chat-privacy"
          />
          <div className="studioComposerBottom">
            <div>
              <span>⌘</span>
              <small>Enter envia · Shift + Enter cria uma linha</small>
            </div>
            <button
              className="mindGenerate"
              disabled={busy || !draft.trim()}
              type="submit"
            >
              {busy ? "Construindo..." : "Enviar"}
              <span aria-hidden="true">↑</span>
            </button>
          </div>
        </form>
        {error ? (
          <div className="studioError" role="alert">
            <strong>Não foi possível concluir esta resposta.</strong>
            <p>
              {error} Seu pedido continua preservado na conversa para nova
              tentativa.
            </p>
          </div>
        ) : null}
        <p className="mindPrivacy" id="chat-privacy">
          A IA propõe; o professor revisa. Não informe nome completo, laudo ou
          outros dados identificáveis do estudante.
        </p>
      </section>

      {documentOpen ? (
        <aside className="studioDocument" aria-label="Editor do material">
          <header>
            <div>
              <small>Documento em construção</small>
              <strong>
                {activeProject.document
                  ? "Material pedagógico"
                  : "Aguardando criação"}
              </strong>
            </div>
            <button
              className="studioIconButton"
              type="button"
              onClick={() => setDocumentOpen(false)}
              aria-label="Fechar editor"
            >
              ×
            </button>
          </header>
          <div className="studioDocumentTools">
            <button
              type="button"
              disabled={!activeProject.document}
              onClick={() => void copyDocument()}
            >
              {copied ? "✓ Copiado" : "□ Copiar"}
            </button>
            <button
              type="button"
              disabled={!activeProject.document}
              onClick={downloadDocument}
            >
              ↓ Baixar TXT
            </button>
            <button
              type="button"
              disabled={!activeProject.document}
              onClick={printDocument}
            >
              ⌁ Imprimir
            </button>
          </div>
          {activeProject.document ? (
            <textarea
              className="studioDocumentEditor"
              aria-label="Conteúdo editável do material"
              value={activeProject.document}
              onChange={(event) =>
                updateActive((project) => ({
                  ...project,
                  document: event.currentTarget.value,
                  updatedAt: new Date().toISOString(),
                }))
              }
            />
          ) : (
            <div className="studioDocumentEmpty">
              <span>✦</span>
              <h2>O material nasce aqui.</h2>
              <p>
                A resposta final será separada da conversa para você revisar,
                editar, copiar, baixar ou imprimir sem poluição visual.
              </p>
              <ul>
                <li>Folha do estudante</li>
                <li>Leitura guiada e exemplo resolvido</li>
                <li>Gabarito e guia do professor</li>
              </ul>
            </div>
          )}
          <footer>
            <span>
              <i /> Edição local
            </span>
            <small>Alterações salvas neste navegador</small>
          </footer>
        </aside>
      ) : null}
    </main>
  );
}

function safeFileName(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "material-acessa-mais"
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

