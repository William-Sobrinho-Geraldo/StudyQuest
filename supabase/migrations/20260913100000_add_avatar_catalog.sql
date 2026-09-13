-- ============================================================
-- Catálogo de Avatares (Fase 1 - Dados e Catálogo)
--   - avatar_id: avatar equipado pelo jogador (default 'comum_1').
--   - unlocked_avatars: avatares já desbloqueados. Os comuns vêm
--     liberados por padrão; épicos/lendários são desbloqueados via
--     Mercado (fase posterior) por RPC security definer — por isso
--     NÃO concedemos grant de update nessa coluna ao usuário.
--   - As RPCs de leitura de perfil e ranking passam a expor essas
--     colunas.
-- ============================================================

-- 1) Colunas de avatar na tabela profiles.
alter table public.profiles
  add column if not exists unlocked_avatars text[] not null
    default array['comum_1', 'comum_2', 'comum_3', 'comum_4', 'comum_5'];

alter table public.profiles
  alter column avatar_id set default 'comum_1';

-- Backfill de dados legados: jogadores sem avatar equipado passam
-- a usar o avatar comum padrão.
update public.profiles
  set avatar_id = 'comum_1'
  where avatar_id is null;


-- ============================================================
-- 2) get_public_profile: expõe unlocked_avatars (além do avatar_id
--    já existente).
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

  select p.id, p.display_name, p.player_tag, p.avatar_id,
         p.unlocked_avatars, p.study_goal, p.bio,
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
    'unlocked_avatars', v_profile.unlocked_avatars,
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


-- ============================================================
-- 3) get_global_ranking: expõe avatar_id de cada entry.
-- ============================================================

drop function if exists public.get_global_ranking(text, integer);

create or replace function public.get_global_ranking(
  p_period text,
  p_limit integer default 100
)
returns table (
  pos bigint,
  user_id uuid,
  player_tag text,
  avatar_id text,
  minutes bigint,
  relation text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_frame text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if lower(p_period) not in ('week', 'month', 'year') then
    raise exception 'invalid period';
  end if;

  v_frame := case lower(p_period)
    when 'week'  then 'weekly'
    when 'month' then 'monthly'
    else 'yearly'
  end;

  return query
  select
    s.rank_position::bigint as pos,
    s.user_id as user_id,
    pr.player_tag as player_tag,
    pr.avatar_id as avatar_id,
    s.total_minutes::bigint as minutes,
    case
      when s.user_id = v_uid then 'self'
      when f.status = 'accepted' then 'friends'
      when f.status = 'pending' and f.user_id = v_uid then 'pending_out'
      when f.status = 'pending' and f.friend_id = v_uid then 'pending_in'
      else null
    end::text as relation
  from public.global_ranking_summary s
  left join public.profiles pr on pr.id = s.user_id
  left join public.friendships f
    on (f.user_id = v_uid and f.friend_id = s.user_id)
    or (f.user_id = s.user_id and f.friend_id = v_uid)
  where s.time_frame = v_frame
  order by s.rank_position asc
  limit greatest(1, coalesce(p_limit, 100));
end;
$$;

revoke all on function public.get_global_ranking(text, integer) from public;
grant execute on function public.get_global_ranking(text, integer) to authenticated;
grant execute on function public.get_global_ranking(text, integer) to service_role;
