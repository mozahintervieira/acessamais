import { Module } from "@nestjs/common";
import { ArchitectureController } from "./architecture.controller.js";
import { ArchitectureService } from "./architecture.service.js";

@Module({
  controllers: [ArchitectureController],
  providers: [ArchitectureService]
})
export class ArchitectureModule {}
