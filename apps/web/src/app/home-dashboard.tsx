"use client";

import { useEffect, useMemo, useState } from "react";
import { listLocalMissions, listLocalResources, type LocalMission, type LocalResource } from "./demo-local-store";
import {
  getTeacherProfile,
  listDemoClasses,
  listDemoStudents,
  type TeacherProfile
} from "./teacher-demo-store";

const quickActions = [
  {
    href: "/planning/new",
    icon: "✎",
    title: "Atividade Adaptada",
    text: "Crie folha A4 com apoios, progressao e guia do professor."
  },
  {
    href: "/planning/new",
    icon: "◆",
    title: "PEI",
    text: "Estruture objetivos, apoios e acompanhamento pedagogico."
  },
  {
    href: "/caa",
    icon: "▦",
    title: "CAA",
    text: "Organize comunicacao funcional com responsabilidade pedagogica."
  },
  {
    href: "/resources",
    icon: "▣",
    title: "Biblioteca Pedagogica",
    text: "Reutilize materiais, habilidades e estrategias ja criadas."
  },
  {
    href: "/#assistiva",
    icon: "⌁",
    title: "Tecnologia Assistiva",
    text: "Planeje recursos de acesso, participacao e autonomia."
  }
];

const constructionModules = [
  "PEIs",
  "Recursos de Acessibilidade",
  "Tecnologia Assistiva",
  "Guia Pedagogico"
];

export function HomeDashboard(): React.ReactElement {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [missionList, setMissionList] = useState<LocalMission[]>([]);
  const [resourceList, setResourceList] = useState<LocalResource[]>([]);
  const [classCount, setClassCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    setProfile(getTeacherProfile());
    setMissionList(listLocalMissions());
    setResourceList(listLocalResources());
    setClassCount(listDemoClasses().length);
    setStudentCount(listDemoStudents().length);
  }, []);

  const professorName = profile?.name?.trim() || "professor";
  const recentMaterials = useMemo(() => resourceList.slice(0, 3), [resourceList]);

  return (
    <main className="pedagogicalHome">
      <section className="homeHeroPanel" aria-labelledby="home-title">
        <div className="heroBrandBlock">
          <span className="brandSeal">A+</span>
          <div>
            <p className="brandSignature">Inclui · Transforma · Conecta</p>
            <h1 id="home-title">Bem-vindo ao seu espaço pedagógico, {professorName}.</h1>
            <p>
              O ACESSA+ organiza conhecimento, acessibilidade e inteligência
              pedagógica para criar materiais inclusivos prontos para uso.
            </p>
            <div className="heroActions">
              <a className="primaryButton" href="/planning/new">Criar material</a>
              <a className="secondaryButton" href="/profile">Abrir meu espaço</a>
            </div>
          </div>
        </div>

        <aside className="homeSummaryCard" aria-label="Resumo do espaço pedagógico">
          <strong>Sala de recursos digital</strong>
          <div>
            <span><b>{classCount}</b> turmas</span>
            <span><b>{studentCount}</b> estudantes</span>
            <span><b>{resourceList.length}</b> materiais</span>
            <span><b>{missionList.length}</b> produções</span>
          </div>
        </aside>
      </section>

      <section className="quickAccessSection" aria-labelledby="quick-title">
        <div className="sectionHeaderRow">
          <div>
            <p className="productEyebrow">Acesso rápido</p>
            <h2 id="quick-title">O que você deseja construir hoje?</h2>
          </div>
          <a className="textLink" href="/planning/new">Abrir estúdio de criação</a>
        </div>
        <div className="pedagogicalCards">
          {quickActions.map((action) => (
            <a className="pedagogicalModuleCard" href={action.href} key={action.title}>
              <span aria-hidden="true">{action.icon}</span>
              <strong>{action.title}</strong>
              <p>{action.text}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="homeTwoColumns">
        <article className="continuePanel">
          <div className="sectionHeaderRow">
            <div>
              <p className="productEyebrow">Continuar</p>
              <h2>Materiais recentes</h2>
            </div>
            <a className="textLink" href="/missions">Ver produções</a>
          </div>
          {recentMaterials.length > 0 ? (
            <div className="recentList">
              {recentMaterials.map((resource) => (
                <a href={resource.missionId ? `/missions/${resource.missionId}` : "/missions"} key={resource.id}>
                  <span>{resource.metadata.discipline ?? "Material"}</span>
                  <strong>{resource.title}</strong>
                  <small>{resource.metadata.specificNeed ?? "Recurso pedagógico"}</small>
                </a>
              ))}
            </div>
          ) : (
            <p className="emptyState pedagogicalEmpty">
              Seu acervo pedagógico ainda está começando. Crie ou salve o
              primeiro material.
            </p>
          )}
        </article>

        <article className="constructionPanel" id="assistiva">
          <p className="productEyebrow">Em construção responsável</p>
          <h2>Módulos pedagógicos em evolução</h2>
          <p>
            Estes espaços já fazem parte da arquitetura do ACESSA+, mas serão
            liberados gradualmente com validação pedagógica.
          </p>
          <div className="constructionChips">
            {constructionModules.map((module) => (
              <span key={module}>{module}</span>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
