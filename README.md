# Acessa+

Aplicativo para criacao de atividades e recursos pedagogicos inclusivos.

## O que esta versao entrega

- Assistente AEE com integracao real de IA via funcao serverless da Vercel.
- Chamada segura para OpenAI pelo backend, usando `OPENAI_API_KEY`.
- Geracao de folha A4 estruturada pelo contrato JSON `acessamais.a4.v1`.
- Renderizacao de cabecalho, metadados, ancoras cognitivas, missoes/desafios, orientacoes docentes e rodape `@mozahintervieira`.
- Campos pedagogicos para perfil, nivel de alfabetizacao, nivel de apoio e area de interesse/hiperfoco.
- Atividades adaptadas em folha A4 prontas para estudante.
- Exercicios com campos de nome, turma, disciplina e data.
- Alternativas marcaveis, espaco de resposta, desenho/escrita e mini cartoes de CAA.
- Adaptacao por DI, TEA, DV, DA, TDAH, AH/SD e multiplas deficiencias.
- Modulos de atividade, adaptacao, plano, PEI, avaliacao, ABA, CAA e relatorio.
- Banco local de materiais salvos no navegador.
- Exportacao em PDF/impressao, imagem PNG A4, Word e HTML.
- Impressao da folha A4 gerada pelo Assistente AEE.
- Instalacao como PWA quando aberto por servidor local.

## Como usar

Opcao simples:

1. Abra `abrir-acessaplus.bat`.
2. Preencha os dados do estudante e da atividade.
3. Clique em `Gerar material`.
4. Clique em `Imagem A4` para baixar a folha como PNG.

Opcao recomendada para instalar como aplicativo:

1. Abra `servidor-local.bat`.
2. Acesse `http://localhost:8787`.
3. Clique em `Instalar app`, se o navegador oferecer essa opcao.

## Configuracao da IA na Vercel

O gerador local funciona sem internet e sem API externa.

O modulo `Assistente AEE` usa a funcao serverless `api/generate.js` e exige a variavel de ambiente:

```text
OPENAI_API_KEY
```

Opcionalmente, e possivel configurar:

```text
OPENAI_MODEL
```

Se `OPENAI_MODEL` nao for informado, a funcao usa `gpt-4.1-mini`.

Nunca coloque a chave da OpenAI no frontend.

## Expansao SaaS

A pasta `docs` registra a proxima etapa profissional do AcessaMais:

- `docs/acessamais-saas-blueprint.md`: roadmap para autenticacao, freemium, banco de dados, pagamento e multimodalidade.
- `docs/supabase-schema.sql`: esquema inicial para persistencia futura em Supabase/PostgreSQL.

Esses recursos ainda nao estao ativos no app local. Eles servem como base tecnica para a evolucao SaaS.
