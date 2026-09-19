-- Marca sessões registradas manualmente (tempo esquecido) no histórico.
alter table public.study_sessions
  add column if not exists is_manual boolean not null default false;