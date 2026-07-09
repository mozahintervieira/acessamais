"use client";

import { useEffect, useState } from "react";
import {
  listDemoClasses,
  listDemoStudents,
  saveDemoStudent,
  type DemoClass,
  type DemoStudent
} from "../teacher-demo-store";

const emptyForm = {
  classId: "",
  name: "",
  age: "",
  grade: "",
  diagnosis: "",
  profile: "TEA",
  notes: "",
  supportLevel: "Apoio moderado",
  resources: "",
  pei: "",
  preferences: ""
};

export function StudentsPanel(): React.ReactElement {
  const [classes, setClasses] = useState<DemoClass[]>([]);
  const [students, setStudents] = useState<DemoStudent[]>([]);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setClasses(listDemoClasses());
    setStudents(listDemoStudents());
  }, []);

  function save(): void {
    if (!form.name.trim()) {
      return;
    }

    saveDemoStudent(form);
    setStudents(listDemoStudents());
    setForm(emptyForm);
  }

  return (
    <main className="productShell">
      <section className="productHero compactHero">
        <div>
          <p className="productEyebrow">Estudantes</p>
          <h1>Perfis pedagogicos para personalizacao.</h1>
          <p>Use dados necessarios para fins pedagogicos. Diagnostico e opcional.</p>
        </div>
      </section>
      <section className="saasGrid simpleGrid">
        <div className="creatorCard">
          <label className="field">
            <span>Turma</span>
            <select value={form.classId} onChange={(event) => setForm((current) => ({ ...current, classId: event.currentTarget.value }))}>
              <option value="">Sem turma</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {(["name", "age", "grade", "diagnosis", "profile", "notes", "supportLevel", "resources", "pei", "preferences"] as const).map((field) => (
            <Field key={field} label={labelFor(field)} value={form[field]} onChange={(value) => setForm((current) => ({ ...current, [field]: value }))} />
          ))}
          <button className="primaryButton" type="button" onClick={save}>Cadastrar estudante</button>
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
    classId: "Turma",
    name: "Nome",
    age: "Idade",
    grade: "Serie",
    diagnosis: "Diagnostico opcional",
    profile: "Deficiencia/perfil",
    notes: "Observacoes",
    supportLevel: "Nivel de apoio",
    resources: "Recursos utilizados",
    pei: "PEI",
    preferences: "Preferencias"
  };

  return labels[field];
}
