const STORAGE_KEYS = {
  saved: "acessaplus.saved.v2",
  settings: "acessaplus.settings.v2",
  users: "acessaplus.users.v1",
  currentUser: "acessaplus.currentUser.v1"
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
  aiLatestText: "",
  aiLastPayload: null,
  saved: readJson(STORAGE_KEYS.saved, readJson(LEGACY_STORAGE_KEYS.saved, [])),
  users: readJson(STORAGE_KEYS.users, []),
  currentUser: readJson(STORAGE_KEYS.currentUser, null),
  settings: normalizeSettings(readJson(STORAGE_KEYS.settings, readJson(LEGACY_STORAGE_KEYS.settings, DEFAULT_SETTINGS))),
  installPrompt: null
};

writeJson(STORAGE_KEYS.saved, state.saved);
writeJson(STORAGE_KEYS.users, state.users);
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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function setAuthStatus(selector, message, isError = false) {
  const element = $(selector);
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("status-error", isError);
}

async function hashPassword(password) {
  const value = String(password || "");
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(`acessamais:${value}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash)}`;
}

function buildUserProfile() {
  return {
    id: `user-${Date.now()}`,
    name: $("#signupName").value.trim(),
    contact: $("#signupContact").value.trim(),
    email: normalizeEmail($("#signupEmail").value),
    institution: $("#signupInstitution").value.trim(),
    role: $("#signupRole").value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };
}

function validateSignup(user, password) {
  if (!user.name) return "Informe o nome completo.";
  if (!user.contact) return "Informe um contato ou WhatsApp.";
  if (!user.email || !user.email.includes("@")) return "Informe um e-mail valido.";
  if (!password || password.length < 6) return "Crie uma senha com pelo menos 6 caracteres.";
  if (state.users.some((entry) => normalizeEmail(entry.email) === user.email)) return "Ja existe um cadastro com este e-mail.";
  return "";
}

function persistUsers() {
  writeJson(STORAGE_KEYS.users, state.users);
  writeJson(STORAGE_KEYS.currentUser, state.currentUser);
  refreshAuthUi();
}

function refreshAuthUi() {
  const box = $("#userStatus");
  if (!box) return;

  const user = state.currentUser;
  const dot = box.querySelector(".status-dot");
  const label = box.querySelector("strong");
  const logout = $("#logoutBtn");

  box.classList.toggle("logged", Boolean(user));
  dot?.classList.toggle("offline", !user);
  dot?.classList.toggle("online", Boolean(user));

  if (label) {
    label.textContent = user ? `Professor: ${user.name}` : "Sem professor logado";
  }

  if (logout) {
    logout.hidden = !user;
  }
}

function logoutUser() {
  state.currentUser = null;
  persistUsers();
  setAuthStatus("#loginStatus", "Perfil desconectado neste dispositivo.");
}

async function signupUser() {
  const password = $("#signupPassword").value;
  const user = buildUserProfile();
  const error = validateSignup(user, password);

  if (error) {
    setAuthStatus("#signupStatus", error, true);
    return;
  }

  user.passwordHash = await hashPassword(password);
  state.users.unshift(user);
  state.currentUser = {
    id: user.id,
    name: user.name,
    contact: user.contact,
    email: user.email,
    institution: user.institution,
    role: user.role,
    lastLoginAt: user.lastLoginAt
  };
  persistUsers();
  setAuthStatus("#signupStatus", "Cadastro criado e perfil profissional ativado.");
  showView("dashboard");
}

async function loginUser() {
  const email = normalizeEmail($("#loginEmail").value);
  const password = $("#loginPassword").value;
  const passwordHash = await hashPassword(password);
  const user = state.users.find((entry) => normalizeEmail(entry.email) === email);

  if (!user || user.passwordHash !== passwordHash) {
    setAuthStatus("#loginStatus", "E-mail ou senha nao encontrados neste dispositivo.", true);
    return;
  }

  user.lastLoginAt = new Date().toISOString();
  state.currentUser = {
    id: user.id,
    name: user.name,
    contact: user.contact,
    email: user.email,
    institution: user.institution,
    role: user.role,
    lastLoginAt: user.lastLoginAt
  };
  persistUsers();
  setAuthStatus("#loginStatus", `Bem-vindo(a), ${user.name}.`);
  showView("dashboard");
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

function normalizeDiscipline(value) {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();
  if (lower.includes("portugu")) return "Língua Portuguesa";
  if (lower.includes("matem")) return "Matemática";
  if (lower.includes("cien") || lower.includes("ciên")) return "Ciências";
  if (lower.includes("hist")) return "História";
  if (lower.includes("geo")) return "Geografia";
  if (lower.includes("ingl")) return "Inglês";
  if (lower.includes("arte")) return "Arte";
  if (lower.includes("educa") && lower.includes("fis")) return "Educação Física";
  if (lower.includes("relig")) return "Ensino Religioso";
  return text || "Disciplina não informada";
}

function normalizeSchoolYear(value) {
  const text = String(value || "").toLowerCase();
  const fundamental = text.match(/\b(6|7|8|9)\s*[ºo]?\s*ano\b/);
  if (fundamental) return `${fundamental[1]}º Ano`;
  const medio = text.match(/\b(1|2|3)\s*[ªa]?\s*s[eé]rie\b/);
  if (medio) return `${medio[1]}ª série EM`;
  return value || "Ano não informado";
}

function classifySchoolStage(value) {
  const text = String(value || "").toLowerCase();
  if (/\b(6|7|8|9)\s*[ºo]?\s*ano\b/.test(text)) return "Ensino Fundamental II";
  if (/\b(1|2|3)\s*[ªa]?\s*s[eé]rie\b/.test(text) || text.includes("ensino medio") || text.includes("ensino médio")) return "Ensino Médio";
  if (text.includes("profissional")) return "Educação Profissional";
  return "Etapa não informada";
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

function getSkillCodeOnly(data) {
  return extractSkillCode(data.skill || "") || "BNCC";
}

function isLanguageProductionContext(text) {
  return text.includes("portugues")
    || text.includes("lingua portuguesa")
    || text.includes("contexto de producao")
    || text.includes("contexto de produção")
    || text.includes("genero")
    || text.includes("gênero")
    || text.includes("circulacao")
    || text.includes("circulação")
    || text.includes("interlocucao")
    || text.includes("interlocução")
    || text.includes("leitura")
    || text.includes("escuta");
}

function buildLanguageProductionSheetContext(data) {
  const skillCode = getSkillCodeOnly(data);
  const topic = "CONTEXTO DE PRODUCAO DO TEXTO";
  return {
    theme: "language",
    title: topic,
    subtitle: "LER, ANALISAR E COMPREENDER",
    intro: "OBSERVE AS PISTAS DO TEXTO. DESCUBRA QUEM PRODUZIU, PARA QUEM, ONDE CIRCULA E COM QUAL FINALIDADE.",
    objective: "IDENTIFICAR ELEMENTOS DO CONTEXTO DE PRODUCAO, CIRCULACAO E RECEPCAO DE TEXTOS.",
    remember: [
      ["TEMA", "CONTEXTO DE PRODUCAO, CIRCULACAO E RECEPCAO DE TEXTOS"],
      ["HABILIDADE", skillCode],
      ["PISTAS", "AUTOR, PUBLICO, LUGAR DE CIRCULACAO, FINALIDADE E GENERO TEXTUAL"]
    ],
    sections: [
      {
        type: "visualChoice",
        label: "1",
        title: "MARQUE A IMAGEM QUE REPRESENTA UM TEXTO.",
        prompt: "QUAL OPCAO PODE SER LIDA OU ESCUTADA PARA PASSAR UMA MENSAGEM?",
        options: [
          { text: "CARTAZ", visual: "cartaz texto" },
          { text: "PEDRA", visual: "pedra" },
          { text: "BOLA", visual: "bola" }
        ]
      },
      {
        type: "match",
        label: "2",
        title: "LIGUE CADA PALAVRA AO SIGNIFICADO.",
        left: ["AUTOR", "PUBLICO", "FINALIDADE", "CIRCULACAO"],
        right: ["QUEM PRODUZ O TEXTO", "QUEM RECEBE O TEXTO", "PARA QUE O TEXTO FOI FEITO", "ONDE O TEXTO APARECE"]
      },
      {
        type: "trueFalse",
        label: "3",
        title: "MARQUE (V) OU (F).",
        statements: [
          "TODO TEXTO TEM UMA FINALIDADE.",
          "O PUBLICO E QUEM RECEBE A MENSAGEM.",
          "O CONTEXTO NAO AJUDA A ENTENDER O TEXTO."
        ]
      },
      {
        type: "fillText",
        label: "4",
        title: "COMPLETE COM AS PALAVRAS DO BANCO.",
        bank: ["AUTOR", "PUBLICO", "FINALIDADE", "GENERO"],
        text: "O ______ PRODUZ O TEXTO. O ______ RECEBE A MENSAGEM. A ______ MOSTRA PARA QUE O TEXTO FOI FEITO. O ______ INDICA O TIPO DE TEXTO."
      },
      {
        type: "visualChoice",
        label: "5",
        title: "ESCOLHA A FINALIDADE DO TEXTO.",
        prompt: "UM CARTAZ DE CAMPANHA SERVE PRINCIPALMENTE PARA:",
        options: [
          { text: "INFORMAR E ORIENTAR", visual: "cartaz informacao" },
          { text: "ESCONDER IDEIAS", visual: "nao" },
          { text: "IMPEDIR A LEITURA", visual: "negacao" }
        ]
      },
      {
        type: "production",
        label: "6",
        title: "PRODUZA SUA RESPOSTA.",
        prompts: [
          "DESENHE OU ESCREVA UM CARTAZ SOBRE RESPEITO.",
          "MARQUE PARA QUEM ESSE CARTAZ FOI FEITO.",
          "DIGA QUAL E A FINALIDADE DO CARTAZ."
        ]
      },
      {
        type: "challenge",
        label: "DESAFIO",
        prompt: "ESCOLHA UM TEXTO QUE VOCE JA VIU NA ESCOLA, NA RUA OU NA INTERNET. QUAL ERA A FINALIDADE DELE?"
      }
    ]
  };
}

function getPremiumWorksheetContext(data) {
  const combined = normalizeText(`${data.subject} ${data.knowledgeObject} ${data.skill} ${data.baseActivity}`);

  if (isLanguageProductionContext(combined)) {
    return buildLanguageProductionSheetContext(data);
  }

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
    remember: [["TEMA", data.knowledgeObject || "conteúdo estudado"], ["HABILIDADE", getSkillCodeOnly(data)]],
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

  if (section.type === "visualChoice") {
    return `
      <section class="activity-panel">
        <h3>${label}${escapeHtml(section.title)}</h3>
        <p>${escapeHtml(section.prompt || "MARQUE A RESPOSTA CORRETA.")}</p>
        <div class="visual-choice-grid">
          ${(section.options || []).slice(0, 3).map((option) => `
            <div class="visual-choice-card">
              <div class="visual-choice-art" aria-hidden="true">${renderPictogramSvg(option.visual || option.text)}</div>
              <span class="choice-mark"></span>
              <strong>${escapeHtml(option.text || "")}</strong>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

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
  const skillCode = getSkillCodeOnly(data);
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

      <div class="sheet-learning-meta" aria-label="Dados pedagogicos da atividade">
        <span><strong>OBJETIVO:</strong> ${escapeHtml(context.objective || `COMPREENDER ELEMENTOS ESSENCIAIS SOBRE ${data.knowledgeObject || "O CONTEUDO ESTUDADO"}.`)}</span>
        <span><strong>HABILIDADE:</strong> ${escapeHtml(skillCode)}</span>
        <span><strong>Turma:</strong> ${escapeHtml(data.grade === "Série não informada" ? "" : data.grade)}</span>
        <span><strong>Disciplina:</strong> ${escapeHtml(data.subject === "Disciplina não informada" ? "" : data.subject)}</span>
      </div>

      <div class="intro-ribbon">${escapeHtml(context.intro)}</div>

      <div class="sheet-layout">
        ${renderRemember(context.remember)}
        ${context.sections.map(renderPremiumSection).join("")}
      </div>

      <footer class="sheet-footer">
        <span>@MOZAHINTERVIEIRA</span>
        <strong>ACESSA+ • INCLUI • TRANSFORMA • CONECTA</strong>
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

function shouldUseAiGenerator(data) {
  return data.kind === "activity";
}

function setEngineStatus(message, isError = false) {
  const status = $("#engineStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("status-error", isError);
}

function setGenerateButtonsLoading(isLoading) {
  ["#generateBtn", "#generateTopBtn"].forEach((selector) => {
    const button = $(selector);
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? "Gerando com IA..." : "Gerar material";
  });
}

function getMaterialAiPayload(data) {
  const pedagogicalRequest = [
    data.baseActivity ? `Atividade original, observacoes ou situacao de aprendizagem: ${data.baseActivity}` : "",
    `Formato desejado: ${data.format}`,
    "Gere uma atividade A4 pronta para uso com estudante.",
    "A folha visivel nao deve conter nome do estudante, nome do professor, escola, turma ou data.",
    "A atividade precisa ter imagens/pictogramas integrados no layout, comandos claros, alternativas objetivas e variacao de modelos de tarefa."
  ].filter(Boolean).join("\n");

  return {
    perfil: data.needs.join(", "),
    perfis: data.needs,
    serie: data.grade,
    idade: data.age,
    idadeFuncional: "",
    disciplina: data.subject,
    habilidade: data.skill,
    objetoConhecimento: data.knowledgeObject,
    nivelAlfabetizacao: data.readingLevel,
    nivelApoio: data.autonomy,
    comunicacao: data.communication,
    autonomia: data.autonomy,
    areaInteresse: "",
    recursosDisponiveis: data.resourcesNeeded,
    pedidoProfessor: pedagogicalRequest
  };
}

function renderResultError(title, message) {
  state.currentResult = "";
  state.currentMeta = null;
  $("#resultTitle").textContent = "Não foi possível gerar";
  $("#resultPaper").innerHTML = `
    <div class="result-error">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      <p>Verifique se o projeto está publicado na Vercel e se a variável OPENAI_API_KEY está configurada em Production.</p>
    </div>
  `;
}

async function generateAiMaterial(data) {
  const payload = getMaterialAiPayload(data);
  state.aiLastPayload = payload;
  setEngineStatus("Gerando com IA real...");
  setGenerateButtonsLoading(true);
  $("#resultTitle").textContent = "Atividade adaptada";
  $("#resultPaper").innerHTML = `
    <div class="result-loading">
      <h2>Gerando atividade com IA</h2>
      <p>Aguarde enquanto o ACESSA+ cria uma folha A4 adaptada, visual e pronta para uso.</p>
    </div>
  `;

  try {
    const endpoint = state.settings.aiEndpoint || "/api/generate";
    const apiResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseData = await apiResponse.json();

    if (!apiResponse.ok) {
      throw new Error(responseData.error || "A API de IA não conseguiu gerar o material.");
    }

    const material = responseData.material || {};
    const html = buildA4AiMaterialHtml(material, payload);
    state.currentResult = html;
    state.aiLatestText = materialToText(material);
    state.currentMeta = {
      kind: data.kind,
      title: material.cabecalho?.titulo_atividade || material.conteudo_adaptado?.titulo || `${kindLabels[data.kind]} - ${data.subject}`,
      subject: data.subject,
      discipline: normalizeDiscipline(data.subject),
      schoolStage: classifySchoolStage(data.grade),
      schoolYear: normalizeSchoolYear(data.grade),
      skillCode: extractSkillCode(material.metadados?.habilidade_bncc_adaptada || data.skill || ""),
      profiles: data.needs,
      primaryProfile: data.needs[0] || "Geral",
      knowledgeObject: data.knowledgeObject,
      createdBy: state.currentUser?.id || null,
      createdByName: state.currentUser?.name || "Professor não identificado",
      source: "ia",
      date: new Date().toISOString()
    };

    $("#resultPaper").innerHTML = html;
    $("#resultTitle").textContent = "Atividade adaptada pela IA";
    setEngineStatus("Gerado com IA real");
  } catch (error) {
    renderResultError("IA não disponível", error.message);
    setEngineStatus("Erro na IA", true);
  } finally {
    setGenerateButtonsLoading(false);
  }
}

function generateLocalMaterial(data) {
  const generator = generators[data.kind] || generateActivity;
  const html = generator(data);
  state.currentResult = html;
  state.currentMeta = {
    kind: data.kind,
    title: `${kindLabels[data.kind]} - ${data.subject}`,
    studentName: data.studentName,
    subject: data.subject,
    discipline: normalizeDiscipline(data.subject),
    schoolStage: classifySchoolStage(data.grade),
    schoolYear: normalizeSchoolYear(data.grade),
    skillCode: extractSkillCode(data.skill || ""),
    profiles: data.needs,
    primaryProfile: data.needs[0] || "Geral",
    knowledgeObject: data.knowledgeObject,
    createdBy: state.currentUser?.id || null,
    createdByName: state.currentUser?.name || "Professor não identificado",
    date: new Date().toISOString()
  };
  $("#resultPaper").innerHTML = html;
  $("#resultTitle").textContent = kindLabels[data.kind];
  setEngineStatus("Gerado em modo local");
}

async function generateMaterial() {
  const data = getFormData();
  if (shouldUseAiGenerator(data)) {
    await generateAiMaterial(data);
    return;
  }

  generateLocalMaterial(data);
}

async function saveCurrent() {
  if (!state.currentUser) {
    showView("login");
    setAuthStatus("#loginStatus", "Entre ou crie um perfil para salvar materiais na biblioteca.", true);
    return;
  }

  if (!state.currentResult) await generateMaterial();
  if (!state.currentResult) return;

  const item = {
    id: Date.now(),
    ...state.currentMeta,
    html: $("#resultPaper").innerHTML,
    updatedAt: new Date().toISOString()
  };
  state.saved.unshift(item);
  try {
    writeJson(STORAGE_KEYS.saved, state.saved);
  } catch (error) {
    state.saved = state.saved.filter((entry) => entry.id !== item.id);
    $("#engineStatus").textContent = "Não foi possível salvar. O armazenamento local está cheio.";
    return;
  }
  renderSaved();
  showView("library");
}

function setUploadStatus(message, isError = false) {
  const status = $("#uploadStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("status-error", isError);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getUploadProfiles() {
  const selected = $$("input[name='uploadProfiles']:checked").map((field) => field.value);
  if (selected.length > 1 && selected.includes("Geral")) {
    return selected.filter((profile) => profile !== "Geral");
  }
  return selected.length ? selected : ["Geral"];
}

function resetUploadProfiles() {
  $$("input[name='uploadProfiles']").forEach((field) => {
    field.checked = field.value === "Geral";
  });
}

function syncUploadProfileSelection(event) {
  const target = event.target;
  if (!target?.matches?.("input[name='uploadProfiles']")) return;

  const fields = $$("input[name='uploadProfiles']");
  const general = fields.find((field) => field.value === "Geral");

  if (target.value === "Geral" && target.checked) {
    fields.forEach((field) => {
      if (field.value !== "Geral") field.checked = false;
    });
    return;
  }

  if (target.value !== "Geral" && target.checked && general) {
    general.checked = false;
  }

  if (!fields.some((field) => field.checked) && general) {
    general.checked = true;
  }
}

async function uploadLibraryMaterial() {
  const fileInput = $("#uploadFile");
  const file = fileInput?.files?.[0];
  const title = $("#uploadTitle")?.value.trim();
  const schoolYear = $("#uploadYear")?.value || "";
  const discipline = $("#uploadSubject")?.value || "";
  const skillCode = extractSkillCode($("#uploadSkill")?.value || "") || ($("#uploadSkill")?.value.trim() || "");
  const profiles = getUploadProfiles();

  if (!state.currentUser) {
    setUploadStatus("Entre ou crie um perfil para enviar materiais para a biblioteca.", true);
    showView("login");
    return;
  }

  if (!title) {
    setUploadStatus("Informe o título da atividade.", true);
    return;
  }

  if (!skillCode) {
    setUploadStatus("Informe a habilidade para organizar o acervo.", true);
    return;
  }

  if (!file) {
    setUploadStatus("Selecione um arquivo para enviar.", true);
    return;
  }

  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    setUploadStatus("Arquivo muito grande para salvar localmente. Use até 2 MB por enquanto.", true);
    return;
  }

  setUploadStatus("Salvando atividade na biblioteca...");
  const fileDataUrl = await readFileAsDataUrl(file);
  const item = {
    id: Date.now(),
    source: "upload",
    kind: "uploaded",
    title,
    subject: discipline,
    discipline,
    schoolStage: classifySchoolStage(schoolYear),
    schoolYear,
    skillCode,
    profiles,
    primaryProfile: profiles[0],
    knowledgeObject: title,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    fileDataUrl,
    createdBy: state.currentUser?.id || null,
    createdByName: state.currentUser?.name || "Professor não identificado",
    date: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.saved.unshift(item);
  try {
    writeJson(STORAGE_KEYS.saved, state.saved);
  } catch (error) {
    state.saved = state.saved.filter((entry) => entry.id !== item.id);
    setUploadStatus("Não foi possível salvar no navegador. Use um arquivo menor ou integre um banco real.", true);
    return;
  }

  renderSaved();
  setUploadStatus("Atividade salva na biblioteca local.");

  $("#uploadTitle").value = "";
  $("#uploadSkill").value = "";
  fileInput.value = "";
  resetUploadProfiles();
}

function schoolYearSortValue(value) {
  const text = normalizeText(value);
  if (text.includes("6")) return 6;
  if (text.includes("7")) return 7;
  if (text.includes("8")) return 8;
  if (text.includes("9")) return 9;
  if (text.includes("1") && text.includes("em")) return 10;
  if (text.includes("2") && text.includes("em")) return 11;
  if (text.includes("3") && text.includes("em")) return 12;
  return 99;
}

function sortSavedItems(items) {
  return [...items].sort((a, b) => {
    const yearDiff = schoolYearSortValue(a.schoolYear) - schoolYearSortValue(b.schoolYear);
    if (yearDiff) return yearDiff;
    const skillDiff = String(a.skillCode || "").localeCompare(String(b.skillCode || ""), "pt-BR", { numeric: true });
    if (skillDiff) return skillDiff;
    const subjectDiff = String(a.discipline || a.subject || "").localeCompare(String(b.discipline || b.subject || ""), "pt-BR");
    if (subjectDiff) return subjectDiff;
    const profileDiff = String(a.primaryProfile || "").localeCompare(String(b.primaryProfile || ""), "pt-BR");
    if (profileDiff) return profileDiff;
    return new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0);
  });
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderLibrarySummary(filteredCount) {
  const summary = $("#librarySummary");
  if (!summary) return;

  const uploaded = state.saved.filter((item) => item.source === "upload").length;
  const generated = state.saved.length - uploaded;
  const loggedUser = state.currentUser?.name || "sem professor logado";

  summary.innerHTML = `
    <span><strong>${filteredCount}</strong> materiais na visualização atual</span>
    <span><strong>${state.saved.length}</strong> no acervo local</span>
    <span><strong>${generated}</strong> gerados</span>
    <span><strong>${uploaded}</strong> enviados por upload</span>
    <span>Professor: <strong>${escapeHtml(loggedUser)}</strong></span>
  `;
}

function renderSaved() {
  const query = ($("#searchSaved")?.value || "").toLowerCase();
  const stage = $("#filterStage")?.value || "";
  const year = $("#filterYear")?.value || "";
  const subject = $("#filterSubject")?.value || "";
  const profile = $("#filterProfile")?.value || "";
  const filtered = sortSavedItems(state.saved.filter((item) => {
    const itemProfiles = Array.isArray(item.profiles) ? item.profiles : [item.primaryProfile].filter(Boolean);
    const haystack = `${item.title} ${item.fileName} ${item.createdByName} ${item.subject} ${item.discipline} ${item.skillCode} ${item.knowledgeObject} ${itemProfiles.join(" ")} ${kindLabels[item.kind]}`.toLowerCase();
    const matchesQuery = haystack.includes(query);
    const matchesStage = !stage || item.schoolStage === stage;
    const matchesYear = !year || item.schoolYear === year;
    const matchesSubject = !subject || item.discipline === subject || item.subject === subject;
    const matchesProfile = !profile || itemProfiles.includes(profile);
    return matchesQuery && matchesStage && matchesYear && matchesSubject && matchesProfile;
  }));

  const list = $("#savedList");
  renderLibrarySummary(filtered.length);

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <strong>Nenhum material encontrado.</strong>
        <p>Gere um material no criador e clique em salvar. Ele ficara organizado por etapa, ano, disciplina, habilidade e perfil.</p>
      </div>
    `;
    return;
  }

  let lastGroup = "";
  list.innerHTML = filtered.map((item) => {
    const itemDiscipline = item.discipline || item.subject || "Disciplina não informada";
    const groupKey = `${item.schoolYear || "Ano não informado"}|${itemDiscipline}|${item.skillCode || "Habilidade não informada"}`;
    const groupHeader = groupKey !== lastGroup ? `
      <div class="library-group-title">
        <strong>${escapeHtml(item.schoolYear || "Ano não informado")} • ${escapeHtml(itemDiscipline)}</strong>
        <span>${escapeHtml(item.skillCode || "Habilidade não informada")}</span>
      </div>
    ` : "";
    lastGroup = groupKey;
    const itemProfiles = item.profiles || [item.primaryProfile || "Geral"];
    const typeLabel = kindLabels[item.kind] || (item.source === "upload" ? "Arquivo enviado" : "Material");
    const fileInfo = item.fileName ? ` | Arquivo: ${item.fileName}${item.fileSize ? ` (${formatFileSize(item.fileSize)})` : ""}` : "";

    return `
      ${groupHeader}
      <article class="saved-card">
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="saved-meta-line">
            <span>${escapeHtml(typeLabel)}</span>
            <span>${escapeHtml(item.schoolStage || "Etapa")}</span>
            <span>${escapeHtml(item.schoolYear || "Ano")}</span>
            <span>${escapeHtml(itemDiscipline)}</span>
            <span>${escapeHtml(item.skillCode || "Habilidade")}</span>
          </p>
          <p class="saved-owner">Autor: ${escapeHtml(item.createdByName || "Professor não identificado")}${escapeHtml(fileInfo)}</p>
          <div class="saved-tags">
            ${itemProfiles.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
          </div>
        </div>
        <div class="card-actions">
          <button class="secondary-button" type="button" data-open="${item.id}">${item.source === "upload" ? "Abrir arquivo" : "Abrir"}</button>
          <button class="secondary-button" type="button" data-duplicate="${item.id}">Duplicar</button>
          <button class="danger-button" type="button" data-delete="${item.id}">Excluir</button>
        </div>
      </article>
    `;
  }).join("");

  $$('[data-open]').forEach((button) => {
    button.addEventListener("click", () => openSaved(Number(button.dataset.open)));
  });
  $$('[data-duplicate]').forEach((button) => {
    button.addEventListener("click", () => duplicateSaved(Number(button.dataset.duplicate)));
  });
  $$('[data-delete]').forEach((button) => {
    button.addEventListener("click", () => deleteSaved(Number(button.dataset.delete)));
  });
}

function openUploadedFile(item) {
  if (!item.fileDataUrl) return;
  const previewable = /^image\//.test(item.fileType || "")
    || /pdf|text|html/.test(item.fileType || "")
    || /\.(pdf|png|jpe?g|webp|gif|txt|html?)$/i.test(item.fileName || "");
  const link = document.createElement("a");
  link.href = item.fileDataUrl;
  link.target = "_blank";
  link.rel = "noopener";
  if (!previewable) {
    link.download = item.fileName || `${item.title}.pdf`;
  }
  link.click();
}

function openSaved(id) {
  const item = state.saved.find((entry) => entry.id === id);
  if (!item) return;
  if (item.source === "upload") {
    openUploadedFile(item);
    return;
  }
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

async function exportImage() {
  if (!state.currentResult) await generateMaterial();
  if (!state.currentResult) return;

  const aiPages = $$("#resultPaper .ai-a4-sheet, #resultPaper .math-a4");
  if (aiPages.length) {
    setEngineStatus(`Gerando ${aiPages.length} imagem(ns) A4...`);
    for (const [index, page] of aiPages.entries()) {
      await exportElementAsPng(page, safeFileName(`acessaplus-atividade-ia-pagina-${index + 1}.png`));
    }
    setEngineStatus(aiPages.length > 1 ? "Imagens A4 baixadas por página" : "Imagem A4 baixada");
    return;
  }

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
    .visual-choice-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    .visual-choice-card {
      border: 2px solid #d4e4ff;
      border-radius: 10px;
      min-height: 118px;
      padding: 7px;
      display: grid;
      grid-template-rows: 58px auto auto;
      align-items: center;
      justify-items: center;
      text-align: center;
      gap: 4px;
      font-size: 12px;
    }
    .visual-choice-art,
    .visual-choice-art svg,
    .visual-choice-art .ai-picture-placeholder {
      width: 68px;
      height: 54px;
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
    .sheet-learning-meta {
      display: grid;
      grid-template-columns: 1.45fr .55fr;
      gap: 6px;
      margin: 6px 0 8px;
    }
    .sheet-learning-meta span {
      border: 1.8px solid #8fb2e7;
      border-radius: 8px;
      padding: 7px 8px;
      font-size: 12px;
      min-height: 34px;
      background: #f8fbff;
    }
    .sheet-learning-meta span:nth-child(n+3) {
      display: none;
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

const AI_SECTION_LABELS = {
  titulo: "Título da atividade",
  publicoAlvo: "Público-alvo",
  objetivoPedagogico: "Objetivo pedagógico",
  habilidade: "Habilidade",
  materiaisNecessarios: "Materiais necessários",
  metodologiaInclusiva: "Metodologia inclusiva",
  atividadeAdaptada: "Atividade adaptada",
  pistasVisuais: "Pistas visuais e pictogramas",
  recursosAcessibilidade: "Recursos de acessibilidade",
  estrategiasAEE: "Estratégias do AEE",
  avaliacao: "Avaliação",
  sugestoesProfessor: "Sugestões para o professor"
};

const METADATA_LABELS = {
  objetivo_pedagogico: "Objetivo pedagógico",
  habilidade_bncc_adaptada: "Habilidade BNCC adaptada",
  publico_alvo: "Público-alvo",
  nivel_apoio: "Nível de apoio",
  observacoes_acessibilidade: "Observações de acessibilidade"
};

function getAssistantPayload() {
  const perfis = $$("input[name='aiPerfil']:checked").map((input) => input.value);
  return {
    perfil: perfis.join(", "),
    perfis,
    serie: $("#aiSerie").value.trim(),
    idade: $("#aiIdade")?.value.trim() || "",
    idadeFuncional: $("#aiIdadeFuncional")?.value.trim() || "",
    disciplina: $("#aiDisciplina").value.trim(),
    habilidade: $("#aiHabilidade").value.trim(),
    objetoConhecimento: $("#aiObjeto").value.trim(),
    nivelAlfabetizacao: $("#aiNivelAlfabetizacao").value,
    nivelApoio: $("#aiNivelApoio").value,
    comunicacao: $("#aiComunicacao")?.value.trim() || "",
    autonomia: $("#aiAutonomia")?.value.trim() || "",
    areaInteresse: $("#aiAreaInteresse").value.trim(),
    recursosDisponiveis: $("#aiRecursos")?.value.trim() || "",
    pedidoProfessor: $("#aiPedido").value.trim()
  };
}

function validateAssistantPayload(payload) {
  const required = [
    ["perfil", "Perfil"],
    ["serie", "Ano/série"],
    ["disciplina", "Disciplina"],
    ["habilidade", "Habilidade"],
    ["objetoConhecimento", "Objeto de conhecimento"],
    ["nivelAlfabetizacao", "Nível de alfabetização"],
    ["nivelApoio", "Nível de apoio"],
    ["pedidoProfessor", "Pedido do professor"]
  ];
  const missing = required.filter(([key]) => !payload[key]).map(([, label]) => label);
  return missing.length ? `Preencha: ${missing.join(", ")}.` : "";
}

async function generateAeeMaterial() {
  const payload = getAssistantPayload();
  const validationError = validateAssistantPayload(payload);

  if (validationError) {
    setAiStatus(validationError, true);
    return;
  }

  state.aiLastPayload = payload;
  setAiStatus("Gerando material com IA. Aguarde...");
  renderAiLoading();
  $("#aiGenerateBtn").disabled = true;

  try {
    const apiResponse = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      throw new Error(data.error || "Não foi possível gerar o material.");
    }

    renderAiMaterial(data.material);
    state.aiLatestText = materialToText(data.material);
    setAiStatus("Material gerado com sucesso.");
  } catch (error) {
    renderAiError(error.message);
    setAiStatus(error.message, true);
  } finally {
    $("#aiGenerateBtn").disabled = false;
  }
}

function setAiStatus(message, isError = false) {
  const status = $("#aiStatus");
  status.textContent = message;
  status.classList.toggle("status-error", isError);
}

function renderAiLoading() {
  $("#aiResultCards").innerHTML = `
    <article class="ai-card loading">
      <h3>Gerando material</h3>
      <p>A API está organizando a proposta com foco em AEE, DUA, acessibilidade e estratégias pedagógicas inclusivas.</p>
    </article>
  `;
}

function renderAiError(message) {
  $("#aiResultCards").innerHTML = `
    <article class="ai-card error">
      <h3>Não foi possível gerar</h3>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}

function renderAiMaterial(material = {}) {
  if (material.configuracao_folha || material.cabecalho || material.ancoras_cognitivas || material.secoes_desafios) {
    renderA4AiMaterial(material);
    return;
  }

  if (material.metadados || material.conteudo_adaptado || material.atividades) {
    renderStructuredAiMaterial(material);
    return;
  }

  const cards = Object.entries(AI_SECTION_LABELS).map(([key, label]) => `
    <article class="ai-card">
      <h3>${escapeHtml(label)}</h3>
      <p>${escapeHtml(material[key] || "Não informado.")}</p>
    </article>
  `);

  $("#aiResultCards").innerHTML = cards.join("");
}

function shouldUseEditorialA4(payload = {}, material = {}) {
  const discipline = normalizeText(payload.disciplina || "");
  const skill = normalizeText(payload.habilidade || material.metadados?.habilidade_bncc_adaptada || "");
  const isPortuguese = discipline.includes("portugues")
    || discipline.includes("lingua portuguesa")
    || skill.includes("em13lp")
    || skill.includes("ef") && skill.includes("lp");

  if (!isPortuguese) return false;

  const text = normalizeText([
    payload.disciplina,
    payload.habilidade,
    payload.objetoConhecimento,
    payload.areaInteresse,
    payload.pedidoProfessor,
    material.cabecalho?.titulo_atividade,
    material.conteudo_adaptado?.titulo
  ].filter(Boolean).join(" "));

  return text.includes("portugues")
    || text.includes("lingua portuguesa")
    || text.includes("em13lp")
    || text.includes("genero textual")
    || text.includes("leitura")
    || text.includes("escuta")
    || text.includes("compreensao");
}

function shouldUseMathA4(payload = {}, material = {}) {
  const text = normalizeText([
    payload.disciplina,
    payload.habilidade,
    payload.objetoConhecimento,
    payload.areaInteresse,
    payload.recursosDisponiveis,
    payload.pedidoProfessor,
    material.cabecalho?.titulo_atividade,
    material.conteudo_adaptado?.titulo
  ].filter(Boolean).join(" "));

  const isMath = text.includes("matematica")
    || text.includes("matemat")
    || text.includes("em13mat")
    || /\bef\d+ma/i.test(String(payload.habilidade || ""));

  if (!isMath) return false;

  return text.includes("coordenada")
    || text.includes("cartesiano")
    || text.includes("funcao")
    || text.includes("multiplicacao")
    || text.includes("multiplic")
    || text.includes("tabuada")
    || text.includes("algebr");
}

function renderMathA4Sequence(material = {}, payload = {}) {
  const pages = buildMathA4Pages(material, payload);
  if (!pages.length) return false;

  $("#aiResultCards").innerHTML = `
    <div class="math-a4-sequence" aria-label="Sequencia de folhas A4 de Matematica">
      ${pages.map(renderMathPage).join("")}
    </div>
  `;
  return true;
}

function buildMathA4Pages(material = {}, payload = {}) {
  const text = normalizeText(`${payload.habilidade || ""} ${payload.objetoConhecimento || ""} ${payload.pedidoProfessor || ""}`);
  const skillCode = extractSkillCode(payload.habilidade || material.metadados?.habilidade_bncc_adaptada || "");
  const object = String(payload.objetoConhecimento || "MATEMATICA").toUpperCase();
  const resources = String(payload.recursosDisponiveis || "").toUpperCase();
  const hasCoordinates = text.includes("coordenada") || text.includes("cartesiano") || text.includes("ponto") || text.includes("plano");
  const hasFunction = text.includes("funcao") || text.includes("algebr") || text.includes("proporcional") || text.includes("1 grau");
  const hasMultiplication = text.includes("multiplic") || normalizeText(resources).includes("domino");

  const pages = [];

  if (hasCoordinates || !hasFunction) {
    pages.push({
      number: "1",
      accent: "blue",
      title: "PLANO CARTESIANO",
      subtitle: "LOCALIZAR PONTOS NA MALHA",
      icon: "grid",
      body: renderMathCoordinateIntro(skillCode, object)
    });
    pages.push({
      number: "2",
      accent: "green",
      title: "COORDENADAS EM AÇÃO",
      subtitle: "LER, MARCAR E COMPARAR PONTOS",
      icon: "target",
      body: renderMathCoordinatePractice()
    });
  }

  if (hasFunction || hasMultiplication || pages.length < 3) {
    pages.push({
      number: String(pages.length + 1),
      accent: "orange",
      title: hasFunction ? "TABELA E GRÁFICO" : "MULTIPLICAÇÃO VISUAL",
      subtitle: hasFunction ? "REPRESENTAR UMA REGRA" : "CALCULAR COM APOIO",
      icon: "graph",
      body: hasFunction ? renderMathFunctionPractice() : renderMathMultiplicationPractice()
    });
  }

  pages.push({
    number: String(pages.length + 1),
    accent: "purple",
    title: "ATIVIDADE LÚDICA",
    subtitle: "MATERIAIS CONCRETOS E TECNOLOGIA",
    icon: "materials",
    body: renderMathLudicPractice(resources, hasCoordinates, hasFunction, hasMultiplication)
  });

  return pages;
}

function renderMathPage(page) {
  return `
    <article class="math-a4 math-${escapeHtml(page.accent)}">
      <header class="math-header">
        <div class="math-number">${escapeHtml(page.number)}</div>
        <div>
          <h3>${escapeHtml(page.title)}</h3>
          <p>${escapeHtml(page.subtitle)}</p>
        </div>
        <div class="math-icon">${renderMathIcon(page.icon)}</div>
      </header>
      ${page.body}
      <footer class="math-footer">
        <span>@MOZAHINTERVIEIRA</span>
        <strong>ACESSA+ • INCLUI • TRANSFORMA • CONECTA</strong>
      </footer>
    </article>
  `;
}

function renderMathCoordinateIntro(skillCode, object) {
  return `
    <section class="math-reminder">
      <div>
        <strong>PARA LEMBRAR</strong>
        <p>O PLANO CARTESIANO TEM DUAS LINHAS: EIXO X E EIXO Y. CADA PONTO TEM DOIS NÚMEROS: (X, Y).</p>
        ${skillCode ? `<span>HABILIDADE: ${escapeHtml(skillCode)}</span>` : ""}
      </div>
      ${renderCartesianGrid([{ label: "A", x: 2, y: 3 }, { label: "B", x: 5, y: 1 }, { label: "C", x: 1, y: 4 }])}
    </section>
    <section class="math-activity">
      <h4>1. OBSERVE A MALHA E MARQUE A RESPOSTA CERTA.</h4>
      <p>QUAL É A COORDENADA DO PONTO A?</p>
      ${renderMathOptions(["A (2, 3)", "A (3, 2)", "A (5, 1)"])}
    </section>
    <section class="math-activity two-columns">
      <div>
        <h4>2. LIGUE O PONTO À COORDENADA.</h4>
        ${renderMathMatch(["PONTO A", "PONTO B", "PONTO C"], ["(2, 3)", "(5, 1)", "(1, 4)"])}
      </div>
      <div>
        <h4>3. COMPLETE.</h4>
        <p>O EIXO X MOSTRA O NÚMERO NA HORIZONTAL.</p>
        <p>O EIXO Y MOSTRA O NÚMERO NA VERTICAL.</p>
        <label>PONTO B: ( ____ , ____ )</label>
        <label>PONTO C: ( ____ , ____ )</label>
      </div>
    </section>
    <section class="math-object-note">
      <strong>OBJETO DE CONHECIMENTO:</strong>
      <span>${escapeHtml(object)}</span>
    </section>
  `;
}

function renderMathCoordinatePractice() {
  return `
    <section class="math-large-visual">
      ${renderCartesianGrid([{ label: "D", x: 3, y: 4 }, { label: "E", x: 6, y: 2 }, { label: "F", x: 1, y: 1 }])}
      <div class="math-coordinate-cards">
        <strong>LEIA OS PONTOS</strong>
        <span>D = (3, 4)</span>
        <span>E = (6, 2)</span>
        <span>F = (1, 1)</span>
      </div>
    </section>
    <section class="math-activity">
      <h4>1. MARQUE COM X.</h4>
      <p>QUAL PONTO ESTÁ MAIS ALTO NA MALHA?</p>
      ${renderMathOptions(["PONTO D", "PONTO E", "PONTO F"])}
    </section>
    <section class="math-activity">
      <h4>2. ESCREVA O PAR ORDENADO.</h4>
      <div class="math-write-grid">
        <label>PONTO D: ( ____ , ____ )</label>
        <label>PONTO E: ( ____ , ____ )</label>
        <label>PONTO F: ( ____ , ____ )</label>
      </div>
    </section>
    <section class="math-activity">
      <h4>3. DESAFIO VISUAL.</h4>
      <p>DESENHE UM PONTO NO LOCAL (4, 3).</p>
      <div class="math-draw-grid">${renderMiniGrid()}</div>
    </section>
  `;
}

function renderMathFunctionPractice() {
  return `
    <section class="math-reminder">
      <div>
        <strong>PARA LEMBRAR</strong>
        <p>UMA FUNÇÃO MOSTRA UMA REGRA. EXEMPLO: CADA NÚMERO ENTRA, A REGRA MULTIPLICA POR 2 E O RESULTADO SAI.</p>
      </div>
      ${renderFunctionMachine()}
    </section>
    <section class="math-activity two-columns">
      <div>
        <h4>1. COMPLETE A TABELA.</h4>
        ${renderValueTable()}
      </div>
      <div>
        <h4>2. OBSERVE O GRÁFICO.</h4>
        ${renderBarChart()}
      </div>
    </section>
    <section class="math-activity">
      <h4>3. MARQUE A REGRA CORRETA.</h4>
      <p>NA TABELA, O RESULTADO É:</p>
      ${renderMathOptions(["O DOBRO DO NÚMERO.", "SEMPRE IGUAL A 1.", "MENOR QUE O NÚMERO."])}
    </section>
  `;
}

function renderMathMultiplicationPractice() {
  return `
    <section class="math-reminder">
      <div>
        <strong>PARA LEMBRAR</strong>
        <p>MULTIPLICAR É SOMAR GRUPOS IGUAIS. USE DOMINÓ, TAMPINHAS OU MATERIAL DOURADO PARA CONTAR.</p>
      </div>
      ${renderDominoVisual()}
    </section>
    <section class="math-activity">
      <h4>1. CALCULE COM APOIO VISUAL.</h4>
      <div class="math-calc-grid">
        <label>2 × 3 = ____</label>
        <label>4 × 2 = ____</label>
        <label>5 × 3 = ____</label>
        <label>6 × 2 = ____</label>
      </div>
    </section>
    <section class="math-activity">
      <h4>2. MARQUE O RESULTADO.</h4>
      <p>3 × 4 É IGUAL A:</p>
      ${renderMathOptions(["12", "7", "34"])}
    </section>
  `;
}

function renderMathLudicPractice(resources, hasCoordinates, hasFunction, hasMultiplication) {
  const selected = [
    resources.includes("TABLET") ? "TABLET COM JOGO MATEMÁTICO" : "",
    resources.includes("DOMIN") || hasMultiplication ? "DOMINÓ DA MULTIPLICAÇÃO" : "",
    resources.includes("MATERIAL DOURADO") ? "MATERIAL DOURADO" : "",
    hasCoordinates ? "MALHA QUADRICULADA IMPRESSA" : "",
    hasFunction ? "CARTÕES DE TABELA E GRÁFICO" : "",
    "TAMPINHAS NUMERADAS"
  ].filter(Boolean);

  return `
    <section class="math-materials">
      ${selected.slice(0, 6).map((item) => `
        <div>
          ${renderMathMaterialIcon(item)}
          <strong>${escapeHtml(item)}</strong>
        </div>
      `).join("")}
    </section>
    <section class="math-activity">
      <h4>COMO USAR?</h4>
      <ol class="math-steps">
        <li>ESCOLHA UM MATERIAL.</li>
        <li>MONTE A CONTA, O PONTO OU A TABELA.</li>
        <li>FALE OU MARQUE SUA RESPOSTA.</li>
        <li>CONFIRA COM O PROFESSOR E TENTE OUTRA VEZ.</li>
      </ol>
    </section>
    <section class="math-activity">
      <h4>COMUNICAÇÃO E ESCOLHA (CAA)</h4>
      <div class="math-caa">
        <span>GOSTEI</span>
        <span>PRECISO DE AJUDA</span>
        <span>NÃO ENTENDI</span>
        <span>QUERO TENTAR</span>
      </div>
    </section>
  `;
}

function renderCartesianGrid(points = []) {
  const scale = 32;
  const offset = 34;
  const max = 6;
  const gridLines = [];

  for (let i = 0; i <= max; i += 1) {
    const pos = offset + i * scale;
    gridLines.push(`<line x1="${offset}" y1="${pos}" x2="${offset + max * scale}" y2="${pos}" />`);
    gridLines.push(`<line x1="${pos}" y1="${offset}" x2="${pos}" y2="${offset + max * scale}" />`);
    gridLines.push(`<text x="${pos - 4}" y="${offset + max * scale + 22}">${i}</text>`);
    if (i > 0) gridLines.push(`<text x="${offset - 22}" y="${offset + (max - i) * scale + 6}">${i}</text>`);
  }

  const pointNodes = points.map((point) => {
    const x = offset + point.x * scale;
    const y = offset + (max - point.y) * scale;
    return `
      <g class="cartesian-point">
        <circle cx="${x}" cy="${y}" r="8" />
        <text x="${x + 10}" y="${y - 10}">${escapeHtml(point.label)}</text>
      </g>
    `;
  }).join("");

  return `
    <figure class="cartesian-figure" aria-label="Malha quadriculada com pontos no plano cartesiano">
      <svg class="cartesian-svg" viewBox="0 0 260 270" role="img" aria-label="Plano cartesiano com eixo X, eixo Y e pontos marcados">
        <rect x="1" y="1" width="258" height="268" rx="14" />
        <g class="cartesian-grid">${gridLines.join("")}</g>
        <line class="cartesian-axis" x1="${offset}" y1="${offset + max * scale}" x2="${offset + max * scale + 18}" y2="${offset + max * scale}" />
        <line class="cartesian-axis" x1="${offset}" y1="${offset + max * scale}" x2="${offset}" y2="${offset - 18}" />
        <text class="cartesian-label" x="${offset + max * scale + 20}" y="${offset + max * scale + 5}">X</text>
        <text class="cartesian-label" x="${offset - 4}" y="${offset - 22}">Y</text>
        ${pointNodes}
      </svg>
    </figure>
  `;
}

function renderMiniGrid() {
  const cells = Array.from({ length: 36 }).map(() => "<span></span>").join("");
  return `<div class="mini-grid" aria-label="Malha para desenhar ponto">${cells}</div>`;
}

function renderMathOptions(options = []) {
  return `
    <div class="math-options">
      ${options.slice(0, 3).map((option) => `
        <label>
          <i></i>
          <span>${escapeHtml(option)}</span>
        </label>
      `).join("")}
    </div>
  `;
}

function renderMathMatch(left = [], right = []) {
  return `
    <div class="math-match">
      <div>${left.map((item) => `<p><span>${escapeHtml(item)}</span><b></b></p>`).join("")}</div>
      <div>${right.map((item) => `<p><b></b><span>${escapeHtml(item)}</span></p>`).join("")}</div>
    </div>
  `;
}

function renderFunctionMachine() {
  return `
    <figure class="function-machine" aria-label="Maquina de funcao dobro">
      <div>ENTRA<br><strong>X</strong></div>
      <span>REGRA<br><strong>x 2</strong></span>
      <div>SAI<br><strong>Y</strong></div>
    </figure>
  `;
}

function renderValueTable() {
  return `
    <table class="math-table">
      <thead><tr><th>X</th><th>REGRA</th><th>Y</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>1 x 2</td><td>____</td></tr>
        <tr><td>2</td><td>2 x 2</td><td>____</td></tr>
        <tr><td>3</td><td>3 x 2</td><td>____</td></tr>
        <tr><td>4</td><td>4 x 2</td><td>____</td></tr>
      </tbody>
    </table>
  `;
}

function renderBarChart() {
  return `
    <figure class="math-bar-chart" aria-label="Grafico de barras simples">
      <div style="--bar: 35%"><span>2</span><b></b></div>
      <div style="--bar: 55%"><span>4</span><b></b></div>
      <div style="--bar: 75%"><span>6</span><b></b></div>
      <div style="--bar: 95%"><span>8</span><b></b></div>
      <figcaption>RESULTADOS DA REGRA x 2</figcaption>
    </figure>
  `;
}

function renderDominoVisual() {
  return `
    <figure class="domino-visual" aria-label="Domino com pontos para multiplicacao">
      <div><span></span><span></span><span></span></div>
      <div><span></span><span></span><span></span></div>
      <strong>2 GRUPOS DE 3</strong>
    </figure>
  `;
}

function renderMathIcon(type) {
  const icons = {
    grid: `<svg viewBox="0 0 80 80" aria-hidden="true"><rect x="10" y="10" width="60" height="60" rx="8"/><path d="M30 10v60M50 10v60M10 30h60M10 50h60"/><circle cx="50" cy="30" r="6"/></svg>`,
    target: `<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="28"/><circle cx="40" cy="40" r="16"/><circle cx="40" cy="40" r="5"/><path d="M40 5v14M40 61v14M5 40h14M61 40h14"/></svg>`,
    graph: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M14 66h52M18 62V18"/><rect x="25" y="42" width="9" height="20"/><rect x="39" y="32" width="9" height="30"/><rect x="53" y="22" width="9" height="40"/><path d="M22 48l16-12 15 4 13-18"/></svg>`,
    materials: `<svg viewBox="0 0 80 80" aria-hidden="true"><rect x="10" y="18" width="24" height="24" rx="5"/><rect x="42" y="18" width="24" height="24" rx="5"/><rect x="26" y="48" width="28" height="18" rx="5"/><circle cx="22" cy="30" r="4"/><circle cx="54" cy="30" r="4"/></svg>`
  };
  return icons[type] || icons.materials;
}

function renderMathMaterialIcon(item = "") {
  const text = normalizeText(item);
  if (text.includes("tablet")) {
    return `<svg viewBox="0 0 90 70" aria-hidden="true"><rect x="12" y="8" width="66" height="48" rx="8"/><path d="M28 24h24M28 36h15"/><circle cx="60" cy="28" r="7"/></svg>`;
  }
  if (text.includes("domino")) {
    return `<svg viewBox="0 0 90 70" aria-hidden="true"><rect x="16" y="12" width="58" height="40" rx="8"/><path d="M45 12v40"/><circle cx="30" cy="26" r="4"/><circle cx="30" cy="39" r="4"/><circle cx="58" cy="33" r="4"/></svg>`;
  }
  if (text.includes("malha")) {
    return `<svg viewBox="0 0 90 70" aria-hidden="true"><rect x="16" y="10" width="56" height="46" rx="5"/><path d="M30 10v46M44 10v46M58 10v46M16 24h56M16 38h56"/><circle cx="58" cy="24" r="5"/></svg>`;
  }
  if (text.includes("grafico") || text.includes("tabela")) {
    return `<svg viewBox="0 0 90 70" aria-hidden="true"><path d="M18 54h54M22 50V14"/><rect x="30" y="36" width="8" height="18"/><rect x="44" y="28" width="8" height="26"/><rect x="58" y="18" width="8" height="36"/></svg>`;
  }
  return `<svg viewBox="0 0 90 70" aria-hidden="true"><circle cx="26" cy="28" r="10"/><circle cx="48" cy="28" r="10"/><circle cx="37" cy="46" r="10"/><circle cx="59" cy="46" r="10"/></svg>`;
}

function renderEditorialA4Sequence(material = {}, payload = {}) {
  const pages = buildEditorialLanguagePages(material, payload);
  if (!pages.length) return false;

  $("#aiResultCards").innerHTML = `
    <div class="ai-a4-sequence" aria-label="Sequencia de folhas A4 geradas">
      ${pages.map(renderEditorialPage).join("")}
    </div>
  `;
  return true;
}

function buildEditorialLanguagePages(material = {}, payload = {}) {
  const skillCode = extractSkillCode(payload.habilidade || material.metadados?.habilidade_bncc_adaptada || "");
  const interest = normalizeText(`${payload.areaInteresse || ""} ${payload.pedidoProfessor || ""} ${payload.objetoConhecimento || ""}`);
  const theme = interest.includes("musica") || interest.includes("música") || interest.includes("instrumento")
    ? "music"
    : interest.includes("futebol") ? "sport" : "reading";

  const content = getEditorialThemeContent(theme);
  return [
    {
      number: "1",
      accent: "blue",
      title: "QUAL E A IDEIA MAIS IMPORTANTE?",
      icon: "lampada",
      textTitle: "TEXTO:",
      text: content.mainText,
      image: content.mainImage,
      blocks: [
        {
          type: "choices",
          label: "1",
          title: "ATIVIDADE 1",
          prompt: "MARQUE A IDEIA PRINCIPAL.",
          options: content.mainIdeaOptions
        },
        {
          type: "bullets",
          label: "2",
          title: "ATIVIDADE 2",
          prompt: "CIRCULE UMA INFORMACAO SECUNDARIA.",
          items: content.secondaryInfo
        },
        {
          type: "write",
          label: "3",
          title: "ATIVIDADE 3",
          prompt: content.question,
          lines: 1
        }
      ]
    },
    {
      number: "2",
      accent: "green",
      title: "ORGANIZANDO AS INFORMACOES",
      icon: "quebra-cabeca",
      textTitle: "TEXTO:",
      text: content.sequenceText,
      image: content.sequenceImage,
      sideTalk: content.talkQuestions,
      blocks: [
        {
          type: "sequence",
          label: "1",
          title: "ATIVIDADE 1",
          prompt: "NUMERE A ORDEM DOS ACONTECIMENTOS.",
          items: content.sequenceItems
        },
        {
          type: "problemSolution",
          label: "2",
          title: "ATIVIDADE 2",
          prompt: "COMPLETE.",
          fields: ["PROBLEMA:", "SOLUCAO:"]
        },
        {
          type: "write",
          label: "3",
          title: "ATIVIDADE 3",
          prompt: "O QUE ACONTECEU NO FINAL DA HISTORIA?",
          lines: 1
        }
      ]
    },
    {
      number: "3",
      accent: "orange",
      title: "CAUSA E CONSEQUENCIA",
      icon: "raio",
      textTitle: "TEXTO:",
      text: content.causeText,
      image: content.causeImage,
      sideTalk: ["O QUE ACONTECEU PRIMEIRO?", "POR QUE ISSO ACONTECEU?", "O QUE ACONTECEU DEPOIS?", "QUAL FOI O RESULTADO?"],
      blocks: [
        {
          type: "choicesGrid",
          label: "1",
          title: "ATIVIDADE 1",
          prompt: "O QUE ACONTECEU PRIMEIRO?",
          options: content.firstEventOptions
        },
        {
          type: "match",
          label: "2",
          title: "ATIVIDADE 2",
          prompt: "LIGUE CADA CAUSA A SUA CONSEQUENCIA.",
          left: content.causes,
          right: content.consequences
        },
        {
          type: "causeTable",
          label: "3",
          title: "ATIVIDADE 3",
          prompt: "LEIA AS SITUACOES E ESCREVA A CAUSA E A CONSEQUENCIA.",
          rows: content.causeRows
        }
      ],
      footerNote: "DESCOBRIR A CAUSA E ENTENDER O COMECO DA HISTORIA. DESCOBRIR A CONSEQUENCIA E ENTENDER O QUE ACONTECEU DEPOIS."
    },
    {
      number: "4",
      accent: "purple",
      title: "CONTEXTO DE PRODUCAO DO TEXTO",
      icon: "cartaz",
      textTitle: "PARA LEMBRAR:",
      text: `TODO TEXTO E PRODUZIDO POR ALGUEM, PARA UM PUBLICO, COM UMA FINALIDADE E EM UM LUGAR DE CIRCULACAO. ${skillCode ? `HABILIDADE: ${skillCode}.` : ""}`,
      image: "texto-cartaz",
      blocks: [
        {
          type: "match",
          label: "1",
          title: "ATIVIDADE 1",
          prompt: "LIGUE CADA PALAVRA AO SIGNIFICADO.",
          left: ["AUTOR", "PUBLICO", "FINALIDADE", "CIRCULACAO"],
          right: ["QUEM PRODUZ O TEXTO", "QUEM RECEBE A MENSAGEM", "PARA QUE O TEXTO FOI FEITO", "ONDE O TEXTO APARECE"]
        },
        {
          type: "choices",
          label: "2",
          title: "ATIVIDADE 2",
          prompt: "UM CARTAZ SOBRE UM SHOW SERVE PARA:",
          options: ["INFORMAR O PUBLICO.", "ESCONDER A MENSAGEM.", "IMPEDIR A LEITURA."]
        },
        {
          type: "write",
          label: "3",
          title: "ATIVIDADE 3",
          prompt: "CRIE UMA FRASE PARA CONVIDAR PESSOAS PARA UMA APRESENTACAO MUSICAL.",
          lines: 2
        }
      ],
      caa: true
    },
    {
      number: "5",
      accent: "pink",
      title: "ATIVIDADE LUDICA - SALA DE RECURSOS",
      icon: "estrela",
      image: "tablet-leitura",
      blocks: [
        {
          type: "tech",
          label: "1",
          title: "WORDWALL OU JOGO NO TABLET",
          steps: ["ACESSE A ATIVIDADE NO TABLET.", "LEIA OU ESCUTE O TEXTO COM ATENCAO.", "RESPONDA AS PERGUNTAS.", "VEJA SE ACERTOU E TENTE DE NOVO."]
        },
        {
          type: "tech",
          label: "2",
          title: "FICHAS DE LEITURA - BATE PAPO",
          steps: ["LEIA O TEXTO EM VOZ ALTA OU COM APOIO.", "CONVERSE SOBRE AS IMAGENS.", "RESPONDA: O QUE ACONTECEU?", "MARQUE A IDEIA MAIS IMPORTANTE.", "CONTE COM SUAS PALAVRAS O QUE ENTENDEU."]
        },
        {
          type: "goals",
          label: "3",
          title: "OBJETIVOS DA ATIVIDADE",
          items: ["COMPREENDER O TEXTO.", "IDENTIFICAR A IDEIA PRINCIPAL.", "ORGANIZAR INFORMACOES.", "RELACIONAR CAUSA E CONSEQUENCIA.", "DESENVOLVER FOCO, AUTONOMIA E PARTICIPACAO."]
        }
      ],
      footerNote: "LER, CONVERSAR E PENSAR FAZ VOCE CRESCER!"
    }
  ];
}

function getEditorialThemeContent(theme) {
  if (theme === "music") {
    return {
      mainText: "LIA GOSTA DE MUSICA. TODOS OS DIAS, ELA OUVE DIFERENTES SONS E OBSERVA OS INSTRUMENTOS. SEU SONHO E TOCAR VIOLAO EM UMA APRESENTACAO DA ESCOLA.",
      mainImage: "crianca-violao",
      mainIdeaOptions: ["LIA GOSTA DE MUSICA.", "LIA TEM UM CADERNO.", "LIA MORA PERTO DA ESCOLA."],
      secondaryInfo: ["TODOS OS DIAS, ELA OUVE SONS.", "LIA GOSTA DE MUSICA.", "VIOLAO E UM INSTRUMENTO."],
      question: "QUAL E O SONHO DE LIA?",
      sequenceText: "LIA VIU UM CARTAZ DE APRESENTACAO MUSICAL. ELA LEU AS INFORMACOES, ESCOLHEU UMA MUSICA, ENSAIOU COM A TURMA E PARTICIPOU DA APRESENTACAO.",
      sequenceImage: "palco-musica",
      talkQuestions: ["O QUE LIA VIU?", "O QUE ELA ESCOLHEU?", "O QUE A TURMA FEZ?", "O QUE ACONTECEU NO FINAL?"],
      sequenceItems: ["LIA PARTICIPOU DA APRESENTACAO.", "LIA ESCOLHEU UMA MUSICA.", "LIA LEU O CARTAZ.", "A TURMA ENSAIOU."],
      causeText: "A TURMA ENSAIOU DURANTE A SEMANA. POR ISSO, CONSEGUIU CANTAR COM MAIS SEGURANCA E PARTICIPOU DA APRESENTACAO COM ALEGRIA.",
      causeImage: "ensaio-musica",
      firstEventOptions: ["A TURMA ENSAIOU.", "A TURMA TERMINOU A APRESENTACAO.", "A TURMA GUARDOU OS INSTRUMENTOS."],
      causes: ["A TURMA ENSAIOU.", "O CARTAZ FOI DIVULGADO.", "O SOM ESTAVA BAIXO.", "LIA OUVIU A MUSICA."],
      consequences: ["CANTOU COM SEGURANCA.", "AS PESSOAS FICARAM INFORMADAS.", "A PROFESSORA AJUSTOU O VOLUME.", "ESCOLHEU SEU INSTRUMENTO."],
      causeRows: ["O CARTAZ MOSTRAVA DATA E HORARIO.", "A TURMA ENSAIOU BASTANTE.", "O SOM ESTAVA MUITO BAIXO."]
    };
  }

  return {
    mainText: "PEDRO ADORA LER HISTORIAS. TODOS OS DIAS ELE OBSERVA AS IMAGENS, ESCUTA O TEXTO E CONVERSA SOBRE O QUE ENTENDEU. SEU OBJETIVO E CONTAR A HISTORIA COM SUAS PALAVRAS.",
    mainImage: "leitura",
    mainIdeaOptions: ["PEDRO GOSTA DE LER HISTORIAS.", "PEDRO TEM UM LAPIS.", "PEDRO VIU UMA JANELA."],
    secondaryInfo: ["PEDRO OBSERVA AS IMAGENS.", "PEDRO GOSTA DE LER.", "TEXTO TEM IDEIAS."],
    question: "QUAL E O OBJETIVO DE PEDRO?",
    sequenceText: "ANA PEGOU UMA FICHA DE LEITURA. ELA OBSERVOU A IMAGEM, LEU O TEXTO, RESPONDEU AS PERGUNTAS E CONTOU A HISTORIA PARA A TURMA.",
    sequenceImage: "fichas-leitura",
    talkQuestions: ["O QUE ANA PEGOU?", "O QUE ELA OBSERVOU?", "O QUE ELA RESPONDEU?", "O QUE ELA CONTOU?"],
    sequenceItems: ["ANA CONTOU A HISTORIA.", "ANA LEU O TEXTO.", "ANA PEGOU A FICHA.", "ANA RESPONDEU AS PERGUNTAS."],
    causeText: "JOAO LEU O TEXTO COM ATENCAO. POR ISSO, CONSEGUIU IDENTIFICAR A IDEIA PRINCIPAL E EXPLICOU A HISTORIA COM SUAS PALAVRAS.",
    causeImage: "estudo",
    firstEventOptions: ["JOAO LEU O TEXTO.", "JOAO FECHOU O CADERNO.", "JOAO GUARDOU A MOCHILA."],
    causes: ["JOAO LEU COM ATENCAO.", "A IMAGEM AJUDOU.", "O TEXTO ERA CURTO.", "A TURMA CONVERSOU."],
    consequences: ["IDENTIFICOU A IDEIA PRINCIPAL.", "ENTENDEU MELHOR.", "FACILITOU A LEITURA.", "COMPARTILHOU OPINIOES."],
    causeRows: ["O TEXTO ERA CURTO.", "A IMAGEM MOSTROU A CENA.", "A TURMA CONVERSOU SOBRE A HISTORIA."]
  };
}

function renderEditorialPage(page) {
  const accentClass = `editorial-${page.accent || "blue"}`;
  return `
    <article class="ai-a4-sheet editorial-a4 ${accentClass}" aria-label="Folha A4 ${escapeHtml(page.title)}">
      <header class="editorial-header">
        <div class="editorial-number">${escapeHtml(page.number)}</div>
        <h3>${escapeHtml(page.title)}</h3>
        <div class="editorial-icon">${renderPictogramSvg(page.icon || "estrela")}</div>
      </header>

      ${page.text ? `
        <section class="editorial-context">
          <div class="editorial-textbox">
            <strong>${escapeHtml(page.textTitle || "TEXTO:")}</strong>
            <p>${escapeHtml(page.text)}</p>
          </div>
          <div class="editorial-main-image">${renderPictogramSvg(page.image || "leitura")}</div>
          ${page.sideTalk ? renderEditorialTalk(page.sideTalk) : ""}
        </section>
      ` : page.image ? `<section class="editorial-hero-image">${renderPictogramSvg(page.image)}</section>` : ""}

      <section class="editorial-activities">
        ${(page.blocks || []).map(renderEditorialBlock).join("")}
      </section>

      ${page.caa ? renderEditorialCaa() : ""}
      ${page.footerNote ? `<div class="editorial-footer-note">${escapeHtml(page.footerNote)}</div>` : ""}

      <footer class="ai-a4-footer editorial-footer">
        <span>@MOZAHINTERVIEIRA</span>
        <span>ACESSA+ • INCLUI • TRANSFORMA • CONECTA</span>
      </footer>
    </article>
  `;
}

function renderEditorialTalk(items = []) {
  return `
    <aside class="editorial-talk">
      <h4>VAMOS CONVERSAR!</h4>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </aside>
  `;
}

function renderEditorialBlock(block = {}) {
  const head = `
    <div class="editorial-activity-title">
      <span>${escapeHtml(block.label || "")}</span>
      <strong>${escapeHtml(block.title || "ATIVIDADE")}</strong>
    </div>
    <p class="editorial-prompt">${escapeHtml(block.prompt || "")}</p>
  `;

  if (block.type === "choices") {
    return `
      <section class="editorial-activity">
        ${head}
        <div class="editorial-choice-list">
          ${(block.options || []).slice(0, 3).map((option) => `
            <label><i></i><strong>${escapeHtml(option)}</strong></label>
          `).join("")}
        </div>
      </section>
    `;
  }

  if (block.type === "choicesGrid") {
    return `
      <section class="editorial-activity">
        ${head}
        <div class="editorial-choice-grid">
          ${(block.options || []).slice(0, 4).map((option) => `
            <label><i></i><span>${escapeHtml(option)}</span>${renderPictogramSvg(option)}</label>
          `).join("")}
        </div>
      </section>
    `;
  }

  if (block.type === "bullets") {
    return `
      <section class="editorial-activity">
        ${head}
        <ul class="editorial-bullets">${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
    `;
  }

  if (block.type === "write") {
    return `
      <section class="editorial-activity">
        ${head}
        <div class="editorial-write-lines">${Array.from({ length: block.lines || 1 }).map(() => "<span></span>").join("")}</div>
      </section>
    `;
  }

  if (block.type === "sequence") {
    return `
      <section class="editorial-activity">
        ${head}
        <div class="editorial-sequence">${(block.items || []).map((item) => `<label><i></i><span>${escapeHtml(item)}</span></label>`).join("")}</div>
      </section>
    `;
  }

  if (block.type === "problemSolution") {
    return `
      <section class="editorial-activity">
        ${head}
        <div class="editorial-fields">${(block.fields || []).map((field) => `<label><strong>${escapeHtml(field)}</strong><span></span></label>`).join("")}</div>
      </section>
    `;
  }

  if (block.type === "match") {
    return `
      <section class="editorial-activity">
        ${head}
        <div class="editorial-match">
          <div>${(block.left || []).map((item) => `<p>${escapeHtml(item)} <b>•</b></p>`).join("")}</div>
          <div>${(block.right || []).map((item) => `<p><b>•</b> ${escapeHtml(item)}</p>`).join("")}</div>
        </div>
      </section>
    `;
  }

  if (block.type === "causeTable") {
    return `
      <section class="editorial-activity full">
        ${head}
        <table class="editorial-table">
          <thead><tr><th>SITUACAO</th><th>CAUSA</th><th>CONSEQUENCIA</th></tr></thead>
          <tbody>${(block.rows || []).map((row) => `<tr><td>${escapeHtml(row)}</td><td></td><td></td></tr>`).join("")}</tbody>
        </table>
      </section>
    `;
  }

  if (block.type === "tech") {
    return `
      <section class="editorial-activity tech">
        ${head}
        <ol>${(block.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
      </section>
    `;
  }

  if (block.type === "goals") {
    return `
      <section class="editorial-activity goals">
        ${head}
        <ul>${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
    `;
  }

  return "";
}

function renderEditorialCaa() {
  const cards = ["ESTOU BEM", "GOSTEI", "PRECISO DE AJUDA", "NAO ENTENDI", "QUERO FALAR"];
  return `
    <section class="editorial-caa">
      <strong>COMUNICACAO E ESCOLHA (CAA)</strong>
      <div>${cards.map((card) => `<label>${renderPictogramSvg(card)}<span>${escapeHtml(card)}</span></label>`).join("")}</div>
    </section>
  `;
}

function renderA4AiMaterial(material = {}) {
  if (state.aiLastPayload && shouldUseMathA4(state.aiLastPayload, material) && renderMathA4Sequence(material, state.aiLastPayload)) {
    return;
  }

  const prepared = applyCurricularGuardrails(material, state.aiLastPayload);

  const configuracao = prepared.configuracao_folha || {};
  const cabecalho = prepared.cabecalho || {};
  const metadados = prepared.metadados || {};
  const ancoras = prepared.ancoras_cognitivas || {};
  const secoes = Array.isArray(prepared.secoes_desafios) ? prepared.secoes_desafios : [];
  const recursos = prepared.recursos_multissensoriais || {};
  const comunicacao = prepared.comunicacao_caa || {};
  const footerText = configuracao.rodape_autor || "@mozahintervieira";
  const isUppercase = Boolean(configuracao.caixa_alta);
  const skillCode = extractSkillCode(metadados.habilidade_bncc_adaptada || "");

  $("#aiResultCards").innerHTML = `
    <article class="ai-a4-sheet ${isUppercase ? "uppercase-sheet" : ""}" aria-label="Folha A4 gerada pela IA">
      <header class="ai-a4-header">
        <div>
          <span class="ai-a4-badge">${escapeHtml(configuracao.tamanho || "A4")} · ${escapeHtml(configuracao.layout_orientacao || "Retrato")}</span>
          <h3>${escapeHtml(cabecalho.titulo_atividade || prepared.conteudo_adaptado?.titulo || "Atividade adaptada")}</h3>
          <p>${escapeHtml(cabecalho.instrucoes_gerais || "Realize uma etapa de cada vez com apoio do professor.")}</p>
        </div>
        <div class="ai-a4-stamp">
          <strong>ACESSA+</strong>
          <span>${escapeHtml(configuracao.tema_estilo || "Folha inclusiva")}</span>
        </div>
      </header>

      <section class="ai-a4-meta" aria-label="Dados pedagogicos">
        ${renderA4Meta("Objetivo", metadados.objetivo_pedagogico)}
        ${skillCode ? renderA4Meta("Habilidade", skillCode) : ""}
      </section>

      <section class="ai-a4-anchor">
        <div>
          <h4>Para lembrar</h4>
          <p>${escapeHtml(ancoras.contextualizacao || prepared.conteudo_adaptado?.texto_simplificado || "Contextualizacao nao informada.")}</p>
        </div>
        <div class="ai-a4-visuals">
          ${(ancoras.pistas_graficas || []).map(renderGraphicHint).join("")}
        </div>
      </section>

      ${renderMultisensoryResources(recursos)}

      <section class="ai-a4-challenges" aria-label="Secoes da atividade">
        ${secoes.length ? secoes.map(renderChallengeSection).join("") : "<p>Nenhuma secao foi informada pela IA.</p>"}
      </section>

      ${renderCaaStrip(comunicacao.cartoes)}

      <footer class="ai-a4-footer">
        <span>${escapeHtml(footerText)}</span>
        <span>ACESSA+ · Inclui · Transforma · Conecta</span>
      </footer>
    </article>
  `;
}

function buildA4AiMaterialHtml(material = {}, payload = state.aiLastPayload) {
  const target = $("#aiResultCards");
  if (!target) return "";

  const previousHtml = target.innerHTML;
  const previousPayload = state.aiLastPayload;
  state.aiLastPayload = payload;
  renderA4AiMaterial(material);
  const generatedHtml = target.innerHTML;
  target.innerHTML = previousHtml;
  state.aiLastPayload = previousPayload;
  return generatedHtml;
}

function applyCurricularGuardrails(material = {}, payload = {}) {
  const prepared = clonePlain(material);
  const profile = getCurricularProfile(payload);
  const object = String(payload?.objetoConhecimento || prepared.cabecalho?.titulo_atividade || prepared.conteudo_adaptado?.titulo || "CONTEUDO CURRICULAR").trim();
  const objectUpper = object.toUpperCase();
  const skillCode = extractSkillCode(payload?.habilidade || prepared.metadados?.habilidade_bncc_adaptada || "");

  prepared.configuracao_folha = {
    tamanho: "A4",
    layout_orientacao: "Retrato",
    caixa_alta: true,
    tema_estilo: `${profile.label} • ATIVIDADE VISUAL`,
    rodape_autor: "@MOZAHINTERVIEIRA",
    ...(prepared.configuracao_folha || {})
  };

  prepared.cabecalho = {
    ...(prepared.cabecalho || {})
  };
  if (isWeakTitle(prepared.cabecalho.titulo_atividade)) {
    prepared.cabecalho.titulo_atividade = `${profile.titlePrefix}: ${objectUpper}`;
  }
  if (!prepared.cabecalho.instrucoes_gerais) {
    prepared.cabecalho.instrucoes_gerais = profile.instructions;
  }

  prepared.metadados = {
    ...(prepared.metadados || {})
  };
  if (skillCode) prepared.metadados.habilidade_bncc_adaptada = skillCode;
  if (!prepared.metadados.objetivo_pedagogico) {
    prepared.metadados.objetivo_pedagogico = `COMPREENDER E APLICAR ${objectUpper} EM ATIVIDADES ACESSIVEIS.`;
  }

  prepared.ancoras_cognitivas = {
    ...(prepared.ancoras_cognitivas || {})
  };
  if (!prepared.ancoras_cognitivas.contextualizacao) {
    prepared.ancoras_cognitivas.contextualizacao = buildCurricularReminder(profile, objectUpper, skillCode);
  }
  const currentHints = Array.isArray(prepared.ancoras_cognitivas.pistas_graficas)
    ? prepared.ancoras_cognitivas.pistas_graficas.filter((hint) => hint && (hint.elemento || hint.termo || hint.descricao_prompt_imagem || hint.descricao_para_icone_ou_ia_generativa))
    : [];
  prepared.ancoras_cognitivas.pistas_graficas = ensureVisualHints(currentHints, profile, objectUpper);

  prepared.recursos_multissensoriais = {
    ...(prepared.recursos_multissensoriais || {})
  };
  prepared.recursos_multissensoriais.objetos_concretos = ensureList(prepared.recursos_multissensoriais.objetos_concretos, profile.resources.concrete);
  prepared.recursos_multissensoriais.tecnologia_assistiva = ensureList(prepared.recursos_multissensoriais.tecnologia_assistiva, profile.resources.tech);
  prepared.recursos_multissensoriais.recursos_tateis = ensureList(prepared.recursos_multissensoriais.recursos_tateis, profile.resources.tactile);

  const sections = Array.isArray(prepared.secoes_desafios) ? prepared.secoes_desafios : [];
  prepared.secoes_desafios = shouldReplaceSections(sections, profile)
    ? buildCurricularFallbackSections(profile, objectUpper, skillCode)
    : sections.map((section, index) => enrichCurricularSection(section, index, profile, objectUpper));

  prepared.comunicacao_caa = {
    cartoes: [
      { rotulo: "GOSTEI", simbolo_descritivo: "mao positiva" },
      { rotulo: "PRECISO DE AJUDA", simbolo_descritivo: "mao levantada" },
      { rotulo: "NAO ENTENDI", simbolo_descritivo: "balao de duvida" },
      { rotulo: "QUERO TENTAR", simbolo_descritivo: "estrela" },
      { rotulo: "QUERO FALAR", simbolo_descritivo: "balao de fala" }
    ],
    ...(prepared.comunicacao_caa || {})
  };

  return prepared;
}

function clonePlain(value) {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch {
    return { ...(value || {}) };
  }
}

function isWeakTitle(title) {
  const text = normalizeText(title || "");
  return !text
    || text.includes("atividade adaptada")
    || text.includes("material gerado")
    || text.includes("descubra")
    || text.length < 8;
}

function ensureList(value, fallback = []) {
  const current = Array.isArray(value) ? value.filter(Boolean) : [];
  return current.length ? current : fallback;
}

function getCurricularProfile(payload = {}) {
  const text = normalizeText([
    payload.disciplina,
    payload.habilidade,
    payload.objetoConhecimento
  ].filter(Boolean).join(" "));

  if (text.includes("matemat") || text.includes("em13mat") || /\bef\d+ma/i.test(String(payload.habilidade || ""))) {
    return curricularProfileMap.matematica;
  }
  if (text.includes("ciencia") || text.includes("ciencias") || text.includes("biologia") || text.includes("quimica") || text.includes("fisica")) {
    return curricularProfileMap.ciencias;
  }
  if (text.includes("historia") || text.includes("em13chs") || /\bef\d+hi/i.test(String(payload.habilidade || ""))) {
    return curricularProfileMap.historia;
  }
  if (text.includes("geografia") || /\bef\d+ge/i.test(String(payload.habilidade || ""))) {
    return curricularProfileMap.geografia;
  }
  if (text.includes("portugues") || text.includes("lingua portuguesa") || text.includes("em13lp") || /\bef\d+lp/i.test(String(payload.habilidade || ""))) {
    return curricularProfileMap.portugues;
  }
  if (text.includes("ingles") || text.includes("lingua inglesa") || /\bef\d+li/i.test(String(payload.habilidade || ""))) {
    return curricularProfileMap.ingles;
  }
  if (text.includes("arte") || /\bef\d+ar/i.test(String(payload.habilidade || ""))) {
    return curricularProfileMap.arte;
  }
  if (text.includes("educacao fisica") || text.includes("educacao fisica") || /\bef\d+ef/i.test(String(payload.habilidade || ""))) {
    return curricularProfileMap.educacaoFisica;
  }
  if (text.includes("religioso") || /\bef\d+er/i.test(String(payload.habilidade || ""))) {
    return curricularProfileMap.ensinoReligioso;
  }
  return curricularProfileMap.geral;
}

const curricularProfileMap = {
  matematica: {
    key: "matematica",
    label: "MATEMATICA",
    titlePrefix: "MATEMATICA EM ACAO",
    instructions: "OBSERVE OS NUMEROS, AS REPRESENTACOES E RESOLVA UMA ETAPA POR VEZ.",
    visuals: ["REPRESENTACAO MATEMATICA", "TABELA", "GRAFICO", "RETA NUMERICA", "MATERIAL CONCRETO"],
    words: ["NUMERO", "TABELA", "GRAFICO", "REGRA", "RESULTADO"],
    optionTerms: ["NUMERO", "GRAFICO", "TABELA"],
    relations: [["TABELA", "ORGANIZA DADOS"], ["GRAFICO", "MOSTRA INFORMACOES"], ["REGRA", "AJUDA A CALCULAR"]],
    resources: {
      concrete: ["TAMPINHAS NUMERADAS", "DOMINO", "MATERIAL DOURADO", "MALHA IMPRESSA"],
      tech: ["TABLET COM JOGO MATEMATICO", "CALCULADORA ACESSIVEL"],
      tactile: ["NUMEROS EM RELEVO", "MALHA TATIL", "CARTOES DE PARES"]
    }
  },
  ciencias: {
    key: "ciencias",
    label: "CIENCIAS",
    titlePrefix: "CIENCIAS EM INVESTIGACAO",
    instructions: "OBSERVE, COMPARE E REGISTRE O QUE VOCE DESCOBRIU.",
    visuals: ["ESQUEMA CIENTIFICO", "EXPERIMENTO", "SER VIVO", "CORPO HUMANO", "CICLO DA NATUREZA"],
    words: ["OBSERVAR", "COMPARAR", "EXPERIMENTO", "RESULTADO", "AMBIENTE"],
    optionTerms: ["OBSERVAR", "COMPARAR", "EXPLICAR"],
    relations: [["OBSERVACAO", "VER COM ATENCAO"], ["EXPERIMENTO", "TESTAR UMA IDEIA"], ["RESULTADO", "O QUE ACONTECEU"]],
    resources: {
      concrete: ["OBJETOS REAIS", "LUPA", "RECIPIENTES", "MODELOS 3D"],
      tech: ["VIDEO CURTO COM AUDIODESCRICAO", "TABLET PARA REGISTRO"],
      tactile: ["MAQUETE TATIL", "TEXTURAS", "MODELOS EM RELEVO"]
    }
  },
  historia: {
    key: "historia",
    label: "HISTORIA",
    titlePrefix: "HISTORIA EM FONTES",
    instructions: "OBSERVE AS FONTES, MARQUE AS IDEIAS E ORGANIZE OS ACONTECIMENTOS.",
    visuals: ["LINHA DO TEMPO", "MAPA HISTORICO", "FONTE HISTORICA", "PERSONAGEM HISTORICO", "OBJETO ANTIGO"],
    words: ["TEMPO", "FONTE", "CULTURA", "POVO", "MUDANCA"],
    optionTerms: ["FONTE", "TEMPO", "CULTURA"],
    relations: [["FONTE", "AJUDA A CONHECER O PASSADO"], ["LINHA DO TEMPO", "ORGANIZA ACONTECIMENTOS"], ["CULTURA", "MODO DE VIVER"]],
    resources: {
      concrete: ["IMAGENS HISTORICAS", "MAPA IMPRESSO", "OBJETO SIMBOLICO"],
      tech: ["AUDIO COM NARRACAO", "TABLET COM IMAGENS"],
      tactile: ["LINHA DO TEMPO TATIL", "MAPA EM RELEVO", "MINIATURA"]
    }
  },
  geografia: {
    key: "geografia",
    label: "GEOGRAFIA",
    titlePrefix: "GEOGRAFIA EM MAPAS",
    instructions: "OBSERVE O ESPACO, O MAPA, A PAISAGEM OU O GRAFICO.",
    visuals: ["MAPA", "GLOBO", "PAISAGEM", "LEGENDA", "ROSA DOS VENTOS"],
    words: ["MAPA", "LUGAR", "PAISAGEM", "LEGENDA", "TERRITORIO"],
    optionTerms: ["MAPA", "PAISAGEM", "LEGENDA"],
    relations: [["MAPA", "REPRESENTA LUGARES"], ["LEGENDA", "EXPLICA SIMBOLOS"], ["PAISAGEM", "MOSTRA ELEMENTOS DO ESPACO"]],
    resources: {
      concrete: ["MAPA IMPRESSO", "GLOBO", "FOTOS DE PAISAGENS"],
      tech: ["MAPA DIGITAL", "TABLET COM IMAGENS"],
      tactile: ["MAPA TATIL", "MAQUETE DO ESPACO", "TEXTURAS"]
    }
  },
  portugues: {
    key: "portugues",
    label: "LINGUA PORTUGUESA",
    titlePrefix: "LINGUA PORTUGUESA EM PRATICA",
    instructions: "LEIA OU ESCUTE, OBSERVE AS PISTAS E RESPONDA DO SEU JEITO.",
    visuals: ["TEXTO", "CARTAZ", "LIVRO", "FICHA DE LEITURA", "BALAO DE FALA"],
    words: ["TEXTO", "PALAVRA", "FRASE", "IDEIA", "AUTOR"],
    optionTerms: ["TEXTO", "PALAVRA", "FRASE"],
    relations: [["AUTOR", "QUEM PRODUZ O TEXTO"], ["PUBLICO", "QUEM RECEBE A MENSAGEM"], ["FINALIDADE", "PARA QUE O TEXTO FOI FEITO"]],
    resources: {
      concrete: ["FICHAS DE LEITURA", "CARTOES DE PALAVRAS", "IMAGENS SEQUENCIAIS"],
      tech: ["LEITOR DE TEXTO", "AUDIO DO TEXTO"],
      tactile: ["PALAVRAS EM RELEVO", "LETRAS MOVEIS", "BRAILLE QUANDO PERTINENTE"]
    }
  },
  ingles: {
    key: "ingles",
    label: "LINGUA INGLESA",
    titlePrefix: "INGLES COM IMAGENS",
    instructions: "OBSERVE A IMAGEM, LEIA A PALAVRA E MARQUE A RESPOSTA.",
    visuals: ["CARTAO DE VOCABULARIO", "IMAGEM E PALAVRA", "DIALOGO CURTO", "OBJETO DO COTIDIANO"],
    words: ["WORD", "IMAGE", "MATCH", "LISTEN", "SPEAK"],
    optionTerms: ["WORD", "IMAGE", "MATCH"],
    relations: [["WORD", "PALAVRA"], ["IMAGE", "IMAGEM"], ["MATCH", "LIGAR"]],
    resources: {
      concrete: ["FLASHCARDS", "OBJETOS REAIS", "CARTOES COM IMAGENS"],
      tech: ["AUDIO CURTO", "TABLET COM PRONUNCIA"],
      tactile: ["CARTOES EM RELEVO", "OBJETOS PARA PAREAMENTO"]
    }
  },
  arte: {
    key: "arte",
    label: "ARTE",
    titlePrefix: "ARTE EM CRIACAO",
    instructions: "OBSERVE CORES, FORMAS E PRODUZA COM APOIO.",
    visuals: ["PALETA DE CORES", "FORMAS", "OBRA DE ARTE", "TEXTURA", "MATERIAL ARTISTICO"],
    words: ["COR", "FORMA", "LINHA", "TEXTURA", "CRIAR"],
    optionTerms: ["COR", "FORMA", "TEXTURA"],
    relations: [["COR", "ELEMENTO VISUAL"], ["TEXTURA", "SENSAÇÃO DA SUPERFICIE"], ["FORMA", "CONTORNO DO OBJETO"]],
    resources: {
      concrete: ["TINTA", "PAPEL COLORIDO", "MASSINHA", "COLAGEM"],
      tech: ["APP DE DESENHO", "TABLET PARA CRIACAO"],
      tactile: ["TEXTURAS", "LINHAS EM RELEVO", "MATERIAIS DE COLAGEM"]
    }
  },
  educacaoFisica: {
    key: "educacaoFisica",
    label: "EDUCACAO FISICA",
    titlePrefix: "MOVIMENTO E PARTICIPACAO",
    instructions: "OBSERVE O MOVIMENTO, SIGA A SEQUENCIA E PARTICIPE COM SEGURANCA.",
    visuals: ["SEQUENCIA DE MOVIMENTO", "BOLA", "JOGO", "REGRA VISUAL", "CORPO EM MOVIMENTO"],
    words: ["MOVIMENTO", "JOGO", "REGRA", "CORPO", "COOPERAR"],
    optionTerms: ["MOVIMENTO", "JOGO", "REGRA"],
    relations: [["REGRA", "COMBINADO DO JOGO"], ["MOVIMENTO", "ACAO DO CORPO"], ["COOPERAR", "PARTICIPAR COM O GRUPO"]],
    resources: {
      concrete: ["BOLA", "CONE", "ARCO", "CARTOES DE MOVIMENTO"],
      tech: ["VIDEO DE MOVIMENTO", "TIMER VISUAL"],
      tactile: ["MARCADORES NO CHAO", "OBJETOS COM TEXTURA"]
    }
  },
  ensinoReligioso: {
    key: "ensinoReligioso",
    label: "ENSINO RELIGIOSO",
    titlePrefix: "CULTURA, RESPEITO E CONVIVENCIA",
    instructions: "OBSERVE AS IMAGENS, CONVERSE COM RESPEITO E MARQUE SUA RESPOSTA.",
    visuals: ["SIMBOLO CULTURAL", "GRUPO DE PESSOAS", "GESTO DE RESPEITO", "CARTAO DE CONVIVENCIA"],
    words: ["RESPEITO", "CULTURA", "CONVIVENCIA", "DIFERENCA", "DIALOGO"],
    optionTerms: ["RESPEITO", "CULTURA", "DIALOGO"],
    relations: [["RESPEITO", "TRATAR BEM AS PESSOAS"], ["CULTURA", "MODO DE VIVER"], ["DIALOGO", "CONVERSA COM ESCUTA"]],
    resources: {
      concrete: ["CARTOES DE VALORES", "IMAGENS CULTURAIS", "RODA DE CONVERSA"],
      tech: ["AUDIO COM HISTORIA CURTA", "VIDEO COM LEGENDA"],
      tactile: ["CARTOES EM RELEVO", "OBJETOS SIMBOLICOS"]
    }
  },
  geral: {
    key: "geral",
    label: "ATIVIDADE CURRICULAR",
    titlePrefix: "APRENDER COM APOIO",
    instructions: "OBSERVE, MARQUE, LIGUE E RESPONDA UMA ETAPA POR VEZ.",
    visuals: ["IMAGEM DO CONTEUDO", "CARTAO VISUAL", "OBJETO CONCRETO", "REGISTRO DO ESTUDANTE"],
    words: ["OBSERVAR", "MARCAR", "LIGAR", "RESPONDER", "CRIAR"],
    optionTerms: ["OBSERVAR", "MARCAR", "RESPONDER"],
    relations: [["IMAGEM", "AJUDA A ENTENDER"], ["PALAVRA", "NOMEIA O CONTEUDO"], ["REGISTRO", "MOSTRA A RESPOSTA"]],
    resources: {
      concrete: ["OBJETOS CONCRETOS", "CARTOES VISUAIS", "IMAGENS IMPRESSAS"],
      tech: ["TABLET", "AUDIO", "LEITOR DE TELA"],
      tactile: ["TEXTURAS", "MATERIAL EM RELEVO", "MINIATURA"]
    }
  }
};

function buildCurricularReminder(profile, objectUpper, skillCode) {
  const skill = skillCode ? ` HABILIDADE: ${skillCode}.` : "";
  return `${profile.label}: VAMOS ESTUDAR ${objectUpper} COM APOIO VISUAL, MATERIAL CONCRETO E RESPOSTAS ACESSIVEIS.${skill}`;
}

function ensureVisualHints(currentHints, profile, objectUpper) {
  const normalized = currentHints.map((hint, index) => ({
    elemento: hint.elemento || hint.termo || profile.visuals[index % profile.visuals.length],
    descricao_prompt_imagem: hint.descricao_prompt_imagem || hint.descricao_para_icone_ou_ia_generativa || `${profile.visuals[index % profile.visuals.length]} RELACIONADO A ${objectUpper}`,
    posicionamento: hint.posicionamento || "AREA VISUAL DA FOLHA"
  }));

  const needed = Math.max(0, 3 - normalized.length);
  for (let index = 0; index < needed; index += 1) {
    const visual = profile.visuals[(normalized.length + index) % profile.visuals.length];
    normalized.push({
      elemento: visual,
      descricao_prompt_imagem: `${visual} RELACIONADO A ${objectUpper}, COM TRAÇO SIMPLES, ALTO CONTRASTE E FUNCAO PEDAGOGICA CLARA.`,
      posicionamento: "PROXIMO AO ENUNCIADO"
    });
  }

  return normalized.slice(0, 5);
}

function shouldReplaceSections(sections = [], profile) {
  if (!Array.isArray(sections) || sections.length < 3) return true;
  const text = normalizeText(sections.map((section) => [
    section.titulo_bloco,
    section.enunciado,
    section.tipo_componente,
    section.imagem_sugerida?.elemento
  ].filter(Boolean).join(" ")).join(" "));

  if (profile.key === "matematica") {
    const hasMath = text.includes("numero") || text.includes("calcul") || text.includes("grafico") || text.includes("tabela") || text.includes("coordenada") || text.includes("medida") || text.includes("forma");
    const hasPortugueseLeak = text.includes("ideia principal") || text.includes("informacao secundaria") || text.includes("contexto de producao") || text.includes("texto curto") || text.includes("lia gosta");
    return hasPortugueseLeak || !hasMath;
  }

  return false;
}

function buildCurricularFallbackSections(profile, objectUpper, skillCode) {
  return [
    {
      fase_id: 1,
      titulo_bloco: "OBSERVE E IDENTIFIQUE",
      tipo_componente: "Marque_com_X",
      enunciado: `OBSERVE A IMAGEM SOBRE ${objectUpper}. MARQUE A PALAVRA QUE COMBINA COM O CONTEUDO.`,
      imagem_sugerida: {
        elemento: profile.visuals[0],
        descricao_prompt_imagem: `${profile.visuals[0]} RELACIONADO A ${objectUpper}, COM ILUSTRACAO CLARA E ALTO CONTRASTE.`
      },
      opcoes: profile.optionTerms.slice(0, 3).map((term, index) => ({
        letra: String.fromCharCode(65 + index),
        texto: term
      }))
    },
    {
      fase_id: 2,
      titulo_bloco: "LIGUE AS IDEIAS",
      tipo_componente: "Ligue_Colunas",
      enunciado: `LIGUE CADA PALAVRA AO SIGNIFICADO CORRETO SOBRE ${objectUpper}.`,
      imagem_sugerida: {
        elemento: profile.visuals[1],
        descricao_prompt_imagem: `${profile.visuals[1]} COMO APOIO VISUAL PARA PAREAMENTO.`
      },
      coluna_esquerda: profile.relations.map(([left]) => left),
      coluna_direita: profile.relations.map(([, right]) => right)
    },
    {
      fase_id: 3,
      titulo_bloco: "COMPLETE COM APOIO",
      tipo_componente: "Complete_Com_Banco_De_Palavras",
      enunciado: `COMPLETE AS FRASES USANDO O BANCO DE PALAVRAS SOBRE ${objectUpper}.`,
      imagem_sugerida: {
        elemento: profile.visuals[2],
        descricao_prompt_imagem: `${profile.visuals[2]} COM ELEMENTOS DO OBJETO DE CONHECIMENTO.`
      },
      banco_palavras: profile.words.slice(0, 5),
      espaco_resposta: "ESCREVA, MARQUE, APONTE OU RESPONDA COM APOIO."
    },
    {
      fase_id: 4,
      titulo_bloco: "DESAFIO PRATICO",
      tipo_componente: "Producao_Com_Desenho",
      enunciado: `REGISTRE UMA IDEIA SOBRE ${objectUpper}. VOCE PODE DESENHAR, COLAR, MODELAR, FALAR OU USAR CAA.`,
      imagem_sugerida: {
        elemento: profile.visuals[3],
        descricao_prompt_imagem: `${profile.visuals[3]} PARA INSPIRAR PRODUCAO DO ESTUDANTE.`
      },
      espaco_resposta: "ESPACO PARA DESENHO, COLAGEM, MODELAGEM, ESCRITA OU REGISTRO DO PROFESSOR."
    }
  ];
}

function enrichCurricularSection(section = {}, index, profile, objectUpper) {
  const enriched = {
    ...section
  };

  enriched.fase_id = enriched.fase_id || index + 1;
  enriched.titulo_bloco = enriched.titulo_bloco || `ATIVIDADE ${index + 1}`;
  enriched.enunciado = enriched.enunciado || `REALIZE A ETAPA SOBRE ${objectUpper}.`;
  enriched.imagem_sugerida = {
    elemento: enriched.imagem_sugerida?.elemento || enriched.imagem_sugerida?.titulo || profile.visuals[index % profile.visuals.length],
    descricao_prompt_imagem: enriched.imagem_sugerida?.descricao_prompt_imagem
      || enriched.imagem_sugerida?.descricao
      || `${profile.visuals[index % profile.visuals.length]} RELACIONADO A ${objectUpper}.`
  };

  const type = normalizeText(enriched.tipo_componente || "");
  if ((!Array.isArray(enriched.opcoes) || !enriched.opcoes.length) && (type.includes("marque") || type.includes("multipla") || type.includes("visual"))) {
    enriched.opcoes = profile.optionTerms.slice(0, 3).map((term, optionIndex) => ({
      letra: String.fromCharCode(65 + optionIndex),
      texto: term
    }));
  }

  if ((!Array.isArray(enriched.banco_palavras) || !enriched.banco_palavras.length) && type.includes("complete")) {
    enriched.banco_palavras = profile.words.slice(0, 5);
  }

  return enriched;
}

function renderA4Meta(label, value) {
  return `
    <div>
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value || "Nao informado.")}</span>
    </div>
  `;
}

function extractSkillCode(value) {
  const text = String(value || "").toUpperCase();
  const match = text.match(/\b[A-Z]{2,}\d{2,}[A-Z0-9]*(?:\/[A-Z]{2})?\b/);
  return match ? match[0] : "";
}

function renderGraphicHint(hint = {}) {
  return renderVisualFigure(
    hint.elemento || hint.termo || "Imagem de apoio",
    hint.descricao_prompt_imagem || hint.descricao_para_icone_ou_ia_generativa || "Imagem simples relacionada ao tema."
  );
}

function renderChallengeSection(section = {}) {
  const title = section.titulo_bloco || `Missao ${section.fase_id || ""}`;
  const type = String(section.tipo_componente || "").toLowerCase();
  const visualTitle = section.imagem_sugerida?.elemento || section.imagem_sugerida?.titulo || section.titulo_visual || title;
  const visualDescription = section.imagem_sugerida?.descricao_prompt_imagem || section.imagem_sugerida?.descricao || section.suporte_especifico || "";
  const customActivity = type.includes("caca") || type.includes("caça") || type.includes("cruzad") || type.includes("verdadeiro") || type.includes("falso") || type.includes("tatil") || type.includes("tátil") || type.includes("caa") || type.includes("sim") || type.includes("nao") || type.includes("não");
  return `
    <div class="ai-a4-challenge">
      <div class="ai-a4-challenge-title">
        <span>${escapeHtml(String(section.fase_id || ""))}</span>
        <h4>${escapeHtml(title)}</h4>
      </div>
      ${visualDescription ? renderVisualFigure(visualTitle, visualDescription) : ""}
      <p class="ai-a4-enunciation">${escapeHtml(section.enunciado || "Enunciado nao informado.")}</p>
      ${renderChallengeSpecific(section, type)}
      ${customActivity ? "" : renderChallengeOptions(section)}
      ${renderChallengeMatching(section)}
      ${renderChallengeWordBank(section)}
      ${section.espaco_resposta ? `<div class="ai-a4-response-space">${escapeHtml(section.espaco_resposta)}</div>` : ""}
    </div>
  `;
}

function renderVisualFigure(title, description) {
  return `
    <figure class="ai-visual-figure" role="group" aria-label="${escapeHtml(description)}">
      <div class="ai-visual-art" aria-hidden="true">
        ${renderPictogramSvg(title)}
      </div>
      <figcaption>
        <strong>${escapeHtml(title)}</strong>
        <span>IMAGEM DE APOIO</span>
      </figcaption>
    </figure>
  `;
}

function renderPictogramSvg(value) {
  const kind = getVisualKind(value);
  const label = String(value || "IMAGEM").toUpperCase().slice(0, 18);

  if (kind === "oca") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M18 76 L60 18 L102 76 Z" fill="#d98c24" stroke="#08275f" stroke-width="4"/><path d="M49 76 V52 Q60 42 71 52 V76 Z" fill="#5b3517"/><path d="M27 70 H93" stroke="#f7c46c" stroke-width="5"/></svg>`;
  }

  if (kind === "canoa") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M18 52 Q60 82 102 52 Q89 70 60 72 Q31 70 18 52 Z" fill="#9a5a19" stroke="#08275f" stroke-width="4"/><path d="M31 49 Q60 62 89 49" fill="none" stroke="#f7c46c" stroke-width="5"/><path d="M18 74 H102" stroke="#0a56c2" stroke-width="5"/></svg>`;
  }

  if (kind === "cocar" || kind === "pena") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M60 70 C35 45 32 22 42 14 C50 27 56 42 60 62 C64 42 70 27 78 14 C88 22 85 45 60 70 Z" fill="#f28a18" stroke="#08275f" stroke-width="3"/><path d="M60 70 C50 48 48 26 54 10" stroke="#15a650" stroke-width="5"/><path d="M60 70 C70 48 72 26 66 10" stroke="#e83e73" stroke-width="5"/></svg>`;
  }

  if (kind === "pessoa" || kind === "povos") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><circle cx="42" cy="27" r="13" fill="#d98c24" stroke="#08275f" stroke-width="3"/><circle cx="78" cy="27" r="13" fill="#d98c24" stroke="#08275f" stroke-width="3"/><path d="M25 74 Q42 44 59 74 Z" fill="#15a650" stroke="#08275f" stroke-width="3"/><path d="M61 74 Q78 44 95 74 Z" fill="#f28a18" stroke="#08275f" stroke-width="3"/></svg>`;
  }

  if (kind === "mapa" || kind === "brasil") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M46 14 L75 20 L92 43 L80 69 L50 78 L29 57 L34 29 Z" fill="#15a650" stroke="#08275f" stroke-width="4"/><circle cx="59" cy="45" r="10" fill="#f7c46c"/></svg>`;
  }

  if (kind === "sim" || kind === "gostei") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><circle cx="60" cy="45" r="32" fill="#dcfce7" stroke="#15a650" stroke-width="5"/><path d="M42 45 L55 58 L81 31" fill="none" stroke="#15a650" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  if (kind === "nao") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><circle cx="60" cy="45" r="32" fill="#fff1f2" stroke="#e83e73" stroke-width="5"/><path d="M42 28 L78 62 M78 28 L42 62" stroke="#e83e73" stroke-width="9" stroke-linecap="round"/></svg>`;
  }

  if (kind === "ajuda" || kind === "falar") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M24 22 H96 Q104 22 104 30 V56 Q104 64 96 64 H58 L40 78 V64 H24 Q16 64 16 56 V30 Q16 22 24 22 Z" fill="#eaf2ff" stroke="#0a56c2" stroke-width="5"/><circle cx="45" cy="44" r="5" fill="#0a56c2"/><circle cx="60" cy="44" r="5" fill="#0a56c2"/><circle cx="75" cy="44" r="5" fill="#0a56c2"/></svg>`;
  }

  if (kind === "cartaz") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="27" y="13" width="66" height="64" rx="6" fill="#fff7d6" stroke="#08275f" stroke-width="4"/><path d="M39 30 H81 M39 44 H75 M39 58 H66" stroke="#0a56c2" stroke-width="5" stroke-linecap="round"/><circle cx="82" cy="59" r="8" fill="#f28a18"/></svg>`;
  }

  if (kind === "bola") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><circle cx="60" cy="45" r="30" fill="#f8fafc" stroke="#08275f" stroke-width="4"/><path d="M60 16 V74 M31 45 H89 M39 25 Q60 40 81 25 M39 65 Q60 50 81 65" fill="none" stroke="#0a56c2" stroke-width="4"/></svg>`;
  }

  if (kind === "pedra") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M25 59 Q31 30 58 24 Q86 21 98 52 Q88 75 48 73 Q30 72 25 59 Z" fill="#cbd5e1" stroke="#08275f" stroke-width="4"/><path d="M43 42 H73 M50 55 H84" stroke="#64748b" stroke-width="4" stroke-linecap="round"/></svg>`;
  }

  if (kind === "lampada") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><circle cx="60" cy="36" r="23" fill="#ffd83d" stroke="#08275f" stroke-width="5"/><path d="M48 58 H72 L68 75 H52 Z" fill="#60a5fa" stroke="#08275f" stroke-width="4"/><path d="M42 18 L32 8 M78 18 L88 8 M60 8 V0 M35 38 H22 M85 38 H98" stroke="#111827" stroke-width="4" stroke-linecap="round"/></svg>`;
  }

  if (kind === "quebra") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M34 20 H58 Q55 10 65 10 Q76 10 72 20 H92 V42 Q82 39 82 50 Q82 61 92 58 V75 H34 V58 Q44 61 44 50 Q44 39 34 42 Z" fill="#38bdf8" stroke="#08275f" stroke-width="4"/><circle cx="64" cy="48" r="4" fill="#08275f"/></svg>`;
  }

  if (kind === "raio") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M69 6 L30 52 H56 L48 84 L91 35 H64 Z" fill="#ffd43b" stroke="#08275f" stroke-width="5" stroke-linejoin="round"/></svg>`;
  }

  if (kind === "estrela") {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M60 8 L72 33 L99 36 L79 55 L84 82 L60 69 L36 82 L41 55 L21 36 L48 33 Z" fill="#ffd43b" stroke="#08275f" stroke-width="4"/><circle cx="51" cy="45" r="4" fill="#08275f"/><circle cx="69" cy="45" r="4" fill="#08275f"/><path d="M49 56 Q60 65 72 56" fill="none" stroke="#08275f" stroke-width="4" stroke-linecap="round"/></svg>`;
  }

  if (kind === "music") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="6" y="72" width="148" height="30" rx="8" fill="#dcfce7"/><circle cx="58" cy="35" r="18" fill="#f2b37b" stroke="#08275f" stroke-width="4"/><path d="M35 93 Q48 55 70 93 Z" fill="#0a56c2" stroke="#08275f" stroke-width="4"/><ellipse cx="104" cy="66" rx="28" ry="20" fill="#c97825" stroke="#08275f" stroke-width="5"/><path d="M80 62 L132 42" stroke="#6b3b16" stroke-width="8" stroke-linecap="round"/><path d="M134 40 L148 34" stroke="#08275f" stroke-width="4"/><path d="M99 34 V12 H119 M119 12 V45" fill="none" stroke="#15a650" stroke-width="6" stroke-linecap="round"/></svg>`;
  }

  if (kind === "stage") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="16" y="72" width="128" height="24" rx="5" fill="#7c3aed" stroke="#08275f" stroke-width="4"/><path d="M24 72 L40 34 H120 L136 72 Z" fill="#e0f2fe" stroke="#08275f" stroke-width="4"/><circle cx="52" cy="53" r="9" fill="#f28a18"/><circle cx="80" cy="50" r="9" fill="#15a650"/><circle cx="108" cy="53" r="9" fill="#e83e73"/><path d="M42 21 Q80 5 118 21" fill="none" stroke="#ffd43b" stroke-width="6"/><path d="M49 84 H111" stroke="#fff" stroke-width="5"/></svg>`;
  }

  if (kind === "tablet") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="18" y="14" width="124" height="82" rx="12" fill="#111827" stroke="#08275f" stroke-width="4"/><rect x="30" y="25" width="100" height="60" rx="6" fill="#e0f2fe"/><path d="M45 43 H86 M45 58 H112" stroke="#0a56c2" stroke-width="6" stroke-linecap="round"/><circle cx="112" cy="43" r="9" fill="#15a650"/><path d="M71 75 H90" stroke="#111827" stroke-width="4" stroke-linecap="round"/></svg>`;
  }

  if (kind === "reading") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><path d="M25 24 Q55 12 80 34 Q105 12 135 24 V89 Q105 78 80 96 Q55 78 25 89 Z" fill="#fff" stroke="#08275f" stroke-width="5"/><path d="M80 34 V96 M40 39 H66 M40 52 H66 M94 39 H120 M94 52 H120" stroke="#0a56c2" stroke-width="4" stroke-linecap="round"/><circle cx="80" cy="17" r="10" fill="#ffd43b"/></svg>`;
  }

  if (kind === "study") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="22" y="72" width="116" height="18" rx="6" fill="#c08457" stroke="#08275f" stroke-width="4"/><circle cx="76" cy="31" r="16" fill="#f2b37b" stroke="#08275f" stroke-width="4"/><path d="M52 72 Q64 49 86 72 Z" fill="#0a56c2" stroke="#08275f" stroke-width="4"/><path d="M89 62 H123 V82 H89 Z" fill="#fff" stroke="#08275f" stroke-width="4"/><path d="M97 68 H115 M97 75 H111" stroke="#0a56c2" stroke-width="3"/><path d="M34 30 H53 V62 H34 Z" fill="#dcfce7" stroke="#08275f" stroke-width="4"/></svg>`;
  }

  if (kind === "graph") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><path d="M26 86 H136 M31 82 V18" stroke="#08275f" stroke-width="5" stroke-linecap="round"/><rect x="43" y="57" width="15" height="25" rx="3" fill="#15a650"/><rect x="70" y="42" width="15" height="40" rx="3" fill="#0a56c2"/><rect x="97" y="27" width="15" height="55" rx="3" fill="#f28a18"/><path d="M39 60 L72 45 L104 31 L130 22" fill="none" stroke="#e83e73" stroke-width="5" stroke-linecap="round"/><circle cx="39" cy="60" r="5" fill="#e83e73"/><circle cx="72" cy="45" r="5" fill="#e83e73"/><circle cx="104" cy="31" r="5" fill="#e83e73"/></svg>`;
  }

  if (kind === "table") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="24" y="18" width="112" height="74" rx="8" fill="#fff" stroke="#08275f" stroke-width="5"/><path d="M24 42 H136 M24 67 H136 M61 18 V92 M99 18 V92" stroke="#0a56c2" stroke-width="4"/><circle cx="43" cy="55" r="6" fill="#15a650"/><circle cx="80" cy="55" r="6" fill="#f28a18"/><circle cx="118" cy="55" r="6" fill="#e83e73"/></svg>`;
  }

  if (kind === "grid") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="28" y="14" width="104" height="82" rx="7" fill="#fff" stroke="#08275f" stroke-width="5"/><path d="M28 34 H132 M28 54 H132 M28 74 H132 M48 14 V96 M68 14 V96 M88 14 V96 M108 14 V96" stroke="#93c5fd" stroke-width="3"/><path d="M48 86 H132 M48 86 V14" stroke="#08275f" stroke-width="5"/><circle cx="88" cy="54" r="8" fill="#f28a18" stroke="#08275f" stroke-width="3"/></svg>`;
  }

  if (kind === "science") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><path d="M68 18 H92 M80 18 V48 L53 87 Q49 94 58 94 H102 Q111 94 107 87 L80 48" fill="#dcfce7" stroke="#08275f" stroke-width="5" stroke-linejoin="round"/><path d="M61 78 H99" stroke="#15a650" stroke-width="7"/><circle cx="72" cy="72" r="5" fill="#0a56c2"/><circle cx="90" cy="64" r="5" fill="#f28a18"/><circle cx="84" cy="81" r="4" fill="#e83e73"/></svg>`;
  }

  if (kind === "timeline") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><path d="M25 58 H135" stroke="#08275f" stroke-width="6" stroke-linecap="round"/><circle cx="42" cy="58" r="10" fill="#0a56c2"/><circle cx="80" cy="58" r="10" fill="#15a650"/><circle cx="118" cy="58" r="10" fill="#f28a18"/><path d="M42 30 V48 M80 68 V88 M118 30 V48" stroke="#08275f" stroke-width="4"/><rect x="22" y="12" width="40" height="20" rx="5" fill="#e0f2fe" stroke="#08275f" stroke-width="3"/><rect x="60" y="82" width="40" height="20" rx="5" fill="#dcfce7" stroke="#08275f" stroke-width="3"/><rect x="98" y="12" width="40" height="20" rx="5" fill="#fff7ed" stroke="#08275f" stroke-width="3"/></svg>`;
  }

  if (kind === "globe") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><circle cx="80" cy="45" r="34" fill="#dcfce7" stroke="#08275f" stroke-width="5"/><path d="M50 34 Q80 48 110 34 M50 56 Q80 43 110 56 M80 11 Q64 45 80 79 M80 11 Q96 45 80 79" fill="none" stroke="#0a56c2" stroke-width="4"/><path d="M60 87 H100 M70 79 L61 96 H99 L90 79" stroke="#08275f" stroke-width="5" fill="#fff"/></svg>`;
  }

  if (kind === "art") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><path d="M74 17 Q34 18 25 52 Q18 82 49 88 H68 Q79 88 74 76 Q69 64 85 64 H100 Q132 64 132 41 Q132 17 74 17 Z" fill="#fff7ed" stroke="#08275f" stroke-width="5"/><circle cx="52" cy="43" r="8" fill="#e83e73"/><circle cx="78" cy="34" r="8" fill="#0a56c2"/><circle cx="102" cy="43" r="8" fill="#15a650"/><circle cx="61" cy="66" r="8" fill="#f28a18"/><path d="M107 78 L136 49" stroke="#6b3b16" stroke-width="8" stroke-linecap="round"/><path d="M136 49 L145 38" stroke="#08275f" stroke-width="5"/></svg>`;
  }

  if (kind === "movement") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><circle cx="75" cy="23" r="13" fill="#f2b37b" stroke="#08275f" stroke-width="4"/><path d="M72 38 L60 66 L44 87 M72 40 L96 58 L121 53 M62 66 L88 86 M68 50 L46 49" fill="none" stroke="#0a56c2" stroke-width="8" stroke-linecap="round"/><circle cx="125" cy="74" r="15" fill="#fff" stroke="#08275f" stroke-width="4"/><path d="M114 74 H136 M125 63 V85" stroke="#15a650" stroke-width="3"/></svg>`;
  }

  if (kind === "cards") {
    return `<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="26" y="24" width="48" height="62" rx="8" fill="#e0f2fe" stroke="#08275f" stroke-width="4"/><rect x="86" y="24" width="48" height="62" rx="8" fill="#fff7ed" stroke="#08275f" stroke-width="4"/><path d="M37 45 H62 M37 58 H56 M98 45 H122 M98 58 H116" stroke="#0a56c2" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="72" r="7" fill="#15a650"/><circle cx="110" cy="72" r="7" fill="#f28a18"/></svg>`;
  }

  return `<div class="ai-picture-placeholder"><span>IMAGEM</span><strong>${escapeHtml(label)}</strong></div>`;
}

function getVisualKind(value) {
  const text = normalizeText(value);
  if (text.includes("grafico") || text.includes("barra") || text.includes("linha")) return "graph";
  if (text.includes("tabela") || text.includes("quadro")) return "table";
  if (text.includes("malha") || text.includes("coordenada") || text.includes("plano cartesiano") || text.includes("reta numerica")) return "grid";
  if (text.includes("experimento") || text.includes("celula") || text.includes("ser vivo") || text.includes("corpo humano") || text.includes("ciclo") || text.includes("esquema cientifico")) return "science";
  if (text.includes("linha do tempo") || text.includes("fonte historica") || text.includes("objeto antigo") || text.includes("tempo historico")) return "timeline";
  if (text.includes("globo") || text.includes("paisagem") || text.includes("legenda") || text.includes("territorio") || text.includes("rosa dos ventos")) return "globe";
  if (text.includes("paleta") || text.includes("obra de arte") || text.includes("textura") || text.includes("material artistico") || text.includes("forma")) return "art";
  if (text.includes("movimento") || text.includes("jogo") || text.includes("regra visual") || text.includes("corpo em movimento")) return "movement";
  if (text.includes("flashcard") || text.includes("vocabulario") || text.includes("word") || text.includes("dialogo") || text.includes("imagem e palavra")) return "cards";
  if (text.includes("oca")) return "oca";
  if (text.includes("canoa")) return "canoa";
  if (text.includes("cocar")) return "cocar";
  if (text.includes("pena")) return "pena";
  if (text.includes("povo") || text.includes("indig") || text.includes("pessoa")) return "povos";
  if (text.includes("brasil") || text.includes("mapa")) return "brasil";
  if (text.includes("sim") || text.includes("bem") || text.includes("gost") || text.includes("positivo")) return "sim";
  if (text.includes("nao") || text.includes("não") || text.includes("negacao") || text.includes("negação")) return "nao";
  if (text.includes("ajuda") || text.includes("falar") || text.includes("duvida") || text.includes("dúvida") || text.includes("fala")) return "ajuda";
  if (text.includes("cartaz") || text.includes("texto") || text.includes("informacao") || text.includes("informação")) return "cartaz";
  if (text.includes("bola")) return "bola";
  if (text.includes("pedra")) return "pedra";
  if (text.includes("lampada") || text.includes("lâmpada") || text.includes("ideia")) return "lampada";
  if (text.includes("quebra")) return "quebra";
  if (text.includes("raio") || text.includes("causa") || text.includes("consequencia") || text.includes("consequência")) return "raio";
  if (text.includes("estrela")) return "estrela";
  if (text.includes("musica") || text.includes("música") || text.includes("violao") || text.includes("violão") || text.includes("instrumento")) return "music";
  if (text.includes("palco") || text.includes("apresentacao") || text.includes("apresentação")) return "stage";
  if (text.includes("tablet") || text.includes("wordwall") || text.includes("tecnologia")) return "tablet";
  if (text.includes("leitura") || text.includes("ficha") || text.includes("livro")) return "reading";
  if (text.includes("estudo") || text.includes("prova") || text.includes("caderno") || text.includes("ensaio")) return "study";
  return "generic";
}

function renderChallengeSpecific(section, type) {
  if (type.includes("caca") || type.includes("caça")) {
    return renderWordSearch(section);
  }

  if (type.includes("cruzad")) {
    return renderCrossword(section);
  }

  if (type.includes("verdadeiro") || type.includes("falso")) {
    return renderTrueFalse(section);
  }

  if (type.includes("tatil") || type.includes("tátil")) {
    return renderTactileActivity(section);
  }

  if (type.includes("caa")) {
    return renderCaaChoice(section.cartoes_caa || section.opcoes || []);
  }

  if (type.includes("sim") || type.includes("nao") || type.includes("não")) {
    return renderYesNoChoice();
  }

  if (type.includes("desenho") || type.includes("produ") || type.includes("criar")) {
    return `<div class="ai-a4-drawing-space">ESPAÇO PARA DESENHO, COLAGEM, MODELAGEM OU REGISTRO DO ESTUDANTE.</div>`;
  }

  return "";
}
function renderWordSearch(section) {
  const words = getActivityWords(section).slice(0, 6);
  const grid = buildWordSearchGrid(words);

  return `
    <div class="ai-puzzle-wrap">
      <div class="ai-word-search" aria-label="Caca-palavras">
        ${grid.map((row) => row.map((letter) => `<span>${escapeHtml(letter)}</span>`).join("")).join("")}
      </div>
      <div class="ai-puzzle-words">
        <strong>Encontre:</strong>
        ${words.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderCrossword(section) {
  const words = getActivityWords(section).slice(0, 5);
  return `
    <div class="ai-crossword">
      ${words.map((word, index) => `
        <div class="ai-crossword-row">
          <strong>${index + 1}</strong>
          ${word.split("").map(() => "<span></span>").join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function renderTrueFalse(section) {
  return `
    <div class="ai-true-false">
      <label><span></span> Verdadeiro</label>
      <label><span></span> Falso</label>
    </div>
  `;
}

function renderYesNoChoice() {
  return `
    <div class="ai-yes-no-grid">
      <label><span></span>${renderPictogramSvg("SIM")}<strong>SIM</strong></label>
      <label><span></span>${renderPictogramSvg("NAO")}<strong>NAO</strong></label>
      <label><span></span>${renderPictogramSvg("AJUDA")}<strong>PRECISO DE AJUDA</strong></label>
    </div>
  `;
}

function renderTactileActivity(section = {}) {
  const items = [
    section.recurso_tatil,
    ...(section.banco_palavras || []),
    ...(Array.isArray(section.opcoes) ? section.opcoes.map((option) => normalizeRenderOption(option, 0).texto) : [])
  ].filter(Boolean).slice(0, 4);
  const visibleItems = items.length ? items : ["OBJETO REAL", "MINIATURA", "TEXTURA", "IMAGEM AMPLIADA"];

  return `
    <div class="ai-tactile-grid">
      ${visibleItems.map((item) => `
        <div>
          ${renderPictogramSvg(item)}
          <strong>${escapeHtml(item)}</strong>
          <span>TOQUE, OBSERVE E ESCOLHA.</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderCaaChoice(cards = []) {
  const normalized = cards.map((card, index) => {
    if (typeof card === "string") return { rotulo: card, simbolo_descritivo: card };
    return {
      rotulo: card?.rotulo || card?.texto || card?.label || `OPCAO ${index + 1}`,
      simbolo_descritivo: card?.simbolo_descritivo || card?.descricao || card?.rotulo || card?.texto || ""
    };
  }).filter((card) => card.rotulo).slice(0, 6);

  return renderCaaStrip(normalized.length ? normalized : [
    { rotulo: "GOSTEI", simbolo_descritivo: "mao positiva" },
    { rotulo: "PRECISO DE AJUDA", simbolo_descritivo: "mao levantada" },
    { rotulo: "QUERO FALAR", simbolo_descritivo: "balao de fala" }
  ]);
}

function renderMultisensoryResources(resources = {}) {
  const items = [
    ...(resources.objetos_concretos || []),
    ...(resources.recursos_tateis || []),
    ...(resources.tecnologia_assistiva || [])
  ].filter(Boolean).slice(0, 6);

  if (!items.length) return "";

  return `
    <section class="ai-resource-strip" aria-label="Materiais para a atividade">
      <strong>Materiais para usar</strong>
      <div>
        ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </section>
  `;
}

function renderCaaStrip(cards = []) {
  const normalized = Array.isArray(cards) ? cards : [];
  const defaultCards = [
    { rotulo: "ESTOU BEM", simbolo_descritivo: "rosto feliz" },
    { rotulo: "GOSTEI", simbolo_descritivo: "mao positiva" },
    { rotulo: "PRECISO DE AJUDA", simbolo_descritivo: "mao levantada" },
    { rotulo: "NAO ENTENDI", simbolo_descritivo: "balao com duvida" },
    { rotulo: "QUERO FALAR", simbolo_descritivo: "balao de fala" }
  ];
  const source = normalized.length ? normalized : defaultCards;

  return `
    <section class="ai-caa-strip" aria-label="Comunicacao e escolha">
      <strong>COMUNICACAO E ESCOLHA (CAA)</strong>
      <div>
        ${source.slice(0, 8).map((card, index) => {
          const label = typeof card === "string" ? card : (card.rotulo || card.texto || card.label || `CARTAO ${index + 1}`);
          const symbol = typeof card === "string" ? card : (card.simbolo_descritivo || card.descricao || label);
          return `
            <button type="button" aria-label="${escapeHtml(label)}">
              ${renderPictogramSvg(symbol)}
              <span>${escapeHtml(label)}</span>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function getActivityWords(section) {
  const bank = section.banco_palavras || section.banco_de_palavras || [];
  const options = Array.isArray(section.opcoes)
    ? section.opcoes.map((option) => typeof option === "string" ? option : option.texto)
    : [];
  const fallback = String(section.enunciado || section.titulo_bloco || "ATIVIDADE")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  return [...bank, ...options, ...fallback]
    .map(cleanPuzzleWord)
    .filter((word, index, list) => word.length >= 3 && list.indexOf(word) === index);
}

function cleanPuzzleWord(word) {
  return String(word || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 10);
}

function buildWordSearchGrid(words) {
  const size = 10;
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => ""));
  const letters = "ACESSAMAISBNCDAEE";

  words.forEach((word, index) => {
    const row = index % size;
    const start = Math.max(0, Math.min(size - word.length, index % 4));
    word.split("").forEach((letter, offset) => {
      grid[row][start + offset] = letter;
    });
  });

  return grid.map((row, rowIndex) => row.map((letter, colIndex) => letter || letters[(rowIndex + colIndex) % letters.length]));
}

function renderChallengeOptions(section) {
  if (!Array.isArray(section.opcoes) || !section.opcoes.length) return "";
  const options = section.opcoes
    .map((option, index) => normalizeRenderOption(option, index))
    .filter((option) => option.texto)
    .slice(0, 3);

  return `
    <div class="ai-a4-options">
      ${options.map((option) => `
        <div>
          <strong>${escapeHtml(option.letra)}</strong>
          <span>${escapeHtml(option.texto || "")}</span>
          <em>Marque com X</em>
        </div>
      `).join("")}
    </div>
  `;
}

function normalizeRenderOption(option, index) {
  if (typeof option === "string") {
    return {
      letra: String.fromCharCode(65 + index),
      texto: option
    };
  }

  return {
    letra: option?.letra || String.fromCharCode(65 + index),
    texto: option?.texto || option?.label || option?.resposta || ""
  };
}

function renderChallengeMatching(section) {
  const left = section.coluna_esquerda || section.itens_esquerda || [];
  const right = section.coluna_direita || section.itens_direita || [];
  if (!left.length && !right.length) return "";

  return `
    <div class="ai-a4-matching">
      <div>
        <strong>Coluna 1</strong>
        ${left.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <div>
        <strong>Coluna 2</strong>
        ${right.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderChallengeWordBank(section) {
  const bank = section.banco_palavras || section.banco_de_palavras || [];
  if (!Array.isArray(bank) || !bank.length) return "";

  return `
    <div class="ai-a4-word-bank">
      ${bank.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}
    </div>
  `;
}

function renderTeacherNote(label, value) {
  return `
    <div>
      <strong>${escapeHtml(label)}</strong>
      <p>${escapeHtml(value || "Nao informado.")}</p>
    </div>
  `;
}

function renderStructuredAiMaterial(material = {}) {
  const metadados = material.metadados || {};
  const conteudo = material.conteudo_adaptado || {};
  const atividades = Array.isArray(material.atividades) ? material.atividades : [];
  const metadataCards = Object.entries(METADATA_LABELS).map(([key, label]) => `
    <article class="ai-card">
      <h3>${escapeHtml(label)}</h3>
      <p>${escapeHtml(metadados[key] || "Não informado.")}</p>
    </article>
  `);

  const visualCards = Array.isArray(conteudo.pistas_visuais_sugeridas)
    ? conteudo.pistas_visuais_sugeridas.map((pista) => `
      <article class="ai-card visual-card">
        <h3>${escapeHtml(pista.termo || "Pista visual")}</h3>
        <p>${escapeHtml(pista.descricao_para_icone_ou_ia_generativa || "Descrição visual não informada.")}</p>
      </article>
    `)
    : [];

  const activityCards = atividades.map(renderStructuredActivity);

  $("#aiResultCards").innerHTML = [
    `<article class="ai-card ai-card-feature">
      <h3>${escapeHtml(conteudo.titulo || "Conteúdo adaptado")}</h3>
      <p>${escapeHtml(conteudo.texto_simplificado || "Texto simplificado não informado.")}</p>
    </article>`,
    ...metadataCards,
    ...visualCards,
    ...activityCards
  ].join("");
}

function renderStructuredActivity(activity = {}) {
  return `
    <article class="ai-card activity-card">
      <h3>Atividade ${escapeHtml(activity.id || "")}: ${escapeHtml(activity.tipo || "Atividade adaptada")}</h3>
      <p><strong>Enunciado:</strong><br>${escapeHtml(activity.enunciado || "Não informado.")}</p>
      ${renderActivityOptions(activity)}
      ${renderActivityMatching(activity)}
      ${renderActivityBank(activity)}
      <p><strong>Feedback para o professor:</strong><br>${escapeHtml(activity.feedback_professor || "Não informado.")}</p>
    </article>
  `;
}

function renderActivityOptions(activity) {
  if (!Array.isArray(activity.opcoes) || !activity.opcoes.length) return "";

  return `
    <div class="ai-option-list">
      ${activity.opcoes.map((option) => `
        <div class="ai-option">
          <strong>${escapeHtml(option.letra || "")}</strong>
          <span>${escapeHtml(option.texto || "")}</span>
          ${option.correta ? "<em>correta</em>" : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function renderActivityMatching(activity) {
  if (!Array.isArray(activity.itens_esquerda) && !Array.isArray(activity.itens_direita)) return "";

  return `
    <div class="ai-match-grid">
      <div>
        <strong>Itens</strong>
        ${(activity.itens_esquerda || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <div>
        <strong>Correspondências</strong>
        ${(activity.itens_direita || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderActivityBank(activity) {
  const bank = activity.banco_palavras || activity.banco_de_palavras;
  if (!Array.isArray(bank) || !bank.length) return "";

  return `
    <div class="ai-word-bank">
      ${bank.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}
    </div>
  `;
}

function materialToText(material = {}) {
  if (material.configuracao_folha || material.cabecalho || material.ancoras_cognitivas || material.secoes_desafios) {
    return a4MaterialToText(material);
  }

  if (material.metadados || material.conteudo_adaptado || material.atividades) {
    return structuredMaterialToText(material);
  }

  return Object.entries(AI_SECTION_LABELS)
    .map(([key, label]) => `${label}\n${material[key] || "Não informado."}`)
    .join("\n\n");
}

function structuredMaterialToText(material = {}) {
  const metadados = material.metadados || {};
  const conteudo = material.conteudo_adaptado || {};
  const atividades = Array.isArray(material.atividades) ? material.atividades : [];

  const metadataText = Object.entries(METADATA_LABELS)
    .map(([key, label]) => `${label}\n${metadados[key] || "Não informado."}`)
    .join("\n\n");

  const visualText = (conteudo.pistas_visuais_sugeridas || [])
    .map((pista) => `${pista.termo || "Pista visual"}\n${pista.descricao_para_icone_ou_ia_generativa || ""}`)
    .join("\n\n");

  const activitiesText = atividades.map((activity) => {
    const options = (activity.opcoes || [])
      .map((option) => `${option.letra}) ${option.texto}${option.correta ? " [correta]" : ""}`)
      .join("\n");
    const left = (activity.itens_esquerda || []).join(" | ");
    const right = (activity.itens_direita || []).join(" | ");

    return [
      `Atividade ${activity.id || ""} - ${activity.tipo || ""}`,
      activity.enunciado || "",
      options,
      left ? `Itens: ${left}` : "",
      right ? `Correspondências: ${right}` : "",
      activity.feedback_professor ? `Feedback: ${activity.feedback_professor}` : ""
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  return [
    conteudo.titulo || "Conteúdo adaptado",
    conteudo.texto_simplificado || "",
    metadataText,
    visualText,
    activitiesText
  ].filter(Boolean).join("\n\n");
}

function a4MaterialToText(material = {}) {
  const configuracao = material.configuracao_folha || {};
  const cabecalho = material.cabecalho || {};
  const metadados = material.metadados || {};
  const ancoras = material.ancoras_cognitivas || {};
  const secoes = Array.isArray(material.secoes_desafios) ? material.secoes_desafios : [];
  const recursos = material.recursos_multissensoriais || {};
  const comunicacao = material.comunicacao_caa || {};

  const metaText = [
    `Objetivo: ${metadados.objetivo_pedagogico || "Nao informado."}`,
    `Habilidade: ${extractSkillCode(metadados.habilidade_bncc_adaptada || "") || "Nao informado."}`
  ].join("\n");

  const visualText = (ancoras.pistas_graficas || [])
    .map((hint) => [
      hint.elemento || hint.termo || "Pista visual",
      hint.descricao_prompt_imagem || hint.descricao_para_icone_ou_ia_generativa || "",
      hint.posicionamento ? `Posicionamento: ${hint.posicionamento}` : ""
    ].filter(Boolean).join("\n"))
    .join("\n\n");

  const challengeText = secoes.map((section) => {
    const options = (section.opcoes || [])
      .map((option) => `${option.letra}) ${option.texto}`)
      .join("\n");
    const left = (section.coluna_esquerda || section.itens_esquerda || []).join(" | ");
    const right = (section.coluna_direita || section.itens_direita || []).join(" | ");
    const bank = (section.banco_palavras || section.banco_de_palavras || []).join(" | ");

    return [
      section.titulo_bloco || `Missao ${section.fase_id || ""}`,
      section.enunciado || "",
      options,
      left ? `Coluna 1: ${left}` : "",
      right ? `Coluna 2: ${right}` : "",
      bank ? `Banco de palavras: ${bank}` : ""
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  const resourceText = [
    ...(recursos.objetos_concretos || []),
    ...(recursos.recursos_tateis || []),
    ...(recursos.tecnologia_assistiva || [])
  ].filter(Boolean).join(" | ");

  const caaText = (comunicacao.cartoes || [])
    .map((card) => typeof card === "string" ? card : (card.rotulo || card.texto || card.label))
    .filter(Boolean)
    .join(" | ");

  return [
    cabecalho.titulo_atividade || "Atividade adaptada A4",
    cabecalho.instrucoes_gerais || "",
    metaText,
    ancoras.contextualizacao || "",
    resourceText ? `Materiais para usar: ${resourceText}` : "",
    visualText,
    challengeText,
    caaText ? `Comunicacao e escolha (CAA): ${caaText}` : "",
    configuracao.rodape_autor || "@mozahintervieira"
  ].filter(Boolean).join("\n\n");
}

async function copyAiMaterial() {
  if (!state.aiLatestText) {
    setAiStatus("Gere um material antes de copiar.", true);
    return;
  }

  await navigator.clipboard.writeText(state.aiLatestText);
  setAiStatus("Resposta copiada para a área de transferência.");
}

function printAiMaterial() {
  if (!state.aiLatestText) {
    setAiStatus("Gere um material antes de imprimir.", true);
    return;
  }

  document.body.classList.add("print-assistant");
  window.print();
  setTimeout(() => document.body.classList.remove("print-assistant"), 600);
}

async function exportAiImages() {
  const pages = $$("#aiResultCards .ai-a4-sheet, #aiResultCards .math-a4");
  if (!pages.length) {
    setAiStatus("Gere uma folha A4 antes de baixar a imagem.", true);
    return;
  }

  setAiStatus(`Gerando ${pages.length} imagem(ns) A4...`);
  for (const [index, page] of pages.entries()) {
    await exportElementAsPng(page, safeFileName(`acessaplus-a4-pagina-${index + 1}.png`));
  }
  setAiStatus(pages.length > 1 ? "Imagens A4 baixadas por pagina." : "Imagem A4 baixada.");
}

function collectRuntimeCss() {
  const chunks = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      chunks.push(Array.from(sheet.cssRules || []).map((rule) => rule.cssText).join("\n"));
    } catch {
      // Ignora folhas externas bloqueadas pelo navegador.
    }
  }
  return chunks.join("\n");
}

function exportElementAsPng(element, filename) {
  const width = 794;
  const height = 1123;
  const css = `
    ${collectRuntimeCss()}
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; }
    .export-image-root {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
    }
    .export-image-root .ai-a4-sheet,
    .export-image-root .math-a4 {
      width: ${width}px !important;
      max-width: ${width}px !important;
      min-height: ${height}px !important;
      height: ${height}px !important;
      margin: 0 !important;
      box-shadow: none !important;
    }
  `;
  const html = `
    <div xmlns="http://www.w3.org/1999/xhtml" class="export-image-root">
      <style>${css}</style>
      ${element.outerHTML}
    </div>
  `;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">${html}</foreignObject>
    </svg>
  `;

  return new Promise((resolve) => {
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
        if (blob) downloadBlob(blob, filename);
        resolve();
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      setAiStatus("Nao foi possivel transformar a folha em imagem neste navegador.", true);
      resolve();
    };

    image.src = url;
  });
}

function bindEvents() {
  $$(".nav-item").forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));
  $$("[data-go-view]").forEach((item) => item.addEventListener("click", () => showView(item.dataset.goView)));
  $$("[data-kind-shortcut]").forEach((item) => item.addEventListener("click", () => shortcutKind(item.dataset.kindShortcut)));
  $$(".module-card").forEach((card) => card.addEventListener("click", () => selectKind(card.dataset.kind)));
  $("#generateBtn").addEventListener("click", generateMaterial);
  $("#generateTopBtn").addEventListener("click", generateMaterial);
  $("#saveBtn").addEventListener("click", saveCurrent);
  $("#saveResultBtn").addEventListener("click", saveCurrent);
  $("#printBtn").addEventListener("click", () => window.print());
  $("#imageBtn").addEventListener("click", exportImage);
  $("#wordBtn").addEventListener("click", exportWord);
  $("#htmlBtn").addEventListener("click", exportHtml);
  $("#copyBtn").addEventListener("click", copyResult);
  $("#clearBtn").addEventListener("click", clearForm);
  $("#searchSaved").addEventListener("input", renderSaved);
  $("#filterStage")?.addEventListener("change", renderSaved);
  $("#filterYear")?.addEventListener("change", renderSaved);
  $("#filterSubject")?.addEventListener("change", renderSaved);
  $("#filterProfile")?.addEventListener("change", renderSaved);
  $("#signupBtn")?.addEventListener("click", signupUser);
  $("#loginBtn")?.addEventListener("click", loginUser);
  $("#logoutBtn")?.addEventListener("click", logoutUser);
  $("#uploadLibraryBtn")?.addEventListener("click", uploadLibraryMaterial);
  $$("input[name='uploadProfiles']").forEach((field) => field.addEventListener("change", syncUploadProfileSelection));
  $("#saveSettingsBtn").addEventListener("click", saveSettings);
  $("#clearLibraryBtn").addEventListener("click", clearLibrary);
  $("#contrastBtn").addEventListener("click", toggleHighContrast);
  $("#simpleModeBtn").addEventListener("click", toggleSimpleMode);
  $("#fontPlusBtn").addEventListener("click", () => changeFont(1));
  $("#fontMinusBtn").addEventListener("click", () => changeFont(-1));
  $("#settingsContrastBtn").addEventListener("click", toggleHighContrast);
  $("#settingsSimpleBtn").addEventListener("click", toggleSimpleMode);
  $("#settingsFontBtn").addEventListener("click", () => changeFont(1));
  $("#aiGenerateBtn").addEventListener("click", generateAeeMaterial);
  $("#aiCopyBtn").addEventListener("click", copyAiMaterial);
  $("#aiPrintBtn").addEventListener("click", printAiMaterial);
  $("#aiImageBtn")?.addEventListener("click", exportAiImages);
  window.addEventListener("afterprint", () => document.body.classList.remove("print-assistant"));

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

renderGuide();
renderSaved();
loadSettings();
refreshAuthUi();
applyAccessibilitySettings();
bindEvents();
registerServiceWorker();
