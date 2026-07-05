CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "OrganizationType" AS ENUM ('SCHOOL', 'UNIVERSITY', 'MUSEUM', 'GOVERNMENT', 'INDEPENDENT');
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEACHER', 'REVIEWER');
CREATE TYPE "MissionType" AS ENUM ('CREATE_LESSON_PLAN', 'ADAPT_ACTIVITY');
CREATE TYPE "MissionStatus" AS ENUM ('DRAFT', 'READY_FOR_ORCHESTRATION', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "ResourceType" AS ENUM ('LESSON_PLAN', 'ADAPTED_ACTIVITY');
CREATE TYPE "ResourceStatus" AS ENUM ('DRAFT', 'VALIDATED', 'ARCHIVED');
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'PASSED', 'WARNING', 'FAILED');
CREATE TYPE "KnowledgeSourceType" AS ENUM ('LAW', 'CURRICULUM', 'GUIDELINE', 'INTERNAL_RESOURCE', 'TEACHER_STRATEGY');
CREATE TYPE "ReliabilityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'OFFICIAL');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "OrganizationType" NOT NULL,
  "region" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "role" "UserRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Mission" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "type" "MissionType" NOT NULL,
  "status" "MissionStatus" NOT NULL DEFAULT 'DRAFT',
  "input" JSONB NOT NULL,
  "profileContext" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Resource" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "missionId" TEXT,
  "type" "ResourceType" NOT NULL,
  "title" TEXT NOT NULL,
  "status" "ResourceStatus" NOT NULL DEFAULT 'DRAFT',
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResourceVersion" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "contentJson" JSONB NOT NULL,
  "contentText" TEXT NOT NULL,
  "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ValidationReport" (
  "id" TEXT NOT NULL,
  "resourceVersionId" TEXT NOT NULL,
  "pedagogicalScore" INTEGER,
  "accessibilityScore" INTEGER,
  "lgpdRiskScore" INTEGER,
  "hallucinationRiskScore" INTEGER,
  "recommendations" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ValidationReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeSource" (
  "id" TEXT NOT NULL,
  "type" "KnowledgeSourceType" NOT NULL,
  "title" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "citation" TEXT,
  "reliabilityLevel" "ReliabilityLevel" NOT NULL,
  "license" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeChunk" (
  "id" TEXT NOT NULL,
  "knowledgeSourceId" TEXT NOT NULL,
  "chunkText" TEXT NOT NULL,
  "metadata" JSONB,
  "embedding" vector,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiProvider" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "configReference" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiCallLog" (
  "id" TEXT NOT NULL,
  "providerId" TEXT,
  "model" TEXT,
  "purpose" TEXT NOT NULL,
  "tokenUsage" JSONB,
  "latencyMs" INTEGER,
  "costEstimate" DECIMAL(65,30),
  "redactedInputHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiCallLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "ResourceVersion_resourceId_versionNumber_key" ON "ResourceVersion"("resourceId", "versionNumber");

CREATE INDEX "Organization_type_idx" ON "Organization"("type");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "Mission_organizationId_status_idx" ON "Mission"("organizationId", "status");
CREATE INDEX "Mission_createdByUserId_idx" ON "Mission"("createdByUserId");
CREATE INDEX "Mission_type_idx" ON "Mission"("type");
CREATE INDEX "Resource_organizationId_type_idx" ON "Resource"("organizationId", "type");
CREATE INDEX "Resource_organizationId_status_idx" ON "Resource"("organizationId", "status");
CREATE INDEX "Resource_createdByUserId_idx" ON "Resource"("createdByUserId");
CREATE INDEX "Resource_missionId_idx" ON "Resource"("missionId");
CREATE INDEX "ResourceVersion_resourceId_idx" ON "ResourceVersion"("resourceId");
CREATE INDEX "ValidationReport_resourceVersionId_idx" ON "ValidationReport"("resourceVersionId");
CREATE INDEX "KnowledgeSource_type_reliabilityLevel_idx" ON "KnowledgeSource"("type", "reliabilityLevel");
CREATE INDEX "KnowledgeChunk_knowledgeSourceId_idx" ON "KnowledgeChunk"("knowledgeSourceId");
CREATE INDEX "AiCallLog_providerId_idx" ON "AiCallLog"("providerId");
CREATE INDEX "AiCallLog_createdAt_idx" ON "AiCallLog"("createdAt");
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceVersion" ADD CONSTRAINT "ResourceVersion_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ValidationReport" ADD CONSTRAINT "ValidationReport_resourceVersionId_fkey" FOREIGN KEY ("resourceVersionId") REFERENCES "ResourceVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_knowledgeSourceId_fkey" FOREIGN KEY ("knowledgeSourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
