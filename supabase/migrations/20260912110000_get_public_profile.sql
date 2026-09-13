-- ============================================================
-- Perfil Público: exposição segura (RPC) do perfil de outro
-- jogador para o PublicProfileModal do Ranking.
--   - Campos públicos de profiles (nome, tag, avatar, objetivo, bio,
--     nível, XP, streak).
--   - Estatísticas de foco agregadas de study_sessions.
--   - Itens equipados do inventory (para calcular status de combate).
--   - Relação de amizade do usuário logado com o alvo.
--
-- Usa security definer para ler apenas o necessário, sem abrir o RLS
-- de profiles/inventory para leitura pública (evita expor gold, etc.).
-- ============================================================

create or replace function public.get_public_profile(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile record;
  v_total_minutes bigint;
  v_session_count bigint;
  v_relation text;
  v_equipped jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_target_user_id is null then
    raise exception 'target_required';
  end if;

  select p.id, p.display_name, p.player_tag, p.avatar_id, p.study_goal, p.bio,
         p.level, p.current_xp, p.current_streak
  into v_profile
  from public.profiles p
  where p.id = p_target_user_id;

  if not found then
    raise exception 'player_not_found';
  end if;

  select coalesce(sum(s.duration_minutes), 0)::bigint,
         count(*)::bigint
  into v_total_minutes, v_session_count
  from public.study_sessions s
  where s.user_id = p_target_user_id;

  if v_uid = p_target_user_id then
    v_relation := 'self';
  else
    select case
      when f.status = 'accepted' then 'accepted'
      when f.status = 'pending' and f.user_id = v_uid then 'pending_out'
      when f.status = 'pending' and f.friend_id = v_uid then 'pending_in'
      else 'none'
    end into v_relation
    from public.friendships f
    where (f.user_id = v_uid and f.friend_id = p_target_user_id)
       or (f.user_id = p_target_user_id and f.friend_id = v_uid);
    v_relation := coalesce(v_relation, 'none');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'item_category', i.item_category,
      'item_level', i.item_level,
      'enhancement_level', i.enhancement_level,
      'rarity', i.rarity
    ) order by i.item_category
  ), '[]'::jsonb)
  into v_equipped
  from public.inventory i
  where i.user_id = p_target_user_id
    and i.equipped = true;

  return jsonb_build_object(
    'id', v_profile.id,
    'display_name', v_profile.display_name,
    'player_tag', v_profile.player_tag,
    'avatar_id', v_profile.avatar_id,
    'study_goal', v_profile.study_goal,
    'bio', v_profile.bio,
    'level', v_profile.level,
    'current_xp', v_profile.current_xp,
    'current_streak', v_profile.current_streak,
    'total_minutes', v_total_minutes,
    'session_count', v_session_count,
    'relation', v_relation,
    'equipped', v_equipped
  );
end;
$$;

revoke all on function public.get_public_profile(uuid) from public;
grant execute on function public.get_public_profile(uuid) to authenticated;
grant execute on function public.get_public_profile(uuid) to service_role;
