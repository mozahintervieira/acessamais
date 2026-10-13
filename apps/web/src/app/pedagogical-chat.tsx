"use client";

import { useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string; curriculum?: { checkedAt: string; sources: Array<{ title: string; url: string }> } };

export function PedagogicalChat(): React.ReactElement {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);

  async function send(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (sending.current || !draft.trim()) return;
    const content = draft.trim();
    const next: Turn[] = [...turns, { role: "user", content }];
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next })
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.reply !== "string" || !payload.reply.trim()) {
        throw new Error(payload.message || "Não foi possível receber a resposta. Tente novamente.");
      }
      setTurns([...next, { role: "assistant", content: payload.reply, curriculum: payload.curriculum }]);
      setDraft("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível receber a resposta.");
    } finally {
      sending.current = false;
      setBusy(false);
      input.current?.focus();
    }
  }

  return <main className="mindShell">
    <section className="mindWelcome">
      <p className="mindKicker"><span aria-hidden="true" /> Mente pedagógica ACESSA+</p>
      <h1>O que você quer construir hoje?</h1>
      <p>Converse, peça uma atividade ou refine uma proposta. O ACESSA+ acompanha o contexto da conversa.</p>
    </section>
    <section className="mindDialogue" aria-label="Conversa com o ACESSA+" aria-live="polite" aria-busy={busy}>
      {turns.map((turn, index) => <article className={`mindDialogueTurn ${turn.role === "user" ? "teacher" : "assistant"}`} key={index}>
        <span>{turn.role === "user" ? "Você" : "ACESSA+"}</span>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.65 }}>{turn.content}</div>
        {turn.curriculum ? <aside aria-label="Referências curriculares">
          <p>Busca curricular realizada em {new Date(turn.curriculum.checkedAt).toLocaleString("pt-BR")}. Referências não equivalem a validação pedagógica.</p>
          <ul>{turn.curriculum.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul>
        </aside> : null}
      </article>)}
      {busy ? <article className="mindDialogueTurn teacher"><span>Você</span><p style={{ whiteSpace: "pre-wrap" }}>{draft}</p></article> : null}
    </section>
    <form className="mindComposer" onSubmit={event => void send(event)}>
      <label htmlFor="pedagogical-chat-input">{turns.length ? "Continue a conversa" : "Seu pedido"}</label>
      <textarea id="pedagogical-chat-input" ref={input} value={draft} maxLength={12000} readOnly={busy}
        onChange={event => setDraft(event.currentTarget.value)}
        placeholder="Diga o que precisa, com suas palavras. Você pode pedir ajustes depois."
        aria-describedby="chat-privacy" />
      <div className="mindComposerBottom conversational">
        <p>Sem formulário. Tema, público e apoios podem ser explicados na conversa.</p>
        <button className="mindGenerate" disabled={busy || !draft.trim()} type="submit">{busy ? "Preparando resposta..." : "Enviar mensagem →"}</button>
      </div>
    </form>
    {error ? <div className="mindMessage" role="alert"><p>{error}</p><p>A mensagem continua no campo acima para você tentar novamente. <a href="/login">Entrar na conta</a></p></div> : null}
    {turns.length ? <button className="mindSecondary" disabled={busy} onClick={() => { if (window.confirm("Iniciar uma nova conversa? O histórico desta tela será apagado.")) { setTurns([]); setError(""); setDraft(""); } }}>Nova conversa</button> : null}
    <p className="mindPrivacy" id="chat-privacy">A IA propõe; o professor revisa. Evite dados identificáveis dos estudantes. Esta conversa permanece apenas nesta tela e não é arquivada ao sair.</p>
  </main>;
}
