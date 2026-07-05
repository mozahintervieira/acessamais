import { Module } from "@nestjs/common";
import { ResourcesController } from "./resources.controller.js";
import { ResourcesService } from "./resources.service.js";
import { PrismaResourcesRepository } from "./prisma-resources.repository.js";
import { RESOURCES_REPOSITORY } from "./resources.repository.js";

@Module({
  controllers: [ResourcesController],
  providers: [
    ResourcesService,
    PrismaResourcesRepository,
    {
      provide: RESOURCES_REPOSITORY,
      useExisting: PrismaResourcesRepository
    }
  ]
})
export class ResourcesModule {}
