import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import {
  ResourcesService
} from "./resources.service.js";
import type {
  ResourceListItem,
  ResourceVersionResult
} from "./resources.repository.js";

@Controller("resources")
export class ResourcesController {
  @Inject(ResourcesService)
  private readonly resourcesService!: ResourcesService;

  @Get()
  listResources(@Query() query: unknown): Promise<ResourceListItem[]> {
    return this.resourcesService.listResources(query);
  }

  @Get(":resourceId/versions")
  listVersions(
    @Param("resourceId") resourceId: string,
    @Query("organizationId") organizationId: string
  ): Promise<ResourceVersionResult[]> {
    return this.resourcesService.listVersions(organizationId, resourceId);
  }

  @Post(":resourceId/versions")
  createVersion(
    @Param("resourceId") resourceId: string,
    @Body() body: unknown
  ): Promise<ResourceVersionResult> {
    return this.resourcesService.createVersion({
      ...(typeof body === "object" && body !== null ? body : {}),
      resourceId
    });
  }
}
