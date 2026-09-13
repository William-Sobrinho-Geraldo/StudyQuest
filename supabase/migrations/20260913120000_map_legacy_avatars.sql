-- ============================================================
-- Avatares: migração de IDs legados (presets antigos).
--
-- O sistema anterior usava presets de ícones (warrior/mage/ranger/
-- paladin). Como o catálogo agora é imagem-based (comum_1..5, epico,
-- lendario), remapeamos os IDs antigos para avatares comuns, evitando
-- que jogadores existentes fiquem sem imagem (fallback de inicial).
-- ============================================================

update public.profiles set avatar_id = 'comum_1' where avatar_id = 'warrior';
update public.profiles set avatar_id = 'comum_2' where avatar_id = 'mage';
update public.profiles set avatar_id = 'comum_3' where avatar_id = 'ranger';
update public.profiles set avatar_id = 'comum_4' where avatar_id = 'paladin';

-- Segurança: qualquer id fora do catálogo atual vira comum_1.
update public.profiles
  set avatar_id = 'comum_1'
  where avatar_id not in (
    'comum_1', 'comum_2', 'comum_3', 'comum_4', 'comum_5',
    'epico_6', 'epico_7', 'epico_8',
    'lendario_1', 'lendario_2'
  );
