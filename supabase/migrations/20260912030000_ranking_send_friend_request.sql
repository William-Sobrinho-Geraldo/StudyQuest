-- ============================================================
-- Ranking: enviar solicitação de amizade a partir do user_id
-- e expor a relação do usuário logado com cada entry do ranking.
-- ============================================================

-- 1) RPC para enviar solicitação de amizade pelo user_id listado
--    no ranking (diferente do send_invite_by_tag, que recebe tag).
-- ============================================================
create or replace function public.send_invite_by_user(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender uuid := auth.uid();
  v_existing_id uuid;
begin
  if v_sender is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  if p_target_user_id is null then
    return jsonb_build_object('error', 'target_required');
  end if;

  if p_target_user_id = v_sender then
    return jsonb_build_object('error', 'cannot_add_self');
  end if;

  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    return jsonb_build_object('error', 'player_not_found');
  end if;

  -- Verificar se já existe amizade (em qualquer direção)
  select id into v_existing_id
  from public.friendships
  where (user_id = v_sender and friend_id = p_target_user_id)
     or (user_id = p_target_user_id and friend_id = v_sender);

  if v_existing_id is not null then
    return jsonb_build_object('error', 'already_friends_or_pending', 'friendship_id', v_existing_id);
  end if;

  insert into public.friendships (user_id, friend_id, status)
  values (v_sender, p_target_user_id, 'pending')
  returning id into v_existing_id;

  return jsonb_build_object(
    'success', true,
    'friendship_id', v_existing_id,
    'target_user_id', p_target_user_id
  );
end;
$$;

revoke all on function public.send_invite_by_user(uuid) from public;
grant execute on function public.send_invite_by_user(uuid) to authenticated;
grant execute on function public.send_invite_by_user(uuid) to service_role;


-- 2) get_global_ranking passa a expor a relação do usuário logado
--    com cada entry (self | friends | pending_out | pending_in | null)
--    para o frontend renderizar o botão já desabilitado quando for o caso.
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
