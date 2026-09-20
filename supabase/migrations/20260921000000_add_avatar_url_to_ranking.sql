-- ============================================================
-- get_global_ranking passa a expor avatar_url (fase de upload).
-- A RPC do ranking agora retorna, além do avatar_id gamificado,
-- a URL da foto personalizada (profiles.avatar_url) para o
-- frontend priorizar a foto quando ela existir. Recria a função
-- completa preservando o contrato acumulado (relação com o
-- usuário logado + avatar_id).
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
  avatar_url text,
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
    pr.avatar_url as avatar_url,
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