-- =====================================================================
-- Cria (ou redefine) um usuário de DEMONSTRAÇÃO já confirmado.
-- Use no Supabase > SQL Editor > New query > cole > Run.
--
-- ⚠️ Troque a senha AQUI NO SQL EDITOR antes de rodar. Não salve a
--    senha real neste arquivo nem a envie para o GitHub.
-- Pode rodar quantas vezes quiser: se o usuário já existir, a senha
-- é redefinida e o e-mail é confirmado de novo.
-- =====================================================================
do $$
declare
  v_email text := 'demo@pousocurral.com';   -- e-mail de login (não precisa existir)
  v_senha text := 'TROQUE-ESTA-SENHA';      -- escolha a senha antes de rodar
  v_id    uuid;
begin
  select id into v_id from auth.users where email = v_email;

  if v_id is not null then
    update auth.users
       set encrypted_password = extensions.crypt(v_senha, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_id;
    raise notice 'Usuário % já existia: senha redefinida.', v_email;
    return;
  end if;

  v_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(v_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  raise notice 'Usuário % criado com sucesso.', v_email;
end $$;
