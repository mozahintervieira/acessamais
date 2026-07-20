"use client";

import { useEffect, useState } from "react";

type Classroom = {
  id: string;
  name: string;
  grade: string;
};

type Student = {
  id: string;
  classId: string;
  name: string;
  age: string;
  grade: string;
  profile: string;
  notes: string;
  supportLevel: string;
  resources: string;
  preferences: string;
  createdAt: string;
};

const emptyForm = {
  classroomId: "",
  displayName: "",
  age: "",
  grade: "",
  pedagogicalProfile: "TEA",
  observations: "",
  supportLevel: "Apoio moderado",
  interests: "",
  preferences: ""
};

export function StudentsPanel(): React.ReactElement {
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load(): Promise<void> {
    try {
      const [classesResponse, studentsResponse] = await Promise.all([
        fetch("/api/teacher/classes"),
        fetch("/api/teacher/students")
      ]);

      if (!classesResponse.ok || !studentsResponse.ok) {
        throw new Error("Nao foi possivel carregar turmas e estudantes.");
      }

      setClasses((await classesResponse.json()) as Classroom[]);
      setStudents(mapApiStudents((await studentsResponse.json()) as ApiStudent[]));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel carregar turmas e estudantes."
      );
    }
  }

  async function save(): Promise<void> {
    if (!form.displayName.trim()) {
      setError("Informe o nome ou identificador do estudante.");
      return;
    }

    try {
      setError("");
      setMessage("");
      const response = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nao foi possivel salvar o estudante.");
      }

      setMessage("Estudante salvo com persistencia real.");
      await load();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel salvar o estudante."
      );
    }

    setForm(emptyForm);
  }

  return (
    <main className="productShell">
      <section className="productHero compactHero">
        <div>
          <p className="productEyebrow">Estudantes</p>
          <h1>Perfis pedagogicos para personalizacao.</h1>
          <p>Use dados pedagogicos necessarios. Diagnostico clinico nao e obrigatorio.</p>
        </div>
      </section>
      <section className="saasGrid simpleGrid">
        <div className="creatorCard">
          <label className="field">
            <span>Turma</span>
            <select value={form.classroomId} onChange={(event) => setForm((current) => ({ ...current, classroomId: event.currentTarget.value }))}>
              <option value="">Sem turma</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {(["displayName", "age", "grade", "pedagogicalProfile", "observations", "supportLevel", "interests", "preferences"] as const).map((field) => (
            <Field key={field} label={labelFor(field)} value={form[field]} onChange={(value) => setForm((current) => ({ ...current, [field]: value }))} />
          ))}
          {message ? <p className="successMessage">{message}</p> : null}
          {error ? <p className="formError">{error}</p> : null}
          <button className="primaryButton" type="button" onClick={() => void save()}>Cadastrar estudante</button>
        </div>
        <div className="libraryCards">
          {students.length === 0 ? <p className="emptyState">Nenhum estudante cadastrado.</p> : null}
          {students.map((student) => (
            <article className="libraryCard" key={student.id}>
              <span>{student.profile || "Perfil nao informado"}</span>
              <strong>{student.name}</strong>
              <p>{student.grade || "Serie nao informada"} · {student.supportLevel || "Apoio nao informado"}</p>
              <small>{student.preferences || student.notes}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

type ApiStudent = {
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

function mapApiStudents(students: ApiStudent[]): Student[] {
  return students.map((student) => ({
    id: student.id,
    classId: student.classroomId,
    name: student.displayName,
    age: student.age,
    grade: "",
    profile: student.pedagogicalProfile,
    notes: student.observations,
    supportLevel: student.supportLevel,
    resources: student.interests,
    preferences: student.preferences,
    createdAt: student.createdAt
  }));
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }): React.ReactElement {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

function labelFor(field: keyof typeof emptyForm): string {
  const labels: Record<keyof typeof emptyForm, string> = {
    classroomId: "Turma",
    displayName: "Nome ou identificador",
    age: "Idade",
    grade: "Serie",
    pedagogicalProfile: "Deficiencia/perfil pedagogico",
    observations: "Observacoes pedagogicas",
    supportLevel: "Nivel de apoio",
    interests: "Interesses",
    preferences: "Preferencias"
  };

  return labels[field];
}
