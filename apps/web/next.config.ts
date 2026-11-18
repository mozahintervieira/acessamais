import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return ["/", "/app", "/login", "/cadastro"].map((source) => ({
      source,
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, max-age=0, must-revalidate",
        },
      ],
    }));
  },
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  outputFileTracingIncludes: {
    "/*": [
      "../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*",
      "../../node_modules/.prisma/client/**/*",
    ],
  },
  serverExternalPackages: ["@acessa-plus/database", "@prisma/client"],
};

export default nextConfig;
