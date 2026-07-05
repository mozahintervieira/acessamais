# ACESSA+ Architecture

Este documento vivo registra as decisoes arquitetonicas centrais do ACESSA+ e deve ser atualizado a cada ciclo relevante de produto.

## Visao geral

O ACESSA+ e uma plataforma de Inteligencia Inclusiva para apoiar professores na criacao, adaptacao, validacao e reutilizacao de materiais pedagogicos acessiveis.

A plataforma nao sera um chatbot. Toda solicitacao deve ser interpretada como uma missao estruturada e processada por camadas intermediarias:

```txt
Missao
-> Orquestrador
-> Motor Pedagogico
-> Conhecimento / Protocolos
-> Especialistas Virtuais
-> AI Gateway
-> Validacao
-> Recurso versionado
```

## Construcao de dentro para fora

A ordem de evolucao do produto e:

```txt
Arquitetura
-> Conhecimento
-> Metodo
-> Inteligencia
-> Interface
```

A interface e consequencia da arquitetura. A IA e componente substituivel, nao autoridade pedagogica.

## Separacao permanente

O ACESSA+ preserva independencia entre tres camadas:

- **Dominio:** conceitos do produto, missoes, contratos, protocolos, metodos e regras de negocio.
- **Arquitetura:** coordenacao entre modulos, fluxos, boundaries e contratos de integracao.
- **Infraestrutura:** frameworks, banco, cache, filas, storage, provedores externos e ambiente de execucao.

O dominio nao deve depender de NestJS, Next.js, Prisma, PostgreSQL, Redis ou qualquer provedor de IA.

## Estrutura do monorepo

```txt
apps/
  api/   Backend NestJS inicial
  web/   Frontend Next.js inicial

packages/
  types/              Contratos de dominio compartilhados
  validators/         Schemas compartilhados de validacao
  database/           Prisma, schema e migrations
  pedagogical-core/   Nucleo pedagogico independente de infraestrutura
  ai-core/            Contratos e adaptadores de IA
  security-core/      Permissoes, RBAC e isolamento institucional

docs/
  architecture/
  ciclo-1-fundacao-executavel.md
```

## Limites entre pacotes

- `@acessa-plus/types` nao deve importar frameworks ou infraestrutura.
- `@acessa-plus/validators` valida contratos de entrada sem conhecer controllers ou telas.
- `@acessa-plus/pedagogical-core` deve interpretar protocolos e produzir planos, sem chamar IA diretamente.
- `@acessa-plus/ai-core` define a porta de acesso a modelos, mantendo fornecedores atras de adaptadores.
- `@acessa-plus/security-core` centraliza decisoes reutilizaveis de permissao e tenant scope.
- `@acessa-plus/database` implementa persistencia, mas nao define regra de dominio.
- `apps/api` orquestra infraestrutura backend.
- `apps/web` consome capacidades; nao deve conter regra pedagogica central.

## Decisoes do Ciclo 1

- Monorepo com `pnpm` e Turborepo.
- Backend inicial em NestJS.
- Frontend inicial em Next.js.
- PostgreSQL como banco principal.
- `pgvector` preparado para busca semantica futura.
- Prisma como camada de banco.
- Redis previsto no `docker-compose.yml`, ainda sem uso funcional.
- Contratos compartilhados criados antes dos fluxos.
- Motor Pedagogico inicial criado como interpretador extensivel, ainda sem regras pedagogicas detalhadas.
- AI core criado com adaptador `noop`, sem provedor real.
- RBAC e isolamento por organizacao iniciados no `security-core`.
- Recursos e missoes modelados como entidades estruturais iniciais.

## Independencia de provedor de IA

O ACESSA+ nao deve chamar OpenAI, Anthropic, Google, Azure ou modelos locais diretamente a partir de modulos pedagogicos.

Todo acesso a IA deve passar pelo `AI Gateway`, com contrato estavel:

```txt
AiGatewayRequest -> AiGatewayResponse
```

Essa decisao permite:

- trocar fornecedor sem reescrever o dominio;
- registrar finalidade, custo e seguranca de chamadas;
- aplicar redaction antes de envio externo;
- usar fallback de modelo no futuro;
- manter a IA como infraestrutura, nao como regra de negocio.

## RBAC e isolamento por organizacao

O ACESSA+ sera usado por escolas, redes, instituicoes culturais, universidades e profissionais independentes. Por isso, dados e recursos devem ser sempre escopados por `organizationId`.

RBAC inicial:

- `ADMIN`: gerencia usuarios e configuracoes institucionais.
- `TEACHER`: cria missoes e recursos.
- `REVIEWER`: revisa e valida recursos.

Essa decisao reduz risco de vazamento, melhora governanca e prepara a plataforma para uso multi-institucional.

## Estado atual da fundacao

O Ciclo 1 entregou uma base executavel:

- `pnpm install` funcionando.
- Prisma Client gerado.
- Schema Prisma validado.
- Testes passando.
- Typecheck passando.
- Build passando.
- API respondendo em `GET /health`.
- Web respondendo em `http://localhost:3000`.

Observacao: Docker nao estava disponivel no PATH durante a validacao, entao as migrations ainda nao foram aplicadas em um banco local nesta maquina.

O Ciclo 2 adicionou o nucleo cognitivo inicial:

- `ContextResolver`;
- `KnowledgeRegistry`;
- `DecisionEngine`;
- `MinimalPedagogicalEngine` consumindo decisoes estruturadas;
- pipeline obrigatorio `Contexto -> Objetivo -> Restricoes -> Produto Esperado`.

O Ciclo 3 iniciou a entrega de valor ao professor:

- `POST /missions` generico;
- `missionType: CREATE_LESSON_PLAN`;
- formulario guiado em `/planning/new`;
- execucao ponta a ponta sem IA externa e sem persistencia.

Estado aprovado do Ciclo 3: o ACESSA+ ja possui a primeira missao completa funcionando. A missao `CREATE_LESSON_PLAN` coleta dados pedagogicos essenciais, resolve contexto, produz decisao, gera `PedagogicalPlan` e apresenta o resultado ao professor pela interface.

O Ciclo 4 iniciou a persistencia e a base do Banco Inteligente:

- `POST /missions` persiste `Mission`, `Resource` e `ResourceVersion`;
- `ResourceVersion.contentJson` preserva o plano completo;
- `ResourceVersion.contentText` preserva texto simples para busca futura;
- `GET /missions` lista missoes por `organizationId`;
- `GET /missions/:id` retorna detalhe filtrado por `organizationId`;
- `/missions` e `/missions/[id]` permitem retomada e visualizacao do planejamento.

O Ciclo 5 consolidou revisao, edicao e versionamento:

- `ResourceVersion` passou a ser a fonte do historico;
- `POST /resources/:resourceId/versions` salva nova versao sem sobrescrever a anterior;
- `GET /resources/:resourceId/versions` lista historico por `organizationId`;
- `/missions/[id]` permite editar campos estruturados do plano e salvar nova versao;
- `contentText` e regenerado no backend quando nao vem do frontend.

O Ciclo 6 iniciou o Banco Inteligente reutilizavel:

- novos recursos recebem metadados minimos em `Resource.metadata`;
- tags pedagogicas e de acessibilidade sao normalizadas de forma deterministica;
- `GET /resources` lista recursos por `organizationId`;
- filtros por disciplina, serie, habilidade e necessidade usam metadados;
- busca simples por `q` consulta `ResourceVersion.contentText`;
- `/resources` oferece uma biblioteca inicial de recursos reutilizaveis.

## Proximos ciclos previstos

### Ciclo 2 - Motor Pedagogico Inicial

Implementar o primeiro nucleo real de interpretacao de missoes, ainda sem IA real. Toda missao deve passar por quatro etapas antes da geracao:

```txt
Contexto
-> Objetivo
-> Restricoes
-> Produto Esperado
```

Componentes previstos:

- `ContextResolver`;
- normalizacao de entrada;
- `KnowledgeRegistry` para protocolos, curriculos, legislacoes e evidencias;
- `DecisionEngine` como camada de decisao reutilizavel;
- geracao de `PedagogicalPlan`;
- testes unitarios fortes.

### Ciclo 4 - Persistencia de Missoes e Recursos

Conectar API, Prisma e banco para criar, consultar e versionar recursos.

### Ciclo 5 - Banco Inteligente Inicial

Adicionar metadados, busca por filtros e indexacao inicial de conhecimento.

### Ciclo 6 - Validacao e Recurso Editavel

Transformar o plano gerado em recurso editavel e validavel.

### Ciclo 7 - Banco Inteligente Inicial na Interface

Permitir consulta e reutilizacao dos primeiros recursos salvos.
