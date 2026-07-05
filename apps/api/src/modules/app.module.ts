import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module.js";
import { ArchitectureModule } from "./architecture/architecture.module.js";
import { MissionsModule } from "./missions/missions.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { ResourcesModule } from "./resources/resources.module.js";

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    ArchitectureModule,
    MissionsModule,
    ResourcesModule
  ]
})
export class AppModule {}
