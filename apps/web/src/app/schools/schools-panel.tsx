"use client";

import { useEffect, useState } from "react";

type School = {
  id: string;
  name: string;
  municipality: string;
  state: string;
  networkType: string;
};

const emptyForm = {
  name: "",
  municipality: "",
  state: "ES",
  networkType: ""
};

export function SchoolsPanel(): React.ReactElement {
  const [schools, setSchools] = useState<School[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load(): Promise<void> {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/teacher/schools");

      if (!response.ok) {
        throw new Error("Nao foi possivel carregar as escolas.");
      }

      setSchools((await response.json()) as School[]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro inesperado ao carregar escolas."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function save(): Promise<void> {
    if (!form.name.trim()) {
      setError("Informe o nome da escola.");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/teacher/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };

        throw new Error(payload.message ?? "Nao foi possivel salvar a escola.");
      }

      setMessage("Escola salva com persistencia real.");
      setForm(emptyForm);
      await load();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro inesperado ao salvar escola."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="productShell">
      <section className="productHero compactHero">
        <div>
          <p className="productEyebrow">Escolas</p>
          <h1>Cadastre sua escola de atuacao.</h1>
          <p>
            A escola fica vinculada a sua conta e ajuda a organizar turmas,
            estudantes e materiais salvos.
          </p>
        </div>
      </section>

      <section className="saasGrid simpleGrid">
        <div className="creatorCard">
          <Field
            label="Nome da escola"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          />
          <Field
            label="Municipio"
            value={form.municipality}
            onChange={(value) => setForm((current) => ({ ...current, municipality: value }))}
          />
          <Field
            label="Estado"
            value={form.state}
            onChange={(value) => setForm((current) => ({ ...current, state: value }))}
          />
          <Field
            label="Rede"
            value={form.networkType}
            onChange={(value) => setForm((current) => ({ ...current, networkType: value }))}
          />
          {message ? <p className="successMessage">{message}</p> : null}
          {error ? <p className="formError">{error}</p> : null}
          <button className="primaryButton" disabled={isSaving} type="button" onClick={() => void save()}>
            {isSaving ? "Salvando..." : "Cadastrar escola"}
          </button>
        </div>

        <div className="libraryCards">
          {isLoading ? <p className="emptyState">Carregando escolas...</p> : null}
          {!isLoading && schools.length === 0 ? (
            <p className="emptyState">Voce ainda nao cadastrou escolas.</p>
          ) : null}
          {schools.map((school) => (
            <article className="libraryCard" key={school.id}>
              <span>{school.networkType || "Rede nao informada"}</span>
              <strong>{school.name}</strong>
              <p>
                {school.municipality || "Municipio nao informado"}
                {school.state ? ` - ${school.state}` : ""}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): React.ReactElement {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}
