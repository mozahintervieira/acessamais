export default function SettingsPage(): React.ReactElement {
  return (
    <main className="productShell">
      <section className="productHero compactHero">
        <div>
          <p className="productEyebrow">Configuracoes</p>
          <h1>Ambiente online do ACESSA+</h1>
          <p>Esta versao esta preparada para testes com professores, gerando materiais pela API online e mantendo a arquitetura pronta para banco, login e historico institucional.</p>
        </div>
      </section>
      <section className="creatorCard">
        <h2>Pronto para apresentacao</h2>
        <p className="emptyState">Frontend responsivo, geracao via API Routes, OpenAI em producao quando configurado e fallback pedagogico seguro para continuidade da experiencia.</p>
      </section>
    </main>
  );
}
