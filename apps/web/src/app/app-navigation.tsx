"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/schools", label: "Escolas", icon: "E" },
  { href: "/app", label: "Dashboard", icon: "⌂" },
  { href: "/planning/new", label: "Criar Material", icon: "✎" },
  { href: "/profile", label: "Meu Espaco Pedagogico", icon: "◎" },
  { href: "/classes", label: "Turmas", icon: "▤" },
  { href: "/students", label: "Estudantes", icon: "☺" },
  { href: "/planning/new", label: "PEIs", icon: "◆" },
  { href: "/resources", label: "Biblioteca Pedagogica", icon: "▣" },
  { href: "/missions", label: "Meu Acervo", icon: "▥" },
  { href: "/missions", label: "Minhas Producoes", icon: "▧" },
  { href: "/caa", label: "CAA", icon: "▦" },
  { href: "/#assistiva", label: "Recursos de Acessibilidade", icon: "○" },
  { href: "/#assistiva", label: "Tecnologia Assistiva", icon: "⌁" },
  { href: "/#assistiva", label: "Guia Pedagogico", icon: "?" },
  { href: "/settings", label: "Configuracoes", icon: "⚙" }
];

export function AppNavigation(): React.ReactElement | null {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState(0);

  useEffect(() => {
    document.body.classList.toggle("simpleMode", simpleMode);
    document.body.classList.toggle("highContrastMode", highContrast);
    document.body.dataset.fontScale = String(fontScale);
  }, [simpleMode, highContrast, fontScale]);

  if (pathname === "/") {
    return null;
  }

  if (pathname === "/login" || pathname === "/cadastro") {
    return <a className="publicHomeLink" href="/">ACESSA+</a>;
  }

  async function logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="mindAppHeader">
      <a className="mindAppBrand" href="/app" aria-label="Abrir mente pedagógica ACESSA+"><span>A+</span><strong>ACESSA<span>+</span></strong></a>
      <div className="mindAppCenter"><span className="mindOnlineDot" aria-hidden="true" /> Mente pedagógica ativa</div>
      <div className="mindAppActions">
        <button className="mindAccessButton" type="button" onClick={() => setSimpleMode((value) => !value)} aria-pressed={simpleMode}>Modo simples</button>
        <button className="mindMenuButton" type="button" aria-expanded={isOpen} aria-controls="main-navigation" onClick={() => setIsOpen((current) => !current)}>Abrir menu <span aria-hidden="true">⌄</span></button>
      </div>
      {isOpen ? <div className="mindMenu" id="main-navigation">
        <div className="mindMenuAccessibility"><button type="button" onClick={() => setHighContrast((value) => !value)} aria-pressed={highContrast}>Alto contraste</button><button type="button" onClick={() => setFontScale((value) => Math.min(value + 1, 2))}>A+</button><button type="button" onClick={() => setFontScale((value) => Math.max(value - 1, -1))}>A−</button></div>
        <nav aria-label="Navegação da área do professor">{navItems.map((item) => { const cleanHref = item.href.split("#")[0] || "/"; return <a aria-current={pathname === cleanHref ? "page" : undefined} href={item.href} key={`${item.href}-${item.label}`} onClick={() => setIsOpen(false)}><span aria-hidden="true">{item.icon}</span>{item.label}</a>; })}</nav>
        <button className="mindLogout" type="button" onClick={() => void logout()}>Sair da conta</button>
      </div> : null}
    </header>
  );
}
