-- ============================================================
-- Rebalanceamento da economia de recompensas — Quests e métricas.
--
-- 1. Reduz as recompensas de XP/Gold das quests diárias e semanais.
-- 2. Reduz ~80% do XP e ~50% do Gold das conquistas principais.
-- 3. Corrige a daily-8 (Gold de foco, em vez de Gold total do dia).
-- 4. Corrige a métrica de Gold das conquistas de Economia (acumulado
--    via rewards_log, em vez do saldo atual).
-- 5. Adiciona a métrica 'gold_focus' em quest_current_value.
--
-- Migration idempotente (UPDATE + create or replace).
-- ============================================================

-- ------------------------------------------------------------------
-- 1. Quests diárias (referência: 450 XP / 90 Gold para d1–d8).
-- ------------------------------------------------------------------
update public.quests set reward_xp = 10,  reward_gold = 2   where id = 'daily-1';
update public.quests set reward_xp = 10,  reward_gold = 2   where id = 'daily-2';
update public.quests set reward_xp = 150, reward_gold = 30  where id = 'daily-3';
update public.quests set reward_xp = 10,  reward_gold = 2   where id = 'daily-4';
update public.quests set reward_xp = 10,  reward_gold = 2   where id = 'daily-5';
update public.quests set reward_xp = 160, reward_gold = 32  where id = 'daily-6';
update public.quests set reward_xp = 90,  reward_gold = 18  where id = 'daily-7';
update public.quests set reward_xp = 10,  reward_gold = 2   where id = 'daily-8';
update public.quests set reward_xp = 0,   reward_gold = 0   where id = 'daily-9';
update public.quests set reward_xp = 30,  reward_gold = 6   where id = 'daily-10';

-- ------------------------------------------------------------------
-- 2. Quests semanais (referência: 700 XP / 140 Gold para w1,w2,w3,w6,w7).
-- ------------------------------------------------------------------
update public.quests set reward_xp = 120, reward_gold = 24 where id = 'weekly-1';
update public.quests set reward_xp = 200, reward_gold = 40 where id = 'weekly-2';
update public.quests set reward_xp = 120, reward_gold = 24 where id = 'weekly-3';
update public.quests set reward_xp = 0,   reward_gold = 0  where id = 'weekly-4';
update public.quests set reward_xp = 0,   reward_gold = 0  where id = 'weekly-5';
update public.quests set reward_xp = 120, reward_gold = 24 where id = 'weekly-6';
update public.quests set reward_xp = 140, reward_gold = 28 where id = 'weekly-7';
update public.quests set reward_xp = 50,  reward_gold = 10 where id = 'weekly-8';

-- ------------------------------------------------------------------
-- 3. Conquistas principais: -80% XP, -50% Gold.
--    (Inclui as conquistas da Forja, que permanecem inacessíveis até
--    a métrica 'forge' existir — assim já ficam pré-balanceadas.)
-- ------------------------------------------------------------------
update public.quests
set reward_xp   = round(reward_xp * 0.2),
    reward_gold = round(reward_gold * 0.5)
where category = 'main';

-- ------------------------------------------------------------------
-- 4. daily-8: passa a medir Gold ganho APENAS com foco (evita que as
--    próprias recompensas de quest completem a quest automaticamente).
-- ------------------------------------------------------------------
update public.quests
set metric      = 'gold_focus',
    target      = 180,
    description = 'Acumule 180 de Gold apenas com sessões de foco no dia.'
where id = 'daily-8';

-- ------------------------------------------------------------------
-- 5. Conquistas de Economia: medem o Gold acumulado via rewards_log
--    (foco + quests + anúncios) em vez do saldo atual (gold_total).
-- ------------------------------------------------------------------
update public.quests
set metric = 'gold_earned'
where id in (
  'main-economy-1',
  'main-economy-2',
  'main-economy-3',
  'main-economy-4',
  'main-economy-5',
  'main-economy-6'
);

-- ------------------------------------------------------------------
-- 6. quest_current_value: recria com a métrica 'gold_focus'.
--    (Espelha a versão mais recente — 20260916000000 — e adiciona
--    o caso 'gold_focus'.)
-- ------------------------------------------------------------------
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
    when 'gold_focus' then
      return (select coalesce(sum(r.gold), 0)::bigint
        from public.rewards_log r
        where r.user_id = p_user
          and r.source = 'study'
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

revoke all on function public.quest_current_value(uuid, text, text) from public;
grant execute on function public.quest_current_value(uuid, text, text) to service_role;

notify pgrst, 'reload schema';
