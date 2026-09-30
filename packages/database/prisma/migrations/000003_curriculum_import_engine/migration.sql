CREATE TABLE "CurriculumProvider" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "official" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumSource" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "official" BOOLEAN NOT NULL DEFAULT true,
  "accessedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumDocument" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "educationStage" TEXT,
  "modality" TEXT,
  "knowledgeArea" TEXT,
  "subject" TEXT,
  "grade" TEXT,
  "schoolYear" TEXT,
  "publicationYear" INTEGER,
  "officialUrl" TEXT NOT NULL,
  "official" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumDocumentVersion" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "versionLabel" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "localStorageKey" TEXT,
  "publishedAt" TIMESTAMP(3),
  "accessedAt" TIMESTAMP(3),
  "importedAt" TIMESTAMP(3),
  "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "extractionConfidence" DOUBLE PRECISION,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumDocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumImportRun" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "triggerType" TEXT NOT NULL,
  "documentsDiscovered" INTEGER NOT NULL DEFAULT 0,
  "documentsDownloaded" INTEGER NOT NULL DEFAULT 0,
  "documentsSkipped" INTEGER NOT NULL DEFAULT 0,
  "documentsProcessed" INTEGER NOT NULL DEFAULT 0,
  "recordsCreated" INTEGER NOT NULL DEFAULT 0,
  "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
  "recordsRejected" INTEGER NOT NULL DEFAULT 0,
  "reviewIssuesCreated" INTEGER NOT NULL DEFAULT 0,
  "errorSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumImportRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumImportItem" (
  "id" TEXT NOT NULL,
  "importRunId" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "stage" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "extractedTextSize" INTEGER,
  "tableCount" INTEGER,
  "skillCount" INTEGER,
  "warningCount" INTEGER,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumImportItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumSkill" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "normalizedCode" TEXT NOT NULL,
  "officialDescription" TEXT NOT NULL,
  "educationStage" TEXT,
  "grade" TEXT,
  "subject" TEXT,
  "knowledgeArea" TEXT,
  "thematicUnit" TEXT,
  "fieldOfAction" TEXT,
  "trimester" TEXT,
  "schoolYear" TEXT,
  "sourcePage" INTEGER,
  "sourceSection" TEXT,
  "rawSourceText" TEXT,
  "extractionConfidence" DOUBLE PRECISION,
  "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "publicationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "official" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumKnowledgeObject" (
  "id" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "officialText" TEXT NOT NULL,
  "normalizedText" TEXT NOT NULL,
  "sourcePage" INTEGER,
  "sourceSection" TEXT,
  "extractionConfidence" DOUBLE PRECISION,
  "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumKnowledgeObject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumLearningExpectation" (
  "id" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "officialText" TEXT NOT NULL,
  "normalizedText" TEXT NOT NULL,
  "sourcePage" INTEGER,
  "sourceSection" TEXT,
  "extractionConfidence" DOUBLE PRECISION,
  "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumLearningExpectation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumContent" (
  "id" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "title" TEXT,
  "officialText" TEXT NOT NULL,
  "normalizedText" TEXT NOT NULL,
  "sourcePage" INTEGER,
  "sourceSection" TEXT,
  "extractionConfidence" DOUBLE PRECISION,
  "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumGuidance" (
  "id" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "guidanceType" TEXT NOT NULL,
  "officialText" TEXT NOT NULL,
  "trimester" TEXT,
  "schoolYear" TEXT,
  "sourcePage" INTEGER,
  "sourceSection" TEXT,
  "extractionConfidence" DOUBLE PRECISION,
  "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumGuidance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumSkillRelation" (
  "id" TEXT NOT NULL,
  "sourceSkillId" TEXT NOT NULL,
  "targetEntityType" TEXT NOT NULL,
  "targetEntityId" TEXT NOT NULL,
  "relationType" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION,
  "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumSkillRelation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumReviewIssue" (
  "id" TEXT NOT NULL,
  "importRunId" TEXT,
  "documentVersionId" TEXT,
  "skillId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "issueType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "rawValue" TEXT,
  "suggestedValue" TEXT,
  "sourcePage" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "resolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumReviewIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumReviewDecision" (
  "id" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "previousValue" TEXT,
  "approvedValue" TEXT,
  "reviewer" TEXT NOT NULL,
  "reason" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CurriculumReviewDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurriculumProvider_code_key" ON "CurriculumProvider"("code");
CREATE INDEX "CurriculumProvider_status_idx" ON "CurriculumProvider"("status");

CREATE UNIQUE INDEX "CurriculumSource_providerId_sourceUrl_key" ON "CurriculumSource"("providerId", "sourceUrl");
CREATE INDEX "CurriculumSource_providerId_status_idx" ON "CurriculumSource"("providerId", "status");
CREATE INDEX "CurriculumSource_sourceType_idx" ON "CurriculumSource"("sourceType");

CREATE UNIQUE INDEX "CurriculumDocument_providerId_title_documentType_key" ON "CurriculumDocument"("providerId", "title", "documentType");
CREATE UNIQUE INDEX "CurriculumDocument_providerId_slug_key" ON "CurriculumDocument"("providerId", "slug");
CREATE INDEX "CurriculumDocument_providerId_status_idx" ON "CurriculumDocument"("providerId", "status");
CREATE INDEX "CurriculumDocument_educationStage_subject_grade_idx" ON "CurriculumDocument"("educationStage", "subject", "grade");

CREATE UNIQUE INDEX "CurriculumDocumentVersion_documentId_contentHash_key" ON "CurriculumDocumentVersion"("documentId", "contentHash");
CREATE INDEX "CurriculumDocumentVersion_contentHash_idx" ON "CurriculumDocumentVersion"("contentHash");
CREATE INDEX "CurriculumDocumentVersion_documentId_processingStatus_idx" ON "CurriculumDocumentVersion"("documentId", "processingStatus");
CREATE INDEX "CurriculumDocumentVersion_validationStatus_idx" ON "CurriculumDocumentVersion"("validationStatus");

CREATE INDEX "CurriculumImportRun_providerId_status_idx" ON "CurriculumImportRun"("providerId", "status");
CREATE INDEX "CurriculumImportRun_startedAt_idx" ON "CurriculumImportRun"("startedAt");

CREATE INDEX "CurriculumImportItem_importRunId_status_idx" ON "CurriculumImportItem"("importRunId", "status");
CREATE INDEX "CurriculumImportItem_documentVersionId_idx" ON "CurriculumImportItem"("documentVersionId");

CREATE UNIQUE INDEX "CurriculumSkill_documentVersionId_normalizedCode_grade_subject_key" ON "CurriculumSkill"("documentVersionId", "normalizedCode", "grade", "subject");
CREATE INDEX "CurriculumSkill_normalizedCode_idx" ON "CurriculumSkill"("normalizedCode");
CREATE INDEX "CurriculumSkill_grade_subject_idx" ON "CurriculumSkill"("grade", "subject");
CREATE INDEX "CurriculumSkill_providerId_publicationStatus_idx" ON "CurriculumSkill"("providerId", "publicationStatus");
CREATE INDEX "CurriculumSkill_validationStatus_idx" ON "CurriculumSkill"("validationStatus");

CREATE UNIQUE INDEX "CurriculumKnowledgeObject_documentVersionId_normalizedText_sourceSection_key" ON "CurriculumKnowledgeObject"("documentVersionId", "normalizedText", "sourceSection");
CREATE INDEX "CurriculumKnowledgeObject_normalizedText_idx" ON "CurriculumKnowledgeObject"("normalizedText");
CREATE INDEX "CurriculumKnowledgeObject_validationStatus_idx" ON "CurriculumKnowledgeObject"("validationStatus");

CREATE UNIQUE INDEX "CurriculumLearningExpectation_documentVersionId_normalizedText_sourceSection_key" ON "CurriculumLearningExpectation"("documentVersionId", "normalizedText", "sourceSection");
CREATE INDEX "CurriculumLearningExpectation_normalizedText_idx" ON "CurriculumLearningExpectation"("normalizedText");
CREATE INDEX "CurriculumLearningExpectation_validationStatus_idx" ON "CurriculumLearningExpectation"("validationStatus");

CREATE UNIQUE INDEX "CurriculumContent_documentVersionId_normalizedText_sourceSection_key" ON "CurriculumContent"("documentVersionId", "normalizedText", "sourceSection");
CREATE INDEX "CurriculumContent_normalizedText_idx" ON "CurriculumContent"("normalizedText");
CREATE INDEX "CurriculumContent_validationStatus_idx" ON "CurriculumContent"("validationStatus");

CREATE INDEX "CurriculumGuidance_documentVersionId_guidanceType_idx" ON "CurriculumGuidance"("documentVersionId", "guidanceType");
CREATE INDEX "CurriculumGuidance_validationStatus_idx" ON "CurriculumGuidance"("validationStatus");

CREATE UNIQUE INDEX "CurriculumSkillRelation_sourceSkillId_targetEntityType_targetEntityId_relationType_key" ON "CurriculumSkillRelation"("sourceSkillId", "targetEntityType", "targetEntityId", "relationType");
CREATE INDEX "CurriculumSkillRelation_targetEntityType_targetEntityId_idx" ON "CurriculumSkillRelation"("targetEntityType", "targetEntityId");
CREATE INDEX "CurriculumSkillRelation_relationType_idx" ON "CurriculumSkillRelation"("relationType");

CREATE INDEX "CurriculumReviewIssue_status_severity_idx" ON "CurriculumReviewIssue"("status", "severity");
CREATE INDEX "CurriculumReviewIssue_entityType_entityId_idx" ON "CurriculumReviewIssue"("entityType", "entityId");
CREATE INDEX "CurriculumReviewIssue_importRunId_idx" ON "CurriculumReviewIssue"("importRunId");
CREATE INDEX "CurriculumReviewIssue_documentVersionId_idx" ON "CurriculumReviewIssue"("documentVersionId");

CREATE INDEX "CurriculumReviewDecision_issueId_idx" ON "CurriculumReviewDecision"("issueId");
CREATE INDEX "CurriculumReviewDecision_reviewer_idx" ON "CurriculumReviewDecision"("reviewer");

ALTER TABLE "CurriculumSource" ADD CONSTRAINT "CurriculumSource_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "CurriculumProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CurriculumDocument" ADD CONSTRAINT "CurriculumDocument_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "CurriculumProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CurriculumDocument" ADD CONSTRAINT "CurriculumDocument_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CurriculumSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CurriculumDocumentVersion" ADD CONSTRAINT "CurriculumDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CurriculumDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumImportRun" ADD CONSTRAINT "CurriculumImportRun_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "CurriculumProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CurriculumImportItem" ADD CONSTRAINT "CurriculumImportItem_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "CurriculumImportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumImportItem" ADD CONSTRAINT "CurriculumImportItem_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "CurriculumDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumSkill" ADD CONSTRAINT "CurriculumSkill_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "CurriculumProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CurriculumSkill" ADD CONSTRAINT "CurriculumSkill_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "CurriculumDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumKnowledgeObject" ADD CONSTRAINT "CurriculumKnowledgeObject_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "CurriculumDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumLearningExpectation" ADD CONSTRAINT "CurriculumLearningExpectation_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "CurriculumDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumContent" ADD CONSTRAINT "CurriculumContent_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "CurriculumDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumGuidance" ADD CONSTRAINT "CurriculumGuidance_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "CurriculumDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumSkillRelation" ADD CONSTRAINT "CurriculumSkillRelation_sourceSkillId_fkey" FOREIGN KEY ("sourceSkillId") REFERENCES "CurriculumSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumReviewIssue" ADD CONSTRAINT "CurriculumReviewIssue_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "CurriculumImportRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CurriculumReviewIssue" ADD CONSTRAINT "CurriculumReviewIssue_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "CurriculumDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CurriculumReviewIssue" ADD CONSTRAINT "CurriculumReviewIssue_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "CurriculumSkill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CurriculumReviewDecision" ADD CONSTRAINT "CurriculumReviewDecision_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "CurriculumReviewIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
