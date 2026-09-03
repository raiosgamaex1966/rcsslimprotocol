-- ============================================================
-- RESET COMPLETO DO SUPABASE (DROP TUDO + RECRIA ESTRUTURA)
-- ============================================================
-- Perigo: Este script APAGA TODOS OS DADOS e OBJETOS do schema public
-- e também os buckets do storage. Execute APENAS se tiver certeza.
--
-- Como usar:
--   1. Acesse https://supabase.com/dashboard/project/rdujhnqwpqbchrxbnlfh
--   2. Vá em SQL Editor → New query
--   3. Cole TODO este arquivo e execute (Run)
--
-- O script é idempotente: se rodar de novo ele só limpa e recria.
-- ============================================================

set client_min_messages to warning;

-- ============================================================
-- 1) REMOVER OBJETOS DO SCHEMA public
-- ============================================================
do $$
declare
  r record;
begin
  -- 1a. Desativar RLS em todas as tabelas (evita erros ao dropar policies)
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table if exists %I.%I disable row level security', r.schemaname, r.tablename);
  end loop;

  -- 1b. Dropar TODAS as VIEWS de public (cascade)
  for r in
    select table_schema, table_name
    from information_schema.views
    where table_schema = 'public'
      and table_name not like 'pg_%'
  loop
    execute format('drop view if exists %I.%I cascade', r.table_schema, r.table_name);
  end loop;

  -- 1c. Dropar TODAS as TABELAS de public (cascade = também apaga FKs, índices, triggers)
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('drop table if exists %I.%I cascade', r.schemaname, r.tablename);
  end loop;

  -- 1d. Dropar TODAS as FUNCTIONS / PROCEDURES / AGGREGATES de public
  --     (prokind: f=função, p=procedure, a=aggregate, w=window)
  for r in
    select n.nspname, p.proname, oidvectortypes(p.proargtypes) as argtypes
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p', 'a', 'w')
  loop
    begin
      execute format('drop function if exists %I.%I(%s) cascade', r.nspname, r.proname, r.argtypes);
    exception when others then null;
    end;
  end loop;

  -- 1e. Dropar TIPOS ENUM customizados de public
  for r in
    select n.nspname, t.typname
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype = 'e'
  loop
    execute format('drop type if exists %I.%I cascade', r.nspname, r.typname);
  end loop;

  -- 1f. Dropar SEQUÊNCIAS de public
  for r in
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
  loop
    execute format('drop sequence if exists %I.%I cascade', r.sequence_schema, r.sequence_name);
  end loop;
end $$;

-- ============================================================
-- 2) BUCKET DE STORAGE (recria / atualiza configuração)
-- ============================================================
-- OBS: O Supabase NÃO permite DELETE direto via SQL em storage.objects
--      e storage.buckets (protege contra perda acidental).
--
-- Se precisar APAGAR o bucket 'exercise-videos' ANTES de rodar este
-- script, faça manualmente no painel:
--   Storage → Buckets → exercise-videos → ⋯ → Delete
--
-- O comando abaixo APENAS CRIA ou ATUALIZA o bucket (funciona via SQL):
-- ============================================================

-- ============================================================
-- 3) RECRIAR A ESTRUTURA DO PROJETO (schema oficial)
-- ============================================================

-- Tabela única de dados do paciente (jsonb) — simples e flexível
create table if not exists public.patient_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: cada paciente só acessa os próprios dados
alter table public.patient_data enable row level security;

create policy "paciente lê seus dados"
  on public.patient_data for select
  using (auth.uid() = user_id);

create policy "paciente insere seus dados"
  on public.patient_data for insert
  with check (auth.uid() = user_id);

create policy "paciente atualiza seus dados"
  on public.patient_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "paciente exclui seus dados"
  on public.patient_data for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Vínculos Paciente ⇄ Profissional (médico, nutricionista, personal)
-- ============================================================

-- Código curto que o paciente compartilha para ser localizado por um profissional
create table if not exists public.patient_codes (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.patient_codes enable row level security;

create policy "autenticados consultam código para vincular"
  on public.patient_codes for select
  using (auth.role() = 'authenticated');

create policy "paciente cria seu próprio código"
  on public.patient_codes for insert
  with check (auth.uid() = user_id);

create policy "paciente atualiza seu próprio código"
  on public.patient_codes for update
  using (auth.uid() = user_id);

-- Solicitações de vínculo entre profissional e paciente, com aprovação do paciente
create table if not exists public.patient_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  patient_name text not null,
  patient_email text not null,
  professional_id uuid not null references auth.users (id) on delete cascade,
  professional_name text not null,
  professional_email text not null,
  role text not null check (role in ('medico', 'nutricionista', 'personal')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'revogado')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table public.patient_links enable row level security;

create policy "paciente vê seus vínculos"
  on public.patient_links for select
  using (auth.uid() = patient_id);

create policy "profissional vê os vínculos que solicitou"
  on public.patient_links for select
  using (auth.uid() = professional_id);

create policy "profissional solicita vínculo"
  on public.patient_links for insert
  with check (auth.uid() = professional_id);

create policy "paciente aprova/recusa/revoga vínculo"
  on public.patient_links for update
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

-- Permite que um profissional com vínculo APROVADO leia os dados do paciente vinculado
create policy "profissional vinculado lê dados do paciente"
  on public.patient_data for select
  using (
    exists (
      select 1 from public.patient_links l
      where l.patient_id = patient_data.user_id
        and l.professional_id = auth.uid()
        and l.status = 'aprovado'
    )
  );

-- Permite que o profissional vinculado grave anotações/ajustes
create policy "profissional vinculado atualiza dados do paciente"
  on public.patient_data for update
  using (
    exists (
      select 1 from public.patient_links l
      where l.patient_id = patient_data.user_id
        and l.professional_id = auth.uid()
        and l.status = 'aprovado'
    )
  );

-- ============================================================
-- Super admins
-- ============================================================
create table if not exists public.super_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.super_admins enable row level security;

create policy "super admin lê a lista" on public.super_admins for select using (auth.uid() = user_id);

-- ============================================================
-- Configuração da LLM / app_config
-- ============================================================
create table if not exists public.app_config (
  id text primary key,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

create policy "usuários autenticados leem configurações públicas"
  on public.app_config for select
  using (auth.role() = 'authenticated');

create policy "super admin insere configurações"
  on public.app_config for insert
  with check (exists (select 1 from public.super_admins a where a.user_id = auth.uid()));

create policy "super admin atualiza configurações"
  on public.app_config for update
  using (exists (select 1 from public.super_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.super_admins a where a.user_id = auth.uid()));

-- ============================================================
-- Storage: bucket público para vídeos de exercícios
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-videos',
  'exercise-videos',
  true,
  157286400,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Remove políticas antigas do storage.objects (se existirem com nomes iguais/diferentes)
-- e recria as políticas corretas:
drop policy if exists "público visualiza vídeos de exercícios" on storage.objects;
drop policy if exists "super admin envia vídeos de exercícios" on storage.objects;
drop policy if exists "super admin remove vídeos de exercícios" on storage.objects;

create policy "público visualiza vídeos de exercícios"
  on storage.objects for select
  using (bucket_id = 'exercise-videos');

create policy "super admin envia vídeos de exercícios"
  on storage.objects for insert
  with check (
    bucket_id = 'exercise-videos'
    and exists (select 1 from public.super_admins a where a.user_id = auth.uid())
  );

create policy "super admin remove vídeos de exercícios"
  on storage.objects for delete
  using (
    bucket_id = 'exercise-videos'
    and exists (select 1 from public.super_admins a where a.user_id = auth.uid())
  );

-- ============================================================
-- FIM. Próximos passos (painel Supabase):
--   Authentication → Providers → Email:
--     • Ative "Confirm email"
--     • (Opcional) Ajuste o template do e-mail de confirmação
--   Authentication → URL Configuration:
--     • Site URL: https://seu-dominio (ou http://localhost:5173 no dev)
--     • Redirect URLs: adicione a URL de callback do seu app
--
-- Para registrar o primeiro super admin, rode (trocando pelo UUID):
--   insert into public.super_admins (user_id) values ('<UUID do usuário admin>');
-- ============================================================
