"use client";

import { useEffect, useState } from "react";

type Classroom = {
  id: string;
  name: string;
  grade: string;
  shift: string;
  studentCount?: string;
};

export function ClassesPanel(): React.ReactElement {
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [form, setForm] = useState({ name: "", grade: "", shift: "", studentCount: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load(): Promise<void> {
    try {
      const response = await fetch("/api/teacher/classes");

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nao foi possivel carregar as turmas.");
      }

      setClasses((await response.json()) as Classroom[]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel carregar as turmas."
      );
    }
  }

  async function save(): Promise<void> {
    if (!form.name.trim()) {
      setError("Informe o nome da turma.");
      return;
    }

    try {
      setError("");
      setMessage("");
      const response = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nao foi possivel salvar a turma.");
      }

      setMessage("Turma salva com persistencia real.");
      await load();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel salvar a turma."
      );
    }

    setForm({ name: "", grade: "", shift: "", studentCount: "" });
  }

  return (
    <main className="productShell">
      <section className="productHero compactHero">
        <div>
          <p className="productEyebrow">Turmas</p>
          <h1>Organize os grupos atendidos.</h1>
          <p>As turmas ficam vinculadas a sua conta e ajudam a contextualizar os materiais.</p>
        </div>
      </section>
      <section className="saasGrid simpleGrid">
        <div className="creatorCard">
          <Field label="Nome da turma" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <Field label="Serie/ano" value={form.grade} onChange={(value) => setForm((current) => ({ ...current, grade: value }))} />
          <Field label="Turno" value={form.shift} onChange={(value) => setForm((current) => ({ ...current, shift: value }))} />
          <Field label="Quantidade de estudantes" value={form.studentCount} onChange={(value) => setForm((current) => ({ ...current, studentCount: value }))} />
          {message ? <p className="successMessage">{message}</p> : null}
          {error ? <p className="formError">{error}</p> : null}
          <button className="primaryButton" type="button" onClick={() => void save()}>Cadastrar turma</button>
        </div>
        <div className="libraryCards">
          {classes.length === 0 ? <p className="emptyState">Voce ainda nao cadastrou turmas.</p> : null}
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
