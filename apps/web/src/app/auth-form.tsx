"use client";

import { useState } from "react";

type AuthMode = "login" | "register";

type ReferralDraft = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

const registerSteps = ["Seu contato", "Sua segurança", "Indicações"];

function emptyReferral(): ReferralDraft {
  return { id: crypto.randomUUID(), name: "", email: "", phone: "" };
}

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function AuthForm({ mode }: { mode: AuthMode }): React.ReactElement {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState(0);
  const [referrals, setReferrals] = useState<ReferralDraft[]>([
    { id: "initial-referral", name: "", email: "", phone: "" }
  ]);
  const [referralConsent, setReferralConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  function hasReferralData(): boolean {
    return referrals.some((referral) => referral.email.trim() || referral.phone.trim());
  }

  function validateCurrentStep(): string | null {
    if (step === 0) {
      if (name.trim().length < 2) return "Informe seu nome.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Informe um e-mail válido.";
      const digits = phoneDigits(phone);
      if (digits.length < 10 || digits.length > 15) return "Informe um telefone válido com DDD.";
    }

    if (step === 1) {
      if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
      if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use letras e números na senha.";
    }

    if (step === 2 && hasReferralData()) {
      for (const referral of referrals) {
        if (!referral.email.trim() && !referral.phone.trim()) continue;
        if (referral.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(referral.email.trim())) {
          return "Revise o e-mail da indicação.";
        }
        const referralPhone = phoneDigits(referral.phone);
        if (referral.phone.trim() && (referralPhone.length < 10 || referralPhone.length > 15)) {
          return "Revise o telefone da indicação.";
        }
      }
      if (!referralConsent) return "Confirme que as pessoas indicadas autorizaram o contato.";
    }

    return null;
  }

  function advance(): void {
    const validationMessage = validateCurrentStep();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }
    setMessage("");
    setStep((current) => Math.min(current + 1, registerSteps.length - 1));
  }

  function updateReferral(id: string, field: "name" | "email" | "phone", value: string): void {
    setReferrals((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isRegister && step < registerSteps.length - 1) {
      advance();
      return;
    }

    const validationMessage = isRegister ? validateCurrentStep() : null;
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const submittedReferrals = referrals
      .filter((referral) => referral.email.trim() || referral.phone.trim())
      .map((referral) => ({
        name: referral.name.trim() || undefined,
        email: referral.email.trim() || undefined,
        phone: referral.phone.trim() || undefined,
        consentConfirmed: referralConsent
      }));

    try {
      const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister
            ? { name, email, phone, password, referrals: submittedReferrals }
            : { email, password }
        )
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) throw new Error(payload.message ?? "Não foi possível continuar.");

      window.location.href = isRegister ? "/onboarding" : "/app";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="authShell authExperience">
      <section className="authBrandPanel">
        <a className="landingBrand" href="/" aria-label="Voltar para a página inicial do ACESSA+">
          <span>A+</span><strong>ACESSA<span>+</span></strong>
        </a>
        <p className="landingKicker"><span aria-hidden="true" /> Mente pedagógica inclusiva</p>
        <h1>{isRegister ? "Comece com o essencial." : "Bom ter você de volta."}</h1>
        <p>
          {isRegister
            ? "O ACESSA+ pede uma informação por vez. Você entra rápido e completa o contexto pedagógico quando precisar."
            : "Retome seus materiais, planejamentos e adaptações em um espaço pensado para o professor."}
        </p>
        <div className="authPrinciples" aria-label="Princípios da plataforma">
          <span>Dados mínimos</span><span>Professor no controle</span><span>Inclusão desde o início</span>
        </div>
      </section>

      <form className="authCard" onSubmit={(event) => void submit(event)}>
        <div className="authCardHeading">
          <p className="productEyebrow">{isRegister ? `Etapa ${step + 1} de ${registerSteps.length}` : "Acesso do professor"}</p>
          <h2>{isRegister ? registerSteps[step] : "Entre no ACESSA+"}</h2>
          {isRegister ? (
            <div className="authProgress" aria-label={`Etapa ${step + 1} de ${registerSteps.length}`}>
              {registerSteps.map((item, index) => <span key={item} className={index <= step ? "active" : ""} />)}
            </div>
          ) : null}
        </div>

        {isRegister && step === 0 ? (
          <div className="authStep">
            <label className="field"><span>Como podemos chamar você?</span><input autoComplete="name" value={name} onChange={(event) => setName(event.currentTarget.value)} placeholder="Seu nome" /></label>
            <label className="field"><span>Seu melhor e-mail</span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} placeholder="voce@escola.com.br" /></label>
            <label className="field"><span>WhatsApp com DDD</span><input autoComplete="tel" inputMode="tel" type="tel" value={phone} onChange={(event) => setPhone(event.currentTarget.value)} placeholder="(27) 99999-9999" /></label>
            <p className="authHint">Usaremos estes dados para sua conta e para contatos sobre o ACESSA+.</p>
          </div>
        ) : null}

        {isRegister && step === 1 ? (
          <div className="authStep">
            <label className="field"><span>Crie uma senha</span><input autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} placeholder="Pelo menos 8 caracteres" /></label>
            <div className="passwordGuide"><span className={password.length >= 8 ? "done" : ""}>8 ou mais caracteres</span><span className={/[A-Za-z]/.test(password) && /\d/.test(password) ? "done" : ""}>Letras e números</span></div>
            <p className="privacyNotice">Evite inserir dados clínicos sensíveis de estudantes. O contexto pedagógico deve usar apenas o necessário.</p>
          </div>
        ) : null}

        {isRegister && step === 2 ? (
          <div className="authStep">
            <p className="authHint prominent">Conhece alguém que também pode transformar a educação com IA? A indicação é opcional.</p>
            {referrals.map((referral, index) => (
              <fieldset className="referralCard" key={referral.id}>
                <legend>Indicação {index + 1}</legend>
                <label className="field"><span>Nome (opcional)</span><input value={referral.name} onChange={(event) => updateReferral(referral.id, "name", event.currentTarget.value)} /></label>
                <label className="field"><span>E-mail</span><input inputMode="email" type="email" value={referral.email} onChange={(event) => updateReferral(referral.id, "email", event.currentTarget.value)} placeholder="E-mail ou telefone" /></label>
                <label className="field"><span>Telefone</span><input inputMode="tel" type="tel" value={referral.phone} onChange={(event) => updateReferral(referral.id, "phone", event.currentTarget.value)} placeholder="E-mail ou telefone" /></label>
                {referrals.length > 1 ? <button className="referralRemove" type="button" onClick={() => setReferrals((current) => current.filter((item) => item.id !== referral.id))}>Remover</button> : null}
              </fieldset>
            ))}
            <button className="referralAdd" type="button" onClick={() => setReferrals((current) => [...current, emptyReferral()])}>+ Indicar outra pessoa</button>
            {hasReferralData() ? (
              <label className="consentField"><input type="checkbox" checked={referralConsent} onChange={(event) => setReferralConsent(event.currentTarget.checked)} /><span>Confirmo que as pessoas indicadas autorizaram o ACESSA+ a entrar em contato.</span></label>
            ) : null}
          </div>
        ) : null}

        {!isRegister ? (
          <div className="authStep">
            <label className="field"><span>E-mail</span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} /></label>
            <label className="field"><span>Senha</span><input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} /></label>
          </div>
        ) : null}

        {message ? <p className="formError" role="alert">{message}</p> : null}
        <div className="authControls">
          {isRegister && step > 0 ? <button className="authBack" type="button" onClick={() => { setMessage(""); setStep((current) => current - 1); }}>Voltar</button> : null}
          <button className="primaryButton" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Aguarde..." : isRegister && step < registerSteps.length - 1 ? "Continuar" : isRegister ? "Criar minha conta" : "Entrar"}
          </button>
        </div>
        <a className="textLink" href={isRegister ? "/login" : "/cadastro"}>{isRegister ? "Já tenho conta" : "Criar conta"}</a>
      </form>
    </main>
  );
}
