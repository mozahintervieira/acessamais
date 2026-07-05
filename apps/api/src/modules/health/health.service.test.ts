import { describe, expect, it } from "vitest";
import { HealthService } from "./health.service.js";

describe("HealthService", () => {
  it("reports the foundation API as healthy", () => {
    expect(new HealthService().getHealth()).toEqual({
      status: "ok",
      service: "acessa-plus-api",
      cycle: "foundation"
    });
  });
});
