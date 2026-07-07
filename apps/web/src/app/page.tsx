const taskCards = [
  {
    href: "/planning/new?task=printable",
    label: "Principal",
    title: "Atividade pronta para impressao",
    text: "Da habilidade curricular a uma folha A4 com questoes, instrucoes claras e espacos de resposta.",
    featured: true
  },
  {
    href: "/planning/new?task=adapted",
    label: "Inclusao",
    title: "Atividade adaptada",
    text: "Adapte para DI, TEA, DV, DA, TDAH, AH/SD, CAA, Libras ou Braille preservando o objetivo."
  },
  {
    href: "/planning/new?task=assessment",
    label: "Avaliacao",
    title: "Avaliacao",
    text: "Crie avaliacao objetiva, formativa ou adaptada com criterios claros."
  },
  {
    href: "/planning/new?task=sequence",
    label: "Percurso",
    title: "Sequencia didatica",
    text: "Organize atividades progressivas para mais de uma aula."
  },
  {
    href: "/planning/new?task=lesson",
    label: "Apoio",
    title: "Plano de aula",
    text: "Gere um plano quando precisar orientar a aplicacao do material."
  },
  {
    href: "/planning/new?task=pei",
    label: "AEE",
    title: "PEI",
    text: "Estruture objetivos pedagogicos, apoios e acompanhamento individualizado."
  },
  {
    href: "/planning/new?task=report",
    label: "Registro",
    title: "Relatorio pedagogico",
    text: "Produza registro pedagogico claro, sem perfil medico."
  },
  {
    href: "/planning/new?task=game",
    label: "Ludico",
    title: "Jogo pedagogico",
    text: "Crie jogos simples, concretos e aplicaveis em sala."
  },
  {
    href: "/planning/new?task=caa",
    label: "Acessibilidade",
    title: "CAA",
    text: "Monte atividade com pistas visuais, pranchas e comunicacao alternativa."
  },
  {
    href: "/planning/new?task=libras",
    label: "Libras",
    title: "Material em Libras",
    text: "Prepare orientacoes e suporte visual para estudantes surdos."
  },
  {
    href: "/planning/new?task=braille",
    label: "Braille",
    title: "Material em Braille",
    text: "Crie base acessivel para transcricao, tato e alto contraste."
  }
];

export default function HomePage(): React.ReactElement {
  return (
    <main className="homeShell">
      <section className="homeHero evaluatorHero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">ACESSA+ MVP</p>
          <h1 id="page-title">O que voce deseja criar hoje?</h1>
          <p className="lead">
            Crie atividades prontas para impressao em segundos. Planeje menos.
            Ensine mais. Da habilidade curricular a atividade pronta para sala
            de aula.
          </p>
          <div className="actionRow">
            <a className="primaryLink" href="/planning/new?task=printable">
              Criar atividade A4
            </a>
            <a className="textLink" href="/planning/new?task=adapted">
              Adaptar material
            </a>
          </div>
        </div>

        <aside className="homeStatus evaluatorStatus" aria-label="Resumo do MVP">
          <strong>Para demonstracao</strong>
          <ol>
            <li>Escolha o tipo de material.</li>
            <li>Informe habilidade, tema e necessidade.</li>
            <li>Receba uma folha A4 pronta para imprimir.</li>
            <li>Copie, imprima, salve e reutilize no Banco Inteligente.</li>
          </ol>
        </aside>
      </section>

      <section className="taskBoard taskBoardWide" aria-label="Tarefas principais">
        {taskCards.map((card) => (
          <a
            className={card.featured ? "taskCard featured" : "taskCard"}
            href={card.href}
            key={card.href}
          >
            <span>{card.label}</span>
            <strong>{card.title}</strong>
            <p>{card.text}</p>
          </a>
        ))}
      </section>
    </main>
  );
}
