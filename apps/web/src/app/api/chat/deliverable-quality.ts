export type QualityResult = { valid: boolean; issues: string[] };

export function validatePedagogicalDeliverable(
  request: string,
  response: string,
): QualityResult {
  const normalizedRequest = normalize(request);
  const issues: string[] = [];
  const asksForMaterial = asksForPedagogicalDeliverable(normalizedRequest);
  const asksForSequence = asksForDidacticSequence(normalizedRequest);

  if (asksForMaterial) {
    const normalizedResponse = normalize(response);
    for (const component of requestedCurricularComponents(normalizedRequest))
      if (!normalizedResponse.includes(component))
        issues.push(
          `a resposta divergiu do componente curricular solicitado: ${component}`,
        );
  }

  if (asksForMaterial) {
    const studentSection = extractStudentSection(response);
    if (/\bFRENTE\s+E\s+VERSO\b/i.test(response))
      issues.push(
        "a folha do estudante foi dividida em frente e verso; entregue cada atividade em uma face A4 completa",
      );
    if (
      /(?:ALINHAMENTO|NOTA) CURRICULAR[\s\S]{0,500}(?:MATERIAL|FOLHA|ATIVIDADE) (?:DO|PARA O) ESTUDANTE/i.test(
        response,
      )
    )
      issues.push(
        "a justificativa curricular foi colocada antes da folha do estudante",
      );
    if (
      !/(?:MATERIAL|FOLHA|ATIVIDADE) (?:DO|PARA O) ESTUDANTE|CADERNO DE ATIVIDADES DO ESTUDANTE/i.test(
        response,
      )
    )
      issues.push("faltou a seção do estudante");
    if (
      !/(?:EXEMPLO(?: COMPLETO)?|MODELO) RESOLVIDO|COMO FAZER[^\n]*(?:PASSO A PASSO|EXEMPLO)/i.test(
        response,
      )
    )
      issues.push("faltou um exemplo completo resolvido");
    if (!/LEITURA GUIADA/i.test(studentSection))
      issues.push(
        "faltou leitura guiada que ensine o conteúdo necessário para realizar a atividade",
      );
    if (
      !/(?:FA[CÇ]A AS )?ATIVIDADES|MISS[ÕO]ES|QUEST[ÕO]ES/i.test(studentSection)
    )
      issues.push("faltou uma seção explícita de atividades do estudante");
    if (!/GABARITO(?: COMENTADO)?/i.test(response))
      issues.push("faltou gabarito comentado separado");
    if (
      !/(?:GUIA|ORIENTA[CÇ][ÕO]ES|MEDIA[CÇ][ÃA]O) (?:DO|AO|PARA O) PROFESSOR/i.test(
        response,
      )
    )
      issues.push("faltou guia do professor");
    if (
      /(?:QUADRO|APOIO) VISUAL/i.test(response) &&
      !/(?:GR[AÁ]FICO|MAPA|LINHA DO TEMPO|DIAGRAMA|ESQUEMA|TABELA DE DADOS|CART[ÕO]ES|SEQU[ÊE]NCIA VISUAL|MODELO VISUAL)/i.test(
        response,
      )
    )
      issues.push(
        "o apoio visual foi apenas nomeado; faltou um recurso visual funcional ligado à resolução",
      );
    if (!asksForSequence) {
      const minimumTasks = extractRequestedTaskCount(normalizedRequest) ?? 4;
      const deliveredTasks = countStudentTasks(studentSection);
      if (deliveredTasks < minimumTasks)
        issues.push(
          `a folha entrega ${deliveredTasks} atividade(s), mas precisa de pelo menos ${minimumTasks}`,
        );
      if (!hasFunctionalVisualResource(studentSection))
        issues.push(
          "faltou um recurso visual curricular com conteúdo concreto dentro da folha do estudante",
        );
      if (!taskUsesVisualResource(studentSection))
        issues.push(
          "nenhuma atividade exige que o estudante consulte o recurso visual curricular",
        );
      if (!hasResponseSpace(studentSection))
        issues.push(
          "faltou espaço ou forma de resposta claramente disponível na folha do estudante",
        );
    }
  }

  if (asksForSequence) {
    const requiredSequenceSections: Array<[RegExp, string]> = [
      [
        /PLANEJAMENTO DA SEQU[EÊ]NCIA DID[AÁ]TICA/i,
        "faltou o planejamento da sequência didática",
      ],
      [/IDENTIFICA[CÇ][AÃ]O/i, "faltou a identificação da sequência"],
      [
        /HABILIDADES? E OBJETOS? DE CONHECIMENTO/i,
        "faltaram habilidades e objetos de conhecimento organizados",
      ],
      [/METODOLOGIA/i, "faltou a metodologia da sequência"],
      [
        /DESENVOLVIMENTO DA VIDA AUT[ÔO]NOMA/i,
        "faltou o desenvolvimento da vida autônoma",
      ],
      [/RECURSOS(?: PEDAG[ÓO]GICOS)?/i, "faltaram os recursos pedagógicos"],
      [/COMPONENTE SOCIOEMOCIONAL/i, "faltou o componente socioemocional"],
      [
        /AVALIA[CÇ][AÃ]O DA APRENDIZAGEM/i,
        "faltou a avaliação da aprendizagem",
      ],
      [/REFER[ÊE]NCIAS/i, "faltaram as referências da sequência"],
      [/TEMA INTEGRADOR/i, "faltou o tema integrador"],
      [/(?:^|\n)#{0,6}\s*\*{0,2}ERER\b/im, "faltou a abordagem de ERER"],
      [/PR[AÁ]TICAS EXITOSAS/i, "faltou o planejamento das práticas exitosas"],
      [/CRONOGRAMA DE AULAS/i, "faltou o cronograma de aulas"],
      [
        /CADERNO DE ATIVIDADES DO ESTUDANTE/i,
        "faltou o caderno de atividades do estudante",
      ],
    ];
    for (const [pattern, issue] of requiredSequenceSections)
      if (!pattern.test(response)) issues.push(issue);

    const requestedLessons = extractRequestedLessonCount(normalizedRequest);
    if (requestedLessons) {
      const deliveredLessons = new Set(
        [...response.matchAll(/^\s*#{0,6}\s*\*{0,2}AULA\s+(\d{1,2})\b/gim)].map(
          (match) => Number(match[1]),
        ),
      ).size;
      if (deliveredLessons < requestedLessons)
        issues.push(
          `foram solicitadas ${requestedLessons} aulas, mas a sequência entrega somente ${deliveredLessons}`,
        );
      issues.push(...validateSequenceLessonPages(response, requestedLessons));
    }

    if (
      !/(?:FOLHA|ATIVIDADE) A4|P[AÁ]GINA DO ESTUDANTE|MATERIAL DO ESTUDANTE/i.test(
        response,
      )
    )
      issues.push(
        "o caderno não contém folhas A4 completas para os estudantes",
      );
  }

  if (/caca-palavras/.test(normalizedRequest))
    issues.push(...validateWordSearch(response).issues);
  if (/\[(?:insira|adicione|imagem|figura|resposta)[^\]]*\]/i.test(response))
    issues.push("há marcador vazio ou recurso prometido que não foi entregue");
  return { valid: issues.length === 0, issues };
}

export function hasCriticalQualityFailure(issues: string[]): boolean {
  return issues.some((issue) =>
    issue.includes("a resposta divergiu do componente curricular solicitado"),
  );
}

export function asksForPedagogicalDeliverable(request: string): boolean {
  const normalizedRequest = normalize(request).trim();
  if (
    /^(?:como|por que|porque|qual|quais|o que|quando|onde)\b/.test(
      normalizedRequest,
    )
  )
    return false;
  const deliverable =
    "(?:atividade|material|sequencia didatica|sd|plano de aula|avaliacao|exercicio|caca-palavras|folha a4)";
  const productionVerb =
    "(?:crie|criar|elabore|elaborar|produza|produzir|prepare|preparar|monte|montar|gere|gerar|faca|quero|preciso|necessito|adapte|adaptar|revise|revisar|refaca|melhore|melhorar|corrija|corrigir|ajuste|ajustar|simplifique|simplificar)";
  return (
    new RegExp(`${productionVerb}[\\s\\S]{0,120}\\b${deliverable}\\b`).test(
      normalizedRequest,
    ) || new RegExp(`^(?:uma\\s+)?${deliverable}\\b`).test(normalizedRequest)
  );
}

function extractStudentSection(response: string): string {
  const start = response.search(
    /(?:MATERIAL|FOLHA|ATIVIDADE) (?:DO|PARA O) ESTUDANTE|CADERNO DE ATIVIDADES DO ESTUDANTE/i,
  );
  const source = start >= 0 ? response.slice(start) : response;
  const end = source.search(/(?:^|\n)\s*#{0,6}\s*\*{0,2}GABARITO\b/im);
  return end >= 0 ? source.slice(0, end) : source;
}

function countStudentTasks(studentSection: string): number {
  const activities =
    studentSection.match(/(?:FA[CÇ]A AS )?ATIVIDADES|MISS[ÕO]ES|QUEST[ÕO]ES/i)
      ?.index ?? 0;
  const source = studentSection.slice(activities);
  return new Set(
    [
      ...source.matchAll(
        /^\s*\*{0,2}(?:(?:quest[aã]o|atividade|miss[aã]o)\s*)?(\d{1,2})[.)]\s+/gim,
      ),
    ].map((match) => Number(match[1])),
  ).size;
}

function extractRequestedTaskCount(request: string): number | null {
  const match = request.match(
    /\b(\d{1,2}|uma|duas|dois|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+(?:questoes|atividades|exercicios|itens|missoes)\b/,
  );
  if (!match?.[1]) return null;
  const words: Record<string, number> = {
    uma: 1,
    duas: 2,
    dois: 2,
    tres: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
  };
  const value = Number(match[1]);
  return Number.isInteger(value) ? value : (words[match[1]] ?? null);
}

function hasFunctionalVisualResource(studentSection: string): boolean {
  const visualHeading = studentSection.search(
    /(?:RECURSO|APOIO|MAPA|QUADRO|INFOGR[AÁ]FICO|GR[AÁ]FICO|DIAGRAMA|LINHA DO TEMPO|SEQU[ÊE]NCIA) VISUAL|(?:MAPA|INFOGR[AÁ]FICO|GR[AÁ]FICO|DIAGRAMA|LINHA DO TEMPO) (?:DE|DO|DA|PARA)|TABELA (?:DE DADOS|COM DADOS|COMPARATIVA)/i,
  );
  if (visualHeading < 0) return false;
  const visual = studentSection.slice(visualHeading, visualHeading + 1800);
  const tableRows = (visual.match(/^\s*\|.+\|\s*$/gm) ?? []).filter(
    (row) => !/^\s*\|?\s*:?-{3,}/.test(row),
  ).length;
  const diagramLines =
    visual.match(/```[a-z]*\s*\n([\s\S]*?)```/i)?.[1]?.split(/\r?\n/).length ??
    0;
  const structuredSignals = (
    visual.match(
      /[→↓↔]|\b(?:etapa|dados?|valor|causa|efeito|antes|depois)\b/gi,
    ) ?? []
  ).length;
  return tableRows >= 3 || diagramLines >= 3 || structuredSignals >= 4;
}

function taskUsesVisualResource(studentSection: string): boolean {
  const activitiesIndex = studentSection.search(
    /(?:FA[CÇ]A AS )?ATIVIDADES|MISS[ÕO]ES|QUEST[ÕO]ES/i,
  );
  if (activitiesIndex < 0) return false;
  const tasks = studentSection.slice(activitiesIndex);
  return /(?:consulte|observe|analise|use|compare)[^\n.]{0,100}(?:recurso|quadro|mapa|gr[aá]fico|infogr[aá]fico|diagrama|linha do tempo|tabela|sequ[êe]ncia)/i.test(
    tasks,
  );
}

function hasResponseSpace(studentSection: string): boolean {
  const taskCount = countStudentTasks(studentSection);
  if (taskCount === 0) return false;
  const responseBlocks = [
    ...studentSection.matchAll(
      /\*{0,2}(?:Resposta|C[aá]lculo|Registro)\s*:\s*\*{0,2}\s*(?:_{3,}|(?:\r?\n\s*_{3,})+)/gim,
    ),
  ].length;
  const choiceTasks = [
    ...studentSection.matchAll(
      /^\s*\*{0,2}(?:(?:quest[aã]o|atividade|miss[aã]o)\s*)?\d{1,2}[.)][\s\S]{0,450}?(?:☐|\(\s*\))[\s\S]{0,180}?(?:☐|\(\s*\))/gim,
    ),
  ].length;
  return responseBlocks + choiceTasks >= taskCount;
}

export function asksForDidacticSequence(request: string): boolean {
  return /\b(?:sequencia didatica|sd)\b/.test(normalize(request));
}

function requestedCurricularComponents(request: string): string[] {
  const components = [
    "lingua portuguesa",
    "matematica",
    "quimica",
    "fisica",
    "biologia",
    "ciencias",
    "geografia",
    "historia",
    "filosofia",
    "sociologia",
    "arte",
    "educacao fisica",
    "lingua inglesa",
    "ensino religioso",
  ];
  return components.filter((component) => request.includes(component));
}

function validateSequenceLessonPages(
  response: string,
  requestedLessons: number,
): string[] {
  const issues: string[] = [];
  const cadernoIndex = response.search(/CADERNO DE ATIVIDADES DO ESTUDANTE/i);
  if (cadernoIndex < 0) return issues;
  const caderno = response.slice(cadernoIndex);
  const headings = [
    ...caderno.matchAll(/^\s*#{0,6}\s*\*{0,2}AULA\s+(\d{1,2})\b[^\n]*$/gim),
  ];
  for (let lesson = 1; lesson <= requestedLessons; lesson += 1) {
    const headingIndex = headings.findIndex(
      (match) => Number(match[1]) === lesson,
    );
    if (headingIndex < 0) continue;
    const start =
      (headings[headingIndex]!.index ?? 0) + headings[headingIndex]![0].length;
    const end =
      headingIndex + 1 < headings.length
        ? (headings[headingIndex + 1]!.index ?? caderno.length)
        : caderno.search(/GABARITO(?: COMENTADO)?/i) > start
          ? caderno.search(/GABARITO(?: COMENTADO)?/i)
          : caderno.length;
    const page = stripMarkdownMarkers(caderno.slice(start, end)).trim();
    if (
      page.length < 140 ||
      !/(?:ATIVIDADES|QUEST[ÕO]ES|EXERC[IÍ]CIOS)/i.test(page)
    )
      issues.push(
        `a Aula ${lesson} não contém uma folha completa com atividades`,
      );
  }
  return issues;
}

function stripMarkdownMarkers(text: string): string {
  return text.replace(/[*_~`]/g, "");
}

function extractRequestedLessonCount(request: string): number | null {
  const match = request.match(
    /\b(\d{1,2}|uma|duas|dois|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+aulas?\b/,
  );
  if (!match?.[1]) return null;
  const words: Record<string, number> = {
    uma: 1,
    duas: 2,
    dois: 2,
    tres: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
  };
  const value = Number(match[1]);
  return Number.isInteger(value) ? value : (words[match[1]] ?? null);
}

export function validateWordSearch(text: string): QualityResult {
  const issues: string[] = [];
  const blocks = [
    ...text.matchAll(/```(?:wordsearch|text)?\s*\n([\s\S]*?)```/gi),
  ].map((match) => match[1] ?? "");
  const parsed = blocks
    .map(parseGrid)
    .filter((grid): grid is string[][] => Boolean(grid));
  const grid = parsed.sort((a, b) => b.length - a.length)[0];
  if (!grid || grid.length < 10)
    return {
      valid: false,
      issues: [
        "o caça-palavras não contém uma grade validável com pelo menos 10 linhas",
      ],
    };
  if (grid.some((row) => row.length !== grid.length))
    issues.push("a grade do caça-palavras não é quadrada");
  const words = extractWordList(text);
  if (words.length < 5)
    issues.push("a lista de palavras do caça-palavras não pôde ser validada");
  if (grid && words.length) {
    const missing = words.filter((word) => !findWord(grid, word));
    if (missing.length)
      issues.push(
        `palavras ausentes da grade: ${missing.slice(0, 8).join(", ")}`,
      );
  }
  return { valid: issues.length === 0, issues };
}

function parseGrid(block: string): string[][] | null {
  const rows = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/).map(normalizeToken));
  if (
    !rows.length ||
    rows.some(
      (row) => row.length < 10 || row.some((cell) => !/^[A-Z]$/.test(cell)),
    )
  )
    return null;
  return rows;
}

function extractWordList(text: string): string[] {
  const section =
    text.match(
      /(?:PALAVRAS(?: A ENCONTRAR)?|BANCO DE PALAVRAS)\s*:?[\s\S]*?(?=\n#{1,3}\s|\n\*\*[A-ZÁÉÍÓÚÂÊÔÃÕÇ ]+\*\*|```)/i,
    )?.[0] ?? "";
  return [
    ...section.matchAll(/^\s*(?:[-*•]|\d+[.)])\s*\*{0,2}([^\n:*]{3,40})/gm),
  ]
    .map((match) => normalizeWord(match[1] ?? ""))
    .filter(
      (word, index, all) => word.length >= 3 && all.indexOf(word) === index,
    );
}

function findWord(grid: string[][], word: string): boolean {
  const directions = [-1, 0, 1]
    .flatMap((dr) => [-1, 0, 1].map((dc) => [dr, dc] as const))
    .filter(([dr, dc]) => dr !== 0 || dc !== 0);
  for (let row = 0; row < grid.length; row += 1)
    for (let col = 0; col < grid[row]!.length; col += 1)
      for (const [dr, dc] of directions) {
        let found = true;
        for (let index = 0; index < word.length; index += 1)
          if (grid[row + dr * index]?.[col + dc * index] !== word[index]) {
            found = false;
            break;
          }
        if (found) return true;
      }
  return false;
}

function normalizeToken(value: string): string {
  return normalizeWord(value).slice(0, 1);
}
function normalizeWord(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
