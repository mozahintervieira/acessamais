const principles = [
  { number: "01", title: "Você pede", text: "Descreva a situação pedagógica com suas próprias palavras." },
  { number: "02", title: "A mente pedagógica organiza", text: "O ACESSA+ conecta objetivo, currículo, barreiras e apoios." },
  { number: "03", title: "Você decide", text: "Revise, adapte, salve e leve o material para a sala de aula." }
];

export function PublicLanding(): React.ReactElement {
  return (
    <main className="publicLanding">
      <header className="landingNav">
        <a className="landingBrand" href="/" aria-label="ACESSA+ início">
          <span>A+</span>
          <strong>ACESSA<span>+</span></strong>
        </a>
        <nav aria-label="Navegação da página">
          <a href="#como-funciona">Como funciona</a>
          <a href="#inteligencia">A mente pedagógica</a>
          <a href="#seguranca">Segurança</a>
        </nav>
        <div className="landingActions">
          <a href="/login">Entrar</a>
          <a className="landingButton small" href="/cadastro">Começar gratuitamente</a>
        </div>
      </header>

      <section className="landingHero" aria-labelledby="landing-title">
        <div className="landingHeroCopy">
          <p className="landingKicker"><span aria-hidden="true" /> Inteligência pedagógica inclusiva</p>
          <h1 id="landing-title">A IA que pensa com o professor.</h1>
          <p className="landingLead">
            Transforme uma intenção pedagógica em atividades acessíveis, planejamentos e materiais prontos para revisar — com currículo, DUA e inclusão no centro.
          </p>
          <div className="landingCtas">
            <a className="landingButton" href="/cadastro">Criar gratuitamente <span aria-hidden="true">→</span></a>
            <a className="landingTextButton" href="#como-funciona"><span aria-hidden="true">▷</span> Ver como funciona</a>
          </div>
          <div className="landingSignals" aria-label="Características do ACESSA+">
            <span>Sem formulário longo</span><span>Revisão docente</span><span>PDF e DOCX</span>
          </div>
        </div>
        <div className="landingHeroArt" role="img" aria-label="Composição visual de conhecimento, acessibilidade e inteligência pedagógica" />
      </section>

      <section className="landingTrustLine" aria-label="Fundamentos pedagógicos">
        <span>BNCC</span><span>Currículo Capixaba</span><span>DUA</span><span>Bloom</span><span>CAA</span><span>Tecnologia Assistiva</span>
      </section>

      <section className="landingSection landingSteps" id="como-funciona" aria-labelledby="steps-title">
        <div className="landingSectionIntro"><p className="landingKicker"><span aria-hidden="true" /> Simples para começar</p><h2 id="steps-title">Você não precisa aprender a usar outra ferramenta.</h2><p>Fale com o ACESSA+ como falaria com um parceiro pedagógico. Os detalhes aparecem quando forem necessários.</p></div>
        <div className="landingStepGrid">{principles.map((item) => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
      </section>

      <section className="landingMind" id="inteligencia" aria-labelledby="mind-title">
        <div className="landingMindCopy"><p className="landingKicker"><span aria-hidden="true" /> Por trás de cada pedido</p><h2 id="mind-title">Uma mente pedagógica, não um chatbot genérico.</h2><p>O ACESSA+ interpreta a intenção, considera o contexto curricular e propõe caminhos de acesso, participação e expressão. A decisão final continua sendo do professor.</p><a className="landingTextButton" href="/cadastro">Experimentar a mente pedagógica <span aria-hidden="true">→</span></a></div>
        <div className="landingMindDiagram" aria-label="Fluxo da mente pedagógica"><div><span>Seu pedido</span><b>Crie uma atividade sobre ecossistemas para o 7º ano com apoio visual.</b></div><i aria-hidden="true">→</i><div><span>ACESSA+</span><b>Objetivo · barreira · apoio · evidência</b></div><i aria-hidden="true">→</i><div><span>Resultado</span><b>Material para revisar e usar</b></div></div>
      </section>

      <section className="landingSection landingProof" id="seguranca" aria-labelledby="proof-title">
        <div><p className="landingKicker"><span aria-hidden="true" /> Construído para educação</p><h2 id="proof-title">Tecnologia com responsabilidade pedagógica.</h2></div>
        <div className="landingProofGrid"><article><strong>Contexto antes de resposta</strong><p>Currículo, objetivo e perfil pedagógico orientam o material.</p></article><article><strong>Dados mínimos</strong><p>Use informações necessárias para a personalização e evite dados clínicos sensíveis.</p></article><article><strong>Professor no controle</strong><p>A IA propõe. O professor revisa, edita e decide o que chega ao estudante.</p></article></div>
      </section>

      <section className="landingFinalCta"><p className="landingKicker"><span aria-hidden="true" /> O próximo material começa com uma frase</p><h2>Pronto para conversar com sua mente pedagógica?</h2><a className="landingButton" href="/cadastro">Começar gratuitamente <span aria-hidden="true">→</span></a></section>
      <footer className="landingFooter"><span>ACESSA+ · Inteligência inclusiva para educação</span><div><a href="/login">Entrar</a><a href="/cadastro">Criar conta</a></div></footer>
    </main>
  );
}
