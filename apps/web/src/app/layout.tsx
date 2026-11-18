import type { Metadata } from "next";
import { AppNavigation } from "./app-navigation";
import "./globals.css";
import "./experience.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://acessamais.vercel.app"),
  title: "ACESSA+ | Mente pedagógica para educação inclusiva",
  description:
    "Uma IA pedagógica para criar materiais acessíveis, adaptados e alinhados ao currículo.",
  openGraph: {
    title: "ACESSA+ | Mente pedagógica para educação inclusiva",
    description:
      "Apoio pedagógico inclusivo para criar, adaptar e revisar materiais com o professor no controle.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="pt-BR">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(!('serviceWorker' in navigator))return;window.addEventListener('load',function(){navigator.serviceWorker.getRegistrations().then(function(registrations){return Promise.all(registrations.map(function(registration){return registration.unregister();}));}).then(function(){if(!('caches' in window))return;return caches.keys().then(function(keys){return Promise.all(keys.map(function(key){return caches.delete(key);}));});}).catch(function(){});});})();`,
          }}
        />
      </head>
      <body>
        <AppNavigation />
        {children}
      </body>
    </html>
  );
}
