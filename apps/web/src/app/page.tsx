const workCards = [
  {
    href: "/planning/new",
    label: "Nova missao",
    title: "Criar planejamento inclusivo",
    text: "Preencha um formulario guiado e gere um planejamento com contexto, objetivo, restricoes e produto esperado."
  },
  {
    href: "/missions",
    label: "Missoes",
    title: "Retomar o que ja foi criado",
    text: "Acesse missoes salvas, revise o planejamento e acompanhe o recurso gerado."
  },
  {
    href: "/resources",
    label: "Banco Inteligente",
    title: "Reutilizar recursos qualificados",
    text: "Busque recursos por texto, disciplina, serie, habilidade e necessidade especifica."
  }
];

const foundationSignals = [
  "Missao CREATE_LESSON_PLAN ativa",
  "Resource e ResourceVersion preservam historico",
  "Busca simples em contentText",
  "Sem IA externa no MVP atual"
];

export default function HomePage(): React.ReactElement {
  return (
    <main className="homeShell">
      <section className="homeHero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">ACESSA+ em operacao inicial</p>
          <h1 id="page-title">Planeje, revise e reutilize materiais inclusivos.</h1>
          <p className="lead">
            A primeira versao funcional reduz o tempo do professor para criar
            planejamentos inclusivos, preservar versoes e transformar cada
            recurso salvo em conhecimento reutilizavel.
          </p>
          <div className="actionRow">
            <a className="primaryLink" href="/planning/new">
              Criar nova missao
            </a>
            <a className="textLink" href="/resources">
              Buscar no Banco Inteligente
            </a>
          </div>
        </div>

        <aside className="homeStatus" aria-label="Estado atual da plataforma">
          <strong>Fluxo atual</strong>
          <ol>
            <li>Professor informa dados pedagogicos.</li>
            <li>ACESSA+ executa a missao.</li>
            <li>Planejamento vira recurso versionado.</li>
            <li>Banco Inteligente permite reutilizacao.</li>
          </ol>
        </aside>
      </section>

      <section className="workGrid" aria-label="Acoes principais">
        {workCards.map((card) => (
          <a className="workCard" href={card.href} key={card.href}>
            <span>{card.label}</span>
            <strong>{card.title}</strong>
            <p>{card.text}</p>
          </a>
        ))}
      </section>

      <section className="foundationStrip" aria-label="Fundacao preservada">
        {foundationSignals.map((signal) => (
          <span key={signal}>{signal}</span>
        ))}
      </section>
    </main>
  );
}
