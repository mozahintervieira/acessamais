import { Controller, Get, Inject } from "@nestjs/common";
import {
  ArchitectureService,
  type ArchitectureBoundaryResponse
} from "./architecture.service.js";

@Controller("architecture")
export class ArchitectureController {
  @Inject(ArchitectureService)
  private readonly architectureService!: ArchitectureService;

  @Get("boundaries")
  getBoundaries(): ArchitectureBoundaryResponse {
    return this.architectureService.getBoundaries();
  }
}
