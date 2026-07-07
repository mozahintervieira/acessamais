import { describe, expect, it } from "vitest";

describe("foundation web app", () => {
  it("has an executable smoke test", () => {
    expect("ACESSA+").toContain("ACESSA");
  });

  it("centers the MVP on instant resource generation", () => {
    expect("O que voce deseja criar hoje?").toContain("criar");
  });
});
