"use client";

import { useEffect, useState } from "react";

type DashboardPayload = {
  user: { name: string; email: string };
  profile: { onboardingCompleted: boolean };
  schools: Array<{ name: string; municipality: string; state: string }>;
  classrooms: Array<{ id: string; name: string; grade: string; shift: string }>;
  students: Array<{ id: string; displayName: string; pedagogicalProfile: string; supportLevel: string }>;
  counts: {
    classrooms: number;
    students: number;
    materials: number;
    peis: number;
    favorites: number;
  };
  usage: {
    materialsGenerated: number;
    classesCreated: number;
    studentsCreated: number;
    exports: number;
  };
};

export function PrivateDashboard(): React.ReactElement {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load(): Promise<void> {
      const response = await fetch("/api/teacher/dashboard");

      if (!response.ok) {
        setError("Nao foi possivel carregar seu painel.");
        return;
      }

      setPayload((await response.json()) as DashboardPayload);
    }

    void load();
  }, []);

  if (error) {
    return <main className="productShell"><p className="formError">{error}</p></main>;
  }

  if (!payload) {
    return <main className="productShell"><p className="emptyState">Carregando seu painel...</p></main>;
  }

  const school = payload.schools[0];

  return (
    <main className="pedagogicalHome">
      <section className="homeHeroPanel">
        <div className="heroBrandBlock">
          <span className="brandSeal">A+</span>
          <div>
            <p className="brandSignature">Inclui · Transforma · Conecta</p>
            <h1>Olá, {payload.user.name}. Seu espaço pedagógico está pronto.</h1>
            <p>
              {school
                ? `${school.name} · ${school.municipality || "municipio nao informado"} ${school.state || ""}`
                : "Complete seu onboarding para vincular escola, turma e estudantes."}
            </p>
            <div className="heroActions">
              <a className="primaryButton" href="/planning/new">Criar Material</a>
              <a className="secondaryButton" href="/onboarding">Completar cadastro</a>
            </div>
          </div>
        </div>
        <aside className="homeSummaryCard">
          <strong>Dados reais do seu uso</strong>
          <div>
            <span><b>{payload.counts.classrooms}</b> turmas</span>
            <span><b>{payload.counts.students}</b> estudantes</span>
            <span><b>{payload.counts.materials}</b> materiais</span>
            <span><b>{payload.counts.peis}</b> PEIs</span>
          </div>
        </aside>
      </section>

      <section className="quickAccessSection">
        <div className="sectionHeaderRow">
          <div>
            <p className="productEyebrow">Continuar de onde parou</p>
            <h2>Próximas ações</h2>
          </div>
        </div>
        <div className="pedagogicalCards">
          <ActionCard href="/schools" title="Escolas" empty={!school} text={!school ? "Cadastre sua escola de atuacao." : "Atualize os dados da escola."} />
          <ActionCard href="/classes" title="Turmas" empty={payload.counts.classrooms === 0} text={payload.counts.classrooms === 0 ? "Você ainda não cadastrou turmas." : "Gerencie suas turmas cadastradas."} />
          <ActionCard href="/students" title="Estudantes" empty={payload.counts.students === 0} text={payload.counts.students === 0 ? "Cadastre estudantes com perfil pedagógico." : "Atualize perfis pedagógicos."} />
          <ActionCard href="/missions" title="Meus Materiais" empty={payload.counts.materials === 0} text={payload.counts.materials === 0 ? "Crie seu primeiro material." : "Abra materiais salvos."} />
          <ActionCard href="/resources" title="Banco Pedagógico" empty={payload.counts.materials === 0} text={payload.counts.materials === 0 ? "Seu Banco Pedagógico ainda está começando." : "Reutilize materiais já criados."} />
          <ActionCard href="/planning/new" title="Criar Material" text="Gerar atividade A4 com o Motor Pedagógico 2.0." />
        </div>
      </section>

      <section className="homeTwoColumns">
        <article className="continuePanel">
          <p className="productEyebrow">Validação do MVP</p>
          <h2>Registro de uso</h2>
          <div className="usageGrid">
            <span>Materiais gerados <b>{payload.usage.materialsGenerated}</b></span>
            <span>Turmas criadas <b>{payload.usage.classesCreated}</b></span>
            <span>Estudantes cadastrados <b>{payload.usage.studentsCreated}</b></span>
            <span>Exportações <b>{payload.usage.exports}</b></span>
          </div>
        </article>
        <article className="constructionPanel">
          <p className="productEyebrow">Privacidade</p>
          <h2>Dados pedagógicos, não prontuário clínico</h2>
          <p>
            Use somente informações necessárias para personalização pedagógica.
            Evite dados clínicos sensíveis sem autorização.
          </p>
        </article>
      </section>
    </main>
  );
}

function ActionCard({
  href,
  title,
  text,
  empty
}: {
  href: string;
  title: string;
  text: string;
  empty?: boolean;
}): React.ReactElement {
  return (
    <a className={empty ? "pedagogicalModuleCard emptyModule" : "pedagogicalModuleCard"} href={href}>
      <span aria-hidden="true">{empty ? "!" : "+"}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </a>
  );
}
