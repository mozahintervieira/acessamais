import { Module } from "@nestjs/common";
import { MissionsController } from "./missions.controller.js";
import { MissionsService } from "./missions.service.js";
import {
  MISSIONS_REPOSITORY
} from "./missions.repository.js";
import { PrismaMissionsRepository } from "./prisma-missions.repository.js";

@Module({
  controllers: [MissionsController],
  providers: [
    MissionsService,
    PrismaMissionsRepository,
    {
      provide: MISSIONS_REPOSITORY,
      useExisting: PrismaMissionsRepository
    }
  ]
})
export class MissionsModule {}
