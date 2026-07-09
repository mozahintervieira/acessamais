"use client";

export type TeacherProfile = {
  name: string;
  photoUrl: string;
  email: string;
  school: string;
  city: string;
  state: string;
  teachingStage: string;
  subjects: string;
  audiences: string[];
  generationPreferences: string;
};

export type DemoClass = {
  id: string;
  name: string;
  grade: string;
  shift: string;
  studentCount: string;
  createdAt: string;
};

export type DemoStudent = {
  id: string;
  classId: string;
  name: string;
  age: string;
  grade: string;
  diagnosis: string;
  profile: string;
  notes: string;
  supportLevel: string;
  resources: string;
  pei: string;
  preferences: string;
  createdAt: string;
};

const profileKey = "acessa-plus-teacher-profile-v1";
const classesKey = "acessa-plus-demo-classes-v1";
const studentsKey = "acessa-plus-demo-students-v1";

export const audienceOptions = [
  "DI",
  "TEA",
  "DV",
  "DA",
  "TDAH",
  "AH/SD",
  "CAA",
  "Libras",
  "Braille"
];

export function getTeacherProfile(): TeacherProfile {
  return readValue<TeacherProfile>(profileKey, {
    name: "",
    photoUrl: "",
    email: "",
    school: "",
    city: "",
    state: "",
    teachingStage: "",
    subjects: "",
    audiences: ["DI", "TEA"],
    generationPreferences:
      "Materiais em A4, comandos objetivos, apoio visual e guia do professor."
  });
}

export function saveTeacherProfile(profile: TeacherProfile): void {
  writeValue(profileKey, profile);
}

export function listDemoClasses(): DemoClass[] {
  return readValue<DemoClass[]>(classesKey, []);
}

export function saveDemoClass(input: Omit<DemoClass, "id" | "createdAt">): DemoClass {
  const item: DemoClass = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };

  writeValue(classesKey, [item, ...listDemoClasses()]);

  return item;
}

export function listDemoStudents(): DemoStudent[] {
  return readValue<DemoStudent[]>(studentsKey, []);
}

export function saveDemoStudent(input: Omit<DemoStudent, "id" | "createdAt">): DemoStudent {
  const item: DemoStudent = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };

  writeValue(studentsKey, [item, ...listDemoStudents()]);

  return item;
}

function readValue<TValue>(key: string, fallback: TValue): TValue {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);

    return raw ? (JSON.parse(raw) as TValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeValue<TValue>(key: string, value: TValue): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}
