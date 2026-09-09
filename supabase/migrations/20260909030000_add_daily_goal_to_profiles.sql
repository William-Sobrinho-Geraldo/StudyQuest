alter table public.profiles
  add column if not exists daily_goal_minutes integer not null default 30
  constraint profiles_daily_goal_minutes_check check (daily_goal_minutes between 1 and 1200);

-- Meta é editável pelo próprio usuário (RLS profiles_update_own já cobre a linha).
grant update (current_xp, gold, daily_goal_minutes) on public.profiles to authenticated;

-- Minutos estudados hoje (fuso America/Sao_Paulo, mesma janela da sequência).
create or replace function public.today_study_minutes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_total integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(sum(s.duration_minutes), 0) into v_total
  from public.study_sessions s
  where s.user_id = v_uid
    and (s.completed_at at time zone 'America/Sao_Paulo')::date =
        (now() at time zone 'America/Sao_Paulo')::date;

  return v_total;
end;
$$;

revoke all on function public.today_study_minutes() from public;
grant execute on function public.today_study_minutes() to authenticated;
grant execute on function public.today_study_minutes() to service_role;