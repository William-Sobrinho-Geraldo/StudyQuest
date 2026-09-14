-- Adiciona Nome e E-mail em texto plano na tabela user_feedbacks
-- para facilitar a triagem direto no painel do Supabase.

alter table public.user_feedbacks
  add column if not exists user_name text;

alter table public.user_feedbacks
  add column if not exists user_email text;

notify pgrst, 'reload schema';
