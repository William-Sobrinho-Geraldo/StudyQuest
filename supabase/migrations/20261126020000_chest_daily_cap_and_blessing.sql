-- ============================================================
-- Baú de Recompensas: teto diário de 100 XP / 20 Gold.
--
-- Mantém a acumulação por tempo (8h para encher o baú), mas limita o
-- total diário a 100 XP / 20 Gold por dia-calendário (America/Sao_Paulo),
-- independentemente do número de coletas.
--
-- Bênção do Mercador: reduz para 15 XP / 3 Gold por anúncio, com limite
-- de 3 utilizações diárias (o limite já era validado no banco via
-- daily_ad_views + daily_ad_views_date; aqui apenas mudam os números).
-- ============================================================

-- ------------------------------------------------------------------
-- 1. Colunas de controle do teto diário do baú.
-- ------------------------------------------------------------------
alter table public.profiles
  add column if not exists chest_xp_today integer not null default 0,
  add column if not exists chest_gold_today integer not null default 0,
  add column if not exists chest_day date;

-- ------------------------------------------------------------------
-- 2. claim_chest_reward com teto diário.
-- ------------------------------------------------------------------
create or replace function public.claim_chest_reward()
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_last_claim timestamptz;
  v_elapsed_minutes numeric;
  v_capped_minutes numeric;
  v_raw_xp int;
  v_raw_gold int;
  v_today date;
  v_xp_today int;
  v_gold_today int;
  v_day date;
  v_xp int;
  v_gold int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select last_chest_claim, chest_xp_today, chest_gold_today, chest_day
    into v_last_claim, v_xp_today, v_gold_today, v_day
  from public.profiles
  where id = v_user;

  if v_last_claim is null then
    raise exception 'perfil nao encontrado';
  end if;

  v_elapsed_minutes := floor(extract(epoch from (now() - v_last_claim)) / 60.0);

  if v_elapsed_minutes < 1 then
    raise exception 'sem recompensas acumuladas';
  end if;

  -- Teto de 8h (480 min) para um baú cheio: 100 XP / 20 Gold.
  v_capped_minutes := least(v_elapsed_minutes, 480.0);
  v_raw_xp := floor((v_capped_minutes / 480.0) * 100.0);
  v_raw_gold := floor((v_capped_minutes / 480.0) * 20.0);

  -- Teto diário por dia-calendário.
  v_today := (now() at time zone 'America/Sao_Paulo')::date;
  if v_day is distinct from v_today then
    v_xp_today := 0;
    v_gold_today := 0;
  end if;

  v_xp := least(v_raw_xp, greatest(100 - v_xp_today, 0));
  v_gold := least(v_raw_gold, greatest(20 - v_gold_today, 0));

  insert into public.profiles (id, level, current_xp, gold)
  values (v_user, 1, 0, 0)
  on conflict (id) do nothing;

  update public.profiles
  set current_xp = current_xp + v_xp,
      gold = gold + v_gold,
      last_chest_claim = now(),
      chest_xp_today = v_xp_today + v_xp,
      chest_gold_today = v_gold_today + v_gold,
      chest_day = v_today
  where id = v_user;

  return query
  select * from public.profiles where id = v_user;
end;
$$;

revoke all on function public.claim_chest_reward() from public;
grant execute on function public.claim_chest_reward() to authenticated;
grant execute on function public.claim_chest_reward() to service_role;

-- ------------------------------------------------------------------
-- 3. claim_merchant_blessing: 15 XP / 3 Gold, limite 3/dia.
-- ------------------------------------------------------------------
drop function if exists public.claim_merchant_blessing();

create or replace function public.claim_merchant_blessing()
returns jsonb
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
  v_xp integer := 15;
  v_gold integer := 3;
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

  if v_count >= 3 then
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

  return jsonb_build_object(
    'xp', v_xp,
    'gold', v_gold,
    'daily_ad_views', v_count + 1,
    'limit', 3
  );
end;
$$;

revoke all on function public.claim_merchant_blessing() from public;
grant execute on function public.claim_merchant_blessing() to authenticated;
grant execute on function public.claim_merchant_blessing() to service_role;

notify pgrst, 'reload schema';
