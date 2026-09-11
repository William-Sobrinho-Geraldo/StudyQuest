-- ============================================================
-- Ranking Global (Hall da Fama)
-- Agrega minutos de estudo por usuário dentro de um período
-- (week | month | year), com desempate por XP no período e, em
-- último caso, pela conta mais antiga.
-- Base = todas as profiles (coalesce 0) para que a posição do
-- usuário logado seja sempre calculável (sticky card do app).
-- ============================================================

create or replace function public.get_global_ranking(p_period text)
returns table (
  pos bigint,
  user_id uuid,
  player_tag text,
  minutes bigint,
  xp_earned bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if lower(p_period) not in ('week', 'month', 'year') then
    raise exception 'invalid period';
  end if;

  v_since := now() - case lower(p_period)
    when 'week'  then interval '7 days'
    when 'month' then interval '30 days'
    when 'year'  then interval '365 days'
  end;

  return query
  with agg as (
    select
      p.id as user_id,
      p.player_tag,
      p.created_at,
      coalesce(sum(ss.duration_minutes), 0)::bigint as minutes,
      coalesce(sum(ss.xp), 0)::bigint as xp_earned
    from public.profiles p
    left join public.study_sessions ss
      on ss.user_id = p.id
      and ss.started_at >= v_since
    group by p.id, p.player_tag, p.created_at
  )
  select
    row_number() over (order by minutes desc, xp_earned desc, created_at asc)::bigint,
    user_id,
    player_tag,
    minutes,
    xp_earned
  from agg
  order by minutes desc, xp_earned desc, created_at asc
  limit 100;
end;
$$;

revoke all on function public.get_global_ranking(text) from public;
grant execute on function public.get_global_ranking(text) to authenticated;
grant execute on function public.get_global_ranking(text) to service_role;


-- Posição do usuário logado dentro do mesmo ranking completo.
create or replace function public.get_my_global_rank(p_period text)
returns table (
  pos bigint,
  minutes bigint,
  xp_earned bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_since timestamptz;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if lower(p_period) not in ('week', 'month', 'year') then
    raise exception 'invalid period';
  end if;

  v_since := now() - case lower(p_period)
    when 'week'  then interval '7 days'
    when 'month' then interval '30 days'
    when 'year'  then interval '365 days'
  end;

  return query
  with agg as (
    select
      p.id as user_id,
      p.created_at,
      coalesce(sum(ss.duration_minutes), 0)::bigint as minutes,
      coalesce(sum(ss.xp), 0)::bigint as xp_earned
    from public.profiles p
    left join public.study_sessions ss
      on ss.user_id = p.id
      and ss.started_at >= v_since
    group by p.id, p.created_at
  )
  select ranked.pos, ranked.minutes, ranked.xp_earned
  from (
    select
      row_number() over (order by minutes desc, xp_earned desc, created_at asc)::bigint as pos,
      user_id,
      minutes,
      xp_earned
    from agg
  ) ranked
  where ranked.user_id = v_uid;
end;
$$;

revoke all on function public.get_my_global_rank(text) from public;
grant execute on function public.get_my_global_rank(text) to authenticated;
grant execute on function public.get_my_global_rank(text) to service_role;


-- Índice para o filtro de janela (started_at >= now - intervalo).
create index if not exists study_sessions_started_at_idx
  on public.study_sessions (started_at);