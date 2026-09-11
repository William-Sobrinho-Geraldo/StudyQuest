-- ============================================================
-- Character Creation + Titles: perfil personalizável
-- ============================================================

-- Criação de Personagem e Títulos na tabela profiles
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_id text,
  add column if not exists equipped_title text,
  add column if not exists unlocked_titles text[] not null default '{}';

-- RLS profiles_update_own já autoriza o dono a atualizar a própria linha.
grant update (display_name, avatar_id, equipped_title, unlocked_titles)
  on public.profiles to authenticated;