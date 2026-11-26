-- ============================================================
-- Segurança e integridade das recompensas de estudo.
--
-- Remove a confiança em valores de XP/Gold vindos do cliente:
--  - create_study_session: cria a sessão e calcula a recompensa
--    base no servidor (15 XP / 3 Gold por minuto).
--  - complete_study_session: conclui e credita a recompensa
--    atomicamente (com multiplicador 2x de anúncio, se aplicável),
--    impedindo créditos duplicados via flag `rewarded`.
--  - create_manual_study_session: registra estudo manual com 30%
--    calculados no servidor.
--  - add_xp deixa de ser executável pelo cliente (apenas service_role).
--
-- A tabela study_sessions mantém as colunas existentes; adicionamos
-- apenas `rewarded` e `ad_rewarded`.
-- ============================================================

-- ------------------------------------------------------------------
-- 1. Colunas de estado de recompensa em study_sessions.
-- ------------------------------------------------------------------
alter table public.study_sessions
  add column if not exists rewarded boolean not null default false;

alter table public.study_sessions
  add column if not exists ad_rewarded boolean not null default false;

-- Sessões históricas (criadas antes desta migration) já foram
-- recompensadas pelo fluxo antigo: marca como recompensadas para que
-- nunca possam ser "concluídas" novamente pelo novo fluxo.
update public.study_sessions set rewarded = true where rewarded = false;

-- ------------------------------------------------------------------
-- 2. create_study_session(p_duration_minutes)
-- ------------------------------------------------------------------
create or replace function public.create_study_session(p_duration_minutes int)
returns setof public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_minutes int;
  v_xp int;
  v_gold int;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_duration_minutes is null or p_duration_minutes < 1 or p_duration_minutes > 90 then
    raise exception 'duracao invalida';
  end if;

  v_minutes := p_duration_minutes::int;
  v_xp := v_minutes * 15;
  v_gold := v_minutes * 3;

  insert into public.study_sessions
    (user_id, duration_minutes, xp, gold, started_at, completed_at, is_manual, rewarded, ad_rewarded)
  values
    (v_user, v_minutes, v_xp, v_gold, now() - make_interval(mins => v_minutes), now(), false, false, false)
  returning id into v_id;

  return query
  select * from public.study_sessions where id = v_id;
end;
$$;

-- ------------------------------------------------------------------
-- 3. complete_study_session(p_session_id, p_ad_watched)
-- ------------------------------------------------------------------
create or replace function public.complete_study_session(p_session_id uuid, p_ad_watched boolean default false)
returns setof public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_session public.study_sessions%rowtype;
  v_watched boolean := coalesce(p_ad_watched, false);
  v_mult int := case when v_watched then 2 else 1 end;
  v_xp int;
  v_gold int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_session_id is null then
    raise exception 'sessao nao informada';
  end if;

  select * into v_session
  from public.study_sessions
  where id = p_session_id and user_id = v_user;

  if not found then
    raise exception 'sessao nao encontrada';
  end if;

  if v_session.is_manual then
    raise exception 'sessao manual nao requer conclusao';
  end if;

  if v_session.rewarded then
    raise exception 'sessao ja recompensada';
  end if;

  v_xp := v_session.duration_minutes * 15 * v_mult;
  v_gold := v_session.duration_minutes * 3 * v_mult;

  -- Guarda anti duplicidade: só marca como recompensada se ainda não foi.
  update public.study_sessions
  set rewarded = true,
      ad_rewarded = v_watched,
      xp = v_xp,
      gold = v_gold
  where id = p_session_id
    and user_id = v_user
    and rewarded = false;

  if not found then
    raise exception 'sessao ja recompensada';
  end if;

  update public.profiles
  set current_xp = current_xp + v_xp,
      gold = gold + v_gold
  where id = v_user;

  insert into public.rewards_log (user_id, xp, gold, source, source_id)
  values (v_user, v_xp, v_gold, 'study', p_session_id);

  return query
  select * from public.study_sessions where id = p_session_id;
end;
$$;

-- ------------------------------------------------------------------
-- 4. create_manual_study_session(p_minutes)
-- ------------------------------------------------------------------
create or replace function public.create_manual_study_session(p_minutes int)
returns setof public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_minutes int;
  v_xp int;
  v_gold int;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_minutes is null or p_minutes < 1 or p_minutes > 90 then
    raise exception 'duracao invalida';
  end if;

  v_minutes := p_minutes::int;
  v_xp := floor((v_minutes * 15) * 0.3)::int;
  v_gold := floor((v_minutes * 3) * 0.3)::int;

  insert into public.study_sessions
    (user_id, duration_minutes, xp, gold, started_at, completed_at, is_manual, rewarded, ad_rewarded)
  values
    (v_user, v_minutes, v_xp, v_gold, now() - make_interval(mins => v_minutes), now(), true, true, false)
  returning id into v_id;

  update public.profiles
  set current_xp = current_xp + v_xp,
      gold = gold + v_gold
  where id = v_user;

  insert into public.rewards_log (user_id, xp, gold, source, source_id)
  values (v_user, v_xp, v_gold, 'study', v_id);

  return query
  select * from public.study_sessions where id = v_id;
end;
$$;

-- ------------------------------------------------------------------
-- 5. Grants.
-- ------------------------------------------------------------------
revoke all on function public.create_study_session(int) from public;
grant execute on function public.create_study_session(int) to authenticated;
grant execute on function public.create_study_session(int) to service_role;

revoke all on function public.complete_study_session(uuid, boolean) from public;
grant execute on function public.complete_study_session(uuid, boolean) to authenticated;
grant execute on function public.complete_study_session(uuid, boolean) to service_role;

revoke all on function public.create_manual_study_session(int) from public;
grant execute on function public.create_manual_study_session(int) to authenticated;
grant execute on function public.create_manual_study_session(int) to service_role;

-- add_xp deixa de ser chamável pelo cliente (crédito arbitrário removido).
revoke all on function public.add_xp(integer, integer) from public;
revoke execute on function public.add_xp(integer, integer) from authenticated;
grant execute on function public.add_xp(integer, integer) to service_role;

notify pgrst, 'reload schema';
