alter table public.profiles
  add column if not exists current_streak integer not null default 0,
  add column if not exists last_streak_date date;

-- Sequência em dias consecutivos com pelo menos 20min de estudo por dia.
-- Janela de dia no fuso America/Sao_Paulo (produto BR).
create or replace function public.compute_streak(p_user_id uuid, p_tz text default 'America/Sao_Paulo')
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_tz text := coalesce(p_tz, 'UTC');
  v_today date;
  v_day date;
  v_streak integer := 0;
begin
  if p_user_id is null then
    return 0;
  end if;

  v_today := (now() at time zone v_tz)::date;

  -- Dia atual ainda em andamento: se hoje já qualifica, ancora em hoje;
  -- senão ancora em ontem (já encerrado) se qualificar; senão sequência zerada.
  if exists (
    select 1
    from public.study_sessions s
    where s.user_id = p_user_id
      and (s.completed_at at time zone v_tz)::date = v_today
    group by (s.completed_at at time zone v_tz)::date
    having sum(s.duration_minutes) >= 20
  ) then
    v_day := v_today;
  elsif exists (
    select 1
    from public.study_sessions s
    where s.user_id = p_user_id
      and (s.completed_at at time zone v_tz)::date = v_today - 1
    group by (s.completed_at at time zone v_tz)::date
    having sum(s.duration_minutes) >= 20
  ) then
    v_day := v_today - 1;
  else
    return 0;
  end if;

  while exists (
    select 1
    from public.study_sessions s
    where s.user_id = p_user_id
      and (s.completed_at at time zone v_tz)::date = v_day
    group by (s.completed_at at time zone v_tz)::date
    having sum(s.duration_minutes) >= 20
  ) loop
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;

  return v_streak;
end;
$$;

-- Materializa a sequência na profiles (fonte de verdade continua study_sessions).
create or replace function public.refresh_streak_for(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_streak integer;
begin
  if p_user_id is null then
    return 0;
  end if;

  v_streak := public.compute_streak(p_user_id, 'America/Sao_Paulo');

  update public.profiles
  set current_streak = v_streak,
      last_streak_date = case
        when v_streak > 0 then (
          select max(d)
          from (
            select (s.completed_at at time zone 'America/Sao_Paulo')::date as d
            from public.study_sessions s
            where s.user_id = p_user_id
            group by 1
            having sum(s.duration_minutes) >= 20
          ) sub
        )
        else null
      end
  where id = p_user_id;

  return v_streak;
end;
$$;

-- RPC público usado pelo dashboard.
create or replace function public.refresh_streak()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  return public.refresh_streak_for(v_uid);
end;
$$;

-- Recalcula a sequência sempre que uma sessão é concluída.
create or replace function public.sync_profile_streak()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_streak_for(new.user_id);
  return new;
end;
$$;

drop trigger if exists profiles_sync_streak_on_session on public.study_sessions;
create trigger profiles_sync_streak_on_session
  after insert on public.study_sessions
  for each row execute procedure public.sync_profile_streak();

revoke all on function public.compute_streak(uuid, text) from public;
revoke all on function public.refresh_streak_for(uuid) from public;
revoke all on function public.refresh_streak() from public;
grant execute on function public.compute_streak(uuid, text) to service_role;
grant execute on function public.refresh_streak_for(uuid) to service_role;
grant execute on function public.refresh_streak() to authenticated;
grant execute on function public.refresh_streak() to service_role;