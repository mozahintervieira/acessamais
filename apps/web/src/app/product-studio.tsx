"use client";

import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { CreateMissionRequest } from "@acessa-plus/types";
import { saveGeneratedMission } from "./demo-local-store";
import {
  getTeacherProfile,
  listDemoClasses,
  listDemoStudents,
  type DemoClass,
  type DemoStudent,
  type TeacherProfile
} from "./teacher-demo-store";
import { VisualResourceGrid } from "./visual-resource-grid";

type WorksheetQuestion = {
  command: string;
  support?: string;
};

type WorksheetPlan = {
  studentSheet?: {
    title?: string;
    context?: string;
    instructions?: string[];
    baseText?: string;
    didacticBoxes?: string[];
    visualElements?: string[];
    tableRows?: string[];
    questions?: WorksheetQuestion[];
  };
  teacherGuide?: {
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
  worksheetTitle?: string;
  subject?: string;
  grade?: string;
  skillCode?: string;
  learningObjective?: string;
  context?: string;
  baseText?: string;
  instructions?: string[];
  didacticBoxes?: string[];
  tableRows?: string[];
  objectives?: string[];
  visualElements?: string[];
  questions?: WorksheetQuestion[];
};

type MissionResult = {
  missionId: string;
  resourceId: string;
  status: "COMPLETED" | "NEEDS_REVIEW";
  pedagogicalPlan: WorksheetPlan;
};

type StudioForm = {
  materialTypes: string[];
  discipline: string;
  grade: string;
  skillOrObjective: string;
  knowledgeObject: string;
  curriculumReference: string;
  content: string;
  studentProfile: string;
  supportLevel: string;
  activityCount: string;
  visualNeed: string;
  outputFormat: string;
  selectedClassId: string;
  selectedStudentId: string;
  includeImages: boolean;
  includePictograms: boolean;
  includeVisualElements: boolean;
};

const materialTypes = [
  "Atividade Adaptada",
  "Plano de Aula",
  "Avaliacao",
  "PEI",
  "Recurso Acessivel",
  "Sequencia Didatica",
  "Projeto"
];

const defaultForm: StudioForm = {
  materialTypes: ["Atividade Adaptada"],
  discipline: "Matematica",
  grade: "6 ano",
  skillOrObjective: "Resolver situacoes-problema com equacoes simples.",
  knowledgeObject: "Equacoes do primeiro grau",
  curriculumReference: "BNCC + Curriculo do Espirito Santo / SEDU-ES 2026",
  content: "Equacoes do primeiro grau",
  studentProfile: "Deficiencia Intelectual",
  supportLevel: "Apoio moderado",
  activityCount: "5",
  visualNeed: "Elementos visuais simples, exemplo resolvido e espacos amplos para resposta.",
  outputFormat: "Folha A4 e guia do professor",
  selectedClassId: "",
  selectedStudentId: "",
  includeImages: true,
  includePictograms: true,
  includeVisualElements: true
};

export function ProductStudio(): React.ReactElement {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<DemoClass[]>([]);
  const [students, setStudents] = useState<DemoStudent[]>([]);
  const [form, setForm] = useState<StudioForm>(defaultForm);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showTeacherGuide, setShowTeacherGuide] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const sheetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setProfile(getTeacherProfile());
    setClasses(listDemoClasses());
    setStudents(listDemoStudents());
  }, []);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === form.selectedStudentId),
    [form.selectedStudentId, students]
  );

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === form.selectedClassId),
    [form.selectedClassId, classes]
  );

  const selectedPlan = result?.pedagogicalPlan ?? null;

  function updateForm<TKey extends keyof StudioForm>(
    field: TKey,
    value: StudioForm[TKey]
  ): void {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function toggleMaterial(type: string): void {
    setForm((current) => {
      const nextTypes = current.materialTypes.includes(type)
        ? current.materialTypes.filter((item) => item !== type)
        : [...current.materialTypes, type];

      return {
        ...current,
        materialTypes: nextTypes.length > 0 ? nextTypes : ["Atividade Adaptada"]
      };
    });
  }

  async function generateMaterial(): Promise<void> {
    setError(null);
    setMessage(null);
    setIsGenerating(true);
    setGenerationStep(0);

    const prompt = buildPrompt(form, profile, selectedClass, selectedStudent);
    const request: CreateMissionRequest = {
      userId: "demo-teacher",
      organizationId: "demo-organization",
      missionType: form.materialTypes.includes("Atividade Adaptada")
        ? "ADAPT_ACTIVITY"
        : "CREATE_LESSON_PLAN",
      input: {
        rawPrompt: prompt,
        discipline: form.discipline,
        gradeYear: form.grade,
        skill: form.skillOrObjective,
        knowledgeObject: form.knowledgeObject,
        curriculumReference: form.curriculumReference,
        theme: form.content,
        specificNeed: form.studentProfile,
        expectedProductType: form.materialTypes.join(", "),
        outputFormat: form.outputFormat,
        activityType: form.materialTypes[0],
        questionCount: form.activityCount,
        learningPreference: form.visualNeed,
        accessibilityNeeds: [form.studentProfile, form.supportLevel],
        adaptationProfile: {
          enabled: form.materialTypes.includes("Atividade Adaptada"),
          targetAudience: form.studentProfile,
          learningProfile: selectedStudent?.preferences || form.supportLevel,
          supports: [
            form.supportLevel,
            form.includeImages ? "imagens educativas" : "",
            form.includePictograms ? "pictogramas" : "",
            form.includeVisualElements ? "elementos visuais" : ""
          ].filter(Boolean)
        },
        contextNotes: prompt
      }
    };

    try {
      setGenerationStep(1);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/missions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nao foi possivel gerar o material.");
      }

      setGenerationStep(2);
      const payload = (await response.json()) as MissionResult;
      setResult(payload);
      setShowTeacherGuide(false);
      saveGeneratedMission({
        missionId: payload.missionId,
        resourceId: payload.resourceId,
        missionType: request.missionType,
        contentJson: payload.pedagogicalPlan,
        prompt
      });
      setMessage("Material gerado online e salvo em Meus Materiais.");
      setGenerationStep(3);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erro inesperado.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function exportImage(): Promise<void> {
    if (!sheetRef.current) {
      return;
    }

    const dataUrl = await toPng(sheetRef.current, {
      backgroundColor: "#ffffff",
      cacheBust: true,
      pixelRatio: 2
    });
    const link = document.createElement("a");

    link.download = "atividade-acessa-plus-a4.png";
    link.href = dataUrl;
    link.click();
  }

  return (
    <main className="productShell">
      <section className="productHero">
        <div>
          <p className="productEyebrow">Dashboard</p>
          <h1>Crie atividades completas, visuais e prontas para imprimir.</h1>
          <p>
            O ACESSA+ analisa a habilidade, o objeto de conhecimento e o perfil
            do estudante antes de montar a folha A4 com recursos visuais,
            comandos claros e guia do professor.
          </p>
        </div>
        <div className="dashboardStats" aria-label="Resumo da plataforma">
          <span><strong>{classes.length}</strong> turmas</span>
          <span><strong>{students.length}</strong> estudantes</span>
          <span><strong>{profile?.name ? "ativo" : "online"}</strong> perfil</span>
        </div>
      </section>

      <section className="saasGrid" id="criar">
        <form
          className="creatorCard"
          onSubmit={(event) => {
            event.preventDefault();
            void generateMaterial();
          }}
        >
          <div className="sectionHeader">
            <p className="productEyebrow">Criar material</p>
            <h2>Formulario profissional</h2>
            <span>Atividade Adaptada continua como padrao.</span>
          </div>

          <div className="materialPicker">
            {materialTypes.map((type) => (
              <button
                className={form.materialTypes.includes(type) ? "selected" : undefined}
                key={type}
                type="button"
                onClick={() => toggleMaterial(type)}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="formGridPro">
            <Field label="Disciplina" value={form.discipline} onChange={(value) => updateForm("discipline", value)} />
            <Field label="Ano/serie" value={form.grade} onChange={(value) => updateForm("grade", value)} />
            <Field label="Habilidade ou objetivo" value={form.skillOrObjective} onChange={(value) => updateForm("skillOrObjective", value)} wide />
            <Field label="Objeto de conhecimento" value={form.knowledgeObject} onChange={(value) => updateForm("knowledgeObject", value)} />
            <Field label="Referencia curricular" value={form.curriculumReference} onChange={(value) => updateForm("curriculumReference", value)} />
            <Field label="Conteudo" value={form.content} onChange={(value) => updateForm("content", value)} />
            <SelectField label="Turma" value={form.selectedClassId} onChange={(value) => updateForm("selectedClassId", value)} options={[["", "Selecionar depois"], ...classes.map((item) => [item.id, `${item.name} - ${item.grade}`] as [string, string])]} />
            <SelectField label="Estudante" value={form.selectedStudentId} onChange={(value) => updateForm("selectedStudentId", value)} options={[["", "Sem estudante vinculado"], ...students.map((item) => [item.id, item.name] as [string, string])]} />
            <Field label="Perfil do estudante" value={form.studentProfile} onChange={(value) => updateForm("studentProfile", value)} />
            <Field label="Nivel de apoio" value={form.supportLevel} onChange={(value) => updateForm("supportLevel", value)} />
            <Field label="Quantidade de atividades" value={form.activityCount} onChange={(value) => updateForm("activityCount", value)} />
            <Field label="Formato de saida" value={form.outputFormat} onChange={(value) => updateForm("outputFormat", value)} />
            <Field label="Necessidade de imagens/elementos visuais" value={form.visualNeed} onChange={(value) => updateForm("visualNeed", value)} wide />
          </div>

          <div className="visualOptions">
            <Toggle checked={form.includeImages} label="Inserir imagens educativas" onChange={(value) => updateForm("includeImages", value)} />
            <Toggle checked={form.includePictograms} label="Inserir pictogramas" onChange={(value) => updateForm("includePictograms", value)} />
            <Toggle checked={form.includeVisualElements} label="Inserir elementos visuais" onChange={(value) => updateForm("includeVisualElements", value)} />
          </div>

          {error ? <p className="formError">{error}</p> : null}
          {message ? <p className="successMessage">{message}</p> : null}
          {isGenerating ? <GenerationSteps activeStep={generationStep} /> : null}

          <div className="commandBar">
            <div>
              <strong>{form.materialTypes.join(" + ")}</strong>
              <span>{selectedStudent ? `Contexto: ${selectedStudent.name}` : "Sem estudante individual selecionado"}</span>
            </div>
            <button className="primaryButton" disabled={isGenerating} type="submit">
              {isGenerating ? "Gerando..." : "Gerar material"}
            </button>
          </div>
        </form>

        <aside className="previewCard">
          <div className="previewToolbar">
            <span>{showTeacherGuide ? "Guia do professor" : "Folha A4"}</span>
            <div>
              <button disabled={!selectedPlan} type="button" onClick={() => setShowTeacherGuide(false)}>Folha</button>
              <button disabled={!selectedPlan} type="button" onClick={() => setShowTeacherGuide(true)}>Guia</button>
            </div>
          </div>
          <div className="exportBar productExport">
            <button disabled={!selectedPlan} type="button" onClick={() => window.print()}>PDF</button>
            <button disabled={!selectedPlan} type="button" onClick={() => exportWord(selectedPlan)}>Word</button>
            <button disabled={!selectedPlan} type="button" onClick={() => void exportImage()}>Imagem</button>
            {result ? <a className="saveButton" href={`/missions/${result.missionId}`}>Abrir salvo</a> : null}
          </div>

          {selectedPlan ? (
            showTeacherGuide ? <TeacherGuide plan={selectedPlan} /> : <A4Sheet plan={selectedPlan} sheetRef={sheetRef} />
          ) : (
            <div className="blankPreview">
              <strong>Seu material aparecera aqui.</strong>
              <p>Preencha o formulario e gere um recurso com aparencia profissional.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function buildPrompt(
  form: StudioForm,
  profile: TeacherProfile | null,
  selectedClass?: DemoClass,
  selectedStudent?: DemoStudent
): string {
  return [
    `Crie: ${form.materialTypes.join(", ")}.`,
    `Disciplina: ${form.discipline}. Ano/serie: ${form.grade}.`,
    `Habilidade ou objetivo: ${form.skillOrObjective}.`,
    `Objeto de conhecimento: ${form.knowledgeObject}.`,
    `Referencia curricular: ${form.curriculumReference}.`,
    `Conteudo: ${form.content}.`,
    `Perfil do estudante: ${selectedStudent?.profile || form.studentProfile}. Nivel de apoio: ${selectedStudent?.supportLevel || form.supportLevel}.`,
    `Quantidade de atividades: ${form.activityCount}.`,
    `Formato de saida: ${form.outputFormat}.`,
    `Elementos visuais: ${form.visualNeed}. Imagens: ${form.includeImages ? "sim" : "nao"}. Pictogramas: ${form.includePictograms ? "sim" : "nao"}. Elementos visuais: ${form.includeVisualElements ? "sim" : "nao"}.`,
    selectedClass ? `Turma: ${selectedClass.name}, ${selectedClass.grade}, turno ${selectedClass.shift}.` : "",
    selectedStudent ? `Estudante: ${selectedStudent.name}, ${selectedStudent.age} anos. Observacoes pedagogicas: ${selectedStudent.notes}. Recursos: ${selectedStudent.resources}. PEI: ${selectedStudent.pei}. Preferencias: ${selectedStudent.preferences}.` : "",
    profile ? `Preferencias do professor: ${profile.generationPreferences}. Publico atendido: ${profile.audiences.join(", ")}.` : "",
    "Antes de entregar, pesquise pedagogicamente a habilidade, o objeto de conhecimento e a competencia exigida. Use a BNCC como base nacional e considere o Curriculo do Espirito Santo/SEDU-ES quando informado. A atividade precisa avaliar diretamente essa competencia, nao apenas mencionar o tema.",
    "A folha do estudante deve parecer uma folha editorial A4, como material comprado de editora educacional: cabecalho forte, titulo grande, quadro de dica, exemplo resolvido, atividades numeradas, alternativas com caixas de marcacao, linhas para resposta, tabelas, mapas, sequencias, blocos ou esquemas quando fizer sentido.",
    "Escolha a melhor estrutura visual antes de escrever o texto. Para DI use frases curtas, comandos objetivos, exemplo resolvido e progressao pequena. Para DV use alto contraste, fonte ampliada, organizacao limpa e apoio tactil/Braille apenas quando seguro. Para TEA use previsibilidade, etapas e baixa ambiguidade. Para TDAH use blocos curtos e foco visual.",
    "Nao escreva descricao de imagem na folha nem em support. Use nomes de recursos visuais renderizaveis em visualElements, como reta numerica, balanca de equacao, blocos, tabela comparativa, mapa simples, linha do tempo, ciclo, cartoes CAA, personagem lendo, laboratorio, livros, globo ou pictogramas.",
    "O guia do professor deve trazer a analise curricular, habilidade/objetivo, objeto de conhecimento, criterios de avaliacao e justificativa das adaptacoes."
  ]
    .filter(Boolean)
    .join("\n");
}

function GenerationSteps({ activeStep }: { activeStep: number }): React.ReactElement {
  const steps = [
    "Analisando habilidade e objeto de conhecimento",
    "Selecionando estrategia pedagogica e recursos visuais",
    "Montando folha A4 e guia do professor",
    "Salvando no Banco Inteligente"
  ];

  return (
    <div className="generationSteps" aria-live="polite">
      {steps.map((step, index) => (
        <span className={index <= activeStep ? "active" : undefined} key={step}>
          {step}
        </span>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, wide }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }): React.ReactElement {
  return (
    <label className={wide ? "field proWide" : "field"}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }): React.ReactElement {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }): React.ReactElement {
  return (
    <label className="toggleLine">
      <input checked={checked} type="checkbox" onChange={(event) => onChange(event.currentTarget.checked)} />
      <span>{label}</span>
    </label>
  );
}

type SubjectTheme = {
  className: string;
  kind: "language" | "math" | "science" | "geography";
  label: string;
};

function resolveSubjectTheme(subject?: string): SubjectTheme {
  const normalized = (subject ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    normalized.includes("matematica") ||
    normalized.includes("equacao") ||
    normalized.includes("progressao")
  ) {
    return { className: "subjectMath", kind: "math", label: "Matematica" };
  }

  if (
    normalized.includes("quimica") ||
    normalized.includes("ciencia") ||
    normalized.includes("biologia") ||
    normalized.includes("fisica")
  ) {
    return { className: "subjectScience", kind: "science", label: subject ?? "Ciencias" };
  }

  if (
    normalized.includes("geografia") ||
    normalized.includes("historia") ||
    normalized.includes("territorio") ||
    normalized.includes("brasil")
  ) {
    return { className: "subjectGeo", kind: "geography", label: subject ?? "Geografia" };
  }

  return { className: "subjectLanguage", kind: "language", label: subject ?? "Lingua Portuguesa" };
}

function A4Sheet({
  plan,
  sheetRef
}: {
  plan: WorksheetPlan;
  sheetRef: RefObject<HTMLElement | null>;
}): React.ReactElement {
  const sheet = plan.studentSheet ?? {};
  const questions = sheet.questions ?? plan.questions ?? [{ command: "Realize a atividade proposta." }];
  const instructions = sheet.instructions ?? plan.instructions ?? [
    "Leia cada comando com atencao.",
    "Observe os apoios visuais antes de responder."
  ];
  const baseText = sheet.baseText ?? plan.baseText;
  const didacticBoxes = sheet.didacticBoxes ?? plan.didacticBoxes ?? [
    "Observe o exemplo antes de responder."
  ];
  const tableRows = sheet.tableRows ?? plan.tableRows ?? [];
  const visualElements = sheet.visualElements ?? plan.visualElements ?? [
    resolveDefaultVisual(plan.subject, plan.context ?? sheet.context),
    "tabela simples"
  ];
  const theme = resolveSubjectTheme(plan.subject ?? sheet.title);
  const title = sheet.title ?? plan.worksheetTitle ?? "Atividade adaptada";
  const context =
    sheet.context ?? plan.context ?? "Leia com atencao, observe os apoios visuais e realize cada etapa.";
  const supportBox = didacticBoxes[0] ?? "Observe o exemplo antes de responder.";
  const visibleQuestions = questions.slice(0, 6);

  return (
    <article ref={sheetRef} className={`productA4 editorialA4 ${theme.className}`}>
      <header className="studentSheetHeader editorialHeader">
        <strong>{theme.label}</strong>
        <span>{plan.grade ?? "Folha A4 pronta para imprimir"}</span>
      </header>

      <section className="editorialTitleRow">
        <div>
          <span className="activityRibbon">Atividade pronta para imprimir</span>
          <h2>{title}</h2>
          <p>{context}</p>
        </div>
        <WorksheetHeroIllustration kind={theme.kind} />
      </section>

      <section className="editorialTipBox">
        <span aria-hidden="true">!</span>
        <p>{supportBox}</p>
      </section>

      <section className="studentInstructions">
        <strong>Como realizar</strong>
        <ul>
          {instructions.slice(0, 4).map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ul>
      </section>

      {baseText ? (
        <section className="studentBaseText">
          <strong>Texto de apoio</strong>
          <p>{baseText}</p>
        </section>
      ) : null}

      <VisualResourceGrid items={visualElements} />

      <section className="worksheetBoxes">
        {didacticBoxes.slice(1, 4).map((box) => (
          <div key={box}><strong>Apoio</strong><p>{box}</p></div>
        ))}
      </section>

      {tableRows.length > 0 ? <StudentTable rows={tableRows} /> : null}

      <ol className="premiumQuestions editorialActivities">
        {visibleQuestions.map((question, index) => (
          <li className="activityCard" key={`${question.command}-${index}`}>
            <span className="activityNumber">{index + 1}</span>
            <div>
              <p>{question.command}</p>
              {question.support && shouldShowStudentSupport(question.support) ? <small>{question.support}</small> : null}
              <QuestionVisual command={`${question.command} ${question.support ?? ""}`} subjectKind={theme.kind} />
              <QuestionResponseArea command={question.command} index={index} />
            </div>
          </li>
        ))}
      </ol>
      <footer>acessa+ | educacao inclusiva na pratica - @mozahintervieira</footer>
    </article>
  );
}

function shouldShowStudentSupport(value: string): boolean {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  return ![
    "imagem",
    "icone",
    "pictograma",
    "desenho",
    "blocos mostrando",
    "mapa mostrando",
    "tabela para preencher",
    "sequencia ilustrada"
  ].some((prefix) => normalized.startsWith(prefix));
}

function QuestionVisual({
  command,
  subjectKind
}: {
  command: string;
  subjectKind: SubjectTheme["kind"];
}): React.ReactElement {
  const normalized = command.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (normalized.includes("tabela") || normalized.includes("preencha")) {
    return <MiniWorksheetTable />;
  }

  if (
    subjectKind === "math" &&
    (normalized.includes("progressao") || normalized.includes("sequencia") || normalized.includes("razao"))
  ) {
    return <SequenceVisual />;
  }

  if (
    subjectKind === "math" &&
    (normalized.includes("equacao") || normalized.includes("valor de x") || normalized.includes("balanca"))
  ) {
    return <EquationBalanceVisual />;
  }

  if (subjectKind === "science" || normalized.includes("reagente") || normalized.includes("produto")) {
    return <ReactionVisual />;
  }

  if (subjectKind === "geography" || normalized.includes("mapa") || normalized.includes("territorio")) {
    return <MapQuestionVisual />;
  }

  if (subjectKind === "language" || normalized.includes("texto") || normalized.includes("ideia principal")) {
    return <ReadingChoiceVisual />;
  }

  return <GenericActivityVisual />;
}

function EquationBalanceVisual(): React.ReactElement {
  return (
    <div className="questionVisual equationVisual" aria-hidden="true">
      <svg viewBox="0 0 420 120">
        <line x1="210" y1="16" x2="210" y2="96" />
        <line x1="90" y1="42" x2="330" y2="42" />
        <path d="M90 42 L48 96 H132 Z" />
        <path d="M330 42 L288 96 H372 Z" />
        <circle cx="210" cy="14" r="10" />
        <rect x="186" y="96" width="48" height="14" rx="4" />
        <text x="90" y="82">X + 3</text>
        <text x="330" y="82">8</text>
      </svg>
      <div className="visualCaption">Use a balanca para descobrir o valor que falta.</div>
    </div>
  );
}

function SequenceVisual(): React.ReactElement {
  return (
    <div className="questionVisual sequenceVisual" aria-hidden="true">
      {[2, 5, 8, 11, "?"].map((item, index) => (
        <span key={`${item}-${index}`}>{item}</span>
      ))}
      <b>+3</b>
    </div>
  );
}

function ReactionVisual(): React.ReactElement {
  return (
    <div className="questionVisual reactionVisual" aria-hidden="true">
      <span className="chemBlock blue">A</span>
      <strong>+</strong>
      <span className="chemBlock green">B</span>
      <strong>-&gt;</strong>
      <span className="chemBlock mixed">AB</span>
    </div>
  );
}

function MapQuestionVisual(): React.ReactElement {
  return (
    <div className="questionVisual mapQuestionVisual" aria-hidden="true">
      <svg viewBox="0 0 420 150">
        <rect x="10" y="10" width="400" height="130" rx="16" />
        <path d="M80 96 C106 36 180 26 218 68 C246 100 310 68 342 116 C260 132 166 130 80 96 Z" />
        <circle cx="286" cy="98" r="9" />
        <text x="300" y="102">ES</text>
        <path d="M286 98 L336 74" />
      </svg>
    </div>
  );
}

function ReadingChoiceVisual(): React.ReactElement {
  return (
    <div className="questionVisual readingChoiceVisual" aria-hidden="true">
      {["PASSEIO", "DOACAO DE LIVROS", "FUTEBOL"].map((label) => (
        <span key={label}>
          <i />
          {label}
        </span>
      ))}
    </div>
  );
}

function MiniWorksheetTable(): React.ReactElement {
  return (
    <div className="questionVisual miniWorksheetTable" aria-hidden="true">
      <span>PROBLEMA</span>
      <span>EQUACAO</span>
      <span>RESPOSTA</span>
      <i />
      <i />
      <i />
    </div>
  );
}

function GenericActivityVisual(): React.ReactElement {
  return (
    <div className="questionVisual genericActivityVisual" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function QuestionResponseArea({
  command,
  index
}: {
  command: string;
  index: number;
}): React.ReactElement {
  const normalized = command.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (
    normalized.includes("marque") ||
    normalized.includes("alternativa") ||
    normalized.includes("verdadeiro") ||
    normalized.includes("falso")
  ) {
    return (
      <div className="answerChoiceGrid" aria-hidden="true">
        {["A", "B", "C"].map((letter) => (
          <span className="choiceBox" key={`${letter}-${index}`}>
            <i />
            {letter}
          </span>
        ))}
      </div>
    );
  }

  if (normalized.includes("ligue") || normalized.includes("relacione")) {
    return (
      <div className="matchingArea" aria-hidden="true">
        <span />
        <b />
        <span />
        <span />
        <b />
        <span />
      </div>
    );
  }

  if (normalized.includes("complete") || normalized.includes("preencha")) {
    return (
      <div className="fillBlankArea" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    );
  }

  return <div className="premiumAnswerLines"><span /><span /><span /></div>;
}

function WorksheetHeroIllustration({ kind }: { kind: SubjectTheme["kind"] }): React.ReactElement {
  if (kind === "math") {
    return (
      <svg className="worksheetHeroIllustration" viewBox="0 0 220 160" role="img" aria-label="Esquema matematico">
        <rect x="18" y="24" width="184" height="112" rx="22" />
        {[0, 1, 2, 3].map((item) => (
          <g key={item} transform={`translate(${42 + item * 38} 55)`}>
            <rect width="26" height="26" rx="7" />
            <text x="13" y="18">{item + 2}</text>
          </g>
        ))}
        <path d="M54 102 C78 122 120 122 154 102" />
        <path d="M154 102 l-10 -4 l4 10" />
      </svg>
    );
  }

  if (kind === "science") {
    return (
      <svg className="worksheetHeroIllustration" viewBox="0 0 220 160" role="img" aria-label="Laboratorio">
        <rect x="20" y="112" width="180" height="18" rx="4" />
        <path d="M70 28 h34 v20 l34 62 a18 18 0 0 1 -16 26 h-70 a18 18 0 0 1 -16 -26 l34 -62 z" />
        <path d="M52 104 h70" />
        <circle cx="77" cy="88" r="7" />
        <circle cx="96" cy="74" r="5" />
        <rect x="144" y="40" width="18" height="74" rx="8" />
        <rect x="170" y="52" width="18" height="62" rx="8" />
      </svg>
    );
  }

  if (kind === "geography") {
    return (
      <svg className="worksheetHeroIllustration" viewBox="0 0 220 160" role="img" aria-label="Mapa simplificado">
        <circle cx="112" cy="76" r="54" />
        <path d="M72 58 c20 -26 54 -20 72 -6 c-18 12 -20 28 -4 52 c-28 10 -52 2 -70 -18 c12 -6 14 -16 2 -28z" />
        <path d="M72 116 h82" />
        <path d="M112 22 v108" />
        <path d="M58 76 h108" />
        <circle cx="146" cy="96" r="8" />
      </svg>
    );
  }

  return (
    <svg className="worksheetHeroIllustration" viewBox="0 0 220 160" role="img" aria-label="Leitura e escrita">
      <rect x="42" y="78" width="58" height="44" rx="8" />
      <rect x="120" y="78" width="58" height="44" rx="8" />
      <path d="M100 82 c16 -12 32 -12 48 0 v44 c-16 -12 -32 -12 -48 0z" />
      <circle cx="112" cy="42" r="18" />
      <path d="M76 136 h88" />
      <path d="M62 96 h26 M132 96 h26" />
      <path d="M92 52 c-22 10 -34 28 -34 50" />
    </svg>
  );
}

function StudentTable({ rows }: { rows: string[] }): React.ReactElement {
  return (
    <section className="studentTable" aria-label="Tabela da atividade">
      {rows.slice(0, 5).map((row) => {
        const cells = row.split("|").map((cell) => cell.trim()).filter(Boolean);

        return (
          <div key={row}>
            <span>{cells[0] ?? row}</span>
            <span>{cells[1] ?? ""}</span>
            <span>{cells[2] ?? ""}</span>
          </div>
        );
      })}
    </section>
  );
}

function TeacherGuide({ plan }: { plan: WorksheetPlan }): React.ReactElement {
  const guide = plan.teacherGuide ?? {};

  return (
    <article className="teacherGuide productGuide">
      <header>
        <span>Guia do professor</span>
        <h2>{plan.studentSheet?.title ?? plan.worksheetTitle ?? "Material pedagogico"}</h2>
      </header>
      <Guide title="Habilidade/objetivo" items={[guide.skillCode ?? plan.skillCode ?? "Nao informado"]} />
      <Guide title="Analise curricular" items={guide.curricularAnalysis ?? []} />
      <Guide title="Objetivos" items={guide.objectives ?? plan.objectives ?? []} />
      <Guide title="Metodologia" items={guide.methodology ?? []} />
      <Guide title="Adaptacoes" items={guide.adaptations ?? []} />
      <Guide title="DUA" items={guide.duaPrinciples ?? []} />
      <Guide title="Avaliacao" items={guide.assessmentCriteria ?? []} />
      <Guide title="Pesquisa pedagogica realizada" items={guide.curricularAnalysis ?? []} />
    </article>
  );
}

function Guide({ title, items }: { title: string; items: string[] }): React.ReactElement | null {
  const clean = items.filter(Boolean);

  if (clean.length === 0) {
    return null;
  }

  return (
    <section>
      <strong>{title}</strong>
      <ul>{clean.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}

function exportWord(plan: WorksheetPlan | null): void {
  if (!plan) {
    return;
  }

  const text = [
    plan.studentSheet?.title ?? plan.worksheetTitle,
    plan.studentSheet?.context,
    ...(plan.studentSheet?.instructions ?? plan.instructions ?? []),
    plan.studentSheet?.baseText ?? plan.baseText,
    ...(plan.studentSheet?.didacticBoxes ?? plan.didacticBoxes ?? []),
    ...(plan.studentSheet?.tableRows ?? plan.tableRows ?? []),
    ...(plan.studentSheet?.questions ?? plan.questions ?? []).map((question, index) => `${index + 1}. ${question.command}`)
  ]
    .filter(Boolean)
    .join("\n\n");
  const blob = new Blob([text], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "material-acessa-plus.doc";
  link.click();
  URL.revokeObjectURL(url);
}

function resolveDefaultVisual(subject?: string, context?: string): string {
  const source = `${subject ?? ""} ${context ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (source.includes("matematica") || source.includes("equacao")) return "balanca de equacao";
  if (source.includes("ciencia") || source.includes("ecossistema")) return "ciclo com setas";
  if (source.includes("historia")) return "linha do tempo";
  if (source.includes("geografia")) return "mapa simples";
  if (source.includes("portugues") || source.includes("leitura")) return "personagem lendo";

  return "organizador visual";
}
