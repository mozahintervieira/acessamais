import { describe, expect, it } from "vitest";
import { inferPedagogicalContext, planClarifications } from "./pedagogical-mind";

describe("mente pedagogica por linguagem natural", () => {
  it("nao pergunta o que ja esta claro no pedido", () => {
    const inferred = inferPedagogicalContext(
      "Crie uma atividade de Ciencias sobre ecossistemas para o 7º ano com apoio visual."
    );

    expect(inferred.discipline).toBe("Ciências");
    expect(inferred.gradeYear).toBe("7º ano/série");
    expect(inferred.audience).toBeUndefined();
    expect(planClarifications(inferred)).toEqual([]);
  });

  it("pergunta somente etapa e componente quando o pedido esta vago", () => {
    const questions = planClarifications(
      inferPedagogicalContext("Crie uma atividade sobre cidadania e participacao social.")
    );

    expect(questions.map((question) => question.key)).toEqual(["gradeYear", "discipline"]);
  });

  it("pergunta por barreira ou apoio sem exigir diagnostico", () => {
    const questions = planClarifications(
      inferPedagogicalContext("Adapte uma atividade de leitura para o 5º ano.")
    );

    expect(questions.map((question) => question.key)).toEqual(["audience"]);
    expect(questions[0]?.helper).toContain("Não é necessário informar diagnóstico");
    expect(questions[0]?.optional).toBe(true);
  });

  it("nao repete a pergunta sobre publico quando o perfil ja foi informado", () => {
    const inferred = inferPedagogicalContext(
      "Adapte uma atividade de Matematica para um estudante autista do 6º ano."
    );

    expect(inferred.audience).toBe("Estudante autista");
    expect(planClarifications(inferred)).toEqual([]);
  });

  it("nao transforma apoio visual em diagnostico", () => {
    const inferred = inferPedagogicalContext(
      "Crie uma atividade de Historia sobre povos indigenas para o 6º ano com apoio visual."
    );

    expect(inferred.audience).toBeUndefined();
    expect(planClarifications(inferred)).toEqual([]);
  });
});
