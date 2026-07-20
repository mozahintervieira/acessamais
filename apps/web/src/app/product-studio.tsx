"use client";

import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CreateMissionRequest } from "@acessa-plus/types";
import { StudentSheetRenderer } from "./student-sheet-renderer";

type WorksheetQuestion = {
  plannedTaskOrder?: number;
  actionType?: string;
  pedagogicalPurpose?: string;
  cognitiveDemand?: string;
  responseMode?: string;
  supportRequired?: string[];
  visualFunction?: string;
  successCriterion?: string;
  instruction?: string;
  content?: string;
  command: string;
  support?: string;
  answerSpace?: string;
};

export type WorksheetPlan = {
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
  worksheets?: WorksheetResult[];
};

export type WorksheetResult = {
  worksheetId: string;
  worksheetOrder: number;
  worksheetBlueprintId: string;
  title: string;
  objective: string;
  strategy: string;
  pedagogicalPurpose: string;
  studentSheet: WorksheetPlan["studentSheet"];
  teacherGuide: WorksheetPlan["teacherGuide"];
  validationStatus: "VALID" | "NEEDS_REVIEW";
  validationIssues: string[];
  regenerationCount: number;
};

type MissionResult = {
  missionId: string;
  resourceId: string;
  status: "COMPLETED" | "NEEDS_REVIEW";
  pedagogicalPlan: WorksheetPlan;
};

type StudioUser = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
};

type StudioProfile = {
  name: string;
  email: string;
  audiences: string[];
  generationPreferences: string;
};

type StudioClass = {
  id: string;
  name: string;
  grade: string;
  shift: string;
};

type StudioStudent = {
  id: string;
  name: string;
  age: string;
  grade: string;
  profile: string;
  notes: string;
  supportLevel: string;
  resources: string;
  preferences: string;
};

type TeacherDashboardPayload = {
  user: StudioUser;
  profile: StudioProfile;
  classrooms: StudioClass[];
  students: Array<{
    id: string;
    displayName: string;
    age: string;
    classroomId: string;
    pedagogicalProfile: string;
    supportLevel: string;
    observations: string;
    interests: string;
    preferences: string;
  }>;
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
  const [user, setUser] = useState<StudioUser | null>(null);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [classes, setClasses] = useState<StudioClass[]>([]);
  const [students, setStudents] = useState<StudioStudent[]>([]);
  const [form, setForm] = useState<StudioForm>(defaultForm);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showTeacherGuide, setShowTeacherGuide] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [selectedWorksheetIndex, setSelectedWorksheetIndex] = useState(0);
  const [printAllSheets, setPrintAllSheets] = useState(false);
  const sheetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    async function loadWorkspace(): Promise<void> {
      try {
        const response = await fetch("/api/teacher/dashboard");

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? "Nao foi possivel carregar seu espaco pedagogico.");
        }

        const payload = (await response.json()) as TeacherDashboardPayload;

        setUser(payload.user);
        setProfile(payload.profile);
        setClasses(payload.classrooms);
        setStudents(payload.students.map(mapStudentForStudio));
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Nao foi possivel carregar seu espaco pedagogico."
        );
      }
    }

    void loadWorkspace();
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
  const worksheets = useMemo(() => resolveWorksheetCollection(selectedPlan), [selectedPlan]);
  const selectedWorksheet = worksheets[selectedWorksheetIndex] ?? worksheets[0] ?? null;
  const selectedWorksheetPlan = selectedPlan && selectedWorksheet
    ? buildWorksheetPlanForPreview(selectedPlan, selectedWorksheet)
    : selectedPlan;

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
      userId: user?.id ?? "",
      organizationId: user?.organizationId ?? "",
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
      setSelectedWorksheetIndex(0);
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

  function printAllWorksheets(): void {
    setPrintAllSheets(true);
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => setPrintAllSheets(false), 500);
    }, 0);
  }

  return (
    <main className="productShell">
      <section className="productHero">
        <div>
          <p className="productEyebrow">Estudio de criacao</p>
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
            <h2>Material pedagogico</h2>
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
            <Field
              hint="Informe quantas folhas A4 diferentes o ACESSA+ deve criar."
              label="Quantidade de folhas A4"
              value={form.activityCount}
              onChange={(value) => updateForm("activityCount", value)}
            />
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
            <span>
              {showTeacherGuide ? "Guia do professor" : "Folha A4"}
              {selectedWorksheet ? ` - Folha ${selectedWorksheet.worksheetOrder} de ${worksheets.length}` : ""}
            </span>
            <div>
              <button disabled={!selectedWorksheetPlan} type="button" onClick={() => setShowTeacherGuide(false)}>Folha</button>
              <button disabled={!selectedWorksheetPlan} type="button" onClick={() => setShowTeacherGuide(true)}>Guia</button>
            </div>
          </div>
          {selectedPlan && worksheets.length > 0 ? (
            <div className="worksheetNavigator" aria-label="Navegação entre folhas A4">
              <button
                disabled={selectedWorksheetIndex === 0}
                type="button"
                onClick={() => setSelectedWorksheetIndex((current) => Math.max(0, current - 1))}
              >
                Anterior
              </button>
              <div className="worksheetTabs">
                {worksheets.map((worksheet, index) => (
                  <button
                    aria-current={index === selectedWorksheetIndex ? "page" : undefined}
                    key={worksheet.worksheetId}
                    type="button"
                    onClick={() => setSelectedWorksheetIndex(index)}
                  >
                    {worksheet.worksheetOrder}
                  </button>
                ))}
              </div>
              <button
                disabled={selectedWorksheetIndex >= worksheets.length - 1}
                type="button"
                onClick={() => setSelectedWorksheetIndex((current) => Math.min(worksheets.length - 1, current + 1))}
              >
                Próxima
              </button>
              {selectedWorksheet ? (
                <span className={selectedWorksheet.validationStatus === "VALID" ? "worksheetStatus valid" : "worksheetStatus review"}>
                  {selectedWorksheet.validationStatus === "VALID" ? "Folha validada" : "Revisão interna necessária"}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="exportBar productExport">
            <button disabled={!selectedWorksheetPlan} type="button" onClick={() => window.print()}>PDF atual</button>
            <button disabled={!selectedPlan || worksheets.length === 0} type="button" onClick={printAllWorksheets}>PDF todas</button>
            <button disabled={!selectedPlan} type="button" onClick={() => exportWord(selectedPlan, worksheets, true)}>Word</button>
            <button disabled={!selectedWorksheetPlan} type="button" onClick={() => void exportImage()}>Imagem atual</button>
            {result ? <a className="saveButton" href={`/missions/${result.missionId}`}>Abrir salvo</a> : null}
          </div>

          {selectedWorksheetPlan ? (
            showTeacherGuide ? <TeacherGuide plan={selectedWorksheetPlan} /> : <StudentSheetRenderer plan={selectedWorksheetPlan} sheetRef={sheetRef} />
          ) : (
            <div className="blankPreview">
              <strong>Seu material aparecera aqui.</strong>
              <p>Preencha o formulario e gere um recurso com aparencia profissional.</p>
            </div>
          )}
          {selectedPlan && printAllSheets ? (
            <div className="printWorksheetStack" aria-hidden={!printAllSheets}>
              {worksheets.map((worksheet) => (
                <StudentSheetRenderer
                  key={worksheet.worksheetId}
                  plan={buildWorksheetPlanForPreview(selectedPlan, worksheet)}
                />
              ))}
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function buildPrompt(
  form: StudioForm,
  profile: StudioProfile | null,
  selectedClass?: StudioClass,
  selectedStudent?: StudioStudent
): string {
  return [
    `Crie: ${form.materialTypes.join(", ")}.`,
    `Disciplina: ${form.discipline}. Ano/serie: ${form.grade}.`,
    `Habilidade ou objetivo: ${form.skillOrObjective}.`,
    `Objeto de conhecimento: ${form.knowledgeObject}.`,
    `Referencia curricular: ${form.curriculumReference}.`,
    `Conteudo: ${form.content}.`,
    `Perfil do estudante: ${selectedStudent?.profile || form.studentProfile}. Nivel de apoio: ${selectedStudent?.supportLevel || form.supportLevel}.`,
    `Quantidade de folhas A4: ${form.activityCount}. Cada folha deve ter identidade propria, estrategia diferente, recursos diferentes e progressao cognitiva diferente.`,
    `Formato de saida: ${form.outputFormat}.`,
    `Elementos visuais: ${form.visualNeed}. Imagens: ${form.includeImages ? "sim" : "nao"}. Pictogramas: ${form.includePictograms ? "sim" : "nao"}. Elementos visuais: ${form.includeVisualElements ? "sim" : "nao"}.`,
    selectedClass ? `Turma: ${selectedClass.name}, ${selectedClass.grade}, turno ${selectedClass.shift}.` : "",
    selectedStudent ? `Estudante: ${selectedStudent.name}, ${selectedStudent.age} anos. Observacoes pedagogicas: ${selectedStudent.notes}. Recursos: ${selectedStudent.resources}. Preferencias: ${selectedStudent.preferences}.` : "",
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

function mapStudentForStudio(student: TeacherDashboardPayload["students"][number]): StudioStudent {
  return {
    id: student.id,
    name: student.displayName,
    age: student.age,
    grade: "",
    profile: student.pedagogicalProfile,
    notes: student.observations,
    supportLevel: student.supportLevel,
    resources: student.interests,
    preferences: student.preferences
  };
}

function GenerationSteps({ activeStep }: { activeStep: number }): React.ReactElement {
  const steps = [
    "Organizando o planejamento pedagogico e preparando seu material",
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

function Field({
  label,
  value,
  onChange,
  wide,
  hint
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  hint?: string;
}): React.ReactElement {
  return (
    <label className={wide ? "field proWide" : "field"}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.currentTarget.value)} />
      {hint ? <small>{hint}</small> : null}
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

export function resolveWorksheetCollection(plan: WorksheetPlan | null): WorksheetResult[] {
  if (!plan) {
    return [];
  }

  if (Array.isArray(plan.worksheets) && plan.worksheets.length > 0) {
    return plan.worksheets
      .filter((worksheet): worksheet is WorksheetResult => Boolean(worksheet?.studentSheet))
      .sort((left, right) => left.worksheetOrder - right.worksheetOrder);
  }

  return [{
    worksheetId: "worksheet_1",
    worksheetOrder: 1,
    worksheetBlueprintId: "legacy_worksheet_1",
    title: plan.studentSheet?.title ?? plan.worksheetTitle ?? "Atividade pronta para imprimir",
    objective: plan.learningObjective ?? "Desenvolver a aprendizagem prevista.",
    strategy: "Atividade guiada",
    pedagogicalPurpose: "atividade principal",
    studentSheet: plan.studentSheet,
    teacherGuide: plan.teacherGuide,
    validationStatus: "VALID",
    validationIssues: [],
    regenerationCount: 0
  }];
}

export function buildWorksheetPlanForPreview(
  plan: WorksheetPlan,
  worksheet: WorksheetResult
): WorksheetPlan {
  return {
    ...plan,
    worksheetTitle: worksheet.title,
    learningObjective: worksheet.objective,
    studentSheet: worksheet.studentSheet,
    teacherGuide: worksheet.teacherGuide
  };
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

function exportWord(plan: WorksheetPlan | null, worksheets: WorksheetResult[] = [], allSheets = false): void {
  if (!plan) {
    return;
  }

  const text = buildWordExportText(plan, worksheets, allSheets);
  const blob = new Blob([text], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "material-acessa-plus.doc";
  link.click();
  URL.revokeObjectURL(url);
}

export function buildWordExportText(
  plan: WorksheetPlan,
  worksheets: WorksheetResult[] = [],
  allSheets = false
): string {
  const collection = allSheets && worksheets.length > 0
    ? worksheets.map((worksheet) => buildWorksheetPlanForPreview(plan, worksheet))
    : [plan];

  return collection
    .map((worksheetPlan, index) => [
      `FOLHA ${index + 1}`,
      worksheetPlan.studentSheet?.title ?? worksheetPlan.worksheetTitle,
      worksheetPlan.studentSheet?.context,
      ...(worksheetPlan.studentSheet?.instructions ?? worksheetPlan.instructions ?? []),
      worksheetPlan.studentSheet?.baseText ?? worksheetPlan.baseText,
      ...(worksheetPlan.studentSheet?.didacticBoxes ?? worksheetPlan.didacticBoxes ?? []),
      ...(worksheetPlan.studentSheet?.tableRows ?? worksheetPlan.tableRows ?? []),
      ...(worksheetPlan.studentSheet?.questions ?? worksheetPlan.questions ?? []).map((question, questionIndex) =>
        `${questionIndex + 1}. ${question.command}`
      )
    ]
      .filter(Boolean)
      .join("\n\n"))
    .join("\n\n--- QUEBRA DE FOLHA ---\n\n");
}
