export default function SettingsPage(): React.ReactElement {
  return (
    <main className="productShell">
      <section className="productHero compactHero">
        <div>
          <p className="productEyebrow">Configuracoes</p>
          <h1>Ambiente demo do ACESSA+</h1>
          <p>Esta versao usa dados locais no navegador, sem login real, pagamento ou banco externo obrigatorio.</p>
        </div>
      </section>
      <section className="creatorCard">
        <h2>Pronto para apresentacao</h2>
        <p className="emptyState">Frontend responsivo, geracao via API Routes, OpenAI quando configurado e fallback seguro em desenvolvimento.</p>
      </section>
    </main>
  );
}
