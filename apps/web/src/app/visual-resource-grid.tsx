"use client";

import type React from "react";

type VisualKind =
  | "numberLine"
  | "balance"
  | "blocks"
  | "chart"
  | "cycle"
  | "timeline"
  | "map"
  | "caa"
  | "braille"
  | "libras"
  | "table"
  | "picture";

const fallbackVisuals = [
  "organizador visual",
  "exemplo resolvido"
];

export function VisualResourceGrid({
  items,
  compact = false
}: {
  items?: string[];
  compact?: boolean;
}): React.ReactElement {
  const visuals = (items && items.length > 0 ? items : fallbackVisuals)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, compact ? 2 : 4);

  return (
    <section
      className={compact ? "visualResourceGrid compact" : "visualResourceGrid"}
      aria-label="Recursos visuais da atividade"
    >
      {visuals.map((visual) => (
        <VisualResourceCard key={visual} description={visual} />
      ))}
    </section>
  );
}

function VisualResourceCard({
  description
}: {
  description: string;
}): React.ReactElement {
  const label = sanitizeVisualText(description);
  const kind = resolveVisualKind(label);

  return (
    <div className={`visualResourceCard ${kind}`} aria-label={label}>
      {renderVisual(kind, label)}
      <span>{resolveShortLabel(kind, label)}</span>
    </div>
  );
}

function renderVisual(kind: VisualKind, label: string): React.ReactElement {
  switch (kind) {
    case "numberLine":
      return (
        <div className="numberLineVisual" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((number) => (
            <i key={number}>
              <b />
              <small>{number}</small>
            </i>
          ))}
        </div>
      );
    case "balance":
      return (
        <svg className="svgVisual" viewBox="0 0 160 96" role="img" aria-label={label}>
          <line x1="80" y1="18" x2="80" y2="76" />
          <line x1="38" y1="36" x2="122" y2="36" />
          <path d="M38 36 L22 64 H54 Z" />
          <path d="M122 36 L106 64 H138 Z" />
          <circle cx="80" cy="16" r="7" />
          <rect x="66" y="76" width="28" height="8" rx="3" />
        </svg>
      );
    case "blocks":
      return (
        <div className="blocksVisual" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <i key={item} />
          ))}
        </div>
      );
    case "chart":
      return (
        <div className="barChartVisual" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      );
    case "cycle":
      return (
        <div className="cycleVisual" aria-hidden="true">
          <i>1</i>
          <b>→</b>
          <i>2</i>
          <b>→</b>
          <i>3</i>
        </div>
      );
    case "timeline":
      return (
        <div className="timelineVisual" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      );
    case "map":
      return (
        <svg className="svgVisual mapVisual" viewBox="0 0 160 96" role="img" aria-label={label}>
          <path d="M24 70 L48 24 L74 58 L98 34 L136 72 Z" />
          <circle cx="98" cy="34" r="6" />
          <path d="M98 34 C92 44 88 50 84 58" />
        </svg>
      );
    case "caa":
      return (
        <div className="caaVisual" aria-hidden="true">
          {["😊", "🍎", "📚", "✅"].map((icon) => (
            <i key={icon}>{icon}</i>
          ))}
        </div>
      );
    case "braille":
      return (
        <div className="brailleVisual" aria-label="Célula Braille genérica">
          {[0, 1, 2, 3, 4, 5].map((dot) => (
            <i key={dot} />
          ))}
        </div>
      );
    case "libras":
      return <div className="emojiVisual" aria-hidden="true">🤟</div>;
    case "table":
      return (
        <div className="miniTableVisual" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      );
    default:
      return <div className="emojiVisual" aria-hidden="true">{resolveEmoji(label)}</div>;
  }
}

function sanitizeVisualText(value: string): string {
  return value
    .replace(/^(imagem|icone|ícone|pictograma|desenho)\s+de\s+/i, "")
    .replace(/^(imagem|icone|ícone|pictograma|desenho)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim() || "recurso visual";
}

function resolveVisualKind(label: string): VisualKind {
  const normalized = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (normalized.includes("reta numerica") || normalized.includes("linha numerica")) return "numberLine";
  if (normalized.includes("balanca") || normalized.includes("equacao")) return "balance";
  if (normalized.includes("bloco") || normalized.includes("material dourado")) return "blocks";
  if (normalized.includes("grafico")) return "chart";
  if (normalized.includes("ciclo") || normalized.includes("fluxo") || normalized.includes("seta")) return "cycle";
  if (normalized.includes("linha do tempo") || normalized.includes("tempo historico")) return "timeline";
  if (normalized.includes("mapa") || normalized.includes("territorio")) return "map";
  if (normalized.includes("caa") || normalized.includes("cartao") || normalized.includes("pictograma")) return "caa";
  if (normalized.includes("braille")) return "braille";
  if (normalized.includes("libras")) return "libras";
  if (normalized.includes("tabela") || normalized.includes("quadro comparativo")) return "table";

  return "picture";
}

function resolveShortLabel(kind: VisualKind, label: string): string {
  const labels: Record<VisualKind, string> = {
    numberLine: "Reta numérica",
    balance: "Balança",
    blocks: "Blocos",
    chart: "Gráfico",
    cycle: "Esquema",
    timeline: "Linha do tempo",
    map: "Mapa simples",
    caa: "Cartões visuais",
    braille: "Célula Braille",
    libras: "Apoio visual",
    table: "Tabela",
    picture: label
  };

  return labels[kind];
}

function resolveEmoji(label: string): string {
  const normalized = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (normalized.includes("livro") || normalized.includes("leitura")) return "📖";
  if (normalized.includes("escrita") || normalized.includes("lapis")) return "✏️";
  if (normalized.includes("rosto") || normalized.includes("emocao")) return "😊";
  if (normalized.includes("crianca") || normalized.includes("pessoa")) return "🧑";
  if (normalized.includes("danca") || normalized.includes("movimento")) return "🎵";
  if (normalized.includes("planta") || normalized.includes("ecossistema")) return "🌱";
  if (normalized.includes("agua")) return "💧";
  if (normalized.includes("sol")) return "☀️";
  if (normalized.includes("animal")) return "🐾";
  if (normalized.includes("casa")) return "🏠";

  return "✦";
}
