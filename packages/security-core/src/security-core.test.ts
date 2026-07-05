import { describe, expect, it } from "vitest";
import { assertSameOrganization, roleCan } from "./index.js";

describe("security-core", () => {
  it("keeps role permissions explicit", () => {
    expect(roleCan("TEACHER", "users:manage")).toBe(false);
    expect(roleCan("ADMIN", "users:manage")).toBe(true);
  });

  it("blocks cross-organization access", () => {
    expect(() =>
      assertSameOrganization(
        { organizationId: "org_a" },
        { organizationId: "org_b" }
      )
    ).toThrow("Cross-organization access denied.");
  });
});
