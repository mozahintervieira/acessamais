import type { Metadata } from "next";
import { AppNavigation } from "./app-navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACESSA+",
  description: "Infraestrutura de Inteligencia Inclusiva"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="pt-BR">
      <body>
        <AppNavigation />
        {children}
      </body>
    </html>
  );
}
