-- ============================================================
-- CRIAR USUÁRIO ADMIN + REGISTRAR COMO SUPER_ADMIN
-- ============================================================
-- E-mail: robsoncordeiro1966@gmail.com
-- Senha:  @#$Binho2020
--
-- Execute este script INTEIRO no SQL Editor do Supabase.
-- Se o usuário já existir, só adiciona em super_admins.
-- Se não existir, cria com e-mail JÁ VERIFICADO (sem precisar confirmar).
-- ============================================================

do $$
declare
  v_user_id uuid;
  v_password text := '@#$Binho2020';
  v_email    text := 'robsoncordeiro1966@gmail.com';
begin
  -- 1) Tenta localizar o usuário pelo e-mail
  select id into v_user_id
  from auth.users
  where email = v_email;

  -- 2) Se NÃO existir, cria o usuário no auth.users com senha + email verificado
  if v_user_id is null then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      null,
      null,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false,
      now(),
      now(),
      null,
      null,
      '',
      '',
      '',
      ''
    )
    returning id into v_user_id;

    raise notice 'Usuário criado com sucesso: % (UUID: %)', v_email, v_user_id;
  else
    raise notice 'Usuário já existia: % (UUID: %)', v_email, v_user_id;
  end if;

  -- 3) Garante que ele está na lista de super_admins
  insert into public.super_admins (user_id, created_at)
  values (v_user_id, now())
  on conflict (user_id) do nothing;

  raise notice 'Usuário % foi registrado como SUPER ADMIN ✅', v_email;
end $$;
