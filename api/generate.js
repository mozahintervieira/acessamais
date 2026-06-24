const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const AUTHOR_FOOTER = "@mozahintervieira";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Metodo nao permitido. Use POST." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({
      error: "OPENAI_API_KEY nao configurada no ambiente da Vercel."
    });
  }

  try {
    const payload = await readJsonBody(request);
    const validationError = validatePayload(payload);

    if (validationError) {
      return response.status(400).json({ error: validationError });
    }

    const aiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: buildPrompt(payload),
        temperature: 0.28,
        max_output_tokens: 6500,
        store: false
      })
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      return response.status(aiResponse.status).json({
        error: data?.error?.message || "Erro ao gerar resposta com IA."
      });
    }

    const text = extractResponseText(data);
    const material = parseMaterial(text, payload);

    return response.status(200).json({
      material,
      rawText: text
    });
  } catch (error) {
    return response.status(500).json({
      error: "Erro interno ao gerar material.",
      details: error.message
    });
  }
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalido enviado para a API."));
      }
    });

    request.on("error", reject);
  });
}

function validatePayload(payload) {
  const requiredFields = [
    ["perfil", "Perfil"],
    ["serie", "Ano/serie"],
    ["disciplina", "Disciplina"],
    ["habilidade", "Habilidade"],
    ["objetoConhecimento", "Objeto de conhecimento"],
    ["nivelAlfabetizacao", "Nivel de alfabetizacao"],
    ["nivelApoio", "Nivel de apoio"],
    ["pedidoProfessor", "Pedido do professor"]
  ];

  const missing = requiredFields
    .filter(([key]) => !String(payload[key] || "").trim())
    .map(([, label]) => label);

  if (missing.length) {
    return `Preencha os campos obrigatorios: ${missing.join(", ")}.`;
  }

  return "";
}

function buildPrompt(payload) {
  const schema = {
    schema_version: "acessamais.a4.v1",
    configuracao_folha: {
      tamanho: "A4",
      layout_orientacao: "Retrato",
      tema_estilo: "tema ludico definido pelo conteudo e hiperfoco",
      caixa_alta: true,
      fonte_recomendada: "18 a 22 quando houver baixa visao ou DV",
      alto_contraste: "boolean",
      rodape_autor: AUTHOR_FOOTER
    },
    cabecalho: {
      titulo_atividade: "titulo curto e motivador",
      instrucoes_gerais: "instrucao simples para o estudante"
    },
    metadados: {
      objetivo_pedagogico: "objetivo observavel",
      habilidade_bncc_adaptada: "somente o codigo alfanumerico da habilidade, sem descricao",
      observacoes_acessibilidade: "principais barreiras e apoios"
    },
    ancoras_cognitivas: {
      contextualizacao: "texto curto de apoio ao tema",
      pistas_graficas: [
        {
          elemento: "nome do elemento visual",
          descricao_prompt_imagem: "descricao exata para icone, pictograma ou imagem",
          posicionamento: "Topo_Central"
        }
      ]
    },
    recursos_multissensoriais: {
      objetos_concretos: ["objeto real ou miniatura para exploracao"],
      recursos_tateis: ["textura, relevo, maquete, impressao 3D ou material manipulavel"],
      tecnologia_assistiva: ["tablet, leitor de tela, ampliacao, audio, Libras, Braille ou CAA"],
      apoio_auditivo: ["leitura em voz alta ou audiodescricao objetiva"],
      apoio_libras_braille: ["Libras, legenda, Braille ou fonte ampliada quando pertinente"]
    },
    comunicacao_caa: {
      cartoes: [
        {
          rotulo: "GOSTEI",
          tipo: "escolha",
          simbolo_descritivo: "rosto feliz, mao positiva ou pictograma simples"
        }
      ]
    },
    secoes_desafios: [
      {
        fase_id: 1,
        titulo_bloco: "MISSAO 1: titulo curto",
        tipo_componente: "Multipla_Escolha_Visual",
        enunciado: "comando curto",
        opcoes: [
          { letra: "A", texto: "opcao", valido: true },
          { letra: "B", texto: "opcao", valido: false },
          { letra: "C", texto: "opcao", valido: false }
        ],
        imagem_sugerida: {
          elemento: "imagem objetiva da questao",
          descricao_prompt_imagem: "descricao visual simples, educativa e sem personagem protegido"
        },
        banco_palavras: ["palavra curta quando houver complete, caca-palavras ou cruzadinha"],
        cartoes_caa: ["opcao de comunicacao quando houver escolha por CAA"],
        recurso_tatil: "objeto concreto, textura ou miniatura quando houver DV ou baixa visao",
        suporte_especifico: "pista visual, recurso de CAA, Libras, Braille, tato ou tecnologia assistiva",
        feedback_professor: "evidencia que deve ser observada"
      }
    ],
    orientacoes_docente: {
      metodologia_inclusiva: "como aplicar com DUA",
      recursos_acessibilidade: "TA, CAA, Libras, Braille, alto contraste ou apoio visual",
      estrategias_aee: "mediacao, pistas, rotina, reforco e retirada gradual de ajuda",
      avaliacao: "criterios observaveis",
      sugestoes_professor: "cuidados e variacoes"
    },
    conteudo_adaptado: {
      titulo: "compatibilidade com versoes anteriores",
      texto_simplificado: "texto curto adaptado",
      pistas_visuais_sugeridas: [
        {
          termo: "termo",
          descricao_para_icone_ou_ia_generativa: "descricao visual"
        }
      ]
    },
    atividades: [
      {
        id: 1,
        tipo: "Multipla_Escolha_Visual",
        enunciado: "comando curto",
        feedback_professor: "observacao avaliativa"
      }
    ]
  };

  return [
    {
      role: "system",
      content: [
        "Voce e a IA oficial do ACESSA+, uma plataforma de educacao inclusiva criada para reduzir o tempo de planejamento do professor e ampliar as possibilidades de aprendizagem do estudante.",
        "Sua missao nao e apenas gerar atividades. Sua missao e entregar material pronto para uso imediato, com qualidade de editora especializada em Educacao Inclusiva.",
        "Antes de produzir qualquer material, analise: quem e o estudante, nivel de aprendizagem, necessidade educacional, habilidade curricular, objetivo pedagogico e contexto informado pelo professor.",
        "Atue como especialista em AEE, Educacao Especial Inclusiva, BNCC, curriculos oficiais de redes de ensino, DUA, ABA quando pertinente, Taxonomia de Bloom, Tecnologia Assistiva, Comunicacao Aumentativa e Alternativa (CAA), Libras, Braille, TEA, DI, DV, DA, TDAH, AH/SD e multiplas deficiencias.",
        "O material deve poder ser usado em qualquer estado ou municipio do Brasil. Use BNCC como base nacional e considere curriculo oficial da rede quando o professor informar, sem restringir a producao a um unico curriculo estadual.",
        "Personalizacao obrigatoria: adapte automaticamente por idade cronologica, idade funcional, serie, nivel de leitura, autonomia, comunicacao, perfil comportamental, deficiencia ou transtorno, multiplas deficiencias, recursos disponiveis e contexto escolar.",
        "Nunca produza material generico. Nunca trate multiplas deficiencias isoladamente. Combine as adaptacoes em um unico material funcional.",
        "Todas as atividades destinadas ao estudante devem ser produzidas em LETRAS MAIUSCULAS, caixa alta, frases curtas, comandos objetivos e leitura facilitada.",
        "A folha deve parecer uma atividade escolar impressa, nao um questionario tecnico. Use titulo forte, imagens ou quadros visuais, caixas para marcar, pareamento, banco de palavras, linhas, desenho, CAA, desafios e recursos multissensoriais.",
        "A disciplina informada pelo professor e obrigatoria e deve comandar todo o conteudo. Nao gere atividade de Lingua Portuguesa, leitura, ideia principal, contexto de producao textual, causa e consequencia narrativa ou interpretacao de texto quando a disciplina for Matematica, Ciencias, Historia, Geografia, Arte, Educacao Fisica, Ingles ou Ensino Religioso.",
        "A habilidade curricular e o objeto de conhecimento informados pelo professor sao obrigatorios e devem aparecer como eixo real de todas as secoes. Nao use modelos fixos se eles nao corresponderem ao objeto de conhecimento.",
        "Se a disciplina nao for reconhecida, use literalmente o objeto de conhecimento e a habilidade como tema central da atividade, criando imagens, tarefas e vocabulario coerentes com esses campos.",
        "Se a disciplina for MATEMATICA, a atividade deve conter numeros, operacoes, tabelas, graficos, malhas quadriculadas, reta numerica, plano cartesiano, figuras geometricas, problemas matematicos, calculos, comparacoes, representacoes algebricas ou manipulaveis de acordo com a habilidade e o objeto de conhecimento. Nunca use texto narrativo como eixo principal em Matematica, salvo se for um problema matematico curto.",
        "Se houver area de interesse ou hiperfoco em Matematica, use esse interesse apenas como contexto visual ou motivador. Nao transforme a atividade em interpretacao textual. Exemplo: se o hiperfoco for musica, use notas musicais, instrumentos, contagem, coordenadas, tabelas, graficos ou padroes numericos.",
        "Se Matematica envolver coordenadas, plano cartesiano, localizacao de pontos ou representacao geometrica, inclua uma malha quadriculada com eixos X e Y, pares ordenados, pontos nomeados, tabela de coordenadas e questoes de localizar, marcar e comparar pontos.",
        "Se Matematica envolver funcao, proporcionalidade, funcao polinomial de 1 grau ou representacoes algebricas/graficas, inclua tabela de valores, regra simples, grafico, setas de crescimento, leitura de coordenadas e uma atividade com material ludico como domino da multiplicacao, tampinhas numeradas, cartas de pares ordenados, geoplano, malha impressa, tablet ou calculadora quando informado pelo professor.",
        "As imagens sugeridas para Matematica devem ser matematicas e concretas: malha quadriculada, eixo X e eixo Y, ponto A no plano cartesiano, tabela de valores, grafico de barras, grafico de linha, reta numerica, dado, domino, tampinhas numeradas, regua, bloco logico, material dourado, calculadora ou tablet com grafico.",
        "Se a disciplina for CIENCIAS, use esquemas, ciclos, experimentos simples, observacao, comparacao, corpo humano, seres vivos, ambiente, materiais concretos, lupa, maquete, modelo 3D ou registro de descoberta conforme o objeto de conhecimento.",
        "Se a disciplina for HISTORIA, use linha do tempo, mapa historico, fonte historica, imagens de objetos, personagens, cultura material, comparacao entre tempos, antes/depois e organizacao de acontecimentos conforme a habilidade.",
        "Se a disciplina for GEOGRAFIA, use mapa, globo, paisagem, legenda, territorio, orientacao espacial, graficos, imagens de lugares, maquete, mapa tatil ou leitura de espaco conforme o objeto de conhecimento.",
        "Se a disciplina for LINGUA PORTUGUESA, use texto, genero textual, autor, publico, finalidade, contexto de producao, leitura, escuta, vocabulario, frase, palavra, organizacao textual ou producao escrita conforme o objeto de conhecimento. Nao use esse modelo em outras disciplinas.",
        "Se a disciplina for LINGUA INGLESA, use vocabulario visual, flashcards, pareamento imagem-palavra, escuta, fala, dialogo curto, comando simples e traducao funcional quando pertinente.",
        "Se a disciplina for ARTE, use cores, formas, linhas, texturas, leitura de imagem, obra, tecnica, expressao, criacao, colagem, pintura, modelagem ou apreciacao conforme a habilidade.",
        "Se a disciplina for EDUCACAO FISICA, use movimento, jogos, regras visuais, sequencia corporal, cooperacao, seguranca, materiais concretos e adaptacao motora conforme a habilidade.",
        "Se a disciplina for ENSINO RELIGIOSO, use cultura, convivencia, respeito, simbolos, diversidade, dialogo, valores, cartoes visuais e situacoes de respeito conforme o objeto de conhecimento.",
        "Nao escreva publico-alvo, nivel de apoio, suporte, evidencia, feedback, metodologia ou orientacoes docentes no texto destinado ao estudante.",
        "Nao retorne os campos metadados.publico_alvo nem metadados.nivel_apoio. Esses dados servem apenas para adaptar internamente o material e nao devem aparecer no JSON final.",
        "O material deve ser reutilizavel no banco de atividades. E proibido inserir nome de estudante, professor, escola, rede, municipio, data, turma ou qualquer dado pessoal na folha visivel do estudante.",
        "No campo metadados.habilidade_bncc_adaptada escreva somente o codigo alfanumerico da habilidade, por exemplo EF05HI01 ou EM13CHS502HISA/ES. Nao inclua a descricao da habilidade nesse campo.",
        "Em toda questao de multipla escolha ou marque com X, gere exatamente tres alternativas A, B e C, objetivas e claras. Nao mostre gabarito no enunciado.",
        "Inclua imagens de apoio em ancoras_cognitivas.pistas_graficas e em cada item de secoes_desafios.imagem_sugerida, com descricao_prompt_imagem clara. Nao escreva apenas 'imagem de'. Informe o elemento visual exato que o layout deve apresentar, por exemplo OCA, CANOA, COCAR, PENA, MAPA, SEMAFORO VISUAL, OBJETO REAL, MINIATURA OU MAQUETE TATIL.",
        "Quando pertinente, incorpore CAA diretamente ao material por meio de cartoes de escolha, comunicacao por sim/nao, gostei/nao gostei, preciso de ajuda, nao entendi e quero falar. Nao apenas sugira CAA.",
        "Varie os modelos de atividade. Use uma combinacao de: Exploracao_Tatil, Pareamento_Tatil, Marque_com_X, Sim_Nao_Visual, Verdadeiro_Falso, Complete_Com_Banco_De_Palavras, Ligue_Colunas, Caca_Palavras, Cruzadinha, Desafio_Visual, Escolha_CAA, Expressao_Oral, Producao_Com_Desenho.",
        "Quando usar Caca_Palavras ou Cruzadinha, inclua banco_palavras com termos curtos e adequados ao nivel e serie do estudante.",
        `O campo configuracao_folha.rodape_autor deve ser exatamente "${AUTHOR_FOOTER}". Nao altere esse texto.`,
        "Para estudante pre-silabico, pre-leitor, silabico ou com baixa fluencia leitora, use caixa alta, banco de palavras, pareamento, selecao visual, pictogramas, exploracao concreta e menor exigencia de escrita.",
        "Se o perfil incluir TEA, use rotina visual, previsibilidade, comandos explicitos, linguagem literal, baixa ambiguidade, uma etapa por vez e regulacao por escolha.",
        "Se o perfil incluir DI, use linguagem simples, exemplos concretos, repeticao funcional, apoio visual, atividades graduadas e respostas por marcar, ligar, apontar, escolher, oralizar, desenhar ou completar.",
        "Se o perfil incluir DV ou baixa visao, use fonte 18 a 22, alto contraste, audiodescricao, descricao objetiva de todas as imagens, Braille quando pertinente, exploracao tatil, objetos reais, miniaturas, textura, relevo, impressora 3D ou caneta 3D quando fizer sentido.",
        "Se o perfil incluir DA, use apoio visual, Libras quando pertinente, legenda, comandos escritos, pictogramas, pareamento imagem-palavra e checagem de compreensao sem depender exclusivamente de audio.",
        "Se o perfil incluir TDAH, use blocos curtos, desafio rapido, metas visuais, alternancia de tarefas, poucos distratores e reforco por conclusao de etapas.",
        "Se o perfil incluir AH/SD, mantenha acessibilidade, mas acrescente desafio investigativo, producao autoral, pensamento critico, ampliacao e possibilidade de criar uma solucao.",
        "Crie conteudo original, sem copiar textos, imagens, atividades ou personagens protegidos de terceiros.",
        "Ao finalizar, revise internamente: se eu fosse o professor aplicando este material amanha, ele estaria pronto para uso imediato? Se nao estiver, refaca antes de responder.",
        "O output deve ser estritamente um objeto JSON valido. Nao use markdown. Nao escreva texto introdutorio. Nao coloque blocos de codigo.",
        `Use rigorosamente este schema como contrato de saida: ${JSON.stringify(schema)}`
      ].join(" ")
    },
    {
      role: "user",
      content: [
        "Dados curriculares e pedagogicos:",
        `Perfil do estudante: ${payload.perfil}`,
        `Perfis selecionados: ${Array.isArray(payload.perfis) && payload.perfis.length ? payload.perfis.join(", ") : payload.perfil}`,
        `Ano/serie: ${payload.serie}`,
        `Idade cronologica: ${payload.idade || "nao informada"}`,
        `Idade funcional: ${payload.idadeFuncional || "nao informada"}`,
        `Disciplina: ${payload.disciplina}`,
        `Habilidade BNCC ou Curriculo Capixaba: ${payload.habilidade}`,
        `Objeto de conhecimento: ${payload.objetoConhecimento}`,
        `Nivel de alfabetizacao: ${payload.nivelAlfabetizacao}`,
        `Nivel de apoio necessario: ${payload.nivelApoio}`,
        `Comunicacao: ${payload.comunicacao || "nao informada"}`,
        `Autonomia: ${payload.autonomia || "nao informada"}`,
        `Recursos disponiveis: ${payload.recursosDisponiveis || "nao informados"}`,
        `Area de interesse ou hiperfoco: ${payload.areaInteresse || "nao informada"}`,
        `Pedido do professor: ${payload.pedidoProfessor}`,
        "",
        "Gere material em formato de folha A4 completa, visualmente estruturada e pedagogicamente adaptada. Quando o conteudo exigir, divida em mais de uma folha. Inclua secoes_desafios com modelos variados, conteudo coerente com a serie, imagens de apoio, CAA quando pertinente, recursos tateis quando houver DV e tarefas claras para o estudante."
      ].join("\n")
    }
  ];
}

function extractResponseText(data) {
  if (data.output_text) {
    return data.output_text;
  }

  const output = data.output || [];
  const chunks = [];

  for (const item of output) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function parseMaterial(text, payload) {
  const fallback = buildFallbackMaterial(payload, text);

  try {
    const cleaned = cleanJsonText(text);
    return normalizeMaterial(JSON.parse(cleaned), fallback, payload);
  } catch {
    return fallback;
  }
}

function cleanJsonText(text) {
  const withoutFence = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const first = withoutFence.indexOf("{");
  const last = withoutFence.lastIndexOf("}");
  return first >= 0 && last > first ? withoutFence.slice(first, last + 1) : withoutFence;
}

function normalizeMaterial(parsed, fallback, payload) {
  const material = parsed && typeof parsed === "object" ? parsed : {};
  const configuracao = material.configuracao_folha || {};
  const cabecalho = material.cabecalho || {};
  const metadados = material.metadados || {};
  const ancoras = material.ancoras_cognitivas || {};
  const orientacoes = material.orientacoes_docente || {};
  const conteudo = material.conteudo_adaptado || {};
  const recursos = material.recursos_multissensoriais || {};
  const comunicacao = material.comunicacao_caa || {};
  const atividades = normalizeLegacyActivities(material.atividades, material.secoes_desafios, fallback);
  const secoes = normalizeChallenges(material.secoes_desafios, atividades, fallback);

  return {
    schema_version: "acessamais.a4.v1",
    configuracao_folha: {
      tamanho: textOr(configuracao.tamanho, "A4"),
      layout_orientacao: textOr(configuracao.layout_orientacao, "Retrato"),
      tema_estilo: textOr(configuracao.tema_estilo, fallback.configuracao_folha.tema_estilo),
      caixa_alta: true,
      fonte_recomendada: textOr(configuracao.fonte_recomendada, fallback.configuracao_folha.fonte_recomendada || "18 a 22 quando houver baixa visao ou DV"),
      alto_contraste: typeof configuracao.alto_contraste === "boolean" ? configuracao.alto_contraste : includesProfile(payload, "DV"),
      rodape_autor: AUTHOR_FOOTER
    },
    cabecalho: {
      titulo_atividade: textOr(cabecalho.titulo_atividade, conteudo.titulo || fallback.cabecalho.titulo_atividade),
      instrucoes_gerais: textOr(cabecalho.instrucoes_gerais, fallback.cabecalho.instrucoes_gerais)
    },
    metadados: {
      objetivo_pedagogico: textOr(metadados.objetivo_pedagogico, fallback.metadados.objetivo_pedagogico),
      habilidade_bncc_adaptada: extractSkillCodeServer(textOr(metadados.habilidade_bncc_adaptada, fallback.metadados.habilidade_bncc_adaptada)),
      observacoes_acessibilidade: textOr(metadados.observacoes_acessibilidade, fallback.metadados.observacoes_acessibilidade)
    },
    ancoras_cognitivas: {
      contextualizacao: textOr(ancoras.contextualizacao, conteudo.texto_simplificado || fallback.ancoras_cognitivas.contextualizacao),
      pistas_graficas: normalizeVisualHints(ancoras.pistas_graficas, conteudo.pistas_visuais_sugeridas, fallback)
    },
    recursos_multissensoriais: normalizeMultisensoryResources(recursos, fallback),
    comunicacao_caa: normalizeCaa(comunicacao, secoes, fallback),
    secoes_desafios: secoes,
    orientacoes_docente: {
      metodologia_inclusiva: textOr(orientacoes.metodologia_inclusiva, fallback.orientacoes_docente.metodologia_inclusiva),
      recursos_acessibilidade: textOr(orientacoes.recursos_acessibilidade, fallback.orientacoes_docente.recursos_acessibilidade),
      estrategias_aee: textOr(orientacoes.estrategias_aee, fallback.orientacoes_docente.estrategias_aee),
      avaliacao: textOr(orientacoes.avaliacao, fallback.orientacoes_docente.avaliacao),
      sugestoes_professor: textOr(orientacoes.sugestoes_professor, fallback.orientacoes_docente.sugestoes_professor)
    },
    conteudo_adaptado: {
      titulo: textOr(conteudo.titulo, cabecalho.titulo_atividade || fallback.conteudo_adaptado.titulo),
      texto_simplificado: textOr(conteudo.texto_simplificado, ancoras.contextualizacao || fallback.conteudo_adaptado.texto_simplificado),
      pistas_visuais_sugeridas: normalizeLegacyVisualHints(conteudo.pistas_visuais_sugeridas, material.ancoras_cognitivas?.pistas_graficas, fallback)
    },
    atividades
  };
}

function normalizeChallenges(secoes, atividades, fallback) {
  const source = Array.isArray(secoes) && secoes.length
    ? secoes
    : atividades.map(activityToChallenge);

  const normalized = source.map((section, index) => {
    const tipo = textOr(section.tipo_componente, section.tipo || "Atividade_Adaptada");
    const enunciado = textOr(section.enunciado, "REALIZE A ATIVIDADE COM APOIO DO PROFESSOR.");
    const options = normalizeOptions(section.opcoes);

    return {
      fase_id: Number(section.fase_id || section.id || index + 1),
      titulo_bloco: textOr(section.titulo_bloco, `MISSAO ${index + 1}`),
      tipo_componente: tipo,
      enunciado,
      opcoes: shouldHaveThreeOptions(tipo, enunciado) ? ensureThreeOptions(options, enunciado) : options,
      coluna_esquerda: arrayOfText(section.coluna_esquerda || section.itens_esquerda),
      coluna_direita: arrayOfText(section.coluna_direita || section.itens_direita),
      gabarito_mapa: section.gabarito_mapa || section.gabarito_conexoes || {},
      banco_palavras: arrayOfText(section.banco_palavras || section.banco_de_palavras),
      cartoes_caa: arrayOfText(section.cartoes_caa || section.cartoesCAA || section.opcoes_caa),
      recurso_tatil: textOr(section.recurso_tatil, ""),
      imagem_sugerida: normalizeSectionImage(section.imagem_sugerida, section),
      suporte_especifico: textOr(section.suporte_especifico, "Usar apoio visual, mediacao verbal curta e forma alternativa de resposta."),
      espaco_resposta: textOr(section.espaco_resposta, ""),
      feedback_professor: textOr(section.feedback_professor, "Registrar nivel de ajuda, participacao e evidencia de aprendizagem.")
    };
  });

  return normalized.length ? normalized : fallback.secoes_desafios;
}

function activityToChallenge(activity = {}) {
  return {
    fase_id: activity.id,
    titulo_bloco: `MISSAO ${activity.id || ""}: ${activity.tipo || "ATIVIDADE"}`,
    tipo_componente: activity.tipo,
    enunciado: activity.enunciado,
    opcoes: activity.opcoes,
    coluna_esquerda: activity.itens_esquerda,
    coluna_direita: activity.itens_direita,
    gabarito_mapa: activity.gabarito_conexoes,
    banco_palavras: activity.banco_palavras || activity.banco_de_palavras,
    cartoes_caa: activity.cartoes_caa || activity.opcoes_caa,
    recurso_tatil: activity.recurso_tatil,
    imagem_sugerida: activity.imagem_sugerida,
    feedback_professor: activity.feedback_professor
  };
}

function normalizeSectionImage(image, section = {}) {
  if (image && typeof image === "object") {
    return {
      elemento: textOr(image.elemento || image.titulo, section.titulo_bloco || "Imagem da atividade"),
      descricao_prompt_imagem: textOr(image.descricao_prompt_imagem || image.descricao, section.suporte_especifico || "Imagem simples relacionada ao conteudo.")
    };
  }

  return {
    elemento: textOr(section.titulo_visual, section.titulo_bloco || "Imagem da atividade"),
    descricao_prompt_imagem: textOr(section.suporte_especifico, "Imagem simples relacionada ao conteudo.")
  };
}

function normalizeLegacyActivities(atividades, secoes, fallback) {
  if (Array.isArray(atividades) && atividades.length) {
    return atividades.map((activity, index) => {
      const tipo = textOr(activity.tipo, "Atividade_Adaptada");
      const enunciado = textOr(activity.enunciado, "REALIZE A ATIVIDADE.");
      const options = normalizeOptions(activity.opcoes);

      return {
        id: Number(activity.id || index + 1),
        tipo,
        enunciado,
        opcoes: (shouldHaveThreeOptions(tipo, enunciado) ? ensureThreeOptions(options, enunciado) : options).map((option) => ({
          letra: option.letra,
          texto: option.texto,
          correta: option.correta
        })),
        itens_esquerda: arrayOfText(activity.itens_esquerda || activity.coluna_esquerda),
        itens_direita: arrayOfText(activity.itens_direita || activity.coluna_direita),
        gabarito_conexoes: activity.gabarito_conexoes || activity.gabarito_mapa || {},
        banco_palavras: arrayOfText(activity.banco_palavras || activity.banco_de_palavras),
        feedback_professor: textOr(activity.feedback_professor, "Registrar evidencia de aprendizagem.")
      };
    });
  }

  if (Array.isArray(secoes) && secoes.length) {
    return secoes.map((section, index) => {
      const tipo = textOr(section.tipo_componente, "Atividade_Adaptada");
      const enunciado = textOr(section.enunciado, "REALIZE A ATIVIDADE.");
      const options = normalizeOptions(section.opcoes);

      return {
        id: Number(section.fase_id || index + 1),
        tipo,
        enunciado,
        opcoes: (shouldHaveThreeOptions(tipo, enunciado) ? ensureThreeOptions(options, enunciado) : options).map((option) => ({
          letra: option.letra,
          texto: option.texto,
          correta: option.correta
        })),
        itens_esquerda: arrayOfText(section.coluna_esquerda || section.itens_esquerda),
        itens_direita: arrayOfText(section.coluna_direita || section.itens_direita),
        gabarito_conexoes: section.gabarito_mapa || section.gabarito_conexoes || {},
        banco_palavras: arrayOfText(section.banco_palavras || section.banco_de_palavras),
        feedback_professor: textOr(section.feedback_professor, "Registrar evidencia de aprendizagem.")
      };
    });
  }

  return fallback.atividades;
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];

  return options.map((option, index) => {
    if (typeof option === "string") {
      return {
        letra: String.fromCharCode(65 + index),
        texto: option,
        correta: false
      };
    }

    return {
      letra: textOr(option.letra, String.fromCharCode(65 + index)),
      texto: textOr(option.texto || option.label || option.resposta, ""),
      correta: Boolean(option.correta ?? option.valido)
    };
  }).filter((option) => option.texto);
}

function shouldHaveThreeOptions(tipo, enunciado) {
  const text = `${tipo} ${enunciado}`.toLowerCase();
  return /multipla|m[úu]ltipla|marque(?:\s+com)?\s+x|verdadeiro|falso|sim(?:\s+ou)?\s+n[aã]o|escolha|alternativa/.test(text);
}

function ensureThreeOptions(options, context = "") {
  const normalized = options.slice(0, 3);
  const fallbackTexts = [
    context ? `RESPOSTA RELACIONADA A: ${String(context).slice(0, 42).toUpperCase()}` : "RESPOSTA CORRETA",
    "OUTRA OPCAO",
    "PRECISO DE AJUDA"
  ];

  while (normalized.length < 3) {
    normalized.push({
      letra: String.fromCharCode(65 + normalized.length),
      texto: fallbackTexts[normalized.length],
      correta: normalized.length === 0
    });
  }

  return normalized.map((option, index) => ({
    ...option,
    letra: String.fromCharCode(65 + index),
    texto: String(option.texto || fallbackTexts[index]).toUpperCase()
  }));
}

function normalizeVisualHints(pistasGraficas, pistasLegadas, fallback) {
  if (Array.isArray(pistasGraficas) && pistasGraficas.length) {
    return pistasGraficas.map((hint) => ({
      elemento: textOr(hint.elemento, hint.termo || "Apoio visual"),
      descricao_prompt_imagem: textOr(hint.descricao_prompt_imagem, hint.descricao_para_icone_ou_ia_generativa || "Imagem simples, acessivel e objetiva."),
      posicionamento: textOr(hint.posicionamento, "Proximo_ao_conteudo")
    }));
  }

  if (Array.isArray(pistasLegadas) && pistasLegadas.length) {
    return pistasLegadas.map((hint) => ({
      elemento: textOr(hint.termo, "Apoio visual"),
      descricao_prompt_imagem: textOr(hint.descricao_para_icone_ou_ia_generativa, "Imagem simples, acessivel e objetiva."),
      posicionamento: "Proximo_ao_conteudo"
    }));
  }

  return fallback.ancoras_cognitivas.pistas_graficas;
}

function normalizeLegacyVisualHints(pistasLegadas, pistasGraficas, fallback) {
  if (Array.isArray(pistasLegadas) && pistasLegadas.length) {
    return pistasLegadas.map((hint) => ({
      termo: textOr(hint.termo, hint.elemento || "Apoio visual"),
      descricao_para_icone_ou_ia_generativa: textOr(hint.descricao_para_icone_ou_ia_generativa, hint.descricao_prompt_imagem || "Imagem simples e acessivel.")
    }));
  }

  if (Array.isArray(pistasGraficas) && pistasGraficas.length) {
    return pistasGraficas.map((hint) => ({
      termo: textOr(hint.elemento, "Apoio visual"),
      descricao_para_icone_ou_ia_generativa: textOr(hint.descricao_prompt_imagem, "Imagem simples e acessivel.")
    }));
  }

  return fallback.conteudo_adaptado.pistas_visuais_sugeridas;
}

function normalizeMultisensoryResources(resources, fallback) {
  const fallbackResources = fallback.recursos_multissensoriais || {};
  return {
    objetos_concretos: arrayOrFallback(resources.objetos_concretos, fallbackResources.objetos_concretos),
    recursos_tateis: arrayOrFallback(resources.recursos_tateis, fallbackResources.recursos_tateis),
    tecnologia_assistiva: arrayOrFallback(resources.tecnologia_assistiva, fallbackResources.tecnologia_assistiva),
    apoio_auditivo: arrayOrFallback(resources.apoio_auditivo, fallbackResources.apoio_auditivo),
    apoio_libras_braille: arrayOrFallback(resources.apoio_libras_braille, fallbackResources.apoio_libras_braille)
  };
}

function normalizeCaa(comunicacao, secoes, fallback) {
  const directCards = Array.isArray(comunicacao.cartoes) ? comunicacao.cartoes : [];
  const sectionCards = secoes.flatMap((section) => section.cartoes_caa || []);
  const fallbackCards = fallback.comunicacao_caa?.cartoes || [];
  const source = directCards.length ? directCards : sectionCards.length ? sectionCards : fallbackCards;

  return {
    cartoes: source.map((card, index) => {
      if (typeof card === "string") {
        return {
          rotulo: card,
          tipo: "escolha",
          simbolo_descritivo: defaultCaaSymbol(card, index)
        };
      }

      return {
        rotulo: textOr(card.rotulo || card.texto || card.label, `CARTAO ${index + 1}`),
        tipo: textOr(card.tipo, "escolha"),
        simbolo_descritivo: textOr(card.simbolo_descritivo || card.descricao, defaultCaaSymbol(card.rotulo || card.texto, index))
      };
    }).slice(0, 8)
  };
}

function defaultCaaSymbol(label, index = 0) {
  const text = String(label || "").toLowerCase();
  if (text.includes("ajuda")) return "mao levantada pedindo ajuda";
  if (text.includes("gost")) return "mao positiva";
  if (text.includes("nao") || text.includes("não")) return "sinal de negacao";
  if (text.includes("falar")) return "balao de fala";
  if (text.includes("triste")) return "rosto triste";
  if (text.includes("bem")) return "rosto feliz";
  const symbols = ["cartao de escolha", "pictograma simples", "resposta por apontar"];
  return symbols[index % symbols.length];
}

function buildFallbackMaterial(payload, text = "") {
  const title = `ATIVIDADE ADAPTADA: ${String(payload.objetoConhecimento || "TEMA").toUpperCase()}`;
  const uppercase = shouldUseUppercase(payload);

  return {
    schema_version: "acessamais.a4.v1",
    configuracao_folha: {
      tamanho: "A4",
      layout_orientacao: "Retrato",
      tema_estilo: payload.areaInteresse ? `Tema ligado a ${payload.areaInteresse}` : "Acessibilidade e aprendizagem",
      caixa_alta: true,
      fonte_recomendada: includesProfile(payload, "DV") ? "20 a 22 com alto contraste" : "16 a 18",
      alto_contraste: includesProfile(payload, "DV"),
      rodape_autor: AUTHOR_FOOTER
    },
    cabecalho: {
      titulo_atividade: title,
      instrucoes_gerais: uppercase
        ? "LEIA COM O PROFESSOR. FAÇA UMA PARTE DE CADA VEZ."
        : "Leia com apoio do professor e realize uma etapa de cada vez."
    },
    metadados: {
      objetivo_pedagogico: `Compreender ${payload.objetoConhecimento} por meio de atividade acessivel e mediada.`,
      habilidade_bncc_adaptada: extractSkillCodeServer(payload.habilidade || "Habilidade informada pelo professor."),
      observacoes_acessibilidade: "Aplicar DUA, reduzir carga cognitiva, usar apoio visual e aceitar multiplas formas de resposta."
    },
    ancoras_cognitivas: {
      contextualizacao: text || `Vamos estudar ${payload.objetoConhecimento} com apoio visual, exemplos concretos e participacao ativa.`,
      pistas_graficas: [
        {
          elemento: "Apoio visual principal",
          descricao_prompt_imagem: "Imagem simples, colorida, com alto contraste e poucos elementos, relacionada ao tema central da atividade.",
          posicionamento: "Topo_Central"
        }
      ]
    },
    recursos_multissensoriais: {
      objetos_concretos: ["Imagem ampliada do tema", "Cartoes de escolha", "Objeto real relacionado ao conteudo"],
      recursos_tateis: includesProfile(payload, "DV") ? ["Miniatura ou maquete tatil", "Textura em relevo", "Objeto concreto para exploracao"] : ["Material manipulavel"],
      tecnologia_assistiva: includesProfile(payload, "DV") ? ["Leitor de tela", "Audiodescricao", "Fonte ampliada"] : ["Tablet ou Chromebook para apoio visual"],
      apoio_auditivo: ["Leitura em voz alta pelo professor", "Repeticao curta do comando"],
      apoio_libras_braille: includesProfile(payload, "DA") ? ["Libras e comandos escritos"] : includesProfile(payload, "DV") ? ["Braille quando pertinente"] : ["Apoio visual e comunicacao alternativa quando necessario"]
    },
    comunicacao_caa: {
      cartoes: [
        { rotulo: "ESTOU BEM", tipo: "estado", simbolo_descritivo: "rosto feliz" },
        { rotulo: "GOSTEI", tipo: "escolha", simbolo_descritivo: "mao positiva" },
        { rotulo: "PRECISO DE AJUDA", tipo: "pedido", simbolo_descritivo: "mao levantada" },
        { rotulo: "NAO ENTENDI", tipo: "compreensao", simbolo_descritivo: "balao com ponto de interrogacao" },
        { rotulo: "QUERO FALAR", tipo: "comunicacao", simbolo_descritivo: "balao de fala" }
      ]
    },
    secoes_desafios: [
      {
        fase_id: 1,
        titulo_bloco: "MISSAO 1: OBSERVE E MARQUE",
        tipo_componente: "Multipla_Escolha_Visual",
        enunciado: uppercase ? "MARQUE A OPCAO QUE COMBINA COM O TEMA." : "Marque a opcao que combina com o tema.",
        opcoes: [
          { letra: "A", texto: payload.objetoConhecimento || "Tema da aula", valido: true },
          { letra: "B", texto: "Outro tema", valido: false },
          { letra: "C", texto: "Preciso de ajuda", valido: false }
        ],
        imagem_sugerida: {
          elemento: payload.objetoConhecimento || "Tema da aula",
          descricao_prompt_imagem: "Quadro visual com imagem simples do tema, alto contraste e poucos elementos."
        },
        cartoes_caa: ["GOSTEI", "PRECISO DE AJUDA", "NAO ENTENDI"],
        recurso_tatil: includesProfile(payload, "DV") ? "Apresentar objeto real, miniatura ou relevo antes da resposta." : "",
        suporte_especifico: "Usar imagem do tema, leitura em voz alta e possibilidade de apontar a resposta.",
        feedback_professor: "Observar se o estudante reconhece o tema com apoio visual."
      }
    ],
    orientacoes_docente: {
      metodologia_inclusiva: "Apresente o objetivo, modele uma resposta, ofereca pistas graduais e registre a participacao.",
      recursos_acessibilidade: "Apoio visual, CAA, fonte ampliada, alto contraste, Libras, Braille ou recurso tatil conforme necessidade.",
      estrategias_aee: "Pareamento, instrucao curta, rotina visual, reforco positivo e retirada gradual de ajuda.",
      avaliacao: "Avaliar por participacao, escolha correta, comunicacao funcional e nivel de apoio necessario.",
      sugestoes_professor: "Permitir resposta oral, escrita, apontada, desenhada, em Libras, Braille ou CAA."
    },
    conteudo_adaptado: {
      titulo: title,
      texto_simplificado: text || `Vamos estudar ${payload.objetoConhecimento} com apoio do professor.`,
      pistas_visuais_sugeridas: [
        {
          termo: "Apoio visual principal",
          descricao_para_icone_ou_ia_generativa: "Imagem simples relacionada ao tema central da atividade, com alto contraste e poucos elementos."
        }
      ]
    },
    atividades: [
      {
        id: 1,
        tipo: "Multipla_Escolha_Visual",
        enunciado: uppercase ? "MARQUE A OPCAO QUE COMBINA COM O TEMA." : "Marque a opcao que combina com o tema.",
        opcoes: [
          { letra: "A", texto: payload.objetoConhecimento || "Tema da aula", correta: true },
          { letra: "B", texto: "Outro tema", correta: false },
          { letra: "C", texto: "Preciso de ajuda", correta: false }
        ],
        feedback_professor: "Observe se o estudante compreendeu o vocabulario principal com apoio visual."
      }
    ]
  };
}

function shouldUseUppercase(payload) {
  return true;
}

function includesProfile(payload, profile) {
  const selected = Array.isArray(payload.perfis) ? payload.perfis : [];
  const text = [payload.perfil, ...selected].join(" ").toUpperCase();
  return text.includes(profile.toUpperCase());
}

function extractSkillCodeServer(value) {
  const text = String(value || "").toUpperCase();
  const match = text.match(/\b[A-Z]{2,}\d{2,}[A-Z0-9]*(?:\/[A-Z]{2})?\b/);
  return match ? match[0] : text;
}

function textOr(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function arrayOfText(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function arrayOrFallback(value, fallback) {
  const normalized = arrayOfText(value);
  return normalized.length ? normalized : arrayOfText(fallback);
}
