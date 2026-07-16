"use client";

import { useState } from "react";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }): React.ReactElement {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password })
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Nao foi possivel continuar.");
      }

      window.location.href = isRegister ? "/onboarding" : "/app";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="authShell">
      <section className="authBrandPanel">
        <span className="brandSeal">A+</span>
        <p className="brandSignature">Inclui · Transforma · Conecta</p>
        <h1>{isRegister ? "Crie sua conta no ACESSA+" : "Entre no ACESSA+"}</h1>
        <p>
          Organize turmas, estudantes e materiais inclusivos com segurança,
          persistencia real e foco pedagogico.
        </p>
      </section>

      <form className="authCard" onSubmit={(event) => void submit(event)}>
        <div>
          <p className="productEyebrow">{isRegister ? "Cadastro de professor" : "Acesso do professor"}</p>
          <h2>{isRegister ? "Comece seu espaco pedagogico" : "Acesse seus materiais"}</h2>
        </div>
        {isRegister ? (
          <label className="field">
            <span>Nome</span>
            <input value={name} onChange={(event) => setName(event.currentTarget.value)} />
          </label>
        ) : null}
        <label className="field">
          <span>E-mail</span>
          <input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
        </label>
        <label className="field">
          <span>Senha</span>
          <input autoComplete={isRegister ? "new-password" : "current-password"} type="password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
        </label>
        {isRegister ? (
          <p className="privacyNotice">
            Cadastre apenas informacoes pedagogicas necessarias e evite inserir
            dados clinicos sensiveis sem autorizacao.
          </p>
        ) : null}
        {message ? <p className="formError">{message}</p> : null}
        <button className="primaryButton" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}
        </button>
        <a className="textLink" href={isRegister ? "/login" : "/cadastro"}>
          {isRegister ? "Ja tenho conta" : "Criar conta"}
        </a>
      </form>
    </main>
  );
}
