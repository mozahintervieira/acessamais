"use client";

import { useState } from "react";

const audienceOptions = ["DI", "TEA", "DV", "DA", "TDAH", "AH/SD", "CAA", "Libras", "Braille"];

export function OnboardingFlow(): React.ReactElement {
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({
    name: "",
    professionalRole: "professor do AEE",
    schoolStage: "",
    subjects: "",
    audiences: ["DI", "TEA"],
    generationPreferences: "Atividades A4 com apoio visual, comandos objetivos e guia do professor."
  });
  const [school, setSchool] = useState({ name: "", municipality: "", state: "ES", networkType: "estadual" });
  const [classroom, setClassroom] = useState({ name: "", grade: "", shift: "" });
  const [student, setStudent] = useState({
    displayName: "",
    pedagogicalProfile: "",
    supportLevel: "",
    observations: "",
    interests: "",
    preferences: ""
  });

  async function finish(): Promise<void> {
    setMessage("");
    const savedProfile = await post("/api/teacher/profile", {
      ...profile,
      subjects: split(profile.subjects),
      onboardingCompleted: true
    });

    if (!savedProfile.ok) {
      setMessage(savedProfile.message);
      return;
    }

    if (school.name.trim()) {
      await post("/api/teacher/schools", school);
    }

    if (classroom.name.trim()) {
      await post("/api/teacher/classes", classroom);
    }

    if (student.displayName.trim()) {
      await post("/api/teacher/students", student);
    }

    window.location.href = "/app";
  }

  return (
    <main className="productShell">
      <section className="productHero compactHero">
        <div>
          <p className="productEyebrow">Onboarding</p>
          <h1>Configure seu espaço pedagógico.</h1>
          <p>Você pode pular campos opcionais e concluir depois.</p>
        </div>
      </section>
      <section className="creatorCard onboardingCard">
        <div className="onboardingSteps">
          {[1, 2, 3, 4].map((item) => (
            <button className={step === item ? "active" : undefined} key={item} type="button" onClick={() => setStep(item)}>
              Etapa {item}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="formGridPro">
            <Field label="Nome" value={profile.name} onChange={(value) => setProfile((current) => ({ ...current, name: value }))} />
            <Field label="Tipo de atuação" value={profile.professionalRole} onChange={(value) => setProfile((current) => ({ ...current, professionalRole: value }))} />
            <Field label="Etapa de ensino" value={profile.schoolStage} onChange={(value) => setProfile((current) => ({ ...current, schoolStage: value }))} />
            <Field label="Disciplinas" value={profile.subjects} onChange={(value) => setProfile((current) => ({ ...current, subjects: value }))} />
            <label className="field proWide">
              <span>Preferências de geração</span>
              <textarea value={profile.generationPreferences} onChange={(event) => setProfile((current) => ({ ...current, generationPreferences: event.currentTarget.value }))} />
            </label>
            <div className="proWide">
              <span className="fieldLabel">Público atendido</span>
              <div className="materialPicker">
                {audienceOptions.map((option) => (
                  <button className={profile.audiences.includes(option) ? "selected" : undefined} key={option} type="button" onClick={() => setProfile((current) => ({ ...current, audiences: current.audiences.includes(option) ? current.audiences.filter((item) => item !== option) : [...current.audiences, option] }))}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="formGridPro">
            <Field label="Nome da escola" value={school.name} onChange={(value) => setSchool((current) => ({ ...current, name: value }))} />
            <Field label="Município" value={school.municipality} onChange={(value) => setSchool((current) => ({ ...current, municipality: value }))} />
            <Field label="Estado" value={school.state} onChange={(value) => setSchool((current) => ({ ...current, state: value }))} />
            <Field label="Rede" value={school.networkType} onChange={(value) => setSchool((current) => ({ ...current, networkType: value }))} />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="formGridPro">
            <Field label="Nome da turma" value={classroom.name} onChange={(value) => setClassroom((current) => ({ ...current, name: value }))} />
            <Field label="Ano/série" value={classroom.grade} onChange={(value) => setClassroom((current) => ({ ...current, grade: value }))} />
            <Field label="Turno" value={classroom.shift} onChange={(value) => setClassroom((current) => ({ ...current, shift: value }))} />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="formGridPro">
            <Field label="Nome ou identificador" value={student.displayName} onChange={(value) => setStudent((current) => ({ ...current, displayName: value }))} />
            <Field label="Perfil pedagógico" value={student.pedagogicalProfile} onChange={(value) => setStudent((current) => ({ ...current, pedagogicalProfile: value }))} />
            <Field label="Nível de apoio" value={student.supportLevel} onChange={(value) => setStudent((current) => ({ ...current, supportLevel: value }))} />
            <Field label="Interesses" value={student.interests} onChange={(value) => setStudent((current) => ({ ...current, interests: value }))} />
            <Field label="Preferências" value={student.preferences} onChange={(value) => setStudent((current) => ({ ...current, preferences: value }))} />
            <Field label="Observações pedagógicas" value={student.observations} onChange={(value) => setStudent((current) => ({ ...current, observations: value }))} />
          </div>
        ) : null}

        {message ? <p className="formError">{message}</p> : null}
        <div className="commandBar">
          <button className="secondaryButton" type="button" onClick={() => setStep((current) => Math.max(1, current - 1))}>Voltar</button>
          {step < 4 ? (
            <button className="primaryButton" type="button" onClick={() => setStep((current) => Math.min(4, current + 1))}>Continuar</button>
          ) : (
            <button className="primaryButton" type="button" onClick={() => void finish()}>Concluir onboarding</button>
          )}
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

function split(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function post(url: string, body: unknown): Promise<{ ok: boolean; message: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string };

  return {
    ok: response.ok,
    message: payload.message ?? "Nao foi possivel salvar."
  };
}
