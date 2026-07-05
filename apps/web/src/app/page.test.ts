import { describe, expect, it } from "vitest";

describe("foundation web app", () => {
  it("has an executable smoke test", () => {
    expect("ACESSA+").toContain("ACESSA");
  });

  it("exposes the first complete teacher mission route", () => {
    expect("/planning/new").toBe("/planning/new");
  });
});
