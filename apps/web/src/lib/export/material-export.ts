"use client";

import { toPng } from "html-to-image";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from "docx";

export type ExportQuestion = {
  command?: string;
  support?: string;
  actionType?: string;
  responseMode?: string;
  visualFunction?: string;
  answerSpace?: string;
  taskData?: Record<string, unknown>;
};

export type ExportStudentSheet = {
  title?: string;
  context?: string;
  instructions?: string[];
  baseText?: string;
  didacticBoxes?: string[];
  visualElements?: string[];
  tableRows?: string[];
  questions?: ExportQuestion[];
};

export type ExportTeacherGuide = {
  skillCode?: string;
  knowledgeObject?: string;
  curricularAnalysis?: string[];
  objectives?: string[];
  methodology?: string[];
  adaptations?: string[];
  duaPrinciples?: string[];
  assessmentCriteria?: string[];
  applicationSuggestions?: string[];
};

export type ExportWorksheetPlan = {
  worksheetTitle?: string;
  subject?: string;
  grade?: string;
  studentSheet?: ExportStudentSheet;
  teacherGuide?: ExportTeacherGuide;
};

export type ExportProgress = {
  current: number;
  total: number;
  message: string;
};

export type ExportOptions = {
  title: string;
  onProgress?: (progress: ExportProgress) => void;
};

const a4WidthMm = 210;
const a4HeightMm = 297;
const pngPixelRatio = 3;

export function buildExportFileName(
  title: string,
  extension: "pdf" | "png" | "zip" | "docx",
  suffix?: string
): string {
  const normalizedTitle = sanitizeFileName(title || "material-acessa-plus");
  const normalizedSuffix = suffix ? `-${sanitizeFileName(suffix)}` : "";

  return `${normalizedTitle}${normalizedSuffix}.${extension}`;
}

export function sanitizeFileName(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || "material-acessa-plus";
}

export async function exportWorksheetPdf(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  options.onProgress?.({ current: 1, total: 1, message: "Preparando seu PDF..." });
  const dataUrl = await captureWorksheetPng(element);
  const pdf = createA4Pdf();

  pdf.addImage(dataUrl, "PNG", 0, 0, a4WidthMm, a4HeightMm, undefined, "FAST");
  pdf.save(buildExportFileName(options.title, "pdf", "folha-atual"));
  options.onProgress?.({ current: 1, total: 1, message: "PDF pronto para download." });
}

export async function exportWorksheetsPdf(
  elements: HTMLElement[],
  options: ExportOptions
): Promise<void> {
  assertElements(elements);
  const pdf = createA4Pdf();

  for (const [index, element] of elements.entries()) {
    options.onProgress?.({
      current: index + 1,
      total: elements.length,
      message: `Preparando PDF ${index + 1} de ${elements.length}...`
    });

    const dataUrl = await captureWorksheetPng(element);

    if (index > 0) {
      pdf.addPage([a4WidthMm, a4HeightMm], "portrait");
    }

    pdf.addImage(dataUrl, "PNG", 0, 0, a4WidthMm, a4HeightMm, undefined, "FAST");
  }

  pdf.save(buildExportFileName(options.title, "pdf", "todas-as-folhas"));
  options.onProgress?.({ current: elements.length, total: elements.length, message: "PDF completo pronto." });
}

export async function exportWorksheetPng(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  options.onProgress?.({ current: 1, total: 1, message: "Gerando imagem em alta qualidade..." });
  const dataUrl = await captureWorksheetPng(element);

  downloadDataUrl(dataUrl, buildExportFileName(options.title, "png", "folha-atual"));
  options.onProgress?.({ current: 1, total: 1, message: "Imagem pronta para download." });
}

export async function exportWorksheetsPngZip(
  elements: HTMLElement[],
  options: ExportOptions
): Promise<void> {
  assertElements(elements);
  const zip = new JSZip();

  for (const [index, element] of elements.entries()) {
    options.onProgress?.({
      current: index + 1,
      total: elements.length,
      message: `Gerando imagem ${index + 1} de ${elements.length}...`
    });

    const dataUrl = await captureWorksheetPng(element);
    zip.file(
      buildExportFileName(options.title, "png", `folha-${index + 1}`).replace(/\.png$/, ".png"),
      dataUrlToUint8Array(dataUrl)
    );
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, buildExportFileName(options.title, "zip", "imagens-a4"));
  options.onProgress?.({ current: elements.length, total: elements.length, message: "Imagens prontas para download." });
}

export async function exportWorksheetsDocx(
  plans: ExportWorksheetPlan[],
  options: ExportOptions
): Promise<void> {
  if (plans.length === 0) {
    throw new Error("Nenhuma folha disponivel para exportar.");
  }

  options.onProgress?.({ current: 1, total: plans.length, message: "Preparando documento Word..." });
  const children = plans.flatMap((plan, index) => [
    ...(index > 0 ? [new Paragraph({ children: [new PageBreak()] })] : []),
    ...buildDocxWorksheet(plan, index + 1)
  ]);
  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children
      }
    ]
  });
  const blob = await Packer.toBlob(document);

  downloadBlob(blob, buildExportFileName(options.title, "docx", "editavel"));
  options.onProgress?.({ current: plans.length, total: plans.length, message: "Word pronto para download." });
}

export async function captureWorksheetPng(element: HTMLElement): Promise<string> {
  await waitForExportReadiness(element);

  return toPng(element, {
    backgroundColor: "#ffffff",
    cacheBust: true,
    pixelRatio: pngPixelRatio,
    width: element.scrollWidth,
    height: element.scrollHeight,
    style: {
      margin: "0",
      transform: "none"
    }
  });
}

export async function waitForExportReadiness(element: HTMLElement): Promise<void> {
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const images = Array.from(element.querySelectorAll("img"));

  await Promise.all(
    images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) {
        return;
      }

      if (typeof image.decode === "function") {
        await image.decode().catch(() => undefined);
      }
    })
  );
}

export function getExportableElements(elements: Array<HTMLElement | null | undefined>): HTMLElement[] {
  return elements.filter((element): element is HTMLElement => Boolean(element));
}

function createA4Pdf(): jsPDF {
  return new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true
  });
}

function assertElements(elements: HTMLElement[]): void {
  if (elements.length === 0) {
    throw new Error("Nenhuma folha disponivel para exportar.");
  }
}

function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement("a");

  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function buildDocxWorksheet(plan: ExportWorksheetPlan, order: number): Array<Paragraph | Table> {
  const sheet = plan.studentSheet ?? {};
  const title = sheet.title ?? plan.worksheetTitle ?? `Folha ${order}`;
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${plan.subject ?? "ACESSA+"} - ${plan.grade ?? "Folha A4"}`, bold: true, size: 24 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: title, bold: true, size: 34 })]
    })
  ];

  addParagraph(children, sheet.context, true);
  addParagraph(children, sheet.baseText);
  addListSection(children, "Como realizar", sheet.instructions ?? []);
  addListSection(children, "Apoios visuais", sheet.visualElements ?? []);
  addListSection(children, "Dicas", sheet.didacticBoxes ?? []);

  if ((sheet.tableRows ?? []).length > 0) {
    children.push(buildTable(sheet.tableRows ?? []));
  }

  (sheet.questions ?? []).forEach((question, index) => {
    addQuestion(children, question, index + 1);
  });

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300 },
      children: [new TextRun({ text: "acessa+ | educacao inclusiva na pratica - @mozahintervieira", bold: true, size: 18 })]
    })
  );

  return children;
}

function addParagraph(children: Array<Paragraph | Table>, text: string | undefined, bold = false): void {
  if (!text?.trim()) {
    return;
  }

  children.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: text.trim(), bold, size: 22 })]
    })
  );
}

function addListSection(children: Array<Paragraph | Table>, title: string, items: string[]): void {
  const cleanItems = items.filter((item) => item.trim());

  if (cleanItems.length === 0) {
    return;
  }

  children.push(new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 22 })] }));
  cleanItems.forEach((item) => {
    children.push(new Paragraph({ text: `• ${item}`, spacing: { after: 80 } }));
  });
}

function addQuestion(children: Array<Paragraph | Table>, question: ExportQuestion, order: number): void {
  addParagraph(children, `${order}. ${question.command ?? "Atividade"}`, true);

  if (question.support) {
    addParagraph(children, question.support);
  }

  const taskData = formatTaskData(question.taskData);

  if (taskData.length > 0) {
    children.push(buildTable(taskData));
  }

  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [new TextRun({ text: "Resposta: ________________________________________________", size: 22 })]
    })
  );
}

function buildTable(rows: string[]): Table {
  const tableRows = rows.slice(0, 8).map((row) => {
    const cells = row.split("|").map((cell) => cell.trim()).filter(Boolean);
    const normalizedCells = cells.length > 0 ? cells : [row];

    return new TableRow({
      children: normalizedCells.slice(0, 4).map((cell) => new TableCell({
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "94A3B8" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "94A3B8" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "94A3B8" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "94A3B8" }
        },
        children: [new Paragraph({ text: cell })]
      }))
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

function formatTaskData(taskData: Record<string, unknown> | undefined): string[] {
  if (!taskData) {
    return [];
  }

  return Object.entries(taskData)
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => `${formatLabel(key)} | ${String(item)}`);
      }

      if (typeof value === "string" || typeof value === "number") {
        return [`${formatLabel(key)} | ${String(value)}`];
      }

      return [];
    })
    .slice(0, 10);
}

function formatLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
