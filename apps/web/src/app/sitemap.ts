import type { MetadataRoute } from "next";

const paths = ["", "/cadastro", "/login", "/termos", "/privacidade", "/demonstracoes", "/recuperar-senha"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: `https://acessamais.vercel.app${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6
  }));
}

