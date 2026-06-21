# AcessaMais - Blueprint SaaS

Este documento organiza a evolucao tecnica do AcessaMais para uma plataforma SaaS de AEE, com IA generativa, autenticacao, persistencia e modelo freemium.

## Implementado nesta versao

- Funcao serverless `api/generate.js` para chamada segura da OpenAI pela Vercel.
- Uso da variavel de ambiente `OPENAI_API_KEY`, sem exposicao da chave no frontend.
- Prompt de sistema para gerar JSON estruturado de folha A4.
- Contrato `acessamais.a4.v1` com cabecalho, metadados, ancoras cognitivas, secoes de desafios, orientacoes docentes e rodape `@mozahintervieira`.
- Renderizacao visual da folha A4 no Assistente AEE.
- Comando para copiar resposta e imprimir folha A4.

## Contrato JSON principal

```json
{
  "schema_version": "acessamais.a4.v1",
  "configuracao_folha": {
    "tamanho": "A4",
    "layout_orientacao": "Retrato",
    "tema_estilo": "tema ludico",
    "caixa_alta": true,
    "rodape_autor": "@mozahintervieira"
  },
  "cabecalho": {
    "titulo_atividade": "titulo da atividade",
    "instrucoes_gerais": "instrucao simples"
  },
  "metadados": {
    "objetivo_pedagogico": "objetivo observavel",
    "habilidade_bncc_adaptada": "habilidade adaptada",
    "publico_alvo": "perfil e ano/serie",
    "nivel_apoio": "apoio necessario",
    "observacoes_acessibilidade": "barreiras e apoios"
  },
  "ancoras_cognitivas": {
    "contextualizacao": "texto curto de apoio",
    "pistas_graficas": []
  },
  "secoes_desafios": [],
  "orientacoes_docente": {}
}
```

## Etapas futuras

1. Autenticacao
   - Integrar Clerk, Auth0 ou Supabase Auth.
   - Bloquear geracao por IA para visitantes anonimos.
   - Associar cada atividade ao usuario criador.

2. Persistencia
   - Usar PostgreSQL/Supabase para salvar atividades.
   - Criar biblioteca comunitaria com filtros por disciplina, ano, perfil e acessibilidade.
   - Permitir materiais publicos e privados.

3. Plano freemium
   - Visitante: acesso apenas a exemplos publicos.
   - Professor gratuito: limite mensal de geracoes.
   - Professor Pro: geracoes ampliadas, biblioteca privada e recursos avancados.

4. Pagamento
   - Integrar Stripe ou outro gateway.
   - Sincronizar status de assinatura com o cadastro do usuario.

5. Multimodalidade
   - Gerar pictogramas, imagens de apoio e folhas A4 com recursos visuais.
   - Exportar PDF com controle de margem e assinatura fixa.

## Decisao tecnica atual

A versao atual prioriza validacao pedagogica e usabilidade. Autenticacao, cobranca e banco de dados devem ser adicionados somente depois que o fluxo de geracao de atividades estiver validado com professores reais.
