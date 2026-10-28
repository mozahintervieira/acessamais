"use client";

import { useState } from "react";

export function PasswordResetForm({ mode, token = "" }: { mode: "forgot" | "reset"; token?: string }): React.ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(mode === "forgot" ? "/api/auth/password/forgot" : "/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "forgot" ? { email } : { token, password })
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(payload.message ?? (response.ok ? "Solicitação concluída." : "Não foi possível concluir."));
    } catch {
      setMessage("Não foi possível conectar ao ACESSA+ agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="authCard" onSubmit={(event) => void submit(event)}>
      <div className="authCardHeading"><p className="productEyebrow">Segurança da conta</p><h2>{mode === "forgot" ? "Recuperar senha" : "Criar nova senha"}</h2></div>
      <div className="authStep">
        {mode === "forgot" ? <label className="field"><span>E-mail da conta</span><input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} /></label> : <label className="field"><span>Nova senha</span><input autoComplete="new-password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.currentTarget.value)} /><small>Use pelo menos 8 caracteres, com letras e números.</small></label>}
      </div>
      {message ? <p className="formError" role="status">{message}</p> : null}
      <button className="primaryButton" disabled={isSubmitting || (mode === "reset" && !token)} type="submit">{isSubmitting ? "Aguarde..." : mode === "forgot" ? "Enviar link seguro" : "Redefinir senha"}</button>
      <a className="textLink" href="/login">Voltar para entrar</a>
    </form>
  );
}

