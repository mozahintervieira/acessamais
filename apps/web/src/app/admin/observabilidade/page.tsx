import { redirect } from "next/navigation";
import { canViewObservability, getCurrentUser } from "../../server/session";
import { getChatObservabilitySummary } from "../../server/usage-events";
import styles from "./observability.module.css";

export const dynamic = "force-dynamic";

export default async function ObservabilityPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/observabilidade");
  if (!canViewObservability(user!)) redirect("/app");

  const summary = await getChatObservabilitySummary(30);
  const costConfigured = summary.costCoverage > 0;

  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>PAINEL PRIVADO · ÚLTIMOS 30 DIAS</p>
          <h1>Qualidade e funcionamento do chat</h1>
          <p>
            Indicadores técnicos e pedagógicos do ACESSA+. O conteúdo das
            conversas e dos anexos não é armazenado neste painel.
          </p>
        </div>
        <span className={styles.privacy}>Privacidade por padrão</span>
      </header>

      <section className={styles.grid} aria-label="Resumo das gerações">
        <Metric label="Gerações" value={formatNumber(summary.total)} />
        <Metric
          label="Sucesso técnico"
          value={formatPercent(summary.successRate)}
        />
        <Metric
          label="Latência média"
          value={formatDuration(summary.averageLatencyMs)}
        />
        <Metric
          label="Latência P95"
          value={formatDuration(summary.p95LatencyMs)}
        />
        <Metric
          label="Consulta curricular"
          value={formatPercent(summary.curriculumSearchRate)}
        />
        <Metric
          label="Fonte vigente confirmada"
          value={formatPercent(summary.curriculumConfirmedRate)}
        />
        <Metric
          label="Qualidade verificada"
          value={formatPercent(summary.qualityVerifiedRate)}
        />
        <Metric
          label="Revisões automáticas"
          value={formatNumber(summary.retried)}
        />
      </section>

      <section className={styles.panels}>
        <article className={styles.panel}>
          <h2>Uso do modelo</h2>
          <dl className={styles.details}>
            <div>
              <dt>Tokens de entrada</dt>
              <dd>{formatNumber(summary.inputTokens)}</dd>
            </div>
            <div>
              <dt>Tokens de saída</dt>
              <dd>{formatNumber(summary.outputTokens)}</dd>
            </div>
            <div>
              <dt>Total observado</dt>
              <dd>{formatNumber(summary.totalTokens)}</dd>
            </div>
            <div>
              <dt>Custo estimado</dt>
              <dd>
                {costConfigured
                  ? formatCurrency(summary.estimatedCostUsd)
                  : "Não configurado"}
              </dd>
            </div>
          </dl>
          {!costConfigured ? (
            <p className={styles.note}>
              Para estimar custo sem fixar preços no código, configure
              OPENAI_INPUT_USD_PER_MILLION e OPENAI_OUTPUT_USD_PER_MILLION com
              os valores vigentes do modelo contratado.
            </p>
          ) : null}
        </article>

        <article className={styles.panel}>
          <h2>Proteção dos dados</h2>
          <ul className={styles.checklist}>
            <li>Texto do pedido não registrado nas métricas</li>
            <li>Conteúdo dos anexos não registrado nas métricas</li>
            <li>Erros guardados apenas por códigos seguros</li>
            <li>Identificador técnico por solicitação para suporte</li>
          </ul>
        </article>
      </section>

      <section className={styles.panel}>
        <h2>Falhas recentes</h2>
        {summary.recentFailures.length ? (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>Código</th>
                  <th>Duração</th>
                  <th>Solicitação</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentFailures.map((failure) => (
                  <tr key={`${failure.requestId}-${failure.occurredAt}`}>
                    <td>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "America/Sao_Paulo",
                      }).format(new Date(failure.occurredAt))}
                    </td>
                    <td>
                      {failure.errorCode ?? failure.status ?? "Não informado"}
                    </td>
                    <td>{formatDuration(failure.durationMs)}</td>
                    <td>
                      <code>{failure.requestId?.slice(0, 12) ?? "—"}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>
            Nenhuma falha registrada neste período.
          </p>
        )}
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <article className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDuration(value: number): string {
  if (!value) return "—";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
  }).format(value);
}
