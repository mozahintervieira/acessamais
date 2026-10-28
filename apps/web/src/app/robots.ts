import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/cadastro", "/login", "/termos", "/privacidade", "/demonstracoes"],
      disallow: ["/api/", "/app", "/onboarding", "/missions", "/resources", "/students", "/classes", "/schools", "/profile", "/settings", "/planning"]
    },
    sitemap: "https://acessamais.vercel.app/sitemap.xml"
  };
}

