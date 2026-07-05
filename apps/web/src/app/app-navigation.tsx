"use client";

import { usePathname } from "next/navigation";

const navItems = [
  { href: "/planning/new", label: "Nova missao" },
  { href: "/missions", label: "Missoes" },
  { href: "/resources", label: "Banco Inteligente" },
  { href: "/resources#recursos", label: "Recursos" }
];

export function AppNavigation(): React.ReactElement {
  const pathname = usePathname();

  return (
    <header className="appHeader">
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
    </header>
  );
}
