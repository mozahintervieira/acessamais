const caaCategories = [
  ["Comunicação básica", "sim, não, quero, preciso"],
  ["Escola", "materiais, aula, intervalo, professor"],
  ["Rotina", "cheguei, terminei, esperar, depois"],
  ["Emoções", "feliz, triste, cansado, preocupado"],
  ["Alimentação", "água, lanche, fome, sede"],
  ["Família", "mãe, pai, casa, responsáveis"],
  ["Necessidades", "banheiro, ajuda, dor, descanso"],
  ["Respostas", "concordo, discordo, não entendi"],
  ["Escolhas", "este, aquele, mais, parar"],
  ["Comunicação funcional", "pedir, recusar, comentar, perguntar"]
];

export default function CaaPage(): React.ReactElement {
  return (
    <main className="missionShell caaShell">
      <section className="missionIntro caaHero">
        <p className="eyebrow">CAA</p>
        <h1>Comunicação Aumentativa e Alternativa</h1>
        <p className="lead">
          Um espaço visual para organizar possibilidades de comunicação
          funcional na escola, com responsabilidade pedagógica e validação antes
          do uso com estudantes.
        </p>
        <div className="caaNotice">
          Exemplo visual para demonstração. Requer validação pedagógica antes do uso.
        </div>
      </section>

      <section className="caaGrid" aria-label="Categorias demonstrativas de CAA">
        {caaCategories.map(([title, examples], index) => (
          <article className="caaCard" key={title}>
            <span aria-hidden="true">{index + 1}</span>
            <strong>{title}</strong>
            <p>{examples}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
