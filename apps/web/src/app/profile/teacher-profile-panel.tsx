"use client";

import { useEffect, useState } from "react";
import {
  audienceOptions,
  getTeacherProfile,
  saveTeacherProfile,
  type TeacherProfile
} from "../teacher-demo-store";

export function TeacherProfilePanel(): React.ReactElement {
  const [profile, setProfile] = useState<TeacherProfile>(getTeacherProfile());
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const response = await fetch("/api/teacher/profile");

        if (!response.ok) {
          throw new Error("fallback");
        }

        const payload = (await response.json()) as ApiProfile;

        setProfile({
          name: payload.name,
          photoUrl: payload.profileImageUrl,
          email: payload.email,
          school: "",
          city: payload.municipality,
          state: payload.state,
          teachingStage: payload.schoolStage,
          subjects: payload.subjects.join(", "),
          audiences: payload.audiences,
          generationPreferences: payload.generationPreferences
        });
      } catch {
        setProfile(getTeacherProfile());
      }
    }

    void load();
  }, []);

  function update<TKey extends keyof TeacherProfile>(field: TKey, value: TeacherProfile[TKey]): void {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function toggleAudience(value: string): void {
    setProfile((current) => ({
      ...current,
      audiences: current.audiences.includes(value)
        ? current.audiences.filter((item) => item !== value)
        : [...current.audiences, value]
    }));
  }

  async function save(): Promise<void> {
    try {
      const response = await fetch("/api/teacher/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          profileImageUrl: profile.photoUrl,
          schoolStage: profile.teachingStage,
          subjects: profile.subjects.split(",").map((item) => item.trim()).filter(Boolean),
          audiences: profile.audiences,
          municipality: profile.city,
          state: profile.state,
          generationPreferences: profile.generationPreferences,
          onboardingCompleted: true
        })
      });

      if (!response.ok) {
        throw new Error("fallback");
      }

      setMessage("Perfil salvo com persistencia real.");
    } catch {
      saveTeacherProfile(profile);
      setMessage("Perfil salvo no modo local de desenvolvimento.");
    }
  }

  return (
    <main className="productShell">
      <section className="productHero compactHero">
        <div>
          <p className="productEyebrow">Painel do Professor</p>
          <h1>Meu Perfil</h1>
          <p>Cadastre seu contexto pedagogico para personalizar a criacao de materiais.</p>
        </div>
      </section>
      <section className="creatorCard profileGrid">
        <Field label="Nome" value={profile.name} onChange={(value) => update("name", value)} />
        <Field label="Foto" value={profile.photoUrl} onChange={(value) => update("photoUrl", value)} />
        <Field label="E-mail" value={profile.email} onChange={(value) => update("email", value)} />
        <Field label="Escola" value={profile.school} onChange={(value) => update("school", value)} />
        <Field label="Municipio" value={profile.city} onChange={(value) => update("city", value)} />
        <Field label="Estado" value={profile.state} onChange={(value) => update("state", value)} />
        <Field label="Etapa de ensino" value={profile.teachingStage} onChange={(value) => update("teachingStage", value)} />
        <Field label="Disciplinas" value={profile.subjects} onChange={(value) => update("subjects", value)} />
        <label className="field proWide">
          <span>Preferencias de geracao</span>
          <textarea value={profile.generationPreferences} onChange={(event) => update("generationPreferences", event.currentTarget.value)} />
        </label>
        <div className="proWide">
          <span className="fieldLabel">Publico atendido</span>
          <div className="materialPicker">
            {audienceOptions.map((item) => (
              <button className={profile.audiences.includes(item) ? "selected" : undefined} key={item} type="button" onClick={() => toggleAudience(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
        {message ? <p className="successMessage proWide">{message}</p> : null}
        <button className="primaryButton" type="button" onClick={() => void save()}>Salvar perfil</button>
      </section>
    </main>
  );
}

type ApiProfile = {
  name: string;
  email: string;
  schoolStage: string;
  subjects: string[];
  audiences: string[];
  municipality: string;
  state: string;
  profileImageUrl: string;
  generationPreferences: string;
};

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }): React.ReactElement {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}
