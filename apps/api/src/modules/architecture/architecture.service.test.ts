import { describe, expect, it } from "vitest";
import { ArchitectureService } from "./architecture.service.js";

describe("ArchitectureService", () => {
  it("documents the required independence boundary", () => {
    const result = new ArchitectureService().getBoundaries();

    expect(result.boundaries.map((boundary) => boundary.layer)).toEqual([
      "domain",
      "architecture",
      "infrastructure",
      "interface"
    ]);
  });
});
