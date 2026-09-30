"use client";

import { useState } from "react";

type MissionResponse = {
  missionId: string;
  resourceId: string;
  pedagogicalPlan?: {
    worksheetTitle?: string;
    learningObjective?: string;
    studentSheet?: { title?: string; context?: string };
  };
};

type ClarificationKey = "gradeYear" | "discipline" | "audience";

type Clarification = {
  key: ClarificationKey;
  question: string;
  helper: string;
  placeholder: string;
  optional?: boolean;
};

type ClarificationAnswer = {
  key: ClarificationKey;
  question: string;
  answer: string;
};

type InferredContext = {
  discipline?: string;
  gradeYear?: string;
  knowledgeObject: string;
  audience?: string;
  needsAudienceClarification: boolean;
};

const suggestions = [
  "Crie uma atividade de Ciências sobre ecossistemas para o 7º ano com apoio visual.",
  "Adapte uma atividade de leitura para um estudante que precisa de comandos curtos e objetivos.",
  "Prepare uma atividade de Matemática sobre frações para os anos finais.",
  "Crie um plano de aula inclusivo sobre povos indígenas para o Ensino Médio."
];

export function PedagogicalMind(): React.ReactElement {
  const [prompt, setPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [clarificationIndex, setClarificationIndex] = useState(0);
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [answers, setAnswers] = useState<ClarificationAnswer[]>([]);
  const [result, setResult] = useState<MissionResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const activeClarification = clarifications[clarificationIndex];
  const isClarifying = Boolean(activeClarification) && !result;

  async function begin(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const cleanPrompt = prompt.trim();

    if (cleanPrompt.length < 18) {
      setMessage("Conte em uma frase o que deseja criar. Tema e turma, quando souber, já são suficientes.");
      return;
    }

    const inferred = inferPedagogicalContext(cleanPrompt);
    const plannedClarifications = planClarifications(inferred);

    setOriginalPrompt(cleanPrompt);
    setResult(null);
    setAnswers([]);
    setClarificationIndex(0);
    setClarificationAnswer("");

    if (plannedClarifications.length) {
      setClarifications(plannedClarifications);
      setMessage("Entendi seu pedido. Só vou confirmar o que realmente muda a proposta.");
      return;
    }

    setClarifications([]);
    await generate(cleanPrompt, []);
  }

  async function answerCurrentClarification(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!activeClarification) return;

    const cleanAnswer = clarificationAnswer.trim();
    if (!cleanAnswer && !activeClarification.optional) {
      setMessage("Responda com suas palavras. Pode ser algo breve.");
      return;
    }

    const nextAnswer: ClarificationAnswer = {
      key: activeClarification.key,
      question: activeClarification.question,
      answer: cleanAnswer || "Turma diversa, sem perfil específico informado"
    };
    const nextAnswers = [...answers, nextAnswer];
    const nextIndex = clarificationIndex + 1;

    setAnswers(nextAnswers);
    setClarificationAnswer("");
    setMessage("");

    if (nextIndex < clarifications.length) {
      setClarificationIndex(nextIndex);
      return;
    }

    setClarificationIndex(nextIndex);
    await generate(originalPrompt, nextAnswers);
  }

  async function generate(requestPrompt: string, confirmedAnswers: ClarificationAnswer[]): Promise<void> {
    setIsGenerating(true);
    setMessage("Organizando objetivo, percurso, apoios e evidências de aprendizagem...");

    try {
      const inferred = inferPedagogicalContext(requestPrompt);
      const resolved = resolveConfirmedContext(inferred, confirmedAnswers);
      const requestsLessonPlan = /plano\s+de\s+aula|sequencia\s+didatica/i.test(normalizeComparable(requestPrompt));
      const hasSpecificAudience = Boolean(
        resolved.audience && !/turma diversa|sem perfil especifico/i.test(normalizeComparable(resolved.audience))
      );
      const response = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo-teacher",
          organizationId: "demo-organization",
          missionType: requestsLessonPlan ? "CREATE_LESSON_PLAN" : "ADAPT_ACTIVITY",
          input: {
            rawPrompt: requestPrompt,
            discipline: resolved.discipline,
            gradeYear: resolved.gradeYear,
            theme: inferred.knowledgeObject,
            expectedProductType: requestsLessonPlan ? "Plano de aula inclusivo" : "Atividade A4 pronta para revisão docente",
            questionCount: "1",
            specificNeed: hasSpecificAudience ? resolved.audience : undefined,
            outputFormat: "A4 pronto para revisão",
            contextNotes: [
              "Interpretar como missão pedagógica inclusiva iniciada por linguagem natural.",
              "Aplicar DUA, progressão cognitiva, acessibilidade e linguagem apropriada.",
              "Não presumir diagnóstico, deficiência ou perfil do estudante.",
              "Quando a habilidade curricular não estiver confirmada em fonte oficial, sinalizar revisão docente e nunca inventar código curricular.",
              ...confirmedAnswers.map((item) => `${item.question} Resposta do professor: ${item.answer}`)
            ].join(" ")
          }
        })
      });
      const payload = (await response.json().catch(() => ({}))) as MissionResponse & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Não foi possível gerar agora.");
      setResult(payload);
      setMessage("A primeira proposta está pronta para você revisar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gerar agora.");
    } finally {
      setIsGenerating(false);
    }
  }

  function startAgain(): void {
    setPrompt("");
    setOriginalPrompt("");
    setClarifications([]);
    setClarificationIndex(0);
    setClarificationAnswer("");
    setAnswers([]);
    setResult(null);
    setMessage("");
  }

  return (
    <main className="mindShell">
      <section className="mindWelcome">
        <p className="mindKicker"><span aria-hidden="true" /> Mente pedagógica ACESSA+</p>
        <h1>O que você quer construir hoje?</h1>
        <p>Escreva como você falaria com outro professor. O ACESSA+ organiza o restante e pergunta somente se precisar.</p>
      </section>

      {!isClarifying && !result ? (
        <form className="mindComposer" onSubmit={(event) => void begin(event)}>
          <label htmlFor="mind-prompt">Seu pedido</label>
          <textarea
            id="mind-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.currentTarget.value)}
            placeholder="Ex.: Crie uma atividade sobre povos indígenas para o 6º ano, com linguagem simples e apoio visual."
          />
          <div className="mindComposerBottom conversational">
            <p>Não precisa preencher disciplina, habilidade, objeto ou deficiência em campos separados.</p>
            <button className="mindGenerate" disabled={isGenerating} type="submit">
              <span aria-hidden="true">✦</span>{isGenerating ? "Organizando..." : "Conversar com o ACESSA+"}
            </button>
          </div>
        </form>
      ) : null}

      {activeClarification && !result ? (
        <section className="mindDialogue" aria-live="polite">
          <article className="mindDialogueTurn teacher"><span>Você</span><p>{originalPrompt}</p></article>
          {answers.map((item) => (
            <div className="mindDialoguePair" key={item.key}>
              <article className="mindDialogueTurn assistant"><span>ACESSA+</span><p>{item.question}</p></article>
              <article className="mindDialogueTurn teacher"><span>Você</span><p>{item.answer}</p></article>
            </div>
          ))}
          <article className="mindDialogueTurn assistant active">
            <span>ACESSA+ · pergunta {clarificationIndex + 1} de {clarifications.length}</span>
            <p>{activeClarification.question}</p>
            <small>{activeClarification.helper}</small>
          </article>
          <form className="mindClarificationComposer" onSubmit={(event) => void answerCurrentClarification(event)}>
            <input
              autoFocus
              value={clarificationAnswer}
              onChange={(event) => setClarificationAnswer(event.currentTarget.value)}
              placeholder={activeClarification.placeholder}
            />
            <button className="mindGenerate" disabled={isGenerating} type="submit">
              {clarificationIndex + 1 === clarifications.length ? "Gerar proposta" : "Responder"}<span aria-hidden="true">→</span>
            </button>
            {activeClarification.optional ? (
              <button className="mindSkip" type="button" onClick={() => setClarificationAnswer("Turma diversa, sem perfil específico informado")}>Não há perfil específico</button>
            ) : null}
          </form>
        </section>
      ) : null}

      {!isClarifying && !result ? (
        <section className="mindSuggestions" aria-label="Exemplos de pedidos">
          <span>Você pode começar por:</span>
          {suggestions.map((item) => <button key={item} type="button" onClick={() => setPrompt(item)}>{item}<span aria-hidden="true">→</span></button>)}
        </section>
      ) : null}

      {result ? (
        <section className="mindResult" aria-live="polite">
          <div className="mindResultGlow" aria-hidden="true" />
          <p className="mindKicker"><span aria-hidden="true" /> Primeira proposta criada</p>
          <h2>{result.pedagogicalPlan?.studentSheet?.title ?? result.pedagogicalPlan?.worksheetTitle ?? "Material pedagógico"}</h2>
          <p>{result.pedagogicalPlan?.studentSheet?.context ?? result.pedagogicalPlan?.learningObjective ?? "O material está pronto para revisão."}</p>
          <div className="mindResultActions">
            <a className="mindGenerate" href={`/missions/${result.missionId}`}>Revisar proposta <span aria-hidden="true">→</span></a>
            <button className="mindSecondary" type="button" onClick={startAgain}>Fazer novo pedido</button>
          </div>
        </section>
      ) : null}

      {message ? <p className="mindMessage" role="status">{message}</p> : null}
      <p className="mindPrivacy">A IA propõe. O professor revisa. Informe barreiras e apoios; diagnóstico nunca é obrigatório.</p>
    </main>
  );
}

export function planClarifications(inferred: InferredContext): Clarification[] {
  const questions: Clarification[] = [];

  if (!inferred.gradeYear) {
    questions.push({
      key: "gradeYear",
      question: "Para qual ano, série ou faixa etária você quer esta proposta?",
      helper: "Pode responder, por exemplo: 4º ano, Ensino Médio ou estudante de 12 anos.",
      placeholder: "Digite o ano, série ou faixa etária"
    });
  }

  if (!inferred.discipline) {
    questions.push({
      key: "discipline",
      question: "Em qual componente curricular ou área esse tema será trabalhado?",
      helper: "Pergunto porque o mesmo tema pode exigir objetivos diferentes em História, Arte ou Língua Portuguesa.",
      placeholder: "Ex.: História, Ciências, Matemática..."
    });
  }

  if (inferred.needsAudienceClarification && !inferred.audience) {
    questions.push({
      key: "audience",
      question: "Há alguma necessidade de acesso, perfil de aprendizagem ou apoio que eu deva considerar?",
      helper: "Não é necessário informar diagnóstico. Você pode descrever apenas a barreira: leitura inicial, comunicação, atenção, visão, audição ou outra.",
      placeholder: "Ex.: precisa de comandos curtos e apoio visual",
      optional: true
    });
  }

  return questions;
}

export function inferPedagogicalContext(prompt: string): InferredContext {
  const comparable = normalizeComparable(prompt);
  const disciplines: Array<[RegExp, string]> = [
    [/ciencia|ecossistema|biologia|fisica|quimica|corpo humano|meio ambiente/, "Ciências"],
    [/matematica|fracao|equacao|numero|porcentagem|geometria|medida|calculo/, "Matemática"],
    [/historia|povos indigenas|colonizacao|republica|imperio|escravidao/, "História"],
    [/geografia|mapa|territorio|paisagem|clima|relevo|regiao/, "Geografia"],
    [/portugues|lingua portuguesa|leitura|noticia|texto|poema|alfabetizacao/, "Língua Portuguesa"],
    [/arte|artes visuais|musica|teatro|danca/, "Arte"],
    [/educacao fisica|esporte|movimento corporal|jogo cooperativo/, "Educação Física"]
  ];
  const audiences: Array<[RegExp, string]> = [
    [/autis|\btea\b/, "Estudante autista"],
    [/deficiencia intelectual|\bdi\b/, "Estudante com deficiência intelectual"],
    [/deficiencia visual|baixa visao|cego|cegueira/, "Estudante com deficiência visual"],
    [/deficiencia auditiva|surdo|surdez|libras/, "Estudante surdo ou com deficiência auditiva"],
    [/tdah|atencao sustentada/, "Estudante com TDAH ou necessidade de apoio à atenção"],
    [/altas habilidades|superdotacao/, "Estudante com altas habilidades ou superdotação"],
    [/nao alfabetiz|leitura inicial|ainda nao le/, "Estudante em processo inicial de alfabetização"]
  ];
  const discipline = disciplines.find(([pattern]) => pattern.test(comparable))?.[1];
  const audience = audiences.find(([pattern]) => pattern.test(comparable))?.[1];
  const numericGrade = comparable.match(/(\d{1,2})\s*(?:o|a|º|ª)?\s*(?:ano|serie)/);
  const stageGrade = comparable.match(/educacao infantil|anos iniciais|anos finais|ensino medio|eja/);
  const gradeYear = numericGrade?.[1]
    ? `${numericGrade[1]}º ano/série`
    : stageGrade?.[0]
      ? formatStage(stageGrade[0])
      : undefined;
  const topicMatch = prompt.match(/sobre\s+(.+?)(?:,|\.|\s+para\s+(?:o|a|um|uma|os|as)\s+|\s+com\s+)/i);
  const knowledgeObject = topicMatch?.[1]?.trim() || prompt;
  const needsAudienceClarification = /adapt|personaliz|estudante|aluno|acessibil|necessidade|apoio especifico/.test(comparable);

  return { discipline, gradeYear, knowledgeObject, audience, needsAudienceClarification };
}

function resolveConfirmedContext(
  inferred: InferredContext,
  confirmedAnswers: ClarificationAnswer[]
): { discipline: string; gradeYear: string; audience?: string } {
  const values = new Map(confirmedAnswers.map((item) => [item.key, item.answer]));
  return {
    discipline: inferred.discipline ?? values.get("discipline") ?? "Componente curricular em revisão",
    gradeYear: inferred.gradeYear ?? values.get("gradeYear") ?? "Etapa de ensino em revisão",
    audience: inferred.audience ?? values.get("audience")
  };
}

function normalizeComparable(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
}

function formatStage(stage: string): string {
  const stages: Record<string, string> = {
    "educacao infantil": "Educação Infantil",
    "anos iniciais": "Anos iniciais do Ensino Fundamental",
    "anos finais": "Anos finais do Ensino Fundamental",
    "ensino medio": "Ensino Médio",
    eja: "EJA"
  };
  return stages[stage] ?? stage;
}
