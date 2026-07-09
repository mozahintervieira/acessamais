"use client";

import { useEffect, useState } from "react";
import { listDemoClasses, saveDemoClass, type DemoClass } from "../teacher-demo-store";

export function ClassesPanel(): React.ReactElement {
  const [classes, setClasses] = useState<DemoClass[]>([]);
  const [form, setForm] = useState({ name: "", grade: "", shift: "", studentCount: "" });

  useEffect(() => setClasses(listDemoClasses()), []);

  function save(): void {
    if (!form.name.trim()) {
      return;
    }

    saveDemoClass(form);
    setClasses(listDemoClasses());
    setForm({ name: "", grade: "", shift: "", studentCount: "" });
  }

  return (
    <main className="productShell">
      <section className="productHero compactHero">
        <div>
          <p className="productEyebrow">Turmas</p>
          <h1>Organize os grupos atendidos.</h1>
          <p>Cadastro local/demo para contextualizar os materiais gerados.</p>
        </div>
      </section>
      <section className="saasGrid simpleGrid">
        <div className="creatorCard">
          <Field label="Nome da turma" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <Field label="Serie/ano" value={form.grade} onChange={(value) => setForm((current) => ({ ...current, grade: value }))} />
          <Field label="Turno" value={form.shift} onChange={(value) => setForm((current) => ({ ...current, shift: value }))} />
          <Field label="Quantidade de estudantes" value={form.studentCount} onChange={(value) => setForm((current) => ({ ...current, studentCount: value }))} />
          <button className="primaryButton" type="button" onClick={save}>Cadastrar turma</button>
        </div>
        <div className="libraryCards">
          {classes.length === 0 ? <p className="emptyState">Nenhuma turma cadastrada.</p> : null}
          {classes.map((item) => (
            <article className="libraryCard" key={item.id}>
              <span>{item.shift || "Turno nao informado"}</span>
              <strong>{item.name}</strong>
              <p>{item.grade || "Serie nao informada"} · {item.studentCount || "0"} estudantes</p>
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
