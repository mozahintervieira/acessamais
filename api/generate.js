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
        temperature: 0.35,
        max_output_tokens: 4200,
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
    layout_visual: {
  modelo: "",
  justificativa: "",
  paleta_sugerida: "",
  elementos_visuais: [],
  icone_principal: "",
  estilo_editorial: "",
  nivel_ludicidade: "",
  tema_narrativo: "",
  mascote_sugerido: "",
  cores_predominantes: []
},
    configuracao_folha: {
      tamanho: "A4",
      layout_orientacao: "Retrato",
      tema_estilo: "tema ludico definido pelo conteudo e hiperfoco",
      caixa_alta: "boolean",
      rodape_autor: AUTHOR_FOOTER
    },
    cabecalho: {
  titulo_atividade: "",
  subtitulo: "",
  frase_motivacional: "",
  instrucoes_gerais: ""
},
    metadados: {
  objetivo_pedagogico: "",
  habilidade_bncc_adaptada: "",
  objeto_conhecimento: "",
  publico_alvo: "",
  nivel_apoio: "",
  nivel_bloom_predominante: "",
  observacoes_acessibilidade: ""
},
    ancoras_cognitivas: {
  contextualizacao: "",
  situacao_problema: "",
  conexao_com_cotidiano: "",
  hiperfoco_utilizado: "",
  pistas_graficas: []
},
    secoes_desafios: [
      {
        fase_id: 1,
        titulo_bloco: "MISSAO 1: titulo curto",
        tipo_componente: "Multipla_Escolha_Visual",
        enunciado: "comando curto",
        opcoes: [
          { letra: "A", texto: "opcao", valido: true },
          { letra: "B", texto: "opcao", valido: false }
        ],
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
        "Você é a IA pedagógica oficial do ACESSA+.",
        "Sua função é criar materiais pedagógicos inclusivos, adaptados e altamente personalizados.",
        "A habilidade curricular e o objeto de conhecimento são as informações mais importantes da atividade.",
        "Nunca ignore, substitua ou troque a disciplina, a habilidade ou o objeto de conhecimento.",
        "Quando a disciplina for Matemática, não crie atividades genéricas de interpretação de texto.",
        "Toda atividade deve estar diretamente alinhada à habilidade curricular recebida.",
        "Produza materiais com qualidade de editora educacional, em formato A4, com visual lúdico, progressão pedagógica e atividades específicas.",
        "Antes de finalizar, verifique se a habilidade, o objeto de conhecimento, a série, o perfil do estudante e o nível de aprendizagem foram respeitados.",
        `Use rigorosamente este schema como contrato de saída: ${JSON.stringify(schema)}`
      ].join(" ")
    },
    {
      role: "user",
      content: [
        "Dados curriculares e pedagogicos:",
        `Perfil do estudante: ${payload.perfil}`,
        `Ano/serie: ${payload.serie}`,
        `Disciplina: ${payload.disciplina}`,
        `Habilidade BNCC ou Curriculo Capixaba: ${payload.habilidade}`,
        `Objeto de conhecimento: ${payload.objetoConhecimento}`,
        `Nivel de alfabetizacao: ${payload.nivelAlfabetizacao}`,
        `Nivel de apoio necessario: ${payload.nivelApoio}`,
        `Area de interesse ou hiperfoco: ${payload.areaInteresse || "nao informada"}`,
        `Pedido do professor: ${payload.pedidoProfessor}`,
        "",
        "A folha deve ter organização espacial de material profissional: título grande, subtítulo pedagógico, contextualização curta, blocos numerados, caixas coloridas, espaço para resposta, banco de palavras quando necessário, desafio final e rodapé. A identidade visual precisa mudar conforme o tema. Exemplos de estilos: Investigador, Cientista, Arqueólogo, Explorador, Matemática em Ação, Laboratório, Jornalista, Missão Histórica, Cartografia Tátil, Oficina de Leitura ou Desafio Maker."
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
  const atividades = normalizeLegacyActivities(material.atividades, material.secoes_desafios, fallback);
  const secoes = normalizeChallenges(material.secoes_desafios, atividades, fallback);

  return {
    schema_version: "acessamais.a4.v1",
    layout_visual: material.layout_visual || {
  modelo: "Padrao",
  justificativa: "",
  elementos_visuais: [],
  paleta_sugerida: ""
},
    configuracao_folha: {
      tamanho: textOr(configuracao.tamanho, "A4"),
      layout_orientacao: textOr(configuracao.layout_orientacao, "Retrato"),
      tema_estilo: textOr(configuracao.tema_estilo, fallback.configuracao_folha.tema_estilo),
      caixa_alta: typeof configuracao.caixa_alta === "boolean" ? configuracao.caixa_alta : shouldUseUppercase(payload),
      rodape_autor: AUTHOR_FOOTER
    },
    cabecalho: {
      titulo_atividade: textOr(cabecalho.titulo_atividade, conteudo.titulo || fallback.cabecalho.titulo_atividade),
      instrucoes_gerais: textOr(cabecalho.instrucoes_gerais, fallback.cabecalho.instrucoes_gerais)
    },
    metadados: {
      objetivo_pedagogico: textOr(metadados.objetivo_pedagogico, fallback.metadados.objetivo_pedagogico),
      habilidade_bncc_adaptada: textOr(metadados.habilidade_bncc_adaptada, fallback.metadados.habilidade_bncc_adaptada),
      publico_alvo: textOr(metadados.publico_alvo, fallback.metadados.publico_alvo),
      nivel_apoio: textOr(metadados.nivel_apoio, fallback.metadados.nivel_apoio),
      observacoes_acessibilidade: textOr(metadados.observacoes_acessibilidade, fallback.metadados.observacoes_acessibilidade)
    },
    ancoras_cognitivas: {
      contextualizacao: textOr(ancoras.contextualizacao, conteudo.texto_simplificado || fallback.ancoras_cognitivas.contextualizacao),
      pistas_graficas: normalizeVisualHints(ancoras.pistas_graficas, conteudo.pistas_visuais_sugeridas, fallback)
    },
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

  const normalized = source.map((section, index) => ({
    fase_id: Number(section.fase_id || section.id || index + 1),
    titulo_bloco: textOr(section.titulo_bloco, `MISSAO ${index + 1}`),
    tipo_componente: textOr(section.tipo_componente, section.tipo || "Atividade_Adaptada"),
    enunciado: textOr(section.enunciado, "REALIZE A ATIVIDADE COM APOIO DO PROFESSOR."),
    opcoes: normalizeOptions(section.opcoes),
    coluna_esquerda: arrayOfText(section.coluna_esquerda || section.itens_esquerda),
    coluna_direita: arrayOfText(section.coluna_direita || section.itens_direita),
    gabarito_mapa: section.gabarito_mapa || section.gabarito_conexoes || {},
    banco_palavras: arrayOfText(section.banco_palavras || section.banco_de_palavras),
    suporte_especifico: textOr(section.suporte_especifico, "Usar apoio visual, mediacao verbal curta e forma alternativa de resposta."),
    espaco_resposta: textOr(section.espaco_resposta, ""),
    feedback_professor: textOr(section.feedback_professor, "Registrar nivel de ajuda, participacao e evidencia de aprendizagem.")
  }));

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
    feedback_professor: activity.feedback_professor
  };
}

function normalizeLegacyActivities(atividades, secoes, fallback) {
  if (Array.isArray(atividades) && atividades.length) {
    return atividades.map((activity, index) => ({
      id: Number(activity.id || index + 1),
      tipo: textOr(activity.tipo, "Atividade_Adaptada"),
      enunciado: textOr(activity.enunciado, "REALIZE A ATIVIDADE."),
      opcoes: normalizeOptions(activity.opcoes).map((option) => ({
        letra: option.letra,
        texto: option.texto,
        correta: option.correta
      })),
      itens_esquerda: arrayOfText(activity.itens_esquerda || activity.coluna_esquerda),
      itens_direita: arrayOfText(activity.itens_direita || activity.coluna_direita),
      gabarito_conexoes: activity.gabarito_conexoes || activity.gabarito_mapa || {},
      banco_palavras: arrayOfText(activity.banco_palavras || activity.banco_de_palavras),
      feedback_professor: textOr(activity.feedback_professor, "Registrar evidencia de aprendizagem.")
    }));
  }

  if (Array.isArray(secoes) && secoes.length) {
    return secoes.map((section, index) => ({
      id: Number(section.fase_id || index + 1),
      tipo: textOr(section.tipo_componente, "Atividade_Adaptada"),
      enunciado: textOr(section.enunciado, "REALIZE A ATIVIDADE."),
      opcoes: normalizeOptions(section.opcoes).map((option) => ({
        letra: option.letra,
        texto: option.texto,
        correta: option.correta
      })),
      itens_esquerda: arrayOfText(section.coluna_esquerda || section.itens_esquerda),
      itens_direita: arrayOfText(section.coluna_direita || section.itens_direita),
      gabarito_conexoes: section.gabarito_mapa || section.gabarito_conexoes || {},
      banco_palavras: arrayOfText(section.banco_palavras || section.banco_de_palavras),
      feedback_professor: textOr(section.feedback_professor, "Registrar evidencia de aprendizagem.")
    }));
  }

  return fallback.atividades;
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];

  return options.map((option, index) => ({
    letra: textOr(option.letra, String.fromCharCode(65 + index)),
    texto: textOr(option.texto, ""),
    correta: Boolean(option.correta ?? option.valido)
  })).filter((option) => option.texto);
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

function buildFallbackMaterial(payload, text = "") {
  const title = `ATIVIDADE ADAPTADA: ${String(payload.objetoConhecimento || "TEMA").toUpperCase()}`;
  const uppercase = shouldUseUppercase(payload);

  return {
    schema_version: "acessamais.a4.v1",
    configuracao_folha: {
      tamanho: "A4",
      layout_orientacao: "Retrato",
      tema_estilo: payload.areaInteresse ? `Tema ligado a ${payload.areaInteresse}` : "Acessibilidade e aprendizagem",
      caixa_alta: uppercase,
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
      habilidade_bncc_adaptada: payload.habilidade || "Habilidade informada pelo professor.",
      publico_alvo: `${payload.perfil}, ${payload.serie}, ${payload.disciplina}.`,
      nivel_apoio: payload.nivelApoio || "Apoio definido no formulario.",
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
    secoes_desafios: [
      {
        fase_id: 1,
        titulo_bloco: "MISSAO 1: OBSERVE E MARQUE",
        tipo_componente: "Multipla_Escolha_Visual",
        enunciado: uppercase ? "MARQUE A OPCAO QUE COMBINA COM O TEMA." : "Marque a opcao que combina com o tema.",
        opcoes: [
          { letra: "A", texto: payload.objetoConhecimento || "Tema da aula", valido: true },
          { letra: "B", texto: "Outro tema", valido: false }
        ],
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
          { letra: "B", texto: "Outro tema", correta: false }
        ],
        feedback_professor: "Observe se o estudante compreendeu o vocabulario principal com apoio visual."
      }
    ]
  };
}

function shouldUseUppercase(payload) {
  const level = String(payload.nivelAlfabetizacao || "").toLowerCase();
  return ["pre", "pré", "silab", "siláb", "alfabetico inicial", "alfabético inicial"].some((term) => level.includes(term));
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
