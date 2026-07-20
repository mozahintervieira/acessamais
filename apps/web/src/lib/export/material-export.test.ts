import { describe, expect, it } from "vitest";
import {
  buildExportFileName,
  getExportableElements,
  sanitizeFileName,
  type ExportWorksheetPlan
} from "./material-export";

describe("professional material export helpers", () => {
  it("builds readable file names with accents removed", () => {
    expect(sanitizeFileName("Atividade de Língua Portuguesa: substantivos!")).toBe(
      "atividade-de-lingua-portuguesa-substantivos"
    );
    expect(buildExportFileName("Frações e Equações", "pdf", "folha atual")).toBe(
      "fracoes-e-equacoes-folha-atual.pdf"
    );
  });

  it("filters only real worksheet elements for multi-page export", () => {
    const first = {} as HTMLElement;
    const second = {} as HTMLElement;

    expect(getExportableElements([first, null, undefined, second])).toEqual([first, second]);
  });

  it("keeps the export contract focused on worksheet data instead of interface controls", () => {
    const plan: ExportWorksheetPlan = {
      subject: "Língua Portuguesa",
      grade: "6º ano",
      studentSheet: {
        title: "Substantivos próprios e comuns",
        context: "Leia, observe e classifique as palavras.",
        instructions: ["Leia cada palavra.", "Marque a classe correta."],
        didacticBoxes: ["Substantivo nomeia seres, lugares, objetos e ideias."],
        visualElements: ["cartões de palavras", "quadro comparativo"],
        tableRows: ["Palavra | Próprio | Comum"],
        questions: [
          {
            command: "Classifique as palavras no quadro.",
            actionType: "CLASSIFY",
            responseMode: "marcação",
            taskData: {
              categories: ["Próprio", "Comum"],
              items: ["Vitória", "cidade", "Ana", "livro"]
            }
          }
        ]
      }
    };
    const serialized = JSON.stringify(plan);

    expect(serialized).toContain("Substantivos próprios e comuns");
    expect(serialized).not.toMatch(/menu lateral|bot[aã]o|dashboard|previewToolbar|productShell/i);
  });
});
