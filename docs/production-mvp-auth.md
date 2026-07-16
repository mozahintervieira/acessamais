# MVP de Producao: autenticacao e persistencia

## Decisao tecnica

O ACESSA+ usa autenticacao propria no Next.js para esta etapa do MVP:

- e-mail e senha;
- senha com hash `scrypt`;
- cookie de sessao HTTP-only assinado;
- Prisma + PostgreSQL quando `DATABASE_URL` estiver configurada;
- fallback local apenas para desenvolvimento sem banco.

Essa escolha evita dependencia externa nesta fase, funciona na Vercel e preserva a possibilidade futura de adicionar Google/Microsoft.

## Variaveis de ambiente

Obrigatorias para producao:

- `DATABASE_URL`: URL PostgreSQL usada pelo Prisma.
- `AUTH_SECRET`: segredo longo para assinar sessoes.
- `OPENAI_API_KEY`: chave da OpenAI para geracao real.

Recomendadas:

- `OPENAI_MODEL`: modelo usado pelo gateway de IA.
- `AUTH_COOKIE_SECURE=true`: forca cookie seguro quando o ambiente usa HTTPS.

Na Vercel, `AUTH_COOKIE_SECURE` tambem fica seguro automaticamente quando `VERCEL=1`.

## Migrations

Aplicar em producao:

```bash
pnpm --filter @acessa-plus/database prisma migrate deploy --schema prisma/schema.prisma
```

As migrations atuais criam:

- usuarios;
- sessoes;
- perfil do professor;
- escola;
- turmas;
- estudantes;
- missoes;
- recursos;
- versoes;
- eventos de uso.

## Teste manual recomendado

1. Abrir `/cadastro`.
2. Criar conta do Professor A.
3. Concluir `/onboarding`.
4. Criar uma turma em `/classes`.
5. Criar um estudante em `/students`.
6. Gerar material em `/planning/new`.
7. Abrir o material em `/missions`.
8. Sair.
9. Entrar novamente em `/login`.
10. Abrir o mesmo material salvo.
11. Criar conta do Professor B.
12. Confirmar que Professor B nao abre materiais do Professor A.

## Eventos registrados

- `USER_REGISTERED`
- `LOGIN`
- `PROFILE_COMPLETED`
- `CLASS_CREATED`
- `STUDENT_CREATED`
- `MATERIAL_GENERATED`
- `MATERIAL_SAVED`
- `MATERIAL_OPENED`

`MATERIAL_EXPORTED` esta previsto, mas ainda depende da integracao dos botoes de exportacao ao registro de eventos.

## Limitacoes atuais

- Recuperacao de senha ainda nao foi implementada.
- Login Google/Microsoft esta preparado arquiteturalmente, mas ainda nao ativo.
- Sem painel administrativo completo.
- Fallback sem `DATABASE_URL` nao deve ser usado como persistencia de producao.
