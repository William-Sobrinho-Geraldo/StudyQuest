-- Ajuste da gamificação: métrica "daily_quests_claimed" (weekly-6 "Caçador de
-- Recompensas") deve contabilizar as diárias reivindicadas AO LONGO DA SEMANA,
-- não apenas as do dia corrente.
--
-- Contexto do reset (lazy, Opção B):
--   * Diárias  -> resetam às 00h00 (fuso do produto), via date_trunc('day').
--   * Semanais -> resetam às 00h00 de segunda, via date_trunc('week')
--                (PostgreSQL já inicia a semana ISO na segunda-feira).
--   * Fuso     -> 'America/Sao_Paulo' = Brasília (UTC-3, sem DST desde 2019).
--                O Supabase armazena timestamptz em UTC; toda conversão é feita
--                com `at time zone 'America/Sao_Paulo'` antes de truncar/comparar.
--
-- O reset é implementado por public.sync_user_quests(), que REMOVE as
-- reivindicações de diárias cuja data pertence a um dia anterior. Por isso a
-- métrica anterior (que lia public.quest_claims) só enxergava as diárias do dia
-- atual — nunca acumulava 10 na semana e tornava a weekly-6 impossível.
--
-- Solução: contar a partir de public.rewards_log (histórico append-only de
-- reivindicações, fonte 'quest' + source_id = id da quest), que nunca é removido.

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
      -- métricas da Forja ainda não possuem fonte de dados: progresso 0.
      return 0;
  end case;
end;
$$;
