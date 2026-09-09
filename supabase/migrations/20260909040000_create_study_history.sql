-- Histórico de estudo agregado por período (fuso America/Sao_Paulo, mesma
-- janela da sequência/meta diária). Fonte: study_sessions.
create index if not exists study_sessions_user_completed_idx
  on public.study_sessions (user_id, completed_at);

create or replace function public.study_history(p_period text, p_anchor date default null)
returns table (
  bucket_date date,
  hour integer,
  minutes bigint,
  sessions bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_anchor date := coalesce(p_anchor, (now() at time zone 'America/Sao_Paulo')::date);
  v_start date;
  v_end date;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  case lower(p_period)
    when 'day' then
      -- Buckets por hora do dia (0..23), zerados para eixo consistente.
      v_start := v_anchor;
      v_end := v_anchor;
      return query
        select v_anchor::date, g.h::int, coalesce(sum(s.minutes), 0)::bigint, coalesce(sum(s.cnt), 0)::bigint
        from generate_series(0, 23) g(h)
        left join (
          select (ss.completed_at at time zone 'America/Sao_Paulo')::date as d,
                 extract(hour from (ss.completed_at at time zone 'America/Sao_Paulo'))::int as h,
                 sum(ss.duration_minutes)::bigint as minutes,
                 count(*)::bigint as cnt
          from public.study_sessions ss
          where ss.user_id = v_uid
            and (ss.completed_at at time zone 'America/Sao_Paulo')::date between v_start and v_end
          group by 1, 2
        ) s on s.h = g.h
        group by g.h
        order by g.h;
    when 'week' then
      -- Semana de segunda a domingo que contém a âncora.
      v_start := v_anchor - ((extract(dow from v_anchor)::int + 6) % 7);
      v_end := v_start + 6;
      return query
        select g.d::date, 0::int, coalesce(sum(s.minutes), 0)::bigint, coalesce(sum(s.cnt), 0)::bigint
        from generate_series(v_start, v_end, interval '1 day') g(d)
        left join (
          select (ss.completed_at at time zone 'America/Sao_Paulo')::date as d,
                 sum(ss.duration_minutes)::bigint as minutes,
                 count(*)::bigint as cnt
          from public.study_sessions ss
          where ss.user_id = v_uid
          group by 1
        ) s on s.d = g.d::date
        group by g.d
        order by g.d;
    when 'month' then
      -- Mês inteiro que contém a âncora.
      v_start := v_anchor - (extract(day from v_anchor)::int - 1);
      v_end := (v_start + interval '1 month' - interval '1 day')::date;
      return query
        select g.d::date, 0::int, coalesce(sum(s.minutes), 0)::bigint, coalesce(sum(s.cnt), 0)::bigint
        from generate_series(v_start, v_end, interval '1 day') g(d)
        left join (
          select (ss.completed_at at time zone 'America/Sao_Paulo')::date as d,
                 sum(ss.duration_minutes)::bigint as minutes,
                 count(*)::bigint as cnt
          from public.study_sessions ss
          where ss.user_id = v_uid
          group by 1
        ) s on s.d = g.d::date
        group by g.d
        order by g.d;
    else
      raise exception 'periodo invalido: %', p_period;
  end case;
end;
$$;

revoke all on function public.study_history(text, date) from public;
grant execute on function public.study_history(text, date) to authenticated;
grant execute on function public.study_history(text, date) to service_role;