-- ACESSA+ - Schema profissional para Supabase/PostgreSQL
-- Objetivo: usuarios, cadastro profissional e acervo pedagogico reutilizavel.
-- Execute no SQL Editor do Supabase quando a autenticacao real for ativada.

create extension if not exists pgcrypto;

create type perfil_aee as enum (
  'DI',
  'TEA',
  'DV',
  'DA',
  'TDAH',
  'AH/SD',
  'MULTIPLAS'
);

create type origem_material as enum (
  'OFICIAL_ACESSA',
  'GERADO_IA',
  'ENVIADO_USUARIO',
  'REVISADO_EDITORIAL'
);

create type status_material as enum (
  'RASCUNHO',
  'PUBLICADO',
  'EM_REVISAO',
  'ARQUIVADO'
);

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  nome_completo varchar(180) not null,
  email varchar(180) unique not null,
  contato_whatsapp varchar(40),
  instituicao varchar(180),
  municipio varchar(120),
  estado char(2),
  area_atuacao varchar(80) not null default 'AEE',
  tipo_plano varchar(40) not null default 'FREE',
  aceita_contato boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  ultimo_acesso_em timestamptz
);

create table if not exists etapas_ensino (
  id uuid primary key default gen_random_uuid(),
  nome varchar(120) unique not null,
  ordem int not null default 0
);

create table if not exists anos_series (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references etapas_ensino(id) on delete cascade,
  nome varchar(80) not null,
  ordem int not null default 0,
  unique (etapa_id, nome)
);

create table if not exists disciplinas (
  id uuid primary key default gen_random_uuid(),
  nome varchar(120) unique not null,
  fase_prioridade int not null default 1,
  ativa boolean not null default true
);

create table if not exists habilidades (
  id uuid primary key default gen_random_uuid(),
  ano_serie_id uuid references anos_series(id) on delete set null,
  disciplina_id uuid references disciplinas(id) on delete set null,
  codigo varchar(40) not null,
  descricao text,
  objeto_conhecimento text,
  fonte_curricular varchar(120) default 'BNCC',
  tags text[] not null default '{}',
  unique (codigo, disciplina_id, ano_serie_id)
);

create table if not exists materiais_acervo (
  id uuid primary key default gen_random_uuid(),
  titulo varchar(220) not null,
  etapa_id uuid references etapas_ensino(id) on delete set null,
  ano_serie_id uuid references anos_series(id) on delete set null,
  disciplina_id uuid references disciplinas(id) on delete set null,
  habilidade_id uuid references habilidades(id) on delete set null,
  codigo_habilidade varchar(40),
  objeto_conhecimento text,
  origem origem_material not null default 'GERADO_IA',
  status status_material not null default 'RASCUNHO',
  criado_por uuid references usuarios(id) on delete set null,
  revisado_por uuid references usuarios(id) on delete set null,
  qualidade_editorial int check (qualidade_editorial between 1 and 10),
  payload_json jsonb not null,
  html_renderizado text,
  texto_busca text generated always as (
    lower(
      coalesce(titulo, '') || ' ' ||
      coalesce(codigo_habilidade, '') || ' ' ||
      coalesce(objeto_conhecimento, '')
    )
  ) stored,
  tags text[] not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists material_variantes_perfil (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materiais_acervo(id) on delete cascade,
  perfil perfil_aee not null,
  titulo varchar(220) not null,
  nivel_apoio varchar(80),
  nivel_leitura varchar(100),
  recursos_acessibilidade text[] not null default '{}',
  recursos_tateis text[] not null default '{}',
  recursos_caa jsonb not null default '{}'::jsonb,
  payload_json jsonb not null,
  html_renderizado text,
  pronto_para_impressao boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (material_id, perfil, nivel_apoio, nivel_leitura)
);

create table if not exists materiais_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  material_id uuid references materiais_acervo(id) on delete set null,
  titulo varchar(220) not null,
  etapa varchar(120),
  ano_serie varchar(80),
  disciplina varchar(120),
  codigo_habilidade varchar(40),
  perfis perfil_aee[] not null default '{}',
  conteudo_html text not null,
  payload_json jsonb not null default '{}'::jsonb,
  compartilhavel boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists contatos_interesse (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete cascade,
  nome varchar(180) not null,
  email varchar(180),
  contato_whatsapp varchar(40),
  canal_preferido varchar(40) default 'WhatsApp',
  origem varchar(80) default 'Cadastro ACESSA+',
  observacao text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_usuarios_email on usuarios (email);
create index if not exists idx_usuarios_contato on usuarios (contato_whatsapp);
create index if not exists idx_habilidades_codigo on habilidades (codigo);
create index if not exists idx_habilidades_disciplina_ano on habilidades (disciplina_id, ano_serie_id);
create index if not exists idx_materiais_catalogo on materiais_acervo (status, etapa_id, ano_serie_id, disciplina_id, codigo_habilidade);
create index if not exists idx_materiais_texto_busca on materiais_acervo using gin (to_tsvector('portuguese', texto_busca));
create index if not exists idx_materiais_tags on materiais_acervo using gin (tags);
create index if not exists idx_variantes_perfil on material_variantes_perfil (perfil, nivel_leitura, nivel_apoio);
create index if not exists idx_materiais_usuario_usuario on materiais_usuario (usuario_id, criado_em desc);

insert into etapas_ensino (nome, ordem) values
  ('Ensino Fundamental II', 1),
  ('Ensino Medio', 2),
  ('Educacao Profissional', 3),
  ('Formacao de professores', 4)
on conflict (nome) do nothing;

insert into disciplinas (nome, fase_prioridade) values
  ('Lingua Portuguesa', 1),
  ('Matematica', 1),
  ('Ciencias', 1),
  ('Historia', 1),
  ('Geografia', 1),
  ('Ingles', 2),
  ('Arte', 2),
  ('Educacao Fisica', 2),
  ('Ensino Religioso', 2)
on conflict (nome) do nothing;

-- Insercao dos anos do Ensino Fundamental II.
insert into anos_series (etapa_id, nome, ordem)
select e.id, v.nome, v.ordem
from etapas_ensino e
cross join (values
  ('6 Ano', 6),
  ('7 Ano', 7),
  ('8 Ano', 8),
  ('9 Ano', 9)
) as v(nome, ordem)
where e.nome = 'Ensino Fundamental II'
on conflict (etapa_id, nome) do nothing;

