import { randomUUID } from "node:crypto";
import { getPrisma, hasDatabaseUrl } from "./db";
import type { AuthenticatedUser } from "./session";

export type TeacherProfileRecord = {
  name: string;
  email: string;
  professionalRole: string;
  schoolStage: string;
  subjects: string[];
  audiences: string[];
  municipality: string;
  state: string;
  profileImageUrl: string;
  generationPreferences: string;
  onboardingCompleted: boolean;
};

export type SchoolRecord = {
  id: string;
  name: string;
  municipality: string;
  state: string;
  networkType: string;
};

export type ClassroomRecord = {
  id: string;
  name: string;
  grade: string;
  shift: string;
  schoolId?: string;
  studentCount?: string;
  createdAt: string;
};

export type StudentRecord = {
  id: string;
  displayName: string;
  age: string;
  classroomId: string;
  pedagogicalProfile: string;
  supportLevel: string;
  observations: string;
  interests: string;
  preferences: string;
  createdAt: string;
};

type DevTeacherData = {
  profile?: TeacherProfileRecord;
  schools: SchoolRecord[];
  classrooms: ClassroomRecord[];
  students: StudentRecord[];
};

const devData = new Map<string, DevTeacherData>();

export async function getTeacherWorkspace(user: AuthenticatedUser) {
  const [profile, schools, classrooms, students, materialCount] = await Promise.all([
    getTeacherProfileRecord(user),
    listSchools(user),
    listClassrooms(user),
    listStudents(user),
    countMaterials(user)
  ]);

  return {
    user,
    profile,
    schools,
    classrooms,
    students,
    counts: {
      schools: schools.length,
      classrooms: classrooms.length,
      students: students.length,
      materials: materialCount,
      peis: 0,
      favorites: 0
    }
  };
}

export async function getTeacherProfileRecord(user: AuthenticatedUser): Promise<TeacherProfileRecord> {
  if (!hasDatabaseUrl()) {
    return getDevData(user.id).profile ?? emptyProfile(user);
  }

  const profile = await getPrisma().teacherProfile.findUnique({ where: { userId: user.id } });

  return {
    ...emptyProfile(user),
    professionalRole: profile?.professionalRole ?? "",
    schoolStage: profile?.schoolStage ?? "",
    subjects: profile?.subjects ?? [],
    audiences: profile?.audiences ?? [],
    municipality: profile?.municipality ?? "",
    state: profile?.state ?? "",
    profileImageUrl: profile?.profileImageUrl ?? "",
    generationPreferences: profile?.generationPreferences ?? "",
    onboardingCompleted: Boolean(profile?.onboardingCompletedAt)
  };
}

export async function saveTeacherProfileRecord(
  user: AuthenticatedUser,
  input: Partial<TeacherProfileRecord>
): Promise<TeacherProfileRecord> {
  const next = {
    ...emptyProfile(user),
    ...input,
    name: input.name?.trim() || user.name,
    email: user.email,
    subjects: normalizeList(input.subjects),
    audiences: normalizeList(input.audiences)
  };

  if (!hasDatabaseUrl()) {
    getDevData(user.id).profile = next;
    return next;
  }

  const prisma = getPrisma();

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { name: next.name } }),
    prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: {
        professionalRole: next.professionalRole,
        schoolStage: next.schoolStage,
        subjects: next.subjects,
        audiences: next.audiences,
        municipality: next.municipality,
        state: next.state,
        profileImageUrl: next.profileImageUrl,
        generationPreferences: next.generationPreferences,
        onboardingCompletedAt: next.onboardingCompleted ? new Date() : undefined
      },
      create: {
        userId: user.id,
        professionalRole: next.professionalRole,
        schoolStage: next.schoolStage,
        subjects: next.subjects,
        audiences: next.audiences,
        municipality: next.municipality,
        state: next.state,
        profileImageUrl: next.profileImageUrl,
        generationPreferences: next.generationPreferences,
        onboardingCompletedAt: next.onboardingCompleted ? new Date() : undefined
      }
    })
  ]);

  return next;
}

export async function createSchool(user: AuthenticatedUser, input: Partial<SchoolRecord>): Promise<SchoolRecord> {
  const school = {
    id: `school_${randomUUID()}`,
    name: input.name?.trim() || "Escola sem nome",
    municipality: input.municipality?.trim() || "",
    state: input.state?.trim() || "",
    networkType: input.networkType?.trim() || ""
  };

  if (!hasDatabaseUrl()) {
    getDevData(user.id).schools.unshift(school);
    return school;
  }

  const created = await getPrisma().school.create({
    data: {
      name: school.name,
      municipality: school.municipality,
      state: school.state,
      networkType: school.networkType,
      ownerUserId: user.id
    }
  });

  return {
    id: created.id,
    name: created.name,
    municipality: created.municipality ?? "",
    state: created.state ?? "",
    networkType: created.networkType ?? ""
  };
}

export async function listSchools(user: AuthenticatedUser): Promise<SchoolRecord[]> {
  if (!hasDatabaseUrl()) {
    return getDevData(user.id).schools;
  }

  const schools = await getPrisma().school.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" }
  });

  return schools.map((school) => ({
    id: school.id,
    name: school.name,
    municipality: school.municipality ?? "",
    state: school.state ?? "",
    networkType: school.networkType ?? ""
  }));
}

export async function createClassroom(user: AuthenticatedUser, input: Partial<ClassroomRecord>): Promise<ClassroomRecord> {
  const classroom = {
    id: `class_${randomUUID()}`,
    name: input.name?.trim() || "Turma sem nome",
    grade: input.grade?.trim() || "",
    shift: input.shift?.trim() || "",
    schoolId: input.schoolId,
    studentCount: input.studentCount ?? "",
    createdAt: new Date().toISOString()
  };

  if (!hasDatabaseUrl()) {
    getDevData(user.id).classrooms.unshift(classroom);
    return classroom;
  }

  const created = await getPrisma().classroom.create({
    data: {
      name: classroom.name,
      grade: classroom.grade,
      shift: classroom.shift,
      schoolId: classroom.schoolId || null,
      ownerUserId: user.id
    }
  });

  return {
    id: created.id,
    name: created.name,
    grade: created.grade ?? "",
    shift: created.shift ?? "",
    schoolId: created.schoolId ?? undefined,
    createdAt: created.createdAt.toISOString()
  };
}

export async function listClassrooms(user: AuthenticatedUser): Promise<ClassroomRecord[]> {
  if (!hasDatabaseUrl()) {
    return getDevData(user.id).classrooms;
  }

  const classrooms = await getPrisma().classroom.findMany({
    where: { ownerUserId: user.id },
    include: { _count: { select: { students: true } } },
    orderBy: { createdAt: "desc" }
  });

  return classrooms.map((classroom) => ({
    id: classroom.id,
    name: classroom.name,
    grade: classroom.grade ?? "",
    shift: classroom.shift ?? "",
    schoolId: classroom.schoolId ?? undefined,
    studentCount: String(classroom._count.students),
    createdAt: classroom.createdAt.toISOString()
  }));
}

export async function createStudent(user: AuthenticatedUser, input: Record<string, unknown>): Promise<StudentRecord> {
  const student = {
    id: `student_${randomUUID()}`,
    displayName: normalizeText(input.displayName) || "Estudante",
    age: normalizeText(input.age),
    classroomId: normalizeText(input.classroomId),
    pedagogicalProfile: normalizeText(input.pedagogicalProfile),
    supportLevel: normalizeText(input.supportLevel),
    observations: normalizeText(input.observations),
    interests: normalizeText(input.interests),
    preferences: normalizeText(input.preferences),
    createdAt: new Date().toISOString()
  };

  if (!hasDatabaseUrl()) {
    getDevData(user.id).students.unshift(student);
    return student;
  }

  if (student.classroomId) {
    const classroom = await getPrisma().classroom.findFirst({
      where: { id: student.classroomId, ownerUserId: user.id }
    });

    if (!classroom) {
      throw new Error("Turma nao encontrada para este professor.");
    }
  }

  const created = await getPrisma().student.create({
    data: {
      displayName: student.displayName,
      age: student.age ? Number(student.age) : null,
      classroomId: student.classroomId || null,
      pedagogicalProfile: student.pedagogicalProfile,
      supportLevel: student.supportLevel,
      observations: student.observations,
      interests: student.interests,
      preferences: student.preferences,
      createdBy: user.id
    }
  });

  return {
    id: created.id,
    displayName: created.displayName,
    age: created.age ? String(created.age) : "",
    classroomId: created.classroomId ?? "",
    pedagogicalProfile: created.pedagogicalProfile ?? "",
    supportLevel: created.supportLevel ?? "",
    observations: created.observations ?? "",
    interests: created.interests ?? "",
    preferences: created.preferences ?? "",
    createdAt: created.createdAt.toISOString()
  };
}

export async function listStudents(user: AuthenticatedUser): Promise<StudentRecord[]> {
  if (!hasDatabaseUrl()) {
    return getDevData(user.id).students;
  }

  const students = await getPrisma().student.findMany({
    where: { createdBy: user.id },
    orderBy: { createdAt: "desc" }
  });

  return students.map((student) => ({
    id: student.id,
    displayName: student.displayName,
    age: student.age ? String(student.age) : "",
    classroomId: student.classroomId ?? "",
    pedagogicalProfile: student.pedagogicalProfile ?? "",
    supportLevel: student.supportLevel ?? "",
    observations: student.observations ?? "",
    interests: student.interests ?? "",
    preferences: student.preferences ?? "",
    createdAt: student.createdAt.toISOString()
  }));
}

async function countMaterials(user: AuthenticatedUser): Promise<number> {
  if (!hasDatabaseUrl()) {
    return 0;
  }

  return getPrisma().resource.count({ where: { createdByUserId: user.id } });
}

function emptyProfile(user: AuthenticatedUser): TeacherProfileRecord {
  return {
    name: user.name,
    email: user.email,
    professionalRole: "",
    schoolStage: "",
    subjects: [],
    audiences: [],
    municipality: "",
    state: "",
    profileImageUrl: "",
    generationPreferences: "Materiais A4, acessiveis, com comandos objetivos e guia do professor.",
    onboardingCompleted: false
  };
}

function getDevData(userId: string): DevTeacherData {
  const current = devData.get(userId);

  if (current) {
    return current;
  }

  const created = { schools: [], classrooms: [], students: [] };
  devData.set(userId, created);

  return created;
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
  }

  return "";
}
