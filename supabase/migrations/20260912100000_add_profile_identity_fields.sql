-- ============================================================
-- Perfil (Cartão de Visita de RPG): campos de identidade.
--   - study_goal: objetivo de estudo (ex.: "Concurso / OAB / Dev Pleno").
--   - bio: frase de efeito / apresentação.
-- ============================================================

alter table public.profiles
  add column if not exists study_goal text
    constraint profiles_study_goal_len_check check (char_length(study_goal) <= 50),
  add column if not exists bio text
    constraint profiles_bio_len_check check (char_length(bio) <= 120);

-- RLS profiles_update_own já autoriza o dono a atualizar a própria linha;
-- apenas estendemos o grant de colunas editáveis.
grant update (study_goal, bio) on public.profiles to authenticated;
