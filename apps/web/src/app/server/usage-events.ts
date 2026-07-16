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
  | "MATERIAL_OPENED";

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

  await getPrisma().usageEvent.create({
    data: {
      userId: input.userId,
      eventType: input.eventType,
      resourceId: input.resourceId,
      metadata: input.metadata ? toPrismaJson(input.metadata) : undefined
    }
  });
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
    prisma.classroom.count(userId ? { where: { ownerUserId: userId } } : undefined),
    prisma.student.count(userId ? { where: { createdBy: userId } } : undefined),
    prisma.resource.count(userId ? { where: { createdByUserId: userId } } : undefined),
    prisma.usageEvent.findMany({ where: userId ? { userId } : undefined })
  ]);

  return {
    registeredUsers: users,
    activeTeachers: new Set(events.map((event) => event.userId)).size,
    materialsGenerated: events.filter((event) => event.eventType === "MATERIAL_GENERATED").length,
    classesCreated: classes,
    studentsCreated: students,
    exports: events.filter((event) => event.eventType === "MATERIAL_EXPORTED").length,
    materials
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
    registeredUsers: new Set(events.filter((event) => event.eventType === "USER_REGISTERED").map((event) => event.userId)).size,
    activeTeachers: new Set(events.map((event) => event.userId)).size,
    materialsGenerated: events.filter((event) => event.eventType === "MATERIAL_GENERATED").length,
    classesCreated: events.filter((event) => event.eventType === "CLASS_CREATED").length,
    studentsCreated: events.filter((event) => event.eventType === "STUDENT_CREATED").length,
    exports: events.filter((event) => event.eventType === "MATERIAL_EXPORTED").length,
    materials: events.filter((event) => event.eventType === "MATERIAL_SAVED").length
  };
}
