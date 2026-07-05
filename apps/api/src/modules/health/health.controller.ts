import { Controller, Get, Inject } from "@nestjs/common";
import { HealthService, type HealthResponse } from "./health.service.js";

@Controller("health")
export class HealthController {
  @Inject(HealthService)
  private readonly healthService!: HealthService;

  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }
}
