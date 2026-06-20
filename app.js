const STORAGE_KEYS = {
  saved: "acessaplus.saved.v2",
  settings: "acessaplus.settings.v2"
};

const LEGACY_STORAGE_KEYS = {
  saved: "assistaplus.saved.v2",
  settings: "assistaplus.settings.v2"
};

const DEFAULT_SETTINGS = {
  ownerName: "Mozahinter Alves Vieira",
  footerText: "Acessa+ | Educação Inclusiva na Prática",
  aiEndpoint: "",
  highContrast: false,
  simpleMode: false,
  fontScale: 0
};

const state = {
  currentKind: "activity",
  currentResult: "",
  currentMeta: null,
  saved: readJson(STORAGE_KEYS.saved, readJson(LEGACY_STORAGE_KEYS.saved, [])),
  settings: normalizeSettings(readJson(STORAGE_KEYS.settings, readJson(LEGACY_STORAGE_KEYS.settings, DEFAULT_SETTINGS))),
  installPrompt: null
};

writeJson(STORAGE_KEYS.saved, state.saved);
writeJson(STORAGE_KEYS.settings, state.settings);

const adaptations = {
  "DI": {
    title: "Deficiência Intelectual",
    text: "Linguagem simples, comandos curtos, exemplo concreto, menor carga de leitura, resposta por marcação, pareamento, desenho ou oralidade.",
    response: "marcar, ligar, apontar, desenhar, falar ou escolher entre alternativas visuais"
  },
  "TEA": {
    title: "Transtorno do Espectro Autista",
    text: "Previsibilidade, rotina visual, instruções objetivas, redução de ambiguidades, interesse do estudante e possibilidade de resposta alternativa.",
    response: "seguir sequência visual, escolher cartões, responder por CAA, fala, escrita ou apontamento"
  },
  "DV": {
    title: "Deficiência Visual",
    text: "Descrição verbal, contraste, fonte ampliada para baixa visão, material tátil, áudio e Braille quando utilizado pelo estudante.",
    response: "responder oralmente, em Braille, áudio, objeto concreto, tecnologia assistiva ou mediação descritiva"
  },
  "DA": {
    title: "Deficiência Auditiva",
    text: "Apoio visual, comandos escritos, Libras quando utilizada, legenda, imagens, pistas visuais e checagem de compreensão.",
    response: "responder por escrita, imagem, Libras, seleção visual, desenho ou registro breve"
  },
  "TDAH": {
    title: "TDAH",
    text: "Blocos curtos, checklist, metas visíveis, tempo organizado, pausas combinadas e redução de estímulos concorrentes.",
    response: "concluir uma etapa por vez, marcar checklist, responder em blocos e usar timer pedagógico"
  },
  "AH/SD": {
    title: "Altas Habilidades/Superdotação",
    text: "Aprofundamento, investigação, autoria, resolução de problemas, escolhas, complexidade e níveis superiores da Taxonomia de Bloom.",
    response: "criar, justificar, comparar, investigar, propor solução ou produzir versão autoral"
  },
  "Múltiplas deficiências": {
    title: "Múltiplas deficiências",
    text: "Combinação de acessibilidade comunicacional, sensorial, motora e cognitiva, com múltiplas formas de participação.",
    response: "participar por resposta assistida, CAA, objeto concreto, olhar, toque, gesto, áudio ou mediação"
  }
};

const kindLabels = {
  activity: "Atividade adaptada",
  adaptation: "Adaptação de atividade",
  plan: "Plano de aula inclusivo",
  pei: "PEI",
  evaluation: "Avaliação adaptada",
  aba: "ABA na prática escolar",
  caa: "CAA e tecnologia assistiva",
  report: "Relatório pedagógico"
};

const guideItems = [
  {
    title: "1. Habilidade curricular",
    text: "O app parte da BNCC ou Currículo Capixaba informado pelo professor e preserva a intenção pedagógica."
  },
  {
    title: "2. Perfil do estudante",
    text: "Considera leitura, comunicação, autonomia, área do AEE e necessidade educacional para reduzir barreiras."
  },
  {
    title: "3. DUA",
    text: "Gera múltiplas formas de apresentação, participação, expressão e engajamento."
  },
  {
    title: "4. Bloom",
    text: "Organiza a complexidade em lembrar, compreender, aplicar, analisar, avaliar e criar, respeitando o perfil."
  },
  {
    title: "5. ABA escolar",
    text: "Sugere pareamento, instrução simples, reforço, análise de tarefa, rotina visual e registro de ajuda."
  },
  {
    title: "6. Acessibilidade",
    text: "Inclui CAA, Libras, Braille, fonte ampliada, contraste, tecnologia assistiva e formas alternativas de resposta."
  }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeSettings(settings) {
  const normalized = {
    ...DEFAULT_SETTINGS,
    ...settings
  };

  normalized.ownerName = String(normalized.ownerName || DEFAULT_SETTINGS.ownerName).replaceAll("Assista+", "Acessa+");
  normalized.footerText = String(normalized.footerText || DEFAULT_SETTINGS.footerText).replaceAll("Assista+", "Acessa+");
  normalized.highContrast = Boolean(normalized.highContrast);
  normalized.simpleMode = Boolean(normalized.simpleMode);
  normalized.fontScale = Number(normalized.fontScale || 0);
  return normalized;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getNeeds() {
  return $$("input[name='needs']:checked").map((input) => input.value);
}

function getFormData() {
  const needs = getNeeds();
  return {
    kind: state.currentKind,
    studentName: $("#studentName").value.trim() || "Estudante",
    grade: $("#grade").value.trim() || "Série não informada",
    age: $("#age").value.trim() || "não informada",
    aeeArea: $("#aeeArea").value,
    readingLevel: $("#readingLevel").value,
    communication: $("#communication").value,
    autonomy: $("#autonomy").value,
    subject: $("#subject").value.trim() || "Disciplina não informada",
    knowledgeObject: $("#knowledgeObject").value.trim() || "Objeto de conhecimento não informado",
    skill: $("#skill").value.trim() || "Habilidade curricular a ser definida pelo professor.",
    baseActivity: $("#baseActivity").value.trim(),
    format: $("#format").value,
    resourcesNeeded: $("#resourcesNeeded").value.trim() || "apoios visuais, mediação pedagógica, recurso concreto e forma alternativa de resposta",
    needs: needs.length ? needs : ["DI"]
  };
}

function htmlList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function tags(data) {
  return `
    <div class="tag-row">
      <span class="tag">${escapeHtml(kindLabels[data.kind])}</span>
      <span class="tag">${escapeHtml(data.grade)}</span>
      ${data.needs.map((need) => `<span class="tag">${escapeHtml(need)}</span>`).join("")}
    </div>
  `;
}

function footer() {
  return `<p class="material-footer">${escapeHtml(state.settings.footerText)} | Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>`;
}

function adaptationList(data) {
  return htmlList(data.needs.map((need) => `<strong>${escapeHtml(need)}:</strong> ${escapeHtml(adaptations[need]?.text || "Aplicar acessibilidade conforme avaliação pedagógica.")}`));
}

function responseOptions(data) {
  const options = [...new Set(data.needs.map((need) => adaptations[need]?.response).filter(Boolean))];
  return htmlList(options.length ? options : ["resposta oral, escrita, visual, assistida ou por tecnologia assistiva"]);
}

function duaBlock(data) {
  return `
    <h3>Aplicação do DUA</h3>
    ${htmlList([
      "<strong>Representação:</strong> texto curto, imagem, objeto concreto, áudio, Libras, Braille, contraste ou recurso tátil.",
      "<strong>Ação e expressão:</strong> fala, marcação, desenho, escrita, CAA, Libras, Braille, tecnologia assistiva ou mediação.",
      "<strong>Engajamento:</strong> escolha, previsibilidade, vínculo com a realidade do estudante, reforço positivo e pertencimento."
    ])}
  `;
}

function bloomBlock(data) {
  const high = data.needs.includes("AH/SD");
  const items = high
    ? ["Analisar relações entre ideias.", "Avaliar possibilidades de solução.", "Criar uma resposta autoral ou produto final."]
    : ["Lembrar informações essenciais.", "Compreender com apoio visual ou concreto.", "Aplicar com mediação e forma alternativa de resposta."];
  return `<h3>Progressão pela Taxonomia de Bloom</h3>${htmlList(items)}`;
}

function abaBlock(data) {
  const items = [
    "Pareamento: iniciar a proposta com acolhimento e apresentação previsível da tarefa.",
    "Instrução: usar uma orientação curta por vez.",
    "Ajuda: oferecer pista visual, pista verbal, modelo e retirada gradual de apoio.",
    "Reforço: valorizar tentativa, participação, comunicação e avanço observado.",
    "Registro: anotar nível de ajuda, tempo de permanência, resposta e condição que favoreceu a participação."
  ];
  if (data.needs.includes("TEA")) items.push("Rotina visual: apresentar início, meio, fim e combinados da atividade.");
  if (data.needs.includes("TDAH")) items.push("Organização: dividir a proposta em blocos e usar checklist de conclusão.");
  return `<h3>ABA na prática escolar</h3>${htmlList(items)}`;
}

function caaBlock(data) {
  return `
    <h3>CAA e tecnologia assistiva</h3>
    ${htmlList([
      "Cartões essenciais: sim, não, quero ajuda, terminei, repetir, escolher.",
      `Vocabulário da atividade: ${escapeHtml(data.knowledgeObject)}, ação, objeto, pessoa, lugar, sentimento e resposta.`,
      "Permitir resposta por apontar, olhar, selecionar, falar, escrever, digitar, Libras, Braille, áudio ou prancha.",
      `Recursos indicados: ${escapeHtml(data.resourcesNeeded)}.`
    ])}
  `;
}

function identityBlock(data) {
  return `
    <h3>Identificação</h3>
    <p><strong>Estudante:</strong> ${escapeHtml(data.studentName)} | <strong>Idade:</strong> ${escapeHtml(data.age)} | <strong>Série:</strong> ${escapeHtml(data.grade)}</p>
    <p><strong>Área do AEE:</strong> ${escapeHtml(data.aeeArea)} | <strong>Leitura:</strong> ${escapeHtml(data.readingLevel)} | <strong>Comunicação:</strong> ${escapeHtml(data.communication)} | <strong>Autonomia:</strong> ${escapeHtml(data.autonomy)}</p>
  `;
}

function studentHeader(data) {
  return `
    <div class="student-header">
      <div class="student-field"><strong>Nome:</strong> ${escapeHtml(data.studentName === "Estudante" ? "" : data.studentName)}</div>
      <div class="student-field"><strong>Turma:</strong> ${escapeHtml(data.grade === "Série não informada" ? "" : data.grade)}</div>
      <div class="student-field"><strong>Disciplina:</strong> ${escapeHtml(data.subject === "Disciplina não informada" ? "" : data.subject)}</div>
      <div class="student-field"><strong>Data:</strong> ____ / ____ / ______</div>
    </div>
  `;
}

function studentCaaCards() {
  return `
    <div class="mini-caa">
      <span>SIM</span>
      <span>NÃO</span>
      <span>AJUDA</span>
      <span>TERMINEI</span>
    </div>
  `;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getCurricularContext(data) {
  const subject = normalizeText(data.subject);
  const object = normalizeText(data.knowledgeObject);
  const skill = normalizeText(data.skill);
  const combined = `${subject} ${object} ${skill}`;

  if (combined.includes("morfossintaxe") || combined.includes("sujeito") || combined.includes("predicado")) {
    return buildMorfossintaxeContext(data);
  }

  if (subject.includes("portugues") || subject.includes("lingua portuguesa")) {
    return buildPortugueseContext(data);
  }

  if (subject.includes("matematica")) {
    return buildMathContext(data);
  }

  if (subject.includes("ciencia")) {
    return buildScienceContext(data);
  }

  if (subject.includes("historia") || subject.includes("geografia")) {
    return buildHumanitiesContext(data);
  }

  return buildGenericContext(data);
}

function needIs(data, value) {
  return data.needs.includes(value);
}

function buildMorfossintaxeContext(data) {
  const simplified = needIs(data, "DI") || needIs(data, "TEA") || needIs(data, "TDAH");
  const challenge = needIs(data, "AH/SD");
  const sentenceA = simplified ? "A menina leu o livro." : "Maria Eduarda leu um livro interessante na biblioteca.";
  const sentenceB = simplified ? "O professor explicou a tarefa." : "O professor explicou a atividade adaptada aos estudantes.";
  const sentenceC = challenge ? "Depois da aula, os estudantes produziram respostas criativas com autonomia." : "Os estudantes fizeram a atividade.";

  return {
    title: "Morfossintaxe em frases do cotidiano",
    intro: "Leia as frases com atenção. Depois, identifique as partes da frase e responda do seu jeito.",
    wordBank: ["sujeito", "predicado", "verbo", "substantivo", "adjetivo", "frase"],
    exercises: [
      {
        title: "1. Encontre quem faz a ação",
        prompt: `Na frase "${sentenceA}", quem faz a ação? Marque ou escreva o sujeito.`,
        choices: simplified
          ? ["A menina", "leu", "o livro", "não sei"]
          : ["Maria Eduarda", "leu", "um livro interessante", "na biblioteca"],
        answerLabel: "Sujeito da frase"
      },
      {
        title: "2. Descubra o verbo",
        prompt: `Na frase "${sentenceB}", circule ou marque a palavra que indica ação.`,
        choices: simplified
          ? ["O professor", "explicou", "a tarefa", "atividade"]
          : ["professor", "explicou", "atividade", "estudantes"],
        answerLabel: "Verbo"
      },
      {
        title: "3. Separe sujeito e predicado",
        prompt: `Leia: "${sentenceC}" Separe a frase em duas partes.`,
        splitLabels: ["Sujeito", "Predicado"]
      },
      {
        title: "4. Classifique as palavras",
        prompt: "Escolha uma palavra da frase e marque sua classe.",
        choices: ["substantivo", "verbo", "adjetivo", "outra palavra"],
        answerLabel: "Palavra escolhida"
      },
      {
        title: challenge ? "5. Reescreva e amplie" : "5. Complete com apoio",
        prompt: challenge
          ? "Reescreva uma das frases acrescentando um adjunto adverbial e explique o efeito da mudança."
          : "Complete: Na frase, o sujeito mostra quem faz a ação. O verbo mostra a __________.",
        answerLabel: challenge ? "Minha reescrita" : "Resposta"
      }
    ],
    teacherCue: "Mediação: se necessário, leia a frase em voz alta, use cores diferentes para sujeito/verbo/predicado e aceite resposta oral, apontada, escrita, CAA ou Libras."
  };
}

function buildPortugueseContext(data) {
  const object = data.knowledgeObject || "conteúdo de Língua Portuguesa";
  return {
    title: `${object} em prática`,
    intro: "Leia o pequeno texto e responda às questões usando a forma de comunicação combinada.",
    wordBank: ["texto", "ideia principal", "personagem", "palavra", "frase", "resposta"],
    text: `Na escola, cada estudante aprende de um jeito. Quando a atividade tem apoio e respeito, todos podem participar.`,
    exercises: [
      {
        title: "1. Ideia principal",
        prompt: "Sobre o que fala o texto?",
        choices: ["participação", "brincadeira", "comida", "transporte"],
        answerLabel: "Minha escolha"
      },
      {
        title: "2. Palavra importante",
        prompt: "Escolha uma palavra importante do texto.",
        choices: ["escola", "aprende", "respeito", "participar"],
        answerLabel: "Palavra escolhida"
      },
      {
        title: "3. Responda",
        prompt: `Mostre o que você entendeu sobre ${object}.`,
        answerLabel: "Resposta"
      },
      {
        title: "4. Produza",
        prompt: "Complete a frase: Eu participo melhor quando...",
        answerLabel: "Minha frase"
      }
    ],
    teacherCue: "Mediação: leia o texto em partes, destaque palavras-chave e permita resposta por marcação, fala, desenho, escrita, Libras, Braille ou CAA."
  };
}

function buildMathContext(data) {
  const object = data.knowledgeObject || "conteúdo matemático";
  return {
    title: `${object} com apoio visual`,
    intro: "Resolva com calma. Você pode usar desenho, material concreto, contagem, marcação ou cálculo.",
    wordBank: ["quantidade", "número", "contar", "comparar", "resultado", "estratégia"],
    exercises: [
      {
        title: "1. Observe a situação",
        prompt: `O professor separou materiais para estudar ${object}. Marque uma estratégia que ajuda você a resolver.`,
        choices: ["desenhar", "contar objetos", "usar tabela", "pedir pista"],
        answerLabel: "Estratégia"
      },
      {
        title: "2. Resolva com apoio",
        prompt: "Represente a situação usando desenho, números ou objetos.",
        answerLabel: "Meu registro"
      },
      {
        title: "3. Confira",
        prompt: "Como você sabe que sua resposta faz sentido?",
        choices: ["contei novamente", "comparei", "usei cálculo", "preciso revisar"],
        answerLabel: "Verificação"
      }
    ],
    teacherCue: "Mediação: oferecer material concreto, quadro de passos, tempo organizado e aceitar registro por desenho, cálculo, oralidade ou tecnologia assistiva."
  };
}

function buildScienceContext(data) {
  const object = data.knowledgeObject || "conteúdo de Ciências";
  return {
    title: `${object} por observação`,
    intro: "Observe, compare e registre o que percebeu.",
    wordBank: ["observar", "comparar", "causa", "efeito", "ambiente", "cuidado"],
    exercises: [
      {
        title: "1. Observe",
        prompt: `Marque uma palavra que combina com ${object}.`,
        choices: ["vida", "ambiente", "transformação", "cuidado"],
        answerLabel: "Palavra"
      },
      {
        title: "2. Relacione",
        prompt: "Ligue o conteúdo a uma situação do dia a dia.",
        answerLabel: "Exemplo"
      },
      {
        title: "3. Registre",
        prompt: "Desenhe ou escreva uma descoberta.",
        answerLabel: "Minha descoberta"
      }
    ],
    teacherCue: "Mediação: usar imagens reais, objetos, experimento simples, descrição oral e registro por desenho, fala, CAA, Libras ou escrita."
  };
}

function buildHumanitiesContext(data) {
  const object = data.knowledgeObject || "conteúdo estudado";
  return {
    title: `${object} no tempo e no espaço`,
    intro: "Pense no lugar, nas pessoas, no tempo e nas mudanças.",
    wordBank: ["lugar", "tempo", "pessoas", "mudança", "cultura", "comunidade"],
    exercises: [
      {
        title: "1. Identifique",
        prompt: `Marque uma palavra relacionada a ${object}.`,
        choices: ["lugar", "tempo", "pessoas", "mudança"],
        answerLabel: "Palavra"
      },
      {
        title: "2. Relacione",
        prompt: "Como esse conteúdo aparece na sua comunidade ou na sua vida?",
        answerLabel: "Exemplo"
      },
      {
        title: "3. Compare",
        prompt: "Marque uma opção: o conteúdo fala mais sobre...",
        choices: ["passado", "presente", "lugar", "pessoas"],
        answerLabel: "Minha escolha"
      }
    ],
    teacherCue: "Mediação: usar mapa, linha do tempo, imagem, relato oral e exemplos próximos da realidade do estudante."
  };
}

function buildGenericContext(data) {
  const object = data.knowledgeObject || "conteúdo estudado";
  const words = object.split(/\s+/).filter(Boolean).slice(0, 4);
  return {
    title: `${object} em atividade`,
    intro: "Observe o tema, escolha palavras importantes e registre o que compreendeu.",
    wordBank: [...new Set([...words, "exemplo", "resposta", "ideia", "ajuda"])],
    exercises: [
      {
        title: "1. Palavra-chave",
        prompt: `Escolha uma palavra que combina com ${object}.`,
        choices: [...new Set([...words, "exemplo", "não sei"])].slice(0, 4),
        answerLabel: "Palavra escolhida"
      },
      {
        title: "2. Exemplo",
        prompt: "Mostre um exemplo do conteúdo estudado.",
        answerLabel: "Meu exemplo"
      },
      {
        title: "3. Registro",
        prompt: "Desenhe, escreva ou fale uma resposta sobre o tema.",
        answerLabel: "Minha resposta"
      }
    ],
    teacherCue: "Mediação: adaptar linguagem, oferecer pistas graduais, usar apoio visual/concreto e aceitar diferentes formas de resposta."
  };
}

function renderWordBank(words) {
  if (!words?.length) return "";
  return `
    <section class="exercise-box word-bank">
      <h3>Banco de palavras</h3>
      <div class="word-chip-row">
        ${words.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}
      </div>
    </section>
  `;
}

function renderSupportText(context) {
  if (!context.text) return "";
  return `
    <section class="exercise-box support-text">
      <h3>Texto de apoio</h3>
      <p>${escapeHtml(context.text)}</p>
    </section>
  `;
}

function renderExercise(exercise) {
  const choices = exercise.choices?.length
    ? `<div class="choice-grid">${exercise.choices.map((choice) => `<div class="choice-card"><span class="choice-mark"></span>${escapeHtml(choice)}</div>`).join("")}</div>`
    : "";
  const split = exercise.splitLabels?.length
    ? `<div class="split-grid">${exercise.splitLabels.map((label) => `<div class="answer-area small-answer"><strong>${escapeHtml(label)}:</strong></div>`).join("")}</div>`
    : "";
  const answer = !split
    ? `<div class="answer-area">${escapeHtml(exercise.answerLabel || "Resposta")}</div>`
    : "";

  return `
    <section class="exercise-box">
      <h3>${escapeHtml(exercise.title)}</h3>
      <p>${escapeHtml(exercise.prompt)}</p>
      ${choices}
      ${split}
      ${answer}
    </section>
  `;
}

function getPremiumWorksheetContext(data) {
  const combined = normalizeText(`${data.subject} ${data.knowledgeObject} ${data.skill} ${data.baseActivity}`);

  if (combined.includes("fracao") || combined.includes("fracoes")) {
    return {
      theme: "math",
      title: "FRAÇÕES EM AÇÃO!",
      subtitle: "CALCULAR, PENSAR E RESOLVER",
      intro: "Resolva as frações com atenção. Use desenho, cálculo, material concreto ou apoio do professor.",
      remember: [
        ["FRAÇÃO", "representa uma parte de um todo."],
        ["NUMERADOR", "mostra quantas partes foram consideradas."],
        ["DENOMINADOR", "mostra em quantas partes o todo foi dividido."]
      ],
      sections: [
        {
          type: "fractionGrid",
          label: "ATIVIDADE 1",
          title: "Calcule as frações abaixo.",
          items: [["1/2", "14"], ["1/3", "18"], ["2/4", "20"], ["3/4", "24"], ["2/5", "30"], ["4/5", "20"], ["3/5", "25"], ["1/5", "45"], ["4/5", "25"]]
        },
        {
          type: "numberedProblems",
          label: "ATIVIDADE 2",
          title: "Resolva os problemas.",
          problems: [
            "Em uma turma com 36 alunos, 1/3 gostam de futebol. Quantos alunos gostam de futebol?",
            "João comprou 25 chocolates e deu 2/5 para seus amigos. Quantos chocolates ele deu?",
            "Uma escola arrecadou 60 livros. 3/4 serão doados para a primeira comunidade. Quantos livros serão doados?",
            "Um jardineiro tem 28 plantas e vai plantar 1/2 em um canteiro e 1/4 em outro. Quantas plantas irão para cada canteiro?"
          ]
        },
        {
          type: "trueFalse",
          label: "ATIVIDADE 3",
          title: "Verdadeiro ou falso?",
          statements: ["1/2 de 10 é igual a 5.", "2/3 de 18 é igual a 12.", "1/4 de 16 é igual a 3.", "3/5 de 20 é igual a 12.", "2/5 de 30 é igual a 15.", "4/5 de 25 é igual a 20."]
        },
        {
          type: "challenge",
          label: "DESAFIO EXTRA",
          prompt: "Qual é a fração de 100 cujo resultado é 40?"
        }
      ]
    };
  }

  if (combined.includes("morfossintaxe") || combined.includes("sujeito") || combined.includes("predicado")) {
    return {
      theme: "language",
      title: "INVESTIGADOR DA FRASE",
      subtitle: "SUJEITO, VERBO E SENTIDO EM AÇÃO",
      intro: "Toda frase tem pistas. Investigue as palavras, descubra suas funções e registre suas respostas.",
      remember: [
        ["SUJEITO", "quem pratica ou recebe a informação principal da frase."],
        ["PREDICADO", "o que se declara sobre o sujeito."],
        ["VERBO", "palavra que indica ação, estado ou fenômeno."],
        ["SUBSTANTIVO", "nomeia seres, objetos, lugares, sentimentos ou ideias."],
        ["ADJETIVO", "caracteriza o substantivo."]
      ],
      sections: [
        {
          type: "classificationTable",
          label: "1",
          title: "Classifique as palavras de acordo com sua função.",
          headers: ["PALAVRA OU EXPRESSÃO", "CLASSIFICAÇÃO"],
          rows: ["Maria Eduarda", "leu", "livro", "interessante", "na biblioteca", "os estudantes"]
        },
        {
          type: "trueFalse",
          label: "2",
          title: "Leia as afirmações e marque (V) ou (F).",
          statements: [
            "O verbo indica uma ação, estado ou fenômeno.",
            "O sujeito sempre precisa aparecer no começo da frase.",
            "Predicado é aquilo que se declara sobre o sujeito.",
            "Adjetivo é uma palavra que pode caracterizar um substantivo.",
            "Na frase 'A professora explicou a atividade', a palavra 'explicou' é verbo."
          ]
        },
        {
          type: "sentenceAnalysis",
          label: "3",
          title: "Analise as frases.",
          sentences: ["A menina leu o livro.", "O professor explicou a tarefa.", "Os estudantes produziram respostas criativas."]
        },
        {
          type: "fillText",
          label: "4",
          title: "Complete o texto usando as palavras do quadro.",
          bank: ["sujeito", "predicado", "verbo", "substantivo", "adjetivo"],
          text: "Na frase, o ______ indica de quem se fala. O ______ apresenta a informação sobre ele. O ______ pode indicar ação. O ______ dá nome às coisas, e o ______ pode indicar uma característica."
        },
        {
          type: "production",
          label: "5",
          title: "Produção linguística.",
          prompts: ["Escreva uma frase com sujeito e predicado.", "Circule o verbo da sua frase.", "Reescreva a frase acrescentando uma característica."]
        },
        {
          type: "challenge",
          label: "DESAFIO",
          prompt: "Crie uma frase sobre inclusão e identifique: sujeito, verbo e predicado."
        }
      ]
    };
  }

  if (combined.includes("celula") || combined.includes("tecido") || combined.includes("orgao") || combined.includes("sistema") || combined.includes("organismo") || combined.includes("corpo humano")) {
    return {
      theme: "science",
      title: "INVESTIGADOR DO CORPO HUMANO",
      subtitle: "NÍVEIS DE ORGANIZAÇÃO DOS SERES VIVOS",
      intro: "Os seres vivos são formados por diferentes níveis de organização. Observe a sequência e resolva as atividades.",
      remember: [
        ["CÉLULA", "unidade básica da vida."],
        ["TECIDO", "conjunto de células com a mesma função."],
        ["ÓRGÃO", "estrutura formada por diferentes tecidos."],
        ["SISTEMA", "conjunto de órgãos que trabalham juntos."],
        ["ORGANISMO", "ser vivo completo."]
      ],
      sections: [
        {
          type: "sequence",
          label: "1",
          title: "Complete a sequência dos níveis de organização.",
          items: ["CÉLULA", "TECIDO", "ÓRGÃO", "SISTEMA", "ORGANISMO"]
        },
        {
          type: "classificationTable",
          label: "2",
          title: "Classifique as estruturas abaixo.",
          headers: ["ESTRUTURA", "CLASSIFICAÇÃO"],
          rows: ["pele", "neurônio", "coração", "tecido epitelial", "sistema digestório", "ser humano"]
        },
        {
          type: "trueFalse",
          label: "3",
          title: "Marque (V) para verdadeiro e (F) para falso.",
          statements: [
            "O conjunto de órgãos que trabalham juntos forma um sistema.",
            "O tecido é formado por um único tipo de célula isolada.",
            "O coração é um órgão do corpo humano.",
            "A célula é a menor unidade dos seres vivos.",
            "O sistema digestório é formado por órgãos que realizam a digestão."
          ]
        },
        {
          type: "match",
          label: "4",
          title: "Relacione cada estrutura à sua função.",
          left: ["cérebro", "coração", "pulmão", "estômago", "músculos"],
          right: ["comanda ações do corpo", "bombeia o sangue", "realiza troca de gases", "digere alimentos", "permitem movimentos"]
        },
        {
          type: "fillText",
          label: "5",
          title: "Complete usando as palavras do quadro.",
          bank: ["células", "tecidos", "órgãos", "sistemas", "organismo"],
          text: "As ______ são a unidade básica da vida. Células semelhantes formam ______. Diferentes tecidos formam ______. Órgãos que trabalham juntos formam ______. Todos juntos formam o ______."
        },
        {
          type: "challenge",
          label: "DESAFIO CIENTÍFICO",
          prompt: "Se um órgão deixasse de funcionar, o que poderia acontecer com os outros sistemas do corpo?"
        }
      ]
    };
  }

  return {
    theme: "general",
    title: `${String(data.knowledgeObject || "ATIVIDADE").toUpperCase()}`,
    subtitle: "PENSAR, REGISTRAR E PARTICIPAR",
    intro: "Leia as orientações, responda do seu jeito e peça ajuda quando precisar.",
    remember: [["TEMA", data.knowledgeObject || "conteúdo estudado"], ["HABILIDADE", data.skill || "habilidade informada pelo professor"]],
    sections: [
      {
        type: "classificationTable",
        label: "1",
        title: "Organize as ideias principais.",
        headers: ["PALAVRA", "O QUE SIGNIFICA?"],
        rows: String(data.knowledgeObject || "conteúdo").split(/\s+/).filter(Boolean).slice(0, 5)
      },
      {
        type: "trueFalse",
        label: "2",
        title: "Marque (V) ou (F).",
        statements: ["Consigo reconhecer uma palavra importante do tema.", "Posso responder usando desenho, fala, escrita ou marcação.", "Preciso participar apenas escrevendo."]
      },
      {
        type: "production",
        label: "3",
        title: "Mostre o que você entendeu.",
        prompts: ["Desenhe ou escreva uma ideia sobre o tema.", "Dê um exemplo.", "Explique com suas palavras."]
      },
      {
        type: "challenge",
        label: "DESAFIO",
        prompt: "Crie uma pergunta sobre o conteúdo estudado."
      }
    ]
  };
}

function renderRemember(items) {
  return `
    <aside class="remember-box">
      <h3>PARA LEMBRAR!</h3>
      ${items.map(([term, description]) => `
        <p><strong>${escapeHtml(term)}:</strong> ${escapeHtml(description)}</p>
      `).join("")}
    </aside>
  `;
}

function renderPremiumSection(section) {
  const label = `<span class="section-label">${escapeHtml(section.label)}</span>`;

  if (section.type === "classificationTable") {
    return `
      <section class="activity-panel">
        <h3>${label}${escapeHtml(section.title)}</h3>
        <table class="worksheet-table">
          <thead><tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${section.rows.map((row) => `<tr><td>${escapeHtml(row)}</td><td></td></tr>`).join("")}</tbody>
        </table>
      </section>
    `;
  }

  if (section.type === "trueFalse") {
    return `
      <section class="activity-panel">
        <h3>${label}${escapeHtml(section.title)}</h3>
        <div class="vf-list">
          ${section.statements.map((statement) => `<p><span class="vf-mark">( &nbsp; )</span>${escapeHtml(statement)}</p>`).join("")}
        </div>
      </section>
    `;
  }

  if (section.type === "sentenceAnalysis") {
    return `
      <section class="activity-panel">
        <h3>${label}${escapeHtml(section.title)}</h3>
        ${section.sentences.map((sentence) => `
          <div class="sentence-card">
            <strong>${escapeHtml(sentence)}</strong>
            <div class="triple-lines">
              <span>Sujeito:</span>
              <span>Verbo:</span>
              <span>Predicado:</span>
            </div>
          </div>
        `).join("")}
      </section>
    `;
  }

  if (section.type === "fillText") {
    return `
      <section class="activity-panel">
        <h3>${label}${escapeHtml(section.title)}</h3>
        <div class="word-strip">${section.bank.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}</div>
        <p class="fill-paragraph">${escapeHtml(section.text)}</p>
      </section>
    `;
  }

  if (section.type === "production") {
    return `
      <section class="activity-panel">
        <h3>${label}${escapeHtml(section.title)}</h3>
        ${section.prompts.map((prompt) => `<p>${escapeHtml(prompt)}</p><div class="write-lines"><span></span><span></span></div>`).join("")}
      </section>
    `;
  }

  if (section.type === "challenge") {
    return `
      <section class="activity-panel challenge-panel">
        <h3>${label}${escapeHtml(section.label)}</h3>
        <p>${escapeHtml(section.prompt)}</p>
        <div class="write-lines wide"><span></span><span></span><span></span></div>
      </section>
    `;
  }

  if (section.type === "sequence") {
    return `
      <section class="activity-panel full-row">
        <h3>${label}${escapeHtml(section.title)}</h3>
        <div class="sequence-row">
          ${section.items.map((item, index) => `
            <div class="sequence-item">
              <div class="sequence-icon">${index + 1}</div>
              <strong>${escapeHtml(item)}</strong>
              <span></span>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  if (section.type === "match") {
    return `
      <section class="activity-panel">
        <h3>${label}${escapeHtml(section.title)}</h3>
        <div class="match-grid">
          <div>${section.left.map((item) => `<p>${escapeHtml(item)} <b>•</b></p>`).join("")}</div>
          <div>${section.right.map((item) => `<p><b>•</b> ${escapeHtml(item)}</p>`).join("")}</div>
        </div>
      </section>
    `;
  }

  if (section.type === "fractionGrid") {
    return `
      <section class="activity-panel full-row">
        <h3>${label}${escapeHtml(section.title)}</h3>
        <div class="fraction-grid">
          ${section.items.map(([fraction, number], index) => `<div><strong>${String.fromCharCode(97 + index)})</strong> ${escapeHtml(fraction)} de ${escapeHtml(number)} = <span></span></div>`).join("")}
        </div>
      </section>
    `;
  }

  if (section.type === "numberedProblems") {
    return `
      <section class="activity-panel full-row">
        <h3>${label}${escapeHtml(section.title)}</h3>
        ${section.problems.map((problem, index) => `<p><strong>${index + 1}.</strong> ${escapeHtml(problem)}</p><div class="answer-line">Resposta:</div>`).join("")}
      </section>
    `;
  }

  return "";
}

function premiumWorksheet(data, title = "Atividade adaptada") {
  const context = getPremiumWorksheetContext(data);
  const owner = state.settings.ownerName || "Prof. Mozahinter Vieira";
  return `
    <div class="premium-sheet theme-${context.theme}">
      <header class="sheet-hero">
        <div class="hero-badge left">${context.theme === "math" ? "1/2" : context.theme === "science" ? "BIO" : "ABC"}</div>
        <div>
          <h2>${escapeHtml(context.title)}</h2>
          <p>${escapeHtml(context.subtitle)}</p>
        </div>
        <div class="hero-badge right">A+</div>
      </header>

      <div class="student-meta">
        <span><strong>Nome:</strong> ${escapeHtml(data.studentName === "Estudante" ? "" : data.studentName)}</span>
        <span><strong>Turma:</strong> ${escapeHtml(data.grade === "Série não informada" ? "" : data.grade)}</span>
        <span><strong>Disciplina:</strong> ${escapeHtml(data.subject === "Disciplina não informada" ? "" : data.subject)}</span>
        <span><strong>Data:</strong> ____ / ____ / ______</span>
      </div>

      <div class="intro-ribbon">${escapeHtml(context.intro)}</div>

      <div class="sheet-layout">
        ${renderRemember(context.remember)}
        ${context.sections.map(renderPremiumSection).join("")}
      </div>

      <footer class="sheet-footer">
        <span></span>
        <strong>${escapeHtml(owner).toUpperCase()}</strong>
        <span></span>
      </footer>
    </div>
  `;
}

function studentWorksheet(data, title = "Atividade adaptada") {
  return premiumWorksheet(data, title);
}

function generateActivity(data) {
  return studentWorksheet(data, "Atividade adaptada A4");
}

function generateAdaptation(data) {
  return studentWorksheet(data, "Atividade adaptada para o estudante");
}

function generatePlan(data) {
  return `
    <h2>Plano de aula inclusivo</h2>
    ${tags(data)}
    <h3>Componente curricular</h3>
    <p><strong>${escapeHtml(data.subject)}</strong> | ${escapeHtml(data.grade)} | ${escapeHtml(data.knowledgeObject)}</p>
    <h3>Habilidade</h3>
    <p>${escapeHtml(data.skill)}</p>
    <h3>Objetivo geral</h3>
    <p>Promover aprendizagem sobre ${escapeHtml(data.knowledgeObject)} com participação acessível, mediação pedagógica e múltiplas formas de expressão.</p>
    <h3>Objetivos específicos</h3>
    ${htmlList([
      "Reconhecer elementos essenciais do conteúdo.",
      "Participar de situação de aprendizagem com apoio adequado.",
      "Responder por via oral, visual, escrita, gestual, CAA, Libras, Braille ou tecnologia assistiva.",
      "Registrar evidências de aprendizagem e nível de autonomia."
    ])}
    <h3>Metodologia</h3>
    ${htmlList([
      "Acolhida e ativação de conhecimento prévio.",
      "Apresentação do conteúdo em diferentes linguagens.",
      "Atividade principal com etapas curtas e mediação.",
      "Socialização das respostas em formato acessível.",
      "Registro do professor sobre participação, barreiras e avanços."
    ])}
    ${duaBlock(data)}
    ${bloomBlock(data)}
    ${abaBlock(data)}
    ${caaBlock(data)}
    <h3>Avaliação</h3>
    <p>Processual, observável e formativa, considerando participação, compreensão, comunicação, autonomia, necessidade de apoio e avanço em relação ao ponto de partida.</p>
    ${footer()}
  `;
}

function generatePei(data) {
  return `
    <h2>Plano Educacional Individualizado</h2>
    ${tags(data)}
    ${identityBlock(data)}
    <h3>Perfil funcional pedagógico</h3>
    <p>O estudante apresenta perfil de comunicação ${escapeHtml(data.communication)}, nível de leitura ${escapeHtml(data.readingLevel)} e autonomia descrita como: ${escapeHtml(data.autonomy)}.</p>
    <h3>Barreiras identificadas</h3>
    ${htmlList([
      "Acesso ao conteúdo quando apresentado apenas por texto extenso ou comando único.",
      "Participação quando há pouca previsibilidade ou ausência de forma alternativa de resposta.",
      "Registro da aprendizagem quando se exige apenas escrita convencional."
    ])}
    <h3>Potencialidades a fortalecer</h3>
    ${htmlList([
      "Participação por mediação adequada.",
      "Comunicação por vias acessíveis.",
      "Aprendizagem com apoio visual, concreto, tecnológico ou comunicacional.",
      "Ampliação gradual da autonomia."
    ])}
    <h3>Metas trimestrais sugeridas</h3>
    ${htmlList([
      `Participar de atividades sobre ${escapeHtml(data.knowledgeObject)} com apoio ajustado.`,
      "Responder a comandos simples usando sua forma de comunicação.",
      "Aumentar autonomia em pelo menos uma etapa da atividade.",
      "Registrar aprendizagem por meio acessível."
    ])}
    <h3>Estratégias e recursos</h3>
    ${adaptationList(data)}
    ${caaBlock(data)}
    <h3>Acompanhamento</h3>
    <p>Registrar data, atividade, tipo de apoio, resposta observada, barreira encontrada e próximo passo pedagógico.</p>
    ${footer()}
  `;
}

function generateEvaluation(data) {
  return studentWorksheet(data, "Avaliação adaptada A4");
}

function generateAba(data) {
  return `
    <h2>ABA na prática escolar</h2>
    ${tags(data)}
    ${identityBlock(data)}
    <h3>Objetivo comportamental e pedagógico</h3>
    <p>Favorecer participação, comunicação funcional e realização de etapas da atividade sobre ${escapeHtml(data.knowledgeObject)}.</p>
    <h3>Análise de tarefa</h3>
    ${htmlList([
      "Sentar ou posicionar-se para iniciar.",
      "Olhar, tocar, escutar ou acessar o material.",
      "Responder ao primeiro comando.",
      "Concluir uma etapa curta.",
      "Solicitar ajuda ou indicar término.",
      "Receber devolutiva e registrar a resposta."
    ])}
    <h3>Reforçadores possíveis</h3>
    ${htmlList([
      "Elogio específico: você observou, você tentou, você escolheu.",
      "Escolha de material ou ordem da tarefa.",
      "Pausa breve combinada.",
      "Atividade de interesse após conclusão parcial.",
      "Registro visual de progresso."
    ])}
    <h3>Rotina visual sugerida</h3>
    ${htmlList(["Começar", "Observar", "Responder", "Conferir", "Guardar", "Terminar"])}
    <h3>Registro de comportamento</h3>
    <p>Registrar antecedente, resposta do estudante, consequência, nível de ajuda, duração, engajamento e ajuste necessário.</p>
    ${footer()}
  `;
}

function generateCaa(data) {
  return `
    <h2>CAA e tecnologia assistiva</h2>
    ${tags(data)}
    ${identityBlock(data)}
    <h3>Prancha básica de comunicação</h3>
    <table border="1" cellpadding="10" cellspacing="0">
      <tr><td>SIM</td><td>NÃO</td><td>QUERO AJUDA</td><td>REPETIR</td></tr>
      <tr><td>TERMINEI</td><td>ESCOLHER</td><td>GOSTEI</td><td>NÃO ENTENDI</td></tr>
      <tr><td>${escapeHtml(data.knowledgeObject)}</td><td>IMAGEM</td><td>PALAVRA</td><td>RESPOSTA</td></tr>
    </table>
    <h3>Cartões visuais da sequência</h3>
    ${htmlList(["1. Olhar", "2. Escutar ou ler", "3. Escolher", "4. Responder", "5. Conferir", "6. Terminar"])}
    <h3>Comandos simples</h3>
    ${htmlList([
      "Observe.",
      "Escolha uma opção.",
      "Mostre sua resposta.",
      "Peça ajuda se precisar.",
      "Vamos fazer juntos."
    ])}
    <h3>Tecnologia assistiva indicada</h3>
    <p>${escapeHtml(data.resourcesNeeded)}. Ajustar conforme comunicação, acesso motor, visão, audição e autonomia do estudante.</p>
    ${footer()}
  `;
}

function generateReport(data) {
  return `
    <h2>Relatório pedagógico</h2>
    ${tags(data)}
    ${identityBlock(data)}
    <h3>Descrição pedagógica</h3>
    <p>Durante as propostas relacionadas a ${escapeHtml(data.knowledgeObject)}, o estudante participou conforme suas possibilidades de comunicação, autonomia e acesso ao conteúdo. Observa-se a importância de mediação planejada, recursos acessíveis e formas alternativas de resposta.</p>
    <h3>Estratégias que favorecem participação</h3>
    ${adaptationList(data)}
    ${caaBlock(data)}
    <h3>Aspectos observáveis</h3>
    ${htmlList([
      "Participação em atividades com apoio ajustado.",
      "Resposta por via acessível.",
      "Necessidade de comandos curtos e mediação gradual.",
      "Melhor desempenho quando há previsibilidade, apoio visual/concreto e tempo de resposta."
    ])}
    <h3>Encaminhamentos pedagógicos</h3>
    ${htmlList([
      "Manter atividades adaptadas ao perfil funcional.",
      "Registrar evolução por evidências observáveis.",
      "Planejar recursos de acessibilidade antes da aula.",
      "Articular professor regente, AEE e família quando necessário."
    ])}
    <p>Este relatório tem finalidade pedagógica e deve ser complementado com observações reais do professor.</p>
    ${footer()}
  `;
}

const generators = {
  activity: generateActivity,
  adaptation: generateAdaptation,
  plan: generatePlan,
  pei: generatePei,
  evaluation: generateEvaluation,
  aba: generateAba,
  caa: generateCaa,
  report: generateReport
};

function generateMaterial() {
  const data = getFormData();
  const generator = generators[data.kind] || generateActivity;
  const html = generator(data);
  state.currentResult = html;
  state.currentMeta = {
    kind: data.kind,
    title: `${kindLabels[data.kind]} - ${data.subject}`,
    studentName: data.studentName,
    subject: data.subject,
    date: new Date().toISOString()
  };
  $("#resultPaper").innerHTML = html;
  $("#resultTitle").textContent = kindLabels[data.kind];
  $("#engineStatus").textContent = "Gerado em modo local";
}

function saveCurrent() {
  if (!state.currentResult) generateMaterial();
  const item = {
    id: Date.now(),
    ...state.currentMeta,
    html: $("#resultPaper").innerHTML,
    updatedAt: new Date().toISOString()
  };
  state.saved.unshift(item);
  writeJson(STORAGE_KEYS.saved, state.saved);
  renderSaved();
  showView("library");
}

function renderSaved() {
  const query = ($("#searchSaved")?.value || "").toLowerCase();
  const filtered = state.saved.filter((item) => {
    const haystack = `${item.title} ${item.studentName} ${item.subject} ${kindLabels[item.kind]}`.toLowerCase();
    return haystack.includes(query);
  });

  const list = $("#savedList");
  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <strong>Nenhum material encontrado.</strong>
        <p>Gere um material no criador e clique em salvar. Ele ficará disponível neste navegador.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map((item) => `
    <article class="saved-card">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(kindLabels[item.kind] || "Material")} | ${escapeHtml(item.studentName || "Estudante")} | ${new Date(item.updatedAt).toLocaleString("pt-BR")}</p>
      </div>
      <div class="card-actions">
        <button class="secondary-button" type="button" data-open="${item.id}">Abrir</button>
        <button class="secondary-button" type="button" data-duplicate="${item.id}">Duplicar</button>
        <button class="danger-button" type="button" data-delete="${item.id}">Excluir</button>
      </div>
    </article>
  `).join("");

  $$("[data-open]").forEach((button) => {
    button.addEventListener("click", () => openSaved(Number(button.dataset.open)));
  });
  $$("[data-duplicate]").forEach((button) => {
    button.addEventListener("click", () => duplicateSaved(Number(button.dataset.duplicate)));
  });
  $$("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteSaved(Number(button.dataset.delete)));
  });
}

function openSaved(id) {
  const item = state.saved.find((entry) => entry.id === id);
  if (!item) return;
  state.currentKind = item.kind || "activity";
  state.currentResult = item.html;
  state.currentMeta = item;
  $("#resultPaper").innerHTML = item.html;
  $("#resultTitle").textContent = kindLabels[state.currentKind] || "Material gerado";
  selectKind(state.currentKind);
  showView("workspace");
}

function duplicateSaved(id) {
  const item = state.saved.find((entry) => entry.id === id);
  if (!item) return;
  const copy = {
    ...item,
    id: Date.now(),
    title: `${item.title} (cópia)`,
    updatedAt: new Date().toISOString()
  };
  state.saved.unshift(copy);
  writeJson(STORAGE_KEYS.saved, state.saved);
  renderSaved();
}

function deleteSaved(id) {
  const confirmed = window.confirm("Deseja excluir este material salvo?");
  if (!confirmed) return;
  state.saved = state.saved.filter((entry) => entry.id !== id);
  writeJson(STORAGE_KEYS.saved, state.saved);
  renderSaved();
}

function selectKind(kind) {
  state.currentKind = kind;
  $$(".module-card").forEach((card) => card.classList.toggle("selected", card.dataset.kind === kind));
  const label = kindLabels[kind] || "Material";
  $("#resultTitle").textContent = label;
  const format = $("#format");
  const desired = {
    activity: "Atividade A4 para impressão",
    adaptation: "Atividade A4 para impressão",
    plan: "Plano de aula",
    pei: "Relatório técnico-pedagógico",
    evaluation: "Avaliação adaptada",
    aba: "Roteiro de mediação",
    caa: "Cartões visuais",
    report: "Relatório técnico-pedagógico"
  }[kind];
  if (desired) format.value = desired;
}

function showView(id) {
  $$(".view").forEach((view) => view.classList.remove("active-view"));
  $(`#${id}`).classList.add("active-view");
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === id));
}

function applyAccessibilitySettings() {
  document.body.classList.toggle("high-contrast", state.settings.highContrast);
  document.body.classList.toggle("simple-mode", state.settings.simpleMode);
  document.body.classList.toggle("font-large", state.settings.fontScale > 0);
  document.documentElement.style.fontSize = `${16 + (state.settings.fontScale * 2)}px`;

  setPressed("#contrastBtn", state.settings.highContrast);
  setPressed("#simpleModeBtn", state.settings.simpleMode);
}

function setPressed(selector, value) {
  const element = $(selector);
  if (element) element.setAttribute("aria-pressed", String(Boolean(value)));
}

function persistSettings() {
  writeJson(STORAGE_KEYS.settings, state.settings);
  applyAccessibilitySettings();
}

function toggleHighContrast() {
  state.settings.highContrast = !state.settings.highContrast;
  persistSettings();
}

function toggleSimpleMode() {
  state.settings.simpleMode = !state.settings.simpleMode;
  persistSettings();
}

function changeFont(delta) {
  state.settings.fontScale = Math.max(0, Math.min(3, Number(state.settings.fontScale || 0) + delta));
  persistSettings();
}

function shortcutKind(kind) {
  selectKind(kind);
  showView("workspace");
  const form = $("#mainForm");
  if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function exportWord() {
  const html = buildExportHtml($("#resultPaper").innerHTML);
  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  downloadBlob(blob, safeFileName("acessaplus-material.doc"));
}

function exportHtml() {
  const html = buildExportHtml($("#resultPaper").innerHTML);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, safeFileName("acessaplus-material.html"));
}

function exportImage() {
  if (!state.currentResult) generateMaterial();

  const width = 794;
  const height = 1123;
  const content = $("#resultPaper").innerHTML;
  const html = `
    <div xmlns="http://www.w3.org/1999/xhtml">
      <style>${imageExportCss()}</style>
      <div class="result-paper">${content}</div>
    </div>
  `;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">${html}</foreignObject>
    </svg>
  `;

  const image = new Image();
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, safeFileName("atividade-a4-acessaplus.png"));
    }, "image/png");
  };

  image.src = url;
}

function imageExportCss() {
  return `
    * { box-sizing: border-box; }
    body { margin: 0; }
    .result-paper {
      width: 794px;
      height: 1123px;
      overflow: hidden;
      background: #ffffff;
      color: #1d2a22;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.42;
      padding: 34px;
    }
    h2 {
      font-size: 27px;
      margin: 0 0 16px;
      padding-bottom: 10px;
      border-bottom: 4px solid #238000;
    }
    h3 {
      margin: 0 0 8px;
      font-size: 16px;
      color: #238000;
    }
    p, li {
      font-size: 14px;
    }
    p {
      margin: 0 0 10px;
    }
    .student-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 14px;
    }
    .student-field,
    .exercise-box,
    .choice-card,
    .answer-area {
      border: 2px solid #d8e3d8;
      border-radius: 8px;
      background: #fff;
    }
    .student-field {
      padding: 8px 10px;
      min-height: 40px;
      font-size: 14px;
    }
    .student-field strong {
      color: #238000;
    }
    .exercise-box {
      padding: 12px;
      margin: 10px 0;
    }
    .choice-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    .choice-card {
      min-height: 54px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      font-weight: 800;
      font-size: 13px;
    }
    .choice-mark {
      width: 26px;
      height: 26px;
      border: 2px solid #238000;
      border-radius: 6px;
      flex: 0 0 auto;
    }
    .answer-area {
      min-height: 92px;
      margin-top: 8px;
      padding: 10px;
      color: #75827a;
      font-size: 13px;
    }
    .trace-lines {
      display: grid;
      gap: 12px;
      margin-top: 10px;
    }
    .trace-lines span {
      display: block;
      border-bottom: 2px solid #cfd9cf;
      height: 14px;
    }
    .mini-caa {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 7px;
      margin-top: 8px;
    }
    .mini-caa span {
      border: 2px solid #238000;
      border-radius: 8px;
      min-height: 38px;
      display: grid;
      place-items: center;
      text-align: center;
      font-weight: 900;
      color: #238000;
      font-size: 12px;
    }
    .word-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }
    .word-chip-row span {
      border: 2px solid #238000;
      border-radius: 999px;
      padding: 6px 10px;
      color: #238000;
      font-weight: 900;
      background: #f7fbf5;
      font-size: 12px;
    }
    .split-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    .small-answer {
      min-height: 72px;
    }
    .teacher-cue {
      border-left: 4px solid #238000;
      padding-left: 10px;
      color: #5e6c63;
      font-size: 12px;
    }
    .premium-sheet {
      width: 100%;
      height: 1055px;
      border: 2px solid #5a3192;
      border-radius: 12px;
      padding: 12px;
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
      overflow: hidden;
    }
    .sheet-hero {
      display: grid;
      grid-template-columns: 70px 1fr 70px;
      align-items: center;
      gap: 10px;
      text-align: center;
      margin-bottom: 6px;
    }
    .sheet-hero h2 {
      border: 0;
      padding: 0;
      margin: 0;
      color: #4b1689;
      font-size: 38px;
      line-height: .95;
      font-weight: 950;
    }
    .sheet-hero p {
      display: inline-block;
      margin: 5px 0 0;
      background: #08752a;
      color: #fff;
      border-radius: 8px;
      padding: 5px 14px;
      font-weight: 950;
      font-size: 17px;
    }
    .hero-badge {
      min-height: 56px;
      display: grid;
      place-items: center;
      border: 3px solid #5a3192;
      border-radius: 999px;
      color: #4b1689;
      font-weight: 950;
      font-size: 18px;
      background: #f4f0ff;
    }
    .student-meta {
      display: grid;
      grid-template-columns: 1.4fr .65fr 1fr .9fr;
      gap: 5px;
      margin: 6px 0;
    }
    .student-meta span {
      border: 1.8px solid #8fb2e7;
      border-radius: 8px;
      padding: 6px 8px;
      font-size: 12px;
      min-height: 30px;
    }
    .intro-ribbon {
      width: 76%;
      margin: 6px auto 8px;
      border: 2px solid #f3ad35;
      border-radius: 10px;
      padding: 7px 10px;
      text-align: center;
      font-size: 13px;
      font-weight: 900;
      background: #fff9e9;
    }
    .sheet-layout {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }
    .activity-panel,
    .remember-box {
      border: 2px solid #6f9ee6;
      border-radius: 9px;
      padding: 7px;
      background: #fff;
    }
    .remember-box {
      border-color: #8cc06e;
    }
    .activity-panel.full-row,
    .challenge-panel {
      grid-column: 1 / -1;
    }
    .activity-panel h3,
    .remember-box h3 {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 6px;
      color: #1e2440;
      font-size: 12px;
      text-transform: uppercase;
    }
    .section-label {
      min-width: 23px;
      min-height: 23px;
      display: inline-grid;
      place-items: center;
      border-radius: 6px;
      background: #4b1689;
      color: #fff;
      font-weight: 950;
    }
    .remember-box p {
      margin: 3px 0;
      font-size: 11px;
      line-height: 1.2;
    }
    .remember-box strong {
      display: inline-block;
      border-radius: 5px;
      padding: 2px 5px;
      color: #08752a;
      background: #e9f6e5;
    }
    .worksheet-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      text-align: center;
    }
    .worksheet-table th {
      background: #e8f5d7;
    }
    .worksheet-table th,
    .worksheet-table td {
      border: 1.5px solid #7c8790;
      padding: 5px;
      height: 25px;
    }
    .vf-list p {
      margin: 5px 0;
      font-size: 11px;
      line-height: 1.18;
    }
    .vf-mark {
      display: inline-block;
      margin-right: 6px;
      font-weight: 950;
    }
    .sentence-card {
      border: 1.6px solid #d7dce4;
      border-radius: 8px;
      padding: 6px;
      margin: 5px 0;
      font-size: 11px;
    }
    .triple-lines {
      display: grid;
      gap: 4px;
      margin-top: 5px;
    }
    .triple-lines span,
    .answer-line,
    .write-lines span {
      display: block;
      border-bottom: 2px solid #89919c;
      min-height: 14px;
    }
    .word-strip {
      border: 2px solid #6cae44;
      border-radius: 8px;
      padding: 5px;
      text-align: center;
      color: #125f24;
      font-weight: 950;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .word-strip span {
      display: inline-block;
      margin: 0 5px;
    }
    .fill-paragraph,
    .activity-panel p {
      font-size: 11px;
      line-height: 1.28;
      margin: 4px 0;
    }
    .write-lines {
      display: grid;
      gap: 5px;
      margin: 3px 0 6px;
    }
    .sequence-row {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 6px;
    }
    .sequence-item {
      text-align: center;
    }
    .sequence-icon {
      width: 46px;
      height: 46px;
      margin: 0 auto 4px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: #e4f4ff;
      border: 2px solid #5b9bd5;
      color: #1c5593;
      font-size: 20px;
      font-weight: 950;
    }
    .sequence-item strong {
      display: block;
      color: #4b1689;
      font-size: 10px;
    }
    .sequence-item span {
      display: block;
      border: 2px solid #9aa3ad;
      border-radius: 7px;
      height: 24px;
      margin-top: 5px;
    }
    .match-grid {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 20px;
    }
    .match-grid p {
      border: 1.5px solid #c8d2dc;
      border-radius: 7px;
      padding: 5px;
      margin: 5px 0;
      font-size: 11px;
      font-weight: 800;
    }
    .fraction-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border: 2px solid #5a3192;
      border-radius: 8px;
      overflow: hidden;
    }
    .fraction-grid div {
      min-height: 48px;
      border: 1px solid #b9a8d8;
      padding: 9px;
      font-size: 15px;
      font-weight: 900;
    }
    .fraction-grid span {
      display: inline-block;
      width: 62px;
      border-bottom: 2px solid #89919c;
    }
    .challenge-panel {
      border-color: #f28b2e;
      background: #fffdf8;
    }
    .sheet-footer {
      display: grid;
      grid-template-columns: 1fr 2fr 1fr;
      gap: 10px;
      align-items: center;
      margin-top: 7px;
      border-top: 2px dashed #b79be5;
      padding-top: 6px;
    }
    .sheet-footer strong {
      border: 2px solid #8d69bf;
      border-radius: 8px;
      padding: 5px;
      color: #4b1689;
      text-align: center;
      font-size: 14px;
    }
    .sheet-footer span {
      border-bottom: 3px solid #f28b2e;
    }
    .theme-math .sheet-hero p,
    .theme-math .section-label {
      background: #0b5ca8;
    }
    .theme-science .sheet-hero h2 {
      color: #08752a;
    }
    .material-footer {
      margin-top: 12px;
      border-top: 1px solid #d8e3d8;
      padding-top: 8px;
      color: #5e6c63;
      font-size: 11px;
    }
  `;
}

function buildExportHtml(content) {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Acessa+ - Material Inclusivo</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; line-height: 1.55; color: #1d2a22; padding: 32px; }
          h2 { border-bottom: 4px solid #238000; padding-bottom: 10px; }
          .tag { display: inline-block; border: 1px solid #d8e3d8; border-radius: 999px; padding: 5px 10px; color: #238000; font-size: 12px; font-weight: 700; margin: 0 6px 6px 0; }
          .material-footer { border-top: 1px solid #d8e3d8; padding-top: 12px; color: #5e6c63; font-size: 12px; }
          table { border-collapse: collapse; width: 100%; }
          td { border: 1px solid #d8e3d8; padding: 10px; }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function safeFileName(filename) {
  const date = new Date().toISOString().slice(0, 10);
  return filename.replace("material", `material-${date}`);
}

async function copyResult() {
  const text = $("#resultPaper").innerText;
  await navigator.clipboard.writeText(text);
  $("#copyBtn").textContent = "Copiado";
  setTimeout(() => $("#copyBtn").textContent = "Copiar", 1500);
}
async function gerarComIA() {
  const data = getFormData();

  $("#engineStatus").textContent = "Gerando com IA...";
  $("#resultPaper").innerHTML = "<h2>Acessa+</h2><p>Gerando material com o Assistente AEE...</p>";

  try {
    const resposta = await fetch("/api/gerar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const json = await resposta.json();

    if (!resposta.ok) {
      throw new Error(json.erro || "Erro ao gerar material.");
    }

    $("#resultPaper").innerHTML = json.resultado;
    $("#resultTitle").textContent = kindLabels[data.kind];
    $("#engineStatus").textContent = "Gerado com IA";

    state.currentResult = json.resultado;
    state.currentMeta = {
      kind: data.kind,
      title: `${kindLabels[data.kind]} - ${data.subject}`,
      studentName: data.studentName,
      subject: data.subject,
      date: new Date().toISOString()
    };
  } catch (erro) {
    $("#engineStatus").textContent = "Erro na IA";
    $("#resultPaper").innerHTML = `
      <h2>Erro ao gerar com IA</h2>
      <p>Não foi possível gerar o material com a OpenAI.</p>
      <p><strong>Detalhe:</strong> ${escapeHtml(erro.message)}</p>
      <p>Você ainda pode usar o modo local enquanto ajusta a configuração.</p>
    `;
  }
}
function clearForm() {
  $("#mainForm").reset();
  $$("input[name='needs']").forEach((field) => field.checked = false);
  state.currentResult = "";
  state.currentMeta = null;
  $("#resultPaper").innerHTML = "<h2>Acessa+</h2><p>Preencha os dados e clique em <strong>Gerar material</strong>. O resultado aparecerá aqui para editar, salvar e exportar.</p>";
  selectKind("activity");
}

function renderGuide() {
  $("#guideGrid").innerHTML = guideItems.map((item) => `
    <article class="guide-card">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join("");
}

function loadSettings() {
  $("#ownerName").value = state.settings.ownerName || "";
  $("#footerText").value = state.settings.footerText || "";
  $("#aiEndpoint").value = state.settings.aiEndpoint || "";
}

function saveSettings() {
  state.settings = {
    ...state.settings,
    ownerName: $("#ownerName").value.trim() || "Acessa+",
    footerText: $("#footerText").value.trim() || "Acessa+ | Educação Inclusiva na Prática",
    aiEndpoint: $("#aiEndpoint").value.trim()
  };
  writeJson(STORAGE_KEYS.settings, state.settings);
  $("#saveSettingsBtn").textContent = "Salvo";
  setTimeout(() => $("#saveSettingsBtn").textContent = "Salvar configurações", 1500);
}

function clearLibrary() {
  const confirmed = window.confirm("Deseja apagar todos os materiais salvos neste navegador?");
  if (!confirmed) return;
  state.saved = [];
  writeJson(STORAGE_KEYS.saved, state.saved);
  renderSaved();
}

function bindEvents() {
  $$(".nav-item").forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));
  $$("[data-go-view]").forEach((item) => item.addEventListener("click", () => showView(item.dataset.goView)));
  $$("[data-kind-shortcut]").forEach((item) => item.addEventListener("click", () => shortcutKind(item.dataset.kindShortcut)));
  $$(".module-card").forEach((card) => card.addEventListener("click", () => selectKind(card.dataset.kind)));
  $("#generateBtn").addEventListener("click", gerarComIA);
  $("#generateTopBtn").addEventListener("click", gerarComIA);
  $("#saveBtn").addEventListener("click", saveCurrent);
  $("#saveResultBtn").addEventListener("click", saveCurrent);
  $("#printBtn").addEventListener("click", () => window.print());
  $("#imageBtn").addEventListener("click", exportImage);
  $("#wordBtn").addEventListener("click", exportWord);
  $("#htmlBtn").addEventListener("click", exportHtml);
  $("#copyBtn").addEventListener("click", copyResult);
  $("#clearBtn").addEventListener("click", clearForm);
  $("#searchSaved").addEventListener("input", renderSaved);
  $("#saveSettingsBtn").addEventListener("click", saveSettings);
  $("#clearLibraryBtn").addEventListener("click", clearLibrary);
  $("#contrastBtn").addEventListener("click", toggleHighContrast);
  $("#simpleModeBtn").addEventListener("click", toggleSimpleMode);
  $("#fontPlusBtn").addEventListener("click", () => changeFont(1));
  $("#fontMinusBtn").addEventListener("click", () => changeFont(-1));
  $("#settingsContrastBtn").addEventListener("click", toggleHighContrast);
  $("#settingsSimpleBtn").addEventListener("click", toggleSimpleMode);
  $("#settingsFontBtn").addEventListener("click", () => changeFont(1));

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    $("#installBtn").hidden = false;
  });

  $("#installBtn").addEventListener("click", async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    $("#installBtn").hidden = true;
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}
async function gerarComIA() {
  const data = getFormData();

  $("#engineStatus").textContent = "Gerando com IA...";

  try {
    const resposta = await fetch("/api/gerar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const json = await resposta.json();

    if (!resposta.ok) {
      throw new Error(json.erro || "Erro ao gerar.");
    }

    $("#resultPaper").innerHTML = json.resultado;
    $("#resultTitle").textContent = kindLabels[data.kind];
    $("#engineStatus").textContent = "OpenAI conectada";

    state.currentResult = json.resultado;
    state.currentMeta = {
      kind: data.kind,
      title: `${kindLabels[data.kind]} - ${data.subject}`,
      studentName: data.studentName,
      subject: data.subject,
      date: new Date().toISOString()
    };

  } catch (erro) {
    $("#engineStatus").textContent = "Erro";

    $("#resultPaper").innerHTML = `
      <h2>Erro ao gerar material</h2>
      <p>${erro.message}</p>
    `;
  }
}
renderGuide();
renderSaved();
loadSettings();
applyAccessibilitySettings();
bindEvents();
registerServiceWorker();
