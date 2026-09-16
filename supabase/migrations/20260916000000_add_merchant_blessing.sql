-- Bênção do Mercador (Rewarded Video Ads no baú vazio).
--
-- 1. Contador diário de resgates por anúncio (máx. 10/dia, reset à meia-noite
--    no fuso do produto America/Sao_Paulo).
-- 2. RPC claim_merchant_blessing() que valida o limite e credita 10% de um
--    baú cheio (100 XP + 30 Gold) após um anúncio premiado concluído.
-- 3. Métrica 'ad_views' para quests (fonte 'ad' no rewards_log).
-- 4. Novas quests diária e semanal vinculadas à mecânica.

alter table public.profiles
  add column if not exists daily_ad_views integer not null default 0,
  add column if not exists daily_ad_views_date date;

create or replace function public.claim_merchant_blessing()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_tz text := 'America/Sao_Paulo';
  v_today date;
  v_count integer;
  v_last_date date;
  v_xp integer := 100;
  v_gold integer := 30;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  v_today := (now() at time zone v_tz)::date;

  insert into public.profiles (id, level, current_xp, gold)
  values (v_user, 1, 0, 0)
  on conflict (id) do nothing;

  select daily_ad_views, daily_ad_views_date
    into v_count, v_last_date
  from public.profiles
  where id = v_user;

  if v_last_date is distinct from v_today then
    v_count := 0;
  end if;

  if v_count >= 10 then
    raise exception 'limite diario atingido';
  end if;

  update public.profiles
  set daily_ad_views = v_count + 1,
      daily_ad_views_date = v_today,
      current_xp = current_xp + v_xp,
      gold = gold + v_gold
  where id = v_user;

  insert into public.rewards_log (user_id, xp, gold, source, source_id)
  values (v_user, v_xp, v_gold, 'ad', 'merchant_blessing');

  return json_build_object(
    'xp', v_xp,
    'gold', v_gold,
    'daily_ad_views', v_count + 1,
    'limit', 10
  );
end;
$$;

revoke all on function public.claim_merchant_blessing() from public;
grant execute on function public.claim_merchant_blessing() to authenticated;
grant execute on function public.claim_merchant_blessing() to service_role;

-- Métrica 'ad_views': conta anúncios premiados concluídos no período.
create or replace function public.quest_current_value(p_user uuid, p_metric text, p_period text)
returns bigint
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tz text := 'America/Sao_Paulo';
  v_start timestamp;
begin
  if p_user is null or p_metric is null then
    return 0;
  end if;

  if p_period = 'day' then
    v_start := date_trunc('day', now() at time zone v_tz);
  elsif p_period = 'week' then
    v_start := date_trunc('week', now() at time zone v_tz);
  else
    v_start := timestamp '-infinity';
  end if;

  case p_metric
    when 'sessions' then
      return (select count(*)::bigint
        from public.study_sessions s
        where s.user_id = p_user
          and s.completed_at is not null
          and (s.completed_at at time zone v_tz) >= v_start);
    when 'minutes' then
      return (select coalesce(sum(s.duration_minutes), 0)::bigint
        from public.study_sessions s
        where s.user_id = p_user
          and s.completed_at is not null
          and (s.completed_at at time zone v_tz) >= v_start);
    when 'single_session_minutes' then
      return (select coalesce(max(s.duration_minutes), 0)::bigint
        from public.study_sessions s
        where s.user_id = p_user
          and s.completed_at is not null
          and (s.completed_at at time zone v_tz) >= v_start);
    when 'gold_earned' then
      return (select coalesce(sum(r.gold), 0)::bigint
        from public.rewards_log r
        where r.user_id = p_user
          and (r.created_at at time zone v_tz) >= v_start);
    when 'daily_quests_claimed' then
      return (select count(*)::bigint
        from public.rewards_log r
        where r.user_id = p_user
          and r.source = 'quest'
          and r.source_id like 'daily-%'
          and (r.created_at at time zone v_tz) >= v_start);
    when 'ad_views' then
      return (select count(*)::bigint
        from public.rewards_log r
        where r.user_id = p_user
          and r.source = 'ad'
          and (r.created_at at time zone v_tz) >= v_start);
    when 'study_days_30' then
      return (select count(*)::bigint
        from (
          select 1
          from public.study_sessions s
          where s.user_id = p_user
            and s.completed_at is not null
            and (s.completed_at at time zone v_tz) >= v_start
          group by (s.completed_at at time zone v_tz)::date
          having sum(s.duration_minutes) >= 30
        ) d);
    when 'level' then
      return (select coalesce(p.level, 0)::bigint
        from public.profiles p
        where p.id = p_user);
    when 'gold_total' then
      return (select coalesce(p.gold, 0)::bigint
        from public.profiles p
        where p.id = p_user);
    when 'minutes_total' then
      return (select coalesce(sum(s.duration_minutes), 0)::bigint
        from public.study_sessions s
        where s.user_id = p_user
          and s.completed_at is not null);
    when 'sessions_total' then
      return (select count(*)::bigint
        from public.study_sessions s
        where s.user_id = p_user
          and s.completed_at is not null);
    else
      return 0;
  end case;
end;
$$;

-- Novas quests vinculadas à Bênção do Mercador.
insert into public.quests (id, category, trail, title, description, metric, period, target, reward_xp, reward_gold) values
('daily-10', 'daily', null, 'Visões do Mercador', 'Assista a 3 Visões do Mercador hoje.', 'ad_views', 'day', 3, 150, 30),
('weekly-8', 'weekly', null, 'Fiel ao Mercador', 'Resgate a Bênção do Mercador 15 vezes na semana.', 'ad_views', 'week', 15, 1200, 250)
on conflict (id) do nothing;
