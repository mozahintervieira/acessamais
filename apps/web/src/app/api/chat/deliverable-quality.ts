export type QualityResult = { valid: boolean; issues: string[] };

export function validatePedagogicalDeliverable(
  request: string,
  response: string,
): QualityResult {
  const normalizedRequest = normalize(request);
  const issues: string[] = [];
  const asksForMaterial = asksForPedagogicalDeliverable(normalizedRequest);

  if (asksForMaterial) {
    if (!/(?:MATERIAL|FOLHA|ATIVIDADE) (?:DO|PARA O) ESTUDANTE/i.test(response))
      issues.push("faltou a seção do estudante");
    if (
      !/(?:EXEMPLO(?: COMPLETO)?|MODELO) RESOLVIDO|COMO FAZER[^\n]*(?:PASSO A PASSO|EXEMPLO)/i.test(
        response,
      )
    )
      issues.push("faltou um exemplo completo resolvido");
    if (!/GABARITO(?: COMENTADO)?/i.test(response))
      issues.push("faltou gabarito comentado separado");
    if (
      !/(?:GUIA|ORIENTA[CÇ][ÕO]ES|MEDIA[CÇ][ÃA]O) (?:DO|AO|PARA O) PROFESSOR/i.test(
        response,
      )
    )
      issues.push("faltou guia do professor");
  }

  if (/caca-palavras/.test(normalizedRequest))
    issues.push(...validateWordSearch(response).issues);
  if (/\[(?:insira|adicione|imagem|figura|resposta)[^\]]*\]/i.test(response))
    issues.push("há marcador vazio ou recurso prometido que não foi entregue");
  return { valid: issues.length === 0, issues };
}

export function asksForPedagogicalDeliverable(request: string): boolean {
  const normalizedRequest = normalize(request).trim();
  if (/^(?:como|por que|porque|qual|quais|o que|quando|onde)\b/.test(normalizedRequest))
    return false;
  const deliverable =
    "(?:atividade|material|sequencia didatica|plano de aula|avaliacao|exercicio|caca-palavras|folha a4)";
  const productionVerb =
    "(?:crie|criar|elabore|elaborar|produza|produzir|prepare|preparar|monte|montar|gere|gerar|faca|quero|preciso|necessito|adapte|adaptar)";
  return (
    new RegExp(`${productionVerb}[\\s\\S]{0,120}\\b${deliverable}\\b`).test(
      normalizedRequest,
    ) || new RegExp(`^(?:uma\\s+)?${deliverable}\\b`).test(normalizedRequest)
  );
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
