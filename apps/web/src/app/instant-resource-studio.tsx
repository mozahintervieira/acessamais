"use client";

import { useMemo, useState } from "react";
import type { CreateMissionRequest, MissionType } from "@acessa-plus/types";
import { saveGeneratedMission } from "./demo-local-store";
import { VisualResourceGrid } from "./visual-resource-grid";

type WorksheetQuestion = {
  command: string;
  support?: string;
  answerSpace?: string;
};

type StudentSheet = {
  title?: string;
  context?: string;
  instructions?: string[];
  baseText?: string;
  didacticBoxes?: string[];
  visualElements?: string[];
  tableRows?: string[];
  questions?: WorksheetQuestion[];
};

type TeacherGuide = {
  skillCode?: string;
  knowledgeObject?: string;
  objectives?: string[];
  methodology?: string[];
  adaptations?: string[];
  duaPrinciples?: string[];
  assessmentCriteria?: string[];
  applicationSuggestions?: string[];
};

type WorksheetPlan = {
  studentSheet?: StudentSheet;
  teacherGuide?: TeacherGuide;
  worksheetTitle?: string;
  subject?: string;
  grade?: string;
  skillCode?: string;
  learningObjective?: string;
  context?: string;
  baseText?: string;
  instructions?: string[];
  questions?: WorksheetQuestion[];
  visualElements?: string[];
  didacticBoxes?: string[];
  tableRows?: string[];
  graphicOrganizers?: string[];
  methodologyTips?: string[];
  difficultyProgression?: string[];
  adaptationNotes?: string[];
  objectives?: string[];
  validationCriteria?: string[];
  reuseSuggestions?: string[];
};

type MissionResult = {
  missionId: string;
  resourceId: string;
  status: "COMPLETED" | "NEEDS_REVIEW";
  pedagogicalPlan: WorksheetPlan;
};

type AdaptationState = {
  enabled: boolean;
  targetAudience: string;
  learningProfile: string;
  supports: string[];
};

const defaultPrompt =
  "Crie uma atividade de Matematica para estudante com Deficiencia Intelectual sobre equacoes do primeiro grau usando a habilidade BNCC EM13MAT401. Gere uma folha A4 pronta para imprimir.";

const quickSuggestions = [
  {
    label: "Atividade pronta para impressao",
    prompt:
      "Crie uma atividade pronta para impressao em A4 de Ciencias sobre ecossistemas para o 7 ano, com contexto, quadro explicativo, atividade visual, tabela, 6 questoes variadas e espacos para resposta."
  },
  {
    label: "Adaptar atividade existente",
    prompt:
      "Adapte uma atividade de leitura sobre noticia para um estudante autista, com comandos objetivos, rotina visual e menor carga de escrita."
  },
  {
    label: "Avaliacao",
    prompt:
      "Gere uma avaliacao de Matematica sobre porcentagem para o 8 ano, com questoes progressivas e gabarito para o professor."
  },
  {
    label: "Plano de aula",
    prompt:
      "Crie um plano de aula curto com atividade imprimivel sobre povos indigenas para o Ensino Medio."
  },
  {
    label: "PEI",
    prompt:
      "Gere um PEI pedagogico para estudante com dificuldade de leitura, com objetivos, apoios e evidencias de aprendizagem."
  },
  {
    label: "Libras",
    prompt:
      "Crie um material com apoio em Libras sobre sinais de saudacao para estudante surdo."
  },
  {
    label: "Braille",
    prompt:
      "Prepare uma atividade de Geografia sobre mapas para estudante com deficiencia visual, com orientacoes para Braille e recurso tatil."
  },
  {
    label: "Prancha de comunicacao",
    prompt:
      "Crie uma prancha de comunicacao CAA para rotina de sala de aula com pictogramas descritos e comandos simples."
  }
];

const targetAudienceOptions = [
  "Deficiencia Intelectual",
  "TEA",
  "Deficiencia Visual",
  "Deficiencia Auditiva",
  "TDAH",
  "Altas Habilidades/Superdotacao",
  "Multiplas Deficiencias",
  "CAA",
  "Libras",
  "Braille"
];

const learningProfileOptions = [
  "Pre-leitor",
  "Leitor inicial",
  "Leitor em desenvolvimento",
  "Leitor funcional",
  "Consolidacao"
];

const supportOptions = [
  "Fonte ampliada",
  "Alto contraste",
  "Imagens/pictogramas",
  "Exemplo resolvido",
  "Frases curtas",
  "Espaco ampliado para resposta",
  "Respostas por marcacao",
  "CAA",
  "Libras",
  "Braille",
  "Material tatil"
];

const adaptationOptions = ["DI", "TEA", "DV", "DA", "TDAH", "AH/SD", "Libras", "Braille", "CAA"];

export function InstantResourceStudio(): React.ReactElement {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [editablePlan, setEditablePlan] = useState<WorksheetPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAdaptations, setShowAdaptations] = useState(false);
  const [showTeacherGuide, setShowTeacherGuide] = useState(false);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [adaptation, setAdaptation] = useState<AdaptationState>({
    enabled: true,
    targetAudience: "Deficiencia Intelectual",
    learningProfile: "Leitor inicial",
    supports: ["Imagens/pictogramas", "Exemplo resolvido", "Frases curtas"]
  });

  const activePlan = editablePlan ?? result?.pedagogicalPlan ?? null;
  const canExport = Boolean(activePlan);

  async function generateResource(nextPrompt = prompt, missionType: MissionType = "CREATE_LESSON_PLAN"): Promise<void> {
    const trimmedPrompt = nextPrompt.trim();

    setMessage(null);
    setError(null);

    if (trimmedPrompt.length < 18) {
      setFollowUp("Informe pelo menos o tema e o tipo de material. Exemplo: atividade de Ciencias sobre ecossistemas para 7 ano.");
      return;
    }

    setFollowUp(null);
    setIsGenerating(true);

    const adaptationSummary = buildAdaptationSummary(adaptation);
    const request: CreateMissionRequest = {
      userId: "demo-teacher",
      organizationId: "demo-organization",
      missionType: adaptation.enabled ? "ADAPT_ACTIVITY" : missionType,
      input: {
        rawPrompt: trimmedPrompt,
        specificNeed: adaptation.enabled ? adaptation.targetAudience : undefined,
        readingWritingLevel: adaptation.enabled ? adaptation.learningProfile : undefined,
        learningPreference: adaptation.enabled
          ? `Perfil Inteligente de Adaptacao: ${adaptationSummary}`
          : undefined,
        accessibilityNeeds: adaptation.enabled
          ? [adaptation.targetAudience, adaptation.learningProfile, ...adaptation.supports]
          : undefined,
        adaptationProfile: adaptation.enabled
          ? {
              enabled: true,
              targetAudience: adaptation.targetAudience,
              learningProfile: adaptation.learningProfile,
              supports: adaptation.supports
            }
          : { enabled: false },
        expectedProductType: "Recurso pedagogico pronto para uso",
        outputFormat: "A4 pronto para impressao",
        contextNotes:
          adaptation.enabled
            ? `Interpretar a solicitacao em linguagem natural e gerar um recurso pedagogico completo, visualmente organizado, pronto para sala de aula e com qualidade editorial. Usar Perfil Inteligente de Adaptacao: ${adaptationSummary}.`
            : "Interpretar a solicitacao em linguagem natural e gerar um recurso pedagogico completo, visualmente organizado, pronto para sala de aula e com qualidade editorial."
      }
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/missions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nao foi possivel gerar o recurso.");
      }

      const payload = (await response.json()) as MissionResult;
      setResult(payload);
      setEditablePlan(payload.pedagogicalPlan);
      saveGeneratedMission({
        missionId: payload.missionId,
        resourceId: payload.resourceId,
        missionType: adaptation.enabled ? "ADAPT_ACTIVITY" : missionType,
        contentJson: payload.pedagogicalPlan,
        prompt: trimmedPrompt
      });
      setIsEditing(false);
      setShowAdaptations(false);
      setShowTeacherGuide(false);
      setMessage("Recurso gerado. Voce ja pode editar, adaptar ou exportar.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erro inesperado ao gerar recurso.");
    } finally {
      setIsGenerating(false);
    }
  }

  function improveResource(): void {
    const improvedPrompt = `${prompt}\n\nMelhore o recurso gerado: deixe mais bonito, mais claro, mais organizado pedagogicamente, com comandos objetivos, contexto, quadros, tabela, elementos visuais, progressao de dificuldade, espacos de resposta e maior qualidade editorial em A4.`;
    setPrompt(improvedPrompt);
    void generateResource(improvedPrompt);
  }

  function adaptResource(option: string): void {
    const adaptedPrompt = `${prompt}\n\nAdapte automaticamente este recurso para ${option}, preservando o objetivo de aprendizagem, aplicando acessibilidade, DUA, linguagem clara e apoios pedagogicos adequados.`;
    setAdaptation((current) => ({
      ...current,
      enabled: true,
      targetAudience: resolveTargetAudience(option)
    }));
    setPrompt(adaptedPrompt);
    void generateResource(adaptedPrompt, "ADAPT_ACTIVITY");
  }

  function toggleSupport(support: string): void {
    setAdaptation((current) => ({
      ...current,
      supports: current.supports.includes(support)
        ? current.supports.filter((item) => item !== support)
        : [...current.supports, support]
    }));
  }

  function copyResource(): void {
    const text = activePlan ? buildCopyText(activePlan) : "";

    if (!text) {
      return;
    }

    void navigator.clipboard.writeText(text);
    setMessage("Recurso copiado.");
  }

  function exportWord(): void {
    const text = activePlan ? buildCopyText(activePlan) : "";
    const blob = new Blob([text], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "recurso-acessa-plus.doc";
    link.click();
    URL.revokeObjectURL(url);
  }

  function shareResource(): void {
    const text = activePlan
      ? `ACESSA+ - ${activePlan.worksheetTitle ?? "recurso pedagogico"}\n${window.location.href}`
      : window.location.href;

    void navigator.clipboard.writeText(text);
    setMessage("Link da demonstracao copiado.");
  }

  function updatePlanField(field: keyof WorksheetPlan, value: string): void {
    setEditablePlan((current) => ({
      ...(current ?? {}),
      [field]: value
    }));
  }

  function updateStudentSheetField(field: keyof StudentSheet, value: string): void {
    setEditablePlan((current) => ({
      ...(current ?? {}),
      studentSheet: {
        ...(current?.studentSheet ?? {}),
        [field]: value
      }
    }));
  }

  function updateQuestions(value: string): void {
    setEditablePlan((current) => ({
      ...(current ?? {}),
      studentSheet: {
        ...(current?.studentSheet ?? {}),
        questions: value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => ({ command: line }))
      },
      questions: value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ command: line }))
    }));
  }

  const questionText = useMemo(
    () => (resolveStudentSheet(activePlan ?? {}).questions ?? []).map((question) => question.command).join("\n"),
    [activePlan]
  );

  return (
    <main className="aiStudioShell">
      <section className="saasHero" aria-labelledby="studio-title">
        <div className="heroTrustBadge">IA pedagogica inclusiva para professores</div>
        <h1 id="studio-title">Crie atividades prontas para imprimir com IA.</h1>
        <p className="studioLead">
          Descreva o que precisa em uma frase. O ACESSA+ transforma habilidade,
          tema e necessidade pedagogica em um recurso A4 profissional para sala
          de aula.
        </p>

        <form
          className="promptComposer"
          onSubmit={(event) => {
            event.preventDefault();
            void generateResource();
          }}
        >
          <textarea
            aria-label="Descreva o recurso pedagogico que deseja criar"
            value={prompt}
            placeholder="Crie uma atividade de Matematica para estudante com Deficiencia Intelectual sobre equacoes do primeiro grau usando a habilidade BNCC EM13MAT401. Gere uma folha A4 pronta para imprimir."
            onChange={(event) => setPrompt(event.currentTarget.value)}
          />
          <button className="generateButton" disabled={isGenerating} type="submit">
            {isGenerating ? "GERANDO..." : "Gerar atividade"}
          </button>
        </form>

        <div className="heroMicrocopy">
          <span>Sem formulario longo</span>
          <span>Folha A4 organizada</span>
          <span>Adaptacao inclusiva</span>
        </div>

        <section className="adaptationComposer" aria-label="Perfil Inteligente de Adaptacao">
          <div className="adaptationQuestion">
            <div>
              <strong>Esta atividade sera adaptada?</strong>
              <span>Use controles rapidos quando precisar de acessibilidade especifica.</span>
            </div>
            <div className="segmentedControl" role="group" aria-label="Escolher se a atividade sera adaptada">
              <button
                className={!adaptation.enabled ? "active" : undefined}
                type="button"
                onClick={() => setAdaptation((current) => ({ ...current, enabled: false }))}
              >
                Nao
              </button>
              <button
                className={adaptation.enabled ? "active" : undefined}
                type="button"
                onClick={() => setAdaptation((current) => ({ ...current, enabled: true }))}
              >
                Sim
              </button>
            </div>
          </div>

          {adaptation.enabled ? (
            <div className="adaptationPanel">
              <ChipGroup
                label="Publico-alvo/necessidade especifica"
                options={targetAudienceOptions}
                selected={adaptation.targetAudience}
                onSelect={(value) =>
                  setAdaptation((current) => ({ ...current, targetAudience: value }))
                }
              />
              <ChipGroup
                label="Perfil de aprendizagem"
                options={learningProfileOptions}
                selected={adaptation.learningProfile}
                onSelect={(value) =>
                  setAdaptation((current) => ({ ...current, learningProfile: value }))
                }
              />
              <MultiChipGroup
                label="Apoios necessarios"
                options={supportOptions}
                selected={adaptation.supports}
                onToggle={toggleSupport}
              />
            </div>
          ) : null}
        </section>

        {followUp ? <p className="followUpQuestion">{followUp}</p> : null}

        <div className="suggestionRail" aria-label="Sugestoes rapidas">
          {quickSuggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => setPrompt(suggestion.prompt)}
            >
              {suggestion.label}
            </button>
          ))}
        </div>

        <div className="heroPreviewWrap" aria-hidden="true">
          <div className="heroWorksheetPreview">
            <div className="previewHeader">
              <strong>ATIVIDADE A4</strong>
              <span>pronta para imprimir</span>
            </div>
            <h2>Equacoes do primeiro grau</h2>
            <p>Resolva cada situacao com atencao. Use o exemplo como apoio.</p>
            <div className="previewVisuals">
              <span>Exemplo guiado</span>
              <span>Espaco para desenho</span>
            </div>
            <ol>
              <li>Observe a equacao e encontre o valor desconhecido.</li>
              <li>Explique como chegou ao resultado.</li>
              <li>Crie uma situacao-problema parecida.</li>
            </ol>
            <footer>acessa+ | educacao inclusiva na pratica</footer>
          </div>
        </div>
      </section>

      <section className="trustStrip" aria-label="Indicadores de valor">
        <div>
          <strong>30 segundos</strong>
          <span>do pedido ao primeiro recurso</span>
        </div>
        <div>
          <strong>A4</strong>
          <span>pronto para imprimir ou adaptar</span>
        </div>
        <div>
          <strong>DUA + BNCC</strong>
          <span>organizado para inclusao real</span>
        </div>
        <div>
          <strong>Sem burocracia</strong>
          <span>linguagem natural, nao formulario</span>
        </div>
      </section>

      <section className={activePlan ? "studioResult visible" : "studioResult"} aria-live="polite">
        <div className="resultActions" aria-label="Acoes do recurso gerado">
          <button type="button" disabled={!canExport} onClick={() => setIsEditing((current) => !current)}>
            Editar
          </button>
          <button type="button" disabled={!canExport || isGenerating} onClick={improveResource}>
            Melhorar
          </button>
          <button type="button" disabled={!canExport} onClick={() => setShowAdaptations((current) => !current)}>
            Adaptar
          </button>
          <button type="button" disabled={!canExport} onClick={() => setShowTeacherGuide((current) => !current)}>
            {showTeacherGuide ? "Ver folha do estudante" : "Ver guia do professor"}
          </button>
          <a className={canExport && result ? "" : "disabledLink"} href={result ? `/missions/${result.missionId}` : "/missions"}>
            Salvar
          </a>
          <button type="button" disabled={!canExport} onClick={() => window.print()}>
            Exportar PDF
          </button>
          <button type="button" disabled={!canExport} onClick={exportWord}>
            Exportar Word
          </button>
          <button type="button" disabled={!canExport} onClick={() => window.print()}>
            Exportar imagem
          </button>
          <button type="button" disabled={!canExport} onClick={shareResource}>
            Compartilhar
          </button>
        </div>

        {showAdaptations ? (
          <div className="adaptPanel">
            {adaptationOptions.map((option) => (
              <button key={option} type="button" onClick={() => adaptResource(option)}>
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {message ? <p className="successMessage">{message}</p> : null}
        {error ? <p className="formError">{error}</p> : null}

        {isEditing && activePlan ? (
          <section className="quickEditor" aria-label="Edicao rapida">
            <label>
              <span>Titulo</span>
              <input
                value={resolveStudentSheet(activePlan).title ?? ""}
                onChange={(event) => {
                  updatePlanField("worksheetTitle", event.currentTarget.value);
                  updateStudentSheetField("title", event.currentTarget.value);
                }}
              />
            </label>
            <label>
              <span>Contexto da folha</span>
              <input
                value={resolveStudentSheet(activePlan).context ?? ""}
                onChange={(event) => updateStudentSheetField("context", event.currentTarget.value)}
              />
            </label>
            <label>
              <span>Questoes</span>
              <textarea rows={5} value={questionText} onChange={(event) => updateQuestions(event.currentTarget.value)} />
            </label>
          </section>
        ) : null}

        {activePlan ? (
          showTeacherGuide ? (
            <TeacherGuideView plan={activePlan} />
          ) : (
            <PrintableWorksheet plan={activePlan} />
          )
        ) : (
          <EmptyPreview isGenerating={isGenerating} />
        )}
      </section>

      <section className="productSections" aria-label="Recursos do ACESSA+">
        <div className="sectionIntro">
          <p className="studioEyebrow">Da ideia ao material pronto</p>
          <h2>Uma plataforma para eliminar horas de producao manual.</h2>
          <p>
            O ACESSA+ nao entrega apenas texto. Ele organiza o recurso como
            material pedagogico: objetivo, comandos, questoes, espacos de
            resposta, acessibilidade e exportacao.
          </p>
        </div>

        <div className="featureGrid">
          <article>
            <span>01</span>
            <strong>Crie por linguagem natural</strong>
            <p>
              Peca uma atividade, avaliacao, PEI, prancha CAA, material em
              Libras ou recurso para Braille sem aprender engenharia de comandos.
            </p>
          </article>
          <article>
            <span>02</span>
            <strong>Receba uma folha A4</strong>
            <p>
              O resultado aparece como documento de professor, com titulo,
              habilidade, objetivo, instrucoes, questoes e espacos para resposta.
            </p>
          </article>
          <article>
            <span>03</span>
            <strong>Adapte com um clique</strong>
            <p>
              Recrie o mesmo objetivo para DI, TEA, DV, DA, TDAH, AH/SD,
              Libras, Braille ou CAA preservando a aprendizagem.
            </p>
          </article>
        </div>
      </section>

      <section className="confidenceBand" aria-label="Confianca pedagogica">
        <div>
          <p className="studioEyebrow">Confianca para demonstracao</p>
          <h2>Feito para parecer simples, estruturado para evoluir.</h2>
        </div>
        <ul>
          <li>Funciona integralmente na publicacao atual, sem depender de sistema externo obrigatorio.</li>
          <li>Compatibilidade mantida para religar o servidor principal no futuro.</li>
          <li>Recursos salvos como materiais reutilizaveis no Banco Inteligente.</li>
          <li>LGPD: sem nome de estudante, escola, turma, data ou professor no A4.</li>
        </ul>
      </section>
    </main>
  );
}

function EmptyPreview({ isGenerating }: { isGenerating: boolean }): React.ReactElement {
  return (
    <article className="emptyWorksheet">
      <span>{isGenerating ? "Criando recurso..." : "Seu material aparecera aqui"}</span>
      <strong>{isGenerating ? "Organizando a folha A4" : "Uma frase pode virar uma atividade pronta para sala."}</strong>
      <p>
        O ACESSA+ transforma uma necessidade pedagogica em material visual, imprimivel e adaptavel.
      </p>
    </article>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onSelect
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}): React.ReactElement {
  return (
    <div className="chipGroup">
      <strong>{label}</strong>
      <div>
        {options.map((option) => (
          <button
            className={selected === option ? "active" : undefined}
            key={option}
            type="button"
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiChipGroup({
  label,
  options,
  selected,
  onToggle
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}): React.ReactElement {
  return (
    <div className="chipGroup">
      <strong>{label}</strong>
      <div>
        {options.map((option) => (
          <button
            className={selected.includes(option) ? "active" : undefined}
            key={option}
            type="button"
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function PrintableWorksheet({ plan }: { plan: WorksheetPlan }): React.ReactElement {
  const sheet = resolveStudentSheet(plan);
  const questions =
    sheet.questions && sheet.questions.length > 0
      ? sheet.questions
      : [{ command: "Responda a questao proposta no espaco indicado." }];

  return (
    <article className="premiumA4Sheet">
      <section className="worksheetTitleBlock">
        <h2>{sheet.title ?? "Atividade pronta para impressao"}</h2>
      </section>

      <section className="worksheetContext">
        <strong>Contexto da atividade</strong>
        <p>
          {sheet.context ??
            sheet.baseText ??
            "Observe as informacoes, leia os apoios visuais e realize cada etapa no seu ritmo."}
        </p>
      </section>

      {(sheet.instructions ?? []).length > 0 ? (
        <section className="worksheetInstructions">
          <strong>Instrucoes</strong>
          <ul>
            {(sheet.instructions ?? []).map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {sheet.baseText ? (
        <section className="worksheetBaseText">
          <strong>Texto-base</strong>
          <p>{sheet.baseText}</p>
        </section>
      ) : null}

      <section className="worksheetBoxes">
        {(sheet.didacticBoxes && sheet.didacticBoxes.length > 0
          ? sheet.didacticBoxes
          : ["Lembrete importante: leia o comando, observe o exemplo e responda no espaco indicado."]
        )
          .slice(0, 2)
          .map((box) => (
            <div key={box}>
              <strong>Quadro de apoio</strong>
              <p>{box}</p>
            </div>
          ))}
      </section>

      <VisualResourceGrid items={sheet.visualElements ?? []} />

      <section className="worksheetTable" aria-label="Tabela da atividade">
        <div>
          <strong>Observe</strong>
          <strong>Organize</strong>
          <strong>Responda</strong>
        </div>
        {(sheet.tableRows && sheet.tableRows.length > 0
          ? sheet.tableRows
          : ["Informacao principal | Ideia importante | Minha resposta"]
        )
          .slice(0, 3)
          .map((row) => {
            const cells = row
              .split("|")
              .map((cell) => cell.trim())
              .filter(Boolean);

            return (
              <div key={row}>
                <span>{cells[0] ?? row}</span>
                <span>{cells[1] ?? ""}</span>
                <span>{cells[2] ?? ""}</span>
              </div>
            );
          })}
      </section>

      <ol className="premiumQuestions">
        {questions.map((question, index) => (
          <li key={`${question.command}-${index}`}>
            <p>{question.command}</p>
            {question.support ? <small>{question.support}</small> : null}
            <div className="premiumAnswerLines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </li>
        ))}
      </ol>

      <footer>acessa+ | educacao inclusiva na pratica - @mozahintervieira</footer>
    </article>
  );
}

function buildCopyText(plan: WorksheetPlan): string {
  const sheet = resolveStudentSheet(plan);

  return [
    sheet.title ?? "Atividade pronta para impressao",
    sheet.context ? `Contexto: ${sheet.context}` : "",
    ...(sheet.instructions ?? []).map((instruction) => `Instrucao: ${instruction}`),
    sheet.baseText ? `Texto-base: ${sheet.baseText}` : "",
    ...(sheet.didacticBoxes ?? []).map((box) => `Quadro de apoio: ${box}`),
    ...(sheet.tableRows ?? []).map((row) => `Tabela: ${row}`),
    ...(sheet.questions ?? []).map((question, index) => `${index + 1}. ${question.command}`),
    "acessa+ | educacao inclusiva na pratica - @mozahintervieira"
  ]
    .filter(Boolean)
    .join("\n\n");
}

function TeacherGuideView({ plan }: { plan: WorksheetPlan }): React.ReactElement {
  const guide = resolveTeacherGuide(plan);

  return (
    <article className="teacherGuide">
      <header>
        <span>Guia do professor</span>
        <h2>{resolveStudentSheet(plan).title ?? "Recurso pedagogico"}</h2>
      </header>
      <GuideSection title="Habilidade BNCC" items={[guide.skillCode ?? plan.skillCode ?? "Nao informada"]} />
      <GuideSection title="Objeto de conhecimento" items={[guide.knowledgeObject ?? "Nao informado"]} />
      <GuideSection title="Objetivos" items={guide.objectives ?? plan.objectives ?? []} />
      <GuideSection title="Metodologia" items={guide.methodology ?? plan.methodologyTips ?? []} />
      <GuideSection title="Adaptacoes realizadas" items={guide.adaptations ?? plan.adaptationNotes ?? []} />
      <GuideSection title="Principios do DUA" items={guide.duaPrinciples ?? ["Oferecer multiplas formas de acesso, participacao e expressao."]} />
      <GuideSection title="Criterios de avaliacao" items={guide.assessmentCriteria ?? plan.validationCriteria ?? []} />
      <GuideSection title="Sugestoes de aplicacao" items={guide.applicationSuggestions ?? plan.reuseSuggestions ?? []} />
    </article>
  );
}

function GuideSection({
  title,
  items
}: {
  title: string;
  items: string[];
}): React.ReactElement | null {
  const cleanItems = items.filter(Boolean);

  if (cleanItems.length === 0) {
    return null;
  }

  return (
    <section>
      <strong>{title}</strong>
      <ul>
        {cleanItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function resolveStudentSheet(plan: WorksheetPlan): StudentSheet {
  return {
    title: plan.studentSheet?.title ?? plan.worksheetTitle,
    context: plan.studentSheet?.context ?? plan.context,
    instructions: plan.studentSheet?.instructions ?? plan.instructions,
    baseText: plan.studentSheet?.baseText ?? plan.baseText,
    didacticBoxes: plan.studentSheet?.didacticBoxes ?? plan.didacticBoxes,
    visualElements: plan.studentSheet?.visualElements ?? plan.visualElements,
    tableRows: plan.studentSheet?.tableRows ?? plan.tableRows,
    questions: plan.studentSheet?.questions ?? plan.questions
  };
}

function resolveTeacherGuide(plan: WorksheetPlan): TeacherGuide {
  return {
    skillCode: plan.teacherGuide?.skillCode ?? plan.skillCode,
    knowledgeObject: plan.teacherGuide?.knowledgeObject,
    objectives: plan.teacherGuide?.objectives ?? plan.objectives,
    methodology: plan.teacherGuide?.methodology ?? plan.methodologyTips,
    adaptations: plan.teacherGuide?.adaptations ?? plan.adaptationNotes,
    duaPrinciples: plan.teacherGuide?.duaPrinciples,
    assessmentCriteria: plan.teacherGuide?.assessmentCriteria ?? plan.validationCriteria,
    applicationSuggestions: plan.teacherGuide?.applicationSuggestions ?? plan.reuseSuggestions
  };
}

function buildAdaptationSummary(adaptation: AdaptationState): string {
  if (!adaptation.enabled) {
    return "atividade sem adaptacao especifica selecionada";
  }

  return [
    `publico-alvo: ${adaptation.targetAudience}`,
    `perfil de aprendizagem: ${adaptation.learningProfile}`,
    `apoios: ${adaptation.supports.join(", ") || "sem apoios adicionais selecionados"}`
  ].join("; ");
}

function resolveTargetAudience(option: string): string {
  const map: Record<string, string> = {
    DI: "Deficiencia Intelectual",
    TEA: "TEA",
    DV: "Deficiencia Visual",
    DA: "Deficiencia Auditiva",
    TDAH: "TDAH",
    "AH/SD": "Altas Habilidades/Superdotacao",
    Libras: "Libras",
    Braille: "Braille",
    CAA: "CAA"
  };

  return map[option] ?? option;
}
