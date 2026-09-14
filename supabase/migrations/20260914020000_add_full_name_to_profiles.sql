-- Adiciona a coluna full_name na tabela profiles para espelhar o nome
-- real do usuário (capturado no cadastro em auth.users.raw_user_meta_data)
-- e permitir atualização via app.

alter table public.profiles
  add column if not exists full_name text;

grant update (full_name) on public.profiles to authenticated;

notify pgrst, 'reload schema';
