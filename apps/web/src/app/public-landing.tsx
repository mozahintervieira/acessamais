const operatingLayers = [
  { number: "01", title: "Compreende o pedido", text: "O professor conversa naturalmente. A plataforma identifica etapa, objetivo, barreiras, apoios e formato de entrega." },
  { number: "02", title: "Organiza a decisão pedagógica", text: "Currículo, DUA, acessibilidade e progressão cognitiva orientam a proposta antes da produção do material." },
  { number: "03", title: "Constrói e revisa", text: "A atividade nasce no editor, com folha do estudante, exemplo resolvido, gabarito e guia do professor." },
];

const differentiators = [
  { icon: "◈", title: "Pedagogia antes do prompt", text: "Uma experiência vertical para educação inclusiva, criada a partir da prática real do AEE." },
  { icon: "⌁", title: "Currículo com evidência", text: "A fonte oficial é consultada e a plataforma não deve inventar códigos quando a conferência não for possível." },
  { icon: "◎", title: "Material que vira trabalho", text: "O resultado pode ser revisto, editado, copiado e organizado em páginas A4 para uso pedagógico." },
  { icon: "✦", title: "Inclusão desde a arquitetura", text: "DUA, CAA, Tecnologia Assistiva e diferentes formas de participação entram como critérios de projeto." },
];

const investmentMilestones = [
  "Roteamento inteligente entre modelos de IA conforme a complexidade do pedido",
  "Geração multimodal de recursos visuais didáticos e acessíveis",
  "Base curricular estruturada, versionada e rastreável por componente e etapa",
  "Avaliação contínua com professores e indicadores de qualidade pedagógica",
];

const evidenceCases = [
  {
    label: "MATEMÁTICA · 6º ANO",
    title: "Frações com apoio concreto",
    request: "Explique frações sem infantilizar e permita diferentes formas de resposta.",
    delivery: "Leitura guiada, exemplo 3/4 resolvido passo a passo, três tarefas e gabarito comentado.",
    access: "Desenho, material manipulável, resposta oral ou escrita.",
    href: "/demonstracoes#fracoes",
  },
  {
    label: "AEE · PLANEJAMENTO",
    title: "Participação e autonomia",
    request: "Organize apoios para um estudante que perde a sequência em tarefas longas.",
    delivery: "Agenda visual em três etapas, modelagem inicial, redução gradual de pistas e registro formativo.",
    access: "Escolha de resposta, checklist e temporizador visual opcional.",
    href: "/demonstracoes#aee",
  },
  {
    label: "CIÊNCIAS · ANOS FINAIS",
    title: "Ecossistemas com leitura guiada",
    request: "Crie uma atividade curta, visual e acessível sobre cadeia alimentar.",
    delivery: "Texto-base autoral, cadeia linear, exemplo respondido, três questões e respostas esperadas.",
    access: "Blocos curtos, vocabulário explicado e resposta apontada, oral ou escrita.",
    href: "/demonstracoes#ecossistemas",
  },
];

export function PublicLanding(): React.ReactElement {
  return (
    <main className="publicLanding incubatorLanding">
      <header className="landingNav">
        <a className="landingBrand" href="/" aria-label="ACESSA+ início"><span>A+</span><strong>ACESSA<span>+</span></strong></a>
        <nav aria-label="Navegação da página"><a href="#produto">Produto</a><a href="#demonstracao">Demonstração</a><a href="#evidencias">Exemplos</a><a href="#diferenciais">Diferenciais</a><a href="#historia">Nossa história</a></nav>
        <div className="landingActions"><a href="/login">Entrar</a><a className="landingButton small" href="/cadastro">Acessar o protótipo</a></div>
      </header>

      <section className="landingHero incubatorHero" aria-labelledby="landing-title">
        <div className="landingHeroCopy">
          <p className="prototypeBadge"><span aria-hidden="true" /> Protótipo funcional em validação</p>
          <p className="landingKicker"><span aria-hidden="true" /> Inteligência pedagógica inclusiva</p>
          <h1 id="landing-title">A IA que pensa com o professor.</h1>
          <p className="landingLead">Transforme uma intenção pedagógica em atividades acessíveis, planejamentos e materiais editáveis — com currículo, DUA e inclusão no centro.</p>
          <div className="landingCtas"><a className="landingButton" href="/cadastro">Acessar o protótipo <span aria-hidden="true">→</span></a><a className="landingTextButton" href="#demonstracao"><span aria-hidden="true">▷</span> Ver o produto em ação</a></div>
          <p className="prototypeAccessNote">Cadastro necessário para criar e manter projetos no laboratório.</p>
          <div className="landingSignals" aria-label="Estado atual do produto"><span>Conversa com contexto</span><span>Editor A4</span><span>BNCC + Currículo ES 2026</span></div>
        </div>
        <div className="landingHeroArt" role="img" aria-label="Livro aberto conectado a interfaces de acessibilidade e inteligência artificial">
          <div className="heroOutputProof">
            <small>UMA ENTREGA DO ACESSA+</small>
            <strong>Atividade pronta para o professor revisar</strong>
            <div><span>Folha do estudante</span><span>Exemplo resolvido</span><span>Gabarito</span></div>
            <p><i aria-hidden="true">✓</i> Editável, acessível e organizada em A4</p>
          </div>
        </div>
      </section>

      <section className="landingTrustLine" aria-label="Fundamentos do ACESSA+"><span>BNCC</span><span>Currículo Capixaba</span><span>DUA</span><span>Bloom</span><span>CAA</span><span>Tecnologia Assistiva</span></section>
      <p className="curriculumScopeNote"><strong>Base nacional, aplicação territorial.</strong> A BNCC orienta as aprendizagens essenciais; o Currículo Capixaba é a referência territorial inicial do protótipo, preparado para incorporar currículos de outras redes na expansão nacional.</p>

      <section className="ventureStatement" id="produto" aria-labelledby="venture-title">
        <div><p className="landingKicker"><span aria-hidden="true" /> O problema que decidimos enfrentar</p><h2 id="venture-title">Ensinar para todos ainda exige um trabalho invisível e fragmentado.</h2></div>
        <div className="ventureCopy"><p>Professores precisam interpretar currículo, compreender barreiras, selecionar apoios e produzir materiais acessíveis — frequentemente em ferramentas desconectadas e com pouco tempo para planejar.</p><p><strong>O ACESSA+ concentra esse percurso em uma conversa.</strong> A tecnologia não substitui o professor: organiza decisões, acelera a produção e devolve ao educador o controle sobre o resultado.</p></div>
      </section>

      <section className="landingSection landingSteps" aria-labelledby="layers-title">
        <div className="landingSectionIntro"><p className="landingKicker"><span aria-hidden="true" /> Uma incubadora de decisões pedagógicas</p><h2 id="layers-title">Do pedido livre ao material utilizável.</h2><p>Sem transformar a prática docente em um formulário. Quando uma informação pode mudar a adaptação, a conversa pode solicitar um esclarecimento.</p></div>
        <div className="landingStepGrid">{operatingLayers.map((item) => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        <aside className="flowConversationExample" aria-labelledby="conversation-example-title">
          <div><span>CONVERSA ILUSTRATIVA</span><h3 id="conversation-example-title">O contexto entra pela conversa.</h3><p>O exemplo demonstra como uma informação relevante pode ser esclarecida antes da adaptação. Não representa uma resposta fixa.</p></div>
          <div className="flowConversationMessages">
            <p><strong>Professor</strong> “Adapte esta atividade de frações do 6º ano.”</p>
            <p><strong>ACESSA+</strong> “O estudante já reconhece partes iguais de um inteiro?”</p>
          </div>
        </aside>
      </section>

      <section className="productDemo" id="demonstracao" aria-labelledby="demo-title">
        <div className="productDemoIntro"><p className="landingKicker"><span aria-hidden="true" /> Demonstração do núcleo funcional</p><h2 id="demo-title">Converse. Refine. Entregue.</h2><p>O protótipo já mantém o contexto da conversa e organiza o resultado em um ambiente de trabalho separado do chat.</p><a className="landingTextButton" href="/demonstracoes">Explorar demonstrações <span aria-hidden="true">→</span></a></div>
        <div className="demoWorkbench" aria-label="Simulação da interface do ACESSA+">
          <div className="demoRail"><b>A+</b><span>Projeto</span><span>Currículo</span><span>Arquivos</span><i /></div>
          <div className="demoChat"><small>CONVERSA PEDAGÓGICA</small><div className="demoUser">Crie uma atividade de Língua Portuguesa para o Ensino Médio com apoio visual e gabarito.</div><div className="demoAi"><b>ACESSA+</b><p>Entendi. Vou organizar leitura guiada, recurso visual funcional, exemplo resolvido e quatro tarefas progressivas.</p><span>Currículo oficial consultado</span></div><div className="demoComposer">Peça uma alteração ou continue o trabalho… <b>↑</b></div></div>
          <div className="demoDocument"><div className="demoDocBar"><span>DOCUMENTO EM CONSTRUÇÃO</span><b>Editar · PDF A4 · Imprimir</b></div><div className="demoSheet"><small>FOLHA DO ESTUDANTE</small><h3>Informação que chega, participação que acontece</h3><p>Texto autoral, leitura guiada e um mapa visual que participa da resolução.</p><div className="demoMap"><span>BARREIRA</span><i>→</i><span>APOIO</span><i>→</i><span>PARTICIPAÇÃO</span></div><strong>1. Observe o mapa e explique a relação.</strong><div className="answerLines" /></div></div>
        </div>
      </section>

      <section className="evidenceSection" id="evidencias" aria-labelledby="evidence-title">
        <div className="evidenceHeading">
          <div><p className="landingKicker"><span aria-hidden="true" /> Evidência acessível do produto</p><h2 id="evidence-title">Veja o que chega às mãos do professor.</h2></div>
          <div className="evidenceStatus"><span>FUNCIONA HOJE NO PROTÓTIPO</span><p>Conversa contextual, produção textual, revisão, editor e organização para impressão.</p><small>Os exemplos foram revisados manualmente para demonstrar o padrão esperado. Não representam validação automática nem substituem a conferência docente.</small></div>
        </div>
        <div className="evidenceGrid">
          {evidenceCases.map((item, index) => (
            <article key={item.title}>
              <div className="evidenceCardTop"><span>{item.label}</span><b>0{index + 1}</b></div>
              <h3>{item.title}</h3>
              <dl>
                <div><dt>PEDIDO DO PROFESSOR</dt><dd>{item.request}</dd></div>
                <div><dt>ENTREGA DEMONSTRADA</dt><dd>{item.delivery}</dd></div>
                <div><dt>ACESSIBILIDADE</dt><dd>{item.access}</dd></div>
              </dl>
              <a href={index === 0 ? "#atividade-fracoes" : item.href}>{index === 0 ? "Ir para a atividade completa" : "Abrir exemplo completo"} <span aria-hidden="true">↗</span></a>
            </article>
          ))}
        </div>
        <details className="fractionDemoDisclosure" id="atividade-fracoes">
          <summary><span>Ver atividade completa</span><small>Exemplo público · sem cadastro</small><i aria-hidden="true">＋</i></summary>
          <div className="fractionDemoContent">
            <header className="fractionDemoHeading">
              <p className="landingKicker"><span aria-hidden="true" /> Demonstração pedagógica</p>
              <h3>Frações com apoio concreto — 6º ano</h3>
              <p><strong>Exemplo preparado e revisado pela equipe do Acessa+.</strong> Esta é uma vitrine estática: mostra o padrão esperado, mas não gera um novo material.</p>
              <p><b>Objetivo preservado nas duas versões:</b> representar frações como partes iguais de um todo e comparar frações simples.</p>
            </header>

            <div className="fractionComparison" aria-label="Comparação entre atividade de partida e versão adaptada">
              <article className="startingActivity">
                <div className="comparisonLabel"><span>ATIVIDADE DE PARTIDA</span><small>Exemplo demonstrativo</small></div>
                <h4>Frações — 6º ano</h4>
                <p><strong>Objetivo:</strong> representar frações como partes iguais de um todo e comparar frações simples.</p>
                <ol>
                  <li>Uma barra foi dividida em quatro partes iguais. Três partes foram consideradas. Escreva a fração correspondente.</li>
                  <li>Compare <strong>1/2</strong> e <strong>1/4</strong>. Qual fração é maior? Justifique.</li>
                  <li>Desenhe uma figura dividida em três partes iguais e represente <strong>2/3</strong>.</li>
                </ol>
                <p className="startingActivityNote">Versão curta criada para esta demonstração, pois o repositório não contém a atividade de partida correspondente.</p>
              </article>

              <article className="publicA4Preview" aria-labelledby="fraction-sheet-title">
                <header className="publicA4Brand"><span>A+</span><div><strong>ACESSA+</strong><small>MATEMÁTICA · 6º ANO</small></div><em>Folha do estudante</em></header>
                <h4 id="fraction-sheet-title">Frações: partes iguais de um todo</h4>
                <p className="a4Objective"><strong>Hoje eu vou:</strong> representar e comparar frações simples.</p>
                <section aria-labelledby="guided-reading-title">
                  <h5 id="guided-reading-title">Leitura guiada</h5>
                  <p>Uma fração mostra quantas partes iguais de um todo estamos considerando. O número de baixo indica em quantas partes iguais o todo foi dividido. O número de cima indica quantas partes foram consideradas.</p>
                </section>
                <section className="fractionWorkedExample" aria-labelledby="worked-example-title">
                  <h5 id="worked-example-title">Exemplo resolvido: 3/4</h5>
                  <div className="fractionBar" role="img" aria-label="Barra dividida em quatro partes iguais. As três primeiras estão marcadas com o símbolo de seleção e representam três quartos; a quarta não está marcada.">
                    <span className="selected" aria-hidden="true">✓<small>1</small></span><span className="selected" aria-hidden="true">✓<small>2</small></span><span className="selected" aria-hidden="true">✓<small>3</small></span><span aria-hidden="true"><small>4</small></span>
                  </div>
                  <ol><li>O todo foi dividido em <strong>4 partes iguais</strong>.</li><li><strong>3 partes</strong> estão marcadas.</li><li>A fração representada é <strong>3/4</strong>.</li></ol>
                </section>
                <section className="fractionStudentQuestions" aria-labelledby="fraction-questions-title">
                  <h5 id="fraction-questions-title">Agora é sua vez</h5>
                  <div><b>1</b><p>Uma barra tem 4 partes iguais. Marque duas partes. Qual fração você formou?</p><span className="responseLine">Resposta:</span></div>
                  <div><b>2</b><p>Qual é maior: <strong>1/2</strong> ou <strong>1/4</strong>?</p><div className="fractionChoiceOptions" aria-label="Opções de resposta: um meio ou um quarto"><span><i aria-hidden="true">□</i> 1/2</span><span><i aria-hidden="true">□</i> 1/4</span></div><span className="responseLine">Explique:</span></div>
                  <div><b>3</b><p>Divida o quadro em 3 partes iguais e represente <strong>2/3</strong>.</p><span className="drawingResponse" aria-label="Espaço em branco para desenhar a resposta" /></div>
                </section>
                <footer>Você pode responder marcando, desenhando, falando ou escrevendo.</footer>
              </article>
            </div>
            <aside className="fractionAnswerKey" aria-labelledby="fraction-answer-title">
              <div><span>SEPARADO DA FOLHA DO ESTUDANTE</span><h4 id="fraction-answer-title">Gabarito comentado</h4></div>
              <ol><li><strong>2/4</strong>. Foram consideradas duas das quatro partes iguais.</li><li><strong>1/2</strong>. Quando o todo é o mesmo, uma de duas partes iguais é maior que uma de quatro partes iguais.</li><li>Espera-se uma figura dividida em três partes iguais, com duas partes identificadas: <strong>2/3</strong>.</li></ol>
            </aside>
          </div>
        </details>
        <div className="evidenceFlow" aria-label="Percurso demonstrado pelo produto"><span>PEDIDO LIVRE</span><i>→</i><span>CONTEXTO PEDAGÓGICO</span><i>→</i><span>MATERIAL EDITÁVEL</span><i>→</i><span>REVISÃO DOCENTE</span></div>
      </section>

      <section className="landingSection" id="diferenciais" aria-labelledby="difference-title">
        <div className="landingSectionIntro"><p className="landingKicker"><span aria-hidden="true" /> Por que este produto pode ser diferente</p><h2 id="difference-title">IA vertical com conhecimento de chão de escola.</h2><p>O diferencial não é apenas o modelo de linguagem. É a combinação entre experiência pedagógica, critérios de qualidade, fontes confiáveis e ferramentas de trabalho.</p></div>
        <div className="differenceGrid">{differentiators.map((item) => <article key={item.title}><span>{item.icon}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
      </section>

      <section className="visionSection" id="visao" aria-labelledby="vision-title">
        <div className="visionHeadline"><p className="landingKicker"><span aria-hidden="true" /> O que o investimento viabiliza</p><h2 id="vision-title">Do protótipo validável à infraestrutura de inteligência educacional.</h2><p>Os itens ao lado são próximos marcos de desenvolvimento, não recursos anunciados como concluídos.</p></div>
        <ol className="visionRoadmap">{investmentMilestones.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></li>)}</ol>
      </section>

      <section className="institutionalSection" aria-labelledby="institutional-title">
        <div className="institutionalMonogram" aria-hidden="true"><span>A+</span><i>INTELIGÊNCIA<br />PEDAGÓGICA INCLUSIVA</i></div>
        <div className="institutionalNarrative"><p className="landingKicker"><span aria-hidden="true" /> Origem pedagógica</p><h2 id="institutional-title">Tecnologia construída a partir das necessidades reais da educação inclusiva.</h2><p>O ACESSA+ nasce da prática pedagógica e da urgência de tornar o currículo acessível sem reduzir o potencial dos estudantes. Sua proposta reúne conhecimento educacional, acessibilidade e inteligência artificial em um ambiente de trabalho orientado pela decisão docente.</p><blockquote>“A tecnologia organiza caminhos. O professor preserva a autoria, a avaliação e a decisão sobre o que chega ao estudante.”</blockquote></div>
      </section>

      <section className="originStorySection" id="historia" aria-labelledby="origin-story-title">
        <div className="originStoryVisual">
          <div className="originStoryOrbit" aria-hidden="true"><span /><span /><span /></div>
          <figure>
            <img
              src="/ana-juntos-podemos.jpg"
              alt="Desenho circular criado por Ana, com crianças de mãos dadas formando uma grande corrente. Ana aparece como a menina negra de vestido amarelo e é a única criança colorida."
            />
            <figcaption>Desenho original de Ana · inspiração afetiva do ACESSA+</figcaption>
          </figure>
          <div className="originStorySignal" aria-hidden="true"><span>A</span><i>afeto</i><b>+</b><i>acesso</i><b>+</b><i>aprendizagem</i></div>
        </div>
        <div className="originStoryCopy">
          <p className="landingKicker"><span aria-hidden="true" /> Onde nasce o ACESSA+</p>
          <h2 id="origin-story-title">A plataforma nasceu de uma pergunta que não pode ser ignorada: o estudante está na sala, mas encontra condições reais para aprender?</h2>
          <p>Em uma turma numerosa, o professor precisa ensinar o currículo a todos. Ao mesmo tempo, alguns estudantes encontram barreiras na leitura, na comunicação, na visão, na audição, na compreensão das etapas ou na forma de registrar uma resposta. Preparar caminhos diferentes, sem reduzir o objetivo de aprendizagem, exige tempo, conhecimento e trabalho conjunto.</p>
          <p>Foi da experiência cotidiana no Atendimento Educacional Especializado que nasceu o ACESSA+. Adaptar não é simplesmente facilitar uma atividade: é identificar a barreira, preservar o que deve ser aprendido e oferecer apoios para que o estudante participe, produza e demonstre o que sabe.</p>
          <p>Por isso, o ACESSA+ está sendo desenvolvido como uma mente pedagógica inclusiva. A inteligência artificial organiza possibilidades, consulta referências curriculares e ajuda a transformar materiais; o professor continua responsável pela decisão, pela revisão e pelo olhar sobre cada contexto.</p>
          <p>É uma solução nascida no interior do Espírito Santo, com o propósito de apoiar quem ensina e ampliar as oportunidades de quem aprende. Seu ponto de partida é simples e inegociável: inclusão não é apenas estar na sala de aula. É ter condições reais de aprender.</p>
          <p>Essa origem também ganhou um símbolo criado por Ana. Em seu desenho, crianças com diferentes características formam uma grande corrente. Ana se colocou entre elas como a menina negra de vestido amarelo e resumiu, com sensibilidade, o compromisso que orienta a plataforma:</p>
          <blockquote>“Juntos, todos podemos conseguir.”<cite>— Ana</cite></blockquote>
          <p className="originStoryClosing">Por isso, o <strong>A</strong> de ACESSA+ também guarda a presença de <strong>Ana</strong>: uma lembrança permanente de que acessibilidade, afeto, aprendizagem e pertencimento precisam caminhar juntos.</p>
        </div>
      </section>

      <section className="landingFinalCta"><p className="landingKicker"><span aria-hidden="true" /> ACESSA+ · Protótipo para apresentação</p><h2>Uma tecnologia educacional criada para ampliar possibilidades.</h2><p>Conheça o laboratório, teste o fluxo e fale com o ACESSA+ pelo canal institucional.</p><div className="landingCtas"><a className="landingButton" href="/cadastro">Acessar o protótipo <span aria-hidden="true">→</span></a><a className="landingTextButton" href="mailto:acessamais5.0@gmail.com">acessamais5.0@gmail.com</a></div></section>
      <footer className="landingFooter"><span>ACESSA+ · Inteligência pedagógica inclusiva</span><div><a href="mailto:acessamais5.0@gmail.com">acessamais5.0@gmail.com</a><a href="/termos">Termos</a><a href="/privacidade">Privacidade</a><a href="/login">Entrar</a></div></footer>
    </main>
  );
}


