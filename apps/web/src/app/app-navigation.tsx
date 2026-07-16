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

export function AppNavigation(): React.ReactElement {
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

  if (pathname === "/login" || pathname === "/cadastro") {
    return <a className="publicHomeLink" href="/">ACESSA+</a>;
  }

  async function logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <>
      <button
        className="mobileMenuButton"
        type="button"
        aria-expanded={isOpen}
        aria-controls="main-navigation"
        onClick={() => setIsOpen((current) => !current)}
      >
        Menu
      </button>
      <aside className={isOpen ? "appHeader open" : "appHeader"} id="main-navigation">
        <a className="brandMark" href="/" aria-label="Ir para o inicio do ACESSA+">
          <span aria-hidden="true">A+</span>
          <div>
            <strong>ACESSA+</strong>
            <small>Inclui · Transforma · Conecta</small>
          </div>
        </a>

        <div className="accessibilityBar" aria-label="Barra de acessibilidade">
          <button type="button" onClick={() => setSimpleMode((value) => !value)}>
            Modo simples
          </button>
          <button type="button" onClick={() => setHighContrast((value) => !value)}>
            Alto contraste
          </button>
          <button type="button" onClick={() => setFontScale((value) => Math.min(value + 1, 2))}>
            A+
          </button>
          <button type="button" onClick={() => setFontScale((value) => Math.max(value - 1, -1))}>
            A-
          </button>
        </div>

        <nav className="mainNav" aria-label="Navegacao principal">
          {navItems.map((item) => {
            const cleanHref = item.href.split("#")[0] || "/";
            const isActive = pathname === cleanHref;

            return (
              <a
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "active" : undefined}
                href={item.href}
                key={`${item.href}-${item.label}`}
                onClick={() => setIsOpen(false)}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="sidebarFoot">
          <strong>Ambiente online</strong>
          <span>Motor Pedagogico 2.0 ativo para testes com professores.</span>
          <button type="button" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
