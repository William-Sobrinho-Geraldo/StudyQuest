-- ============================================================
-- Sprints de Estudo: RPCs da Fase 2
--  - create_sprint: criação atômica (sprint + criador como
--    primeiro participante), com validação da regra de ouro.
--  - get_sprint_rankings: ranking da guilda somando os minutos
--    de estudo (sessões) dentro da janela da sprint.
-- ============================================================

-- 1. create_sprint
-- ============================================================
create or replace function public.create_sprint(p_name text, p_duration_type text)
returns public.sprints
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_sprint public.sprints;
  v_end timestamptz;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'name_required';
  end if;

  if p_duration_type not in ('1_week', '2_weeks', '1_month') then
    raise exception 'invalid_duration_type';
  end if;

  if length(trim(p_name)) > 40 then
    raise exception 'name_too_long';
  end if;

  -- Regra de ouro: o criador não pode já estar numa sprint ativa.
  if exists (
    select 1
    from public.sprint_participants sp
    join public.sprints s on s.id = sp.sprint_id
    where sp.user_id = v_user and s.status = 'active'
  ) then
    raise exception 'user already has an active sprint';
  end if;

  v_end := now() + case p_duration_type
    when '1_week' then interval '7 days'
    when '2_weeks' then interval '14 days'
    else interval '1 month'
  end;

  insert into public.sprints (
    name, duration_type, start_date, end_date,
    created_by, max_participants, status
  )
  values (
    trim(p_name), p_duration_type, now(), v_end,
    v_user, 10, 'active'
  )
  returning * into v_sprint;

  -- Criador entra automaticamente como primeiro participante.
  insert into public.sprint_participants (sprint_id, user_id)
  values (v_sprint.id, v_user);

  return v_sprint;
end;
$$;

revoke all on function public.create_sprint(text, text) from public;
grant execute on function public.create_sprint(text, text) to authenticated;
grant execute on function public.create_sprint(text, text) to service_role;


-- 2. get_sprint_rankings
-- ============================================================
-- Soma os minutos de estudo (study_sessions.started_at) de cada
-- participante dentro de [start_date, end_date]. Publica player_tag
-- via security definer porque a RLS de profiles só permite SELECT
-- da própria linha.
create or replace function public.get_sprint_rankings(p_sprint_id uuid)
returns table (
  participant_id uuid,
  user_id uuid,
  player_tag text,
  minutes bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  return query
  select
    sp.id as participant_id,
    sp.user_id,
    p.player_tag,
    coalesce(sum(ss.duration_minutes), 0)::bigint as minutes
  from public.sprint_participants sp
  join public.sprints s on s.id = sp.sprint_id
  left join public.profiles p on p.id = sp.user_id
  left join public.study_sessions ss
    on ss.user_id = sp.user_id
    and ss.started_at >= s.start_date
    and ss.started_at <= s.end_date
  where sp.sprint_id = p_sprint_id
  group by sp.id, sp.user_id, p.player_tag
  order by minutes desc, player_tag asc nulls last;
end;
$$;

revoke all on function public.get_sprint_rankings(uuid) from public;
grant execute on function public.get_sprint_rankings(uuid) to authenticated;
grant execute on function public.get_sprint_rankings(uuid) to service_role;


-- 3. Índice auxiliar para agregação de sessões por usuário + data
-- ============================================================
create index if not exists study_sessions_user_started_idx
  on public.study_sessions (user_id, started_at);