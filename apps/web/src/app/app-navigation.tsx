"use client";

import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/#criar", label: "Criar" },
  { href: "/profile", label: "Painel do Professor" },
  { href: "/classes", label: "Turmas" },
  { href: "/students", label: "Estudantes" },
  { href: "/resources", label: "Banco Inteligente" },
  { href: "/missions", label: "Meus Materiais" },
  { href: "/settings", label: "Configuracoes" }
];

export function AppNavigation(): React.ReactElement {
  const pathname = usePathname();

  return (
    <aside className="appHeader">
      <a className="brandMark" href="/" aria-label="Ir para o inicio do ACESSA+">
        <span aria-hidden="true">A+</span>
        <strong>ACESSA+</strong>
      </a>
      <nav className="mainNav" aria-label="Navegacao principal">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href.split("#")[0];

          return (
            <a
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "active" : undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
      <div className="sidebarFoot">
        <strong>MVP demo</strong>
        <span>Dados locais, sem login real.</span>
      </div>
    </aside>
  );
}
