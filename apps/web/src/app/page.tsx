const taskCards = [
  {
    href: "/planning/new",
    label: "Planejamento",
    title: "Criar uma aula inclusiva",
    text: "Transforme objetivo, habilidade e necessidade pedagogica em um documento pronto para revisar e usar.",
    action: "Comecar planejamento"
  },
  {
    href: "/planning/new?task=activity",
    label: "Atividade",
    title: "Gerar atividade adaptada",
    text: "Produza uma proposta acessivel com comandos claros, apoios, avaliacao e sugestoes de reutilizacao.",
    action: "Criar atividade"
  },
  {
    href: "/resources",
    label: "Acervo",
    title: "Reutilizar materiais salvos",
    text: "Recupere recursos por disciplina, serie, habilidade, necessidade ou trecho do conteudo.",
    action: "Abrir Banco Inteligente"
  }
];

const valueSignals = [
  "Documento profissional para banca",
  "Gera planejamento, atividade, adaptacao e relatorio",
  "Preserva versoes para revisao",
  "Preparado para religar o backend NestJS"
];

export default function HomePage(): React.ReactElement {
  return (
    <main className="homeShell">
      <section className="homeHero evaluatorHero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">ACESSA+ MVP demonstravel</p>
          <h1 id="page-title">O que deseja criar hoje?</h1>
          <p className="lead">
            Uma plataforma web para professores planejarem, adaptarem e
            reutilizarem materiais inclusivos com apoio de inteligencia
            pedagogica, acessibilidade e versionamento.
          </p>
          <div className="signalRow" aria-label="Diferenciais do MVP">
            {valueSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
        </div>

        <aside className="homeStatus evaluatorStatus" aria-label="Fluxo de trabalho">
          <strong>Fluxo de demonstracao</strong>
          <ol>
            <li>Escolha uma tarefa pedagogica.</li>
            <li>Informe apenas o essencial no inicio.</li>
            <li>Receba um documento profissional editavel.</li>
            <li>Salve versoes e reutilize no Banco Inteligente.</li>
          </ol>
        </aside>
      </section>

      <section className="taskBoard" aria-label="Tarefas principais">
        {taskCards.map((card) => (
          <a className="taskCard" href={card.href} key={card.href}>
            <span>{card.label}</span>
            <strong>{card.title}</strong>
            <p>{card.text}</p>
            <b>{card.action}</b>
          </a>
        ))}
      </section>

      <section className="demoStrip" aria-label="Estado do produto">
        <div>
          <p className="panelLabel">Produto em producao</p>
          <h2>Pronto para avaliacao, demonstracao e captacao.</h2>
        </div>
        <a className="primaryLink" href="/planning/new">
          Criar primeiro documento
        </a>
      </section>
    </main>
  );
}
