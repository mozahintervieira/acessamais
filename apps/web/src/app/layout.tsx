import type { Metadata } from "next";
import { AppNavigation } from "./app-navigation";
import "./globals.css";
import "./experience.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://acessamais.vercel.app"),
  title: "ACESSA+ | Mente pedagógica para educação inclusiva",
  description: "Uma IA pedagógica para criar materiais acessíveis, adaptados e alinhados ao currículo.",
  openGraph: {
    title: "ACESSA+ | Mente pedagógica para educação inclusiva",
    description: "Apoio pedagógico inclusivo para criar, adaptar e revisar materiais com o professor no controle.",
    type: "website"
  }
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

