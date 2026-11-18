import { Prisma } from "@acessa-plus/database";
import { getPrisma, hasDatabaseUrl } from "./db";

export type UsageEventType =
  | "USER_REGISTERED"
  | "LOGIN"
  | "PROFILE_COMPLETED"
  | "CLASS_CREATED"
  | "STUDENT_CREATED"
  | "MATERIAL_GENERATED"
  | "MATERIAL_SAVED"
  | "MATERIAL_EXPORTED"
  | "MATERIAL_OPENED"
  | "CHAT_GENERATION";

export type ChatGenerationStatus =
  | "SUCCESS"
  | "VALIDATION_REJECTED"
  | "QUALITY_REJECTED"
  | "CURRICULUM_SEARCH_FAILED"
  | "PROVIDER_FAILED"
  | "INCOMPLETE"
  | "EMPTY_RESPONSE"
  | "INTERNAL_ERROR";

export type ChatGenerationMetric = {
  requestId: string;
  model: string;
  requestKind: "CONVERSATION" | "MATERIAL" | "SEQUENCE" | "REVISION";
  status: ChatGenerationStatus;
  statusCode: number;
  durationMs: number;
  messageCount: number;
  attachmentCount: number;
  retried: boolean;
  curriculumSearchCompleted: boolean;
  curriculumStatus?: string;
  officialSourceCount?: number;
  qualityStatus?: "VERIFIED" | "NEEDS_TEACHER_REVIEW";
  qualityIssueCodes?: string[];
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  errorCode?: string;
};

export async function recordUsageEvent(input: {
  userId: string;
  eventType: UsageEventType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!hasDatabaseUrl()) {
    devUsageEvents.push({ ...input, createdAt: new Date().toISOString() });
    return;
  }

  try {
    await getPrisma().usageEvent.create({
      data: {
        userId: input.userId,
        eventType: input.eventType,
        resourceId: input.resourceId,
        metadata: input.metadata ? toPrismaJson(input.metadata) : undefined,
      },
    });
  } catch (error) {
    console.warn("usage_event_not_recorded", {
      eventType: input.eventType,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export async function recordChatGenerationMetric(
  userId: string,
  metric: ChatGenerationMetric,
): Promise<void> {
  await recordUsageEvent({
    userId,
    eventType: "CHAT_GENERATION",
    metadata: {
      schemaVersion: 1,
      ...metric,
    },
  });
}

export async function getChatObservabilitySummary(days = 30) {
  const safeDays = Math.min(Math.max(Math.round(days), 1), 90);
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const events = hasDatabaseUrl()
    ? await getPrisma().usageEvent.findMany({
        where: {
          eventType: "CHAT_GENERATION",
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
        select: { metadata: true, createdAt: true },
      })
    : devUsageEvents
        .filter(
          (event) =>
            event.eventType === "CHAT_GENERATION" &&
            new Date(event.createdAt) >= since,
        )
        .map((event) => ({
          metadata: event.metadata,
          createdAt: new Date(event.createdAt),
        }));

  return summarizeChatMetrics(
    events.map((event) => ({
      metadata: readMetricMetadata(event.metadata),
      createdAt: event.createdAt,
    })),
    safeDays,
  );
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function getUsageSummary(userId?: string) {
  if (!hasDatabaseUrl()) {
    const events = userId
      ? devUsageEvents.filter((event) => event.userId === userId)
      : devUsageEvents;

    return summarizeEvents(events);
  }

  const prisma = getPrisma();
  const [users, classes, students, materials, events] = await Promise.all([
    prisma.user.count(),
    prisma.classroom.count(
      userId ? { where: { ownerUserId: userId } } : undefined,
    ),
    prisma.student.count(userId ? { where: { createdBy: userId } } : undefined),
    prisma.resource.count(
      userId ? { where: { createdByUserId: userId } } : undefined,
    ),
    prisma.usageEvent.findMany({ where: userId ? { userId } : undefined }),
  ]);

  return {
    registeredUsers: users,
    activeTeachers: new Set(events.map((event) => event.userId)).size,
    materialsGenerated: events.filter(
      (event) => event.eventType === "MATERIAL_GENERATED",
    ).length,
    classesCreated: classes,
    studentsCreated: students,
    exports: events.filter((event) => event.eventType === "MATERIAL_EXPORTED")
      .length,
    materials,
  };
}

const devUsageEvents: Array<{
  userId: string;
  eventType: UsageEventType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}> = [];

function summarizeEvents(events: typeof devUsageEvents) {
  return {
    registeredUsers: new Set(
      events
        .filter((event) => event.eventType === "USER_REGISTERED")
        .map((event) => event.userId),
    ).size,
    activeTeachers: new Set(events.map((event) => event.userId)).size,
    materialsGenerated: events.filter(
      (event) => event.eventType === "MATERIAL_GENERATED",
    ).length,
    classesCreated: events.filter(
      (event) => event.eventType === "CLASS_CREATED",
    ).length,
    studentsCreated: events.filter(
      (event) => event.eventType === "STUDENT_CREATED",
    ).length,
    exports: events.filter((event) => event.eventType === "MATERIAL_EXPORTED")
      .length,
    materials: events.filter((event) => event.eventType === "MATERIAL_SAVED")
      .length,
  };
}

function readMetricMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function summarizeChatMetrics(
  events: Array<{ metadata: Record<string, unknown>; createdAt: Date }>,
  days: number,
) {
  const successful = events.filter(
    (event) => event.metadata.status === "SUCCESS",
  );
  const durations = events
    .map((event) => finiteNumber(event.metadata.durationMs))
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);
  const curriculumSearches = events.filter(
    (event) => event.metadata.curriculumSearchCompleted === true,
  );
  const curriculumConfirmed = events.filter(
    (event) =>
      event.metadata.curriculumStatus === "CURRENT_YEAR_DOCUMENT_CITED",
  );
  const qualityMeasured = events.filter(
    (event) => typeof event.metadata.qualityStatus === "string",
  );
  const qualityVerified = events.filter(
    (event) => event.metadata.qualityStatus === "VERIFIED",
  );
  const withCost = events.filter(
    (event) => finiteNumber(event.metadata.estimatedCostUsd) !== undefined,
  );
  const recentFailures = events
    .filter((event) => event.metadata.status !== "SUCCESS")
    .slice(0, 12)
    .map((event) => ({
      occurredAt: event.createdAt.toISOString(),
      requestId: safeText(event.metadata.requestId, 80),
      status: safeText(event.metadata.status, 40),
      errorCode: safeText(event.metadata.errorCode, 80),
      durationMs: finiteNumber(event.metadata.durationMs) ?? 0,
    }));

  const daily = new Map<string, { total: number; successful: number }>();
  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10);
    const current = daily.get(key) ?? { total: 0, successful: 0 };
    current.total += 1;
    if (event.metadata.status === "SUCCESS") current.successful += 1;
    daily.set(key, current);
  }

  return {
    periodDays: days,
    total: events.length,
    successful: successful.length,
    failed: events.length - successful.length,
    successRate: ratio(successful.length, events.length),
    averageLatencyMs: durations.length
      ? Math.round(
          durations.reduce((sum, value) => sum + value, 0) / durations.length,
        )
      : 0,
    p95LatencyMs: percentile(durations, 0.95),
    retried: events.filter((event) => event.metadata.retried === true).length,
    curriculumSearchRate: ratio(curriculumSearches.length, events.length),
    curriculumConfirmedRate: ratio(curriculumConfirmed.length, events.length),
    qualityVerifiedRate: ratio(qualityVerified.length, qualityMeasured.length),
    qualityMeasured: qualityMeasured.length,
    inputTokens: sumField(events, "inputTokens"),
    outputTokens: sumField(events, "outputTokens"),
    totalTokens: sumField(events, "totalTokens"),
    estimatedCostUsd: Number(
      events
        .reduce(
          (sum, event) =>
            sum + (finiteNumber(event.metadata.estimatedCostUsd) ?? 0),
          0,
        )
        .toFixed(6),
    ),
    costCoverage: ratio(withCost.length, events.length),
    daily: [...daily.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, value]) => ({ date, ...value })),
    recentFailures,
    privacy: {
      promptContentStored: false,
      attachmentContentStored: false,
      studentIdentifiersExpected: false,
    },
  };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function safeText(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

function sumField(
  events: Array<{ metadata: Record<string, unknown> }>,
  field: string,
): number {
  return events.reduce(
    (sum, event) => sum + (finiteNumber(event.metadata[field]) ?? 0),
    0,
  );
}

function ratio(part: number, total: number): number {
  return total ? Number((part / total).toFixed(4)) : 0;
}

function percentile(values: number[], fraction: number): number {
  if (!values.length) return 0;
  return (
    values[
      Math.min(Math.ceil(values.length * fraction) - 1, values.length - 1)
    ] ?? 0
  );
}

