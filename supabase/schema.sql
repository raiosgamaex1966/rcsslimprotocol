-- ============================================================
-- MinhaCaneta — Schema do Supabase
-- Execute este script no SQL Editor do seu projeto Supabase
-- (ou via CLI: supabase db push)
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

-- qualquer usuário autenticado pode CONSULTAR um código (para localizar o paciente),
-- mas só o próprio paciente pode criar/atualizar o seu
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

-- Permite que o profissional vinculado grave anotações/ajustes (notas, overrides, plano)
-- Em produção, prefira restringir via uma Edge Function que só altera os campos permitidos
-- (professionalNotes, nutritionOverride, workoutOverride) em vez de liberar o update completo.
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
-- Super admins (quem pode configurar a LLM de nutrição)
-- ============================================================
create table if not exists public.super_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.super_admins enable row level security;

create policy "super admin lê a lista" on public.super_admins for select using (auth.uid() = user_id);

-- Registre o usuário administrador:
--   insert into public.super_admins (user_id) values ('<uuid do admin>');

-- ============================================================
-- Configuração da LLM (chave/template) — na prática, em produção
-- a chave deve ficar em secrets de Edge Function (nunca no cliente).
-- Esta tabela é opcional para o protótipo; a configuração local
-- (localStorage) é usada quando ela não existe.
-- ============================================================
create table if not exists public.app_config (
  id text primary key,           -- ex.: 'llm_nutrition'
  config jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

create policy "usuários autenticados leem configurações públicas"
  on public.app_config for select
  using (auth.role() = 'authenticated');

-- Super admin pode tudo em app_config; profissionais autenticados podem inserir/atualizar a lista de vídeos ('exercise_videos')
create policy "super admin ou profissional gerencia vídeos"
  on public.app_config for insert
  with check (
    id = 'exercise_videos'
    or exists (select 1 from public.super_admins a where a.user_id = auth.uid())
  );

create policy "super admin ou profissional atualiza configurações"
  on public.app_config for update
  using (
    id = 'exercise_videos'
    or exists (select 1 from public.super_admins a where a.user_id = auth.uid())
  )
  with check (
    id = 'exercise_videos'
    or exists (select 1 from public.super_admins a where a.user_id = auth.uid())
  );

-- Bucket público para aulas e demonstrações dos especialistas.
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

create policy "público visualiza vídeos de exercícios"
  on storage.objects for select
  using (bucket_id = 'exercise-videos');

create policy "usuários autenticados enviam vídeos de exercícios"
  on storage.objects for insert
  with check (
    bucket_id = 'exercise-videos'
    and auth.role() = 'authenticated'
  );

create policy "usuários autenticados removem vídeos de exercícios"
  on storage.objects for delete
  using (
    bucket_id = 'exercise-videos'
    and auth.role() = 'authenticated'
  );

-- ============================================================
-- Configuração do projeto (Painel Supabase → Authentication):
-- 1. Email → "Confirm email" ATIVADO (envia link de verificação)
-- 2. Email → opcional: template de confirmação com link para
--    https://seu-dominio/#/verificar-email
-- 3. URL Configuration → Site URL: https://seu-dominio
--    Redirect URLs: https://seu-dominio/#/verificar-email
-- ============================================================

-- Variáveis de ambiente no projeto Vite (.env):
-- VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
-- VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
