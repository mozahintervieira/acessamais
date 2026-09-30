import type { Metadata } from "next";
import { AppNavigation } from "./app-navigation";
import { WhatsAppContact } from "./whatsapp-contact";
import "./globals.css";
import "./experience.css";

export const metadata: Metadata = {
  title: "ACESSA+ | Mente pedagógica para educação inclusiva",
  description: "Uma IA pedagógica para criar materiais acessíveis, adaptados e alinhados ao currículo."
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
        <WhatsAppContact />
      </body>
    </html>
  );
}
