import { describe, expect, it } from "vitest";
import {
  normalizeCurriculumCode,
  listCurriculumProviders,
  resolveCurriculumKnowledgePack,
  searchCurriculumSkills,
  validateCurriculumAlignment
} from "./curriculum-intelligence.js";
import type { CreateMissionRequest } from "@acessa-plus/types";

const baseRequest: CreateMissionRequest = {
  userId: "user_1",
  organizationId: "org_1",
  missionType: "ADAPT_ACTIVITY",
  input: {
    rawPrompt: "Crie cinco folhas A4 sobre substantivos para estudante com DI.",
    discipline: "Língua Portuguesa",
    gradeYear: "6º ano",
    skill: "EF06LP04/ES",
    knowledgeObject: "substantivos",
    curriculumReference: "BNCC + Currículo do Espírito Santo / SEDU-ES 2026",
    theme: "substantivos próprios e comuns",
    specificNeed: "Deficiência Intelectual",
    questionCount: "5"
  }
};

describe("curriculum intelligence", () => {
  it("expõe as páginas oficiais do Currículo do Espírito Santo como fontes rastreáveis", () => {
    const provider = listCurriculumProviders().find((item) => item.id === "SEDU_ES");
    const urls = provider?.documents.map((document) => document.url) ?? [];

    expect(urls).toEqual(expect.arrayContaining([
      "https://curriculo.sedu.es.gov.br/curriculo/documentoscurriculares/",
      "https://curriculo.sedu.es.gov.br/curriculo/orientacoescurriculares/"
    ]));
  });

  it("normaliza codigos curriculares com barras, espaços e acentos removidos", () => {
    expect(normalizeCurriculumCode(" ef06lp04/es ")).toBe("EF06LP04ES");
    expect(normalizeCurriculumCode("EF06LP04 ES")).toBe("EF06LP04ES");
  });

  it("recupera habilidade oficial do Curriculo do Espirito Santo por codigo", () => {
    const skills = searchCurriculumSkills({ query: "EF06LP04/ES" });

    expect(skills).toHaveLength(1);
    expect(skills[0]?.discipline).toBe("Língua Portuguesa");
    expect(skills[0]?.knowledgeObjects).toContain("Morfossintaxe");
  });

  it("monta CurriculumKnowledgePack com GenerationBrief auditavel", () => {
    const pack = resolveCurriculumKnowledgePack(baseRequest);

    expect(pack?.repositorySource).toBe("MEMORY_FALLBACK");
    expect(pack?.skill.code).toBe("EF06LP04/ES");
    expect(pack?.sourceDocument.url).toContain("curriculo.sedu.es.gov.br");
    expect(pack?.generationBrief.sourceOfTruth).toContain("Orientações Curriculares 2026");
    expect(pack?.generationBrief.requiredEvidence.join(" ")).toMatch(/substantivos/i);
  });

  it("avalia alinhamento curricular quando o guia referencia habilidade, objeto e fonte", () => {
    const pack = resolveCurriculumKnowledgePack(baseRequest);
    const report = validateCurriculumAlignment({
      pack,
      generated: {
        teacherGuide: {
          skillCode: "EF06LP04/ES",
          knowledgeObject: "Morfossintaxe",
          curricularAnalysis: [
            "Fonte: SEDU-ES Currículo do Espírito Santo 2026.",
            "A atividade avalia função e flexões de substantivos em frases."
          ]
        }
      }
    });

    expect(report.approved).toBe(true);
    expect(report.totalScore).toBeGreaterThanOrEqual(80);
  });

  it("identifica alinhamento fraco quando a resposta ignora fonte e objeto curricular", () => {
    const pack = resolveCurriculumKnowledgePack(baseRequest);
    const report = validateCurriculumAlignment({
      pack,
      generated: {
        teacherGuide: {
          skillCode: "habilidade nao informada",
          curricularAnalysis: ["atividade generica"]
        }
      }
    });

    expect(report.approved).toBe(false);
    expect(report.issues).toContain("SKILL_CODE_NOT_REFERENCED_IN_TEACHER_GUIDE");
  });

  it("nao declara alinhamento curricular quando nenhuma fonte oficial foi recuperada", () => {
    const report = validateCurriculumAlignment({
      generated: {
        teacherGuide: {
          curricularAnalysis: ["Proposta pedagógica aguardando confirmação docente."]
        }
      }
    });

    expect(report.approved).toBe(false);
    expect(report.totalScore).toBe(0);
    expect(report.issues).toContain("CURRICULUM_PACK_NOT_AVAILABLE");
  });
});
