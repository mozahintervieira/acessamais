import { Injectable } from "@nestjs/common";

export type ArchitectureBoundaryResponse = {
  principle: string;
  boundaries: Array<{
    layer: "domain" | "architecture" | "infrastructure" | "interface";
    responsibility: string;
  }>;
};

@Injectable()
export class ArchitectureService {
  getBoundaries(): ArchitectureBoundaryResponse {
    return {
      principle:
        "Domain, architecture and infrastructure evolve independently.",
      boundaries: [
        {
          layer: "domain",
          responsibility:
            "Contracts and ACESSA+ method concepts without framework dependencies."
        },
        {
          layer: "architecture",
          responsibility:
            "Orchestration contracts and module boundaries without provider lock-in."
        },
        {
          layer: "infrastructure",
          responsibility:
            "NestJS, Next.js, PostgreSQL, Redis and adapters can be replaced."
        },
        {
          layer: "interface",
          responsibility:
            "User experience consumes capabilities; it does not own core rules."
        }
      ]
    };
  }
}
