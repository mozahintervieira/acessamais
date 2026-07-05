# Ciclo 1 - Fundacao Executavel

## Objetivo

Entregar a base tecnica operacional do ACESSA+ sem acoplar dominio, arquitetura e infraestrutura.

## Decisoes implementadas

- Monorepo com `apps/web`, `apps/api` e `packages/*`.
- Contratos de dominio em `@acessa-plus/types`.
- Validadores compartilhados em `@acessa-plus/validators`.
- Nucleo pedagogico inicial como interpretador de protocolos, sem regras pedagogicas fixas.
- AI core com adaptador `noop`, sem provedor externo.
- Security core com permissoes e isolamento por organizacao.
- Prisma e PostgreSQL preparados para entidades iniciais e `pgvector`.
- Backend NestJS inicial com health check e fronteiras arquitetonicas.
- Frontend Next.js minimo para confirmar a fundacao.

## Fora do ciclo

- Provedor real de IA.
- Regras detalhadas do Motor Pedagogico.
- Especialistas Virtuais completos.
- Fluxos finais de planejamento e adaptacao.
- Interface complexa.

## Como executar

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm test
pnpm typecheck
pnpm dev
```

## Criterios de aceite

- Monorepo instala dependencias.
- API compila e expõe `GET /health`.
- Web compila.
- Prisma valida schema e gera client.
- Testes iniciais passam.
- Ambiente fica pronto para iniciar o Motor Pedagogico no proximo ciclo.
