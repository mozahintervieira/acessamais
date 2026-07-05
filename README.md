# ACESSA+

Fundacao executavel do ACESSA+, organizada para preservar a independencia entre dominio, arquitetura e infraestrutura.

## Principio de engenharia

O dominio do ACESSA+ nao depende de framework, banco, provedor de IA ou interface. A arquitetura coordena contratos entre modulos, e a infraestrutura implementa adaptadores substituiveis.

## Requisitos

- Node.js 22+
- pnpm 11+
- Docker Desktop para PostgreSQL e Redis locais

## Desenvolvimento

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Servicos:

- Web: `http://localhost:3000`
- API: `http://localhost:3333`
- Health check: `http://localhost:3333/health`

## Scripts

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm db:generate
pnpm db:migrate
```

## Estrutura

```txt
apps/
  api/   Backend NestJS inicial
  web/   Frontend Next.js inicial
packages/
  database/ Prisma e migrations
  types/ Contratos de dominio compartilhados
  validators/ Schemas de entrada compartilhados
  pedagogical-core/ Nucleo pedagogico futuro, sem dependencia de IA
  ai-core/ Contratos de gateway de IA, sem provedor concreto
  security-core/ Tipos e politicas iniciais de seguranca/LGPD
```
