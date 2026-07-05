import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import type { CreateMissionRequest } from "@acessa-plus/types";
import {
  MissionsService,
  type MissionExecutionResult
} from "./missions.service.js";
import type {
  MissionDetail,
  MissionListItem
} from "./missions.repository.js";

@Controller("missions")
export class MissionsController {
  @Inject(MissionsService)
  private readonly missionsService!: MissionsService;

  @Post()
  createMission(@Body() body: unknown): Promise<MissionExecutionResult> {
    return this.missionsService.execute(body as CreateMissionRequest);
  }

  @Get()
  listMissions(
    @Query("organizationId") organizationId: string
  ): Promise<MissionListItem[]> {
    return this.missionsService.list(organizationId);
  }

  @Get(":id")
  getMission(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ): Promise<MissionDetail> {
    return this.missionsService.getById(organizationId, id);
  }
}
