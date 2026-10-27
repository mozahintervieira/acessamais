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
          <a href="#exemplos">Exemplos</a>
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

      <section className="landingSection landingExamples" id="exemplos" aria-labelledby="examples-title">
        <div className="landingSectionIntro">
          <p className="landingKicker"><span aria-hidden="true" /> Resultado antes do cadastro</p>
          <h2 id="examples-title">Veja o que você pode construir.</h2>
          <p>Três amostras mostram a lógica da entrega. O material final permanece editável e a decisão de uso é sempre do professor.</p>
        </div>
        <div className="landingExampleGrid">
          <article>
            <span>ATIVIDADE ADAPTADA</span>
            <h3>Frações com apoio concreto</h3>
            <p>Leitura guiada, exemplo resolvido, progressão de tarefas e gabarito comentado para revisão docente.</p>
            <details><summary>Ver amostra</summary><div><b>Pedido</b><p>Atividade de Matemática para o 6º ano, com comandos curtos e apoio visual funcional.</p><b>Entrega</b><p>Representação parte–todo, exemplo passo a passo, respostas por marcação e escrita e critérios de acompanhamento.</p></div></details>
          </article>
          <article>
            <span>PLANEJAMENTO DE AEE</span>
            <h3>Acesso, participação e autonomia</h3>
            <p>Objetivo pedagógico, barreiras observadas, apoios pertinentes e evidências possíveis de aprendizagem.</p>
            <details><summary>Ver amostra</summary><div><b>Pedido</b><p>Planejar mediação para estudante que compreende o conteúdo, mas precisa organizar as etapas da tarefa.</p><b>Entrega</b><p>Sequência visual, modelo inicial, escolha de forma de resposta e registro formativo sem exigir diagnóstico.</p></div></details>
          </article>
          <article>
            <span>MATERIAL ACESSÍVEL</span>
            <h3>Ciências com leitura guiada</h3>
            <p>Conteúdo necessário para resolver, vocabulário acessível e diferentes formas de participação.</p>
            <details><summary>Ver amostra</summary><div><b>Pedido</b><p>Material sobre ecossistemas para o 7º ano, com apoio para leitura e baixa ambiguidade.</p><b>Entrega</b><p>Texto-base curto, relações entre seres vivos, organizador visual e perguntas graduadas com respostas comentadas.</p></div></details>
          </article>
        </div>
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

      <section className="landingFounder" aria-labelledby="founder-title">
        <div><p className="landingKicker"><span aria-hidden="true" /> Criado dentro da educação inclusiva</p><h2 id="founder-title">Experiência pedagógica antes da tecnologia.</h2></div>
        <p>O ACESSA+ foi idealizado por Mozahinter Alves Vieira, professor do Atendimento Educacional Especializado, autista e pai atípico. A plataforma nasce da prática com professores e estudantes e transforma essa experiência em apoio editável — sem substituir a autoria nem a decisão docente.</p>
      </section>

      <section className="landingFinalCta"><p className="landingKicker"><span aria-hidden="true" /> O próximo material começa com uma frase</p><h2>Pronto para conversar com sua mente pedagógica?</h2><a className="landingButton" href="/cadastro">Começar gratuitamente <span aria-hidden="true">→</span></a></section>
      <footer className="landingFooter"><span>ACESSA+ · Inteligência inclusiva para educação</span><div><a href="/termos">Termos</a><a href="/privacidade">Privacidade</a><a href="/login">Entrar</a><a href="/cadastro">Criar conta</a></div></footer>
    </main>
  );
}

