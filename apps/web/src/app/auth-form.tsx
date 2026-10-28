"use client";

import { useState } from "react";

type AuthMode = "login" | "register";

const registerSteps = ["Seus dados", "Sua segurança"];

export function AuthForm({ mode }: { mode: AuthMode }): React.ReactElement {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  function validateCurrentStep(): string | null {
    if (step === 0) {
      if (name.trim().length < 2) return "Informe seu nome.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Informe um e-mail válido.";
    }

    if (step === 1) {
      if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
      if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use letras e números na senha.";
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

    try {
      const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister
            ? { name, email, password }
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
            ? "Um cadastro em duas etapas curtas. O contexto pedagógico aparece somente quando ajudar no seu trabalho."
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
            <p className="authHint">Seu e-mail identifica a conta e será o canal de suporte e recuperação de acesso.</p>
          </div>
        ) : null}

        {isRegister && step === 1 ? (
          <div className="authStep">
            <label className="field"><span>Crie uma senha</span><input autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} placeholder="Pelo menos 8 caracteres" /></label>
            <div className="passwordGuide"><span className={password.length >= 8 ? "done" : ""}>8 ou mais caracteres</span><span className={/[A-Za-z]/.test(password) && /\d/.test(password) ? "done" : ""}>Letras e números</span></div>
            <p className="privacyNotice">Evite inserir dados clínicos sensíveis de estudantes. O contexto pedagógico deve usar apenas o necessário.</p>
          </div>
        ) : null}

        {!isRegister ? (
          <div className="authStep">
            <label className="field"><span>E-mail</span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} /></label>
            <label className="field"><span>Senha</span><input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} /></label>
            <a className="textLink" href="/recuperar-senha">Esqueci minha senha</a>
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
        {isRegister ? <p className="authLegal">Ao criar a conta, você concorda com os <a href="/termos">Termos de Uso</a> e a <a href="/privacidade">Política de Privacidade</a>.</p> : <p className="authLegal"><a href="/termos">Termos de Uso</a> · <a href="/privacidade">Política de Privacidade</a></p>}
      </form>
    </main>
  );
}

