-- ============================================================
-- Cache do Ranking Global (agregação em background)
--
-- 1) Índices de performance para a agregação por janela temporal.
--    O filtro (started_at >= now - intervalo) + agrupamento por
--    user_id é atendido por um índice composto com started_at na
--    frente. (A coluna de fim da sessão é completed_at; já temos
--    (user_id, completed_at) da migration de histórico.)
-- ============================================================

create index if not exists study_sessions_started_user_idx
  on public.study_sessions (started_at, user_id);


-- ============================================================
-- 2) Tabela física de resumo pré-calculado.
--    Uma linha por (user_id, time_frame). Sem RLS: leitura direta
--    só via RPC security definer; bloqueamos acesso por policy.
-- ============================================================

create table if not exists public.global_ranking_summary (
  user_id uuid not null references public.profiles (id) on delete cascade,
  time_frame text not null check (time_frame in ('weekly', 'monthly', 'yearly')),
  total_minutes integer not null default 0,
  rank_position integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, time_frame)
);

create index if not exists global_ranking_summary_frame_rank_idx
  on public.global_ranking_summary (time_frame, rank_position);

alter table public.global_ranking_summary enable row level security;


-- ============================================================
-- 3) Função de recálculo (executada em background).
--    Recalcula as posições de TODOS os usuários nos 3 recortes
--    temporais. Desempates preservados da Fase 3: minutos desc,
--    XP no período desc, conta mais antiga primeiro.
-- ============================================================

create or replace function public.refresh_global_ranking()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_frames text[] := array['weekly', 'monthly', 'yearly'];
  v_frame text;
  v_since timestamptz;
  v_now timestamptz := now();
begin
  truncate table public.global_ranking_summary;

  foreach v_frame in array v_frames loop
    v_since := case v_frame
      when 'weekly'  then v_now - interval '7 days'
      when 'monthly' then v_now - interval '30 days'
      when 'yearly'  then v_now - interval '365 days'
    end;

    insert into public.global_ranking_summary
      (user_id, time_frame, total_minutes, rank_position, updated_at)
    select
      p.id,
      v_frame,
      coalesce(sum(ss.duration_minutes), 0)::int as total_minutes,
      row_number() over (
        order by coalesce(sum(ss.duration_minutes), 0) desc,
                 coalesce(sum(ss.xp), 0) desc,
                 p.created_at asc
      )::int as rank_position,
      v_now as updated_at
    from public.profiles p
    left join public.study_sessions ss
      on ss.user_id = p.id
      and ss.started_at >= v_since
    group by p.id, p.created_at;
  end loop;
end;
$$;

revoke all on function public.refresh_global_ranking() from public;
grant execute on function public.refresh_global_ranking() to service_role;


-- ============================================================
-- 4) RPCs de leitura refatoradas: agora leem o cache, sem tocar
--    na tabela bruta de study_sessions.
-- ============================================================

drop function if exists public.get_global_ranking(text);

create or replace function public.get_global_ranking(
  p_period text,
  p_limit integer default 100
)
returns table (
  pos bigint,
  user_id uuid,
  player_tag text,
  minutes bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_frame text;
begin
  if auth.uid() is null then
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
    s.total_minutes::bigint as minutes
  from public.global_ranking_summary s
  left join public.profiles pr on pr.id = s.user_id
  where s.time_frame = v_frame
  order by s.rank_position asc
  limit greatest(1, coalesce(p_limit, 100));
end;
$$;

revoke all on function public.get_global_ranking(text, integer) from public;
grant execute on function public.get_global_ranking(text, integer) to authenticated;
grant execute on function public.get_global_ranking(text, integer) to service_role;


drop function if exists public.get_my_global_rank(text);

create or replace function public.get_my_global_rank(p_period text)
returns table (
  pos bigint,
  minutes bigint
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
    s.total_minutes::bigint as minutes
  from public.global_ranking_summary s
  where s.user_id = v_uid
    and s.time_frame = v_frame;
end;
$$;

revoke all on function public.get_my_global_rank(text) from public;
grant execute on function public.get_my_global_rank(text) to authenticated;
grant execute on function public.get_my_global_rank(text) to service_role;


-- ============================================================
-- 5) Primeira carga do cache (aquecimento imediato).
-- ============================================================

select public.refresh_global_ranking();