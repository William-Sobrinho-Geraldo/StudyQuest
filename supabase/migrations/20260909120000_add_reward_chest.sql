-- Baú de Recompensas (Idle Rewards): acúmulo passivo com teto de 8 horas.
-- Teto: 480 minutos => 1000 XP e 300 Gold. Acúmulo estritamente proporcional ao tempo.

-- Última reivindicação do baú. Default now() => o relógio começa na criação do perfil.
alter table public.profiles
  add column if not exists last_chest_claim timestamptz not null default now();

-- Reivindica o baú: calcula o tempo acumulado desde o último claim (teto de 480 min),
-- soma XP/Gold proporcionais ao perfil e reseta o acúmulo para now().
-- Só o RPC altera last_chest_claim (nenhum grant de update direto na coluna),
-- impedindo que o cliente "trave" o baú no máximo manualmente.
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
  v_xp integer;
  v_gold integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select last_chest_claim into v_last_claim
  from public.profiles
  where id = v_user;

  if v_last_claim is null then
    raise exception 'perfil nao encontrado';
  end if;

  v_elapsed_minutes := floor(extract(epoch from (now() - v_last_claim)) / 60.0);

  -- Botão desabilitado com menos de 1 minuto acumulado no front; validação server-side
  -- garante a mesma regra (evita spam de claims com recompensa zero).
  if v_elapsed_minutes < 1 then
    raise exception 'sem recompensas acumuladas';
  end if;

  -- Teto de 8h (480 min): acima disso trava no máximo até esvaziar o baú.
  v_capped_minutes := least(v_elapsed_minutes, 480.0);

  -- Proporção estrita com floor (nunca arredonda para cima).
  v_xp := floor((v_capped_minutes / 480.0) * 1000.0);
  v_gold := floor((v_capped_minutes / 480.0) * 300.0);

  insert into public.profiles (id, level, current_xp, gold)
  values (v_user, 1, 0, 0)
  on conflict (id) do nothing;

  update public.profiles
  set current_xp = current_xp + v_xp,
      gold = gold + v_gold,
      last_chest_claim = now()
  where id = v_user;

  -- Rastreia ganhos do baú no rewards_log (fonte 'chest') para métricas de gold earned.
  insert into public.rewards_log (user_id, xp, gold, source, source_id)
  values (v_user, v_xp, v_gold, 'chest', null);

  return query
  select * from public.profiles where id = v_user;
end;
$$;

revoke all on function public.claim_chest_reward() from public;
grant execute on function public.claim_chest_reward() to authenticated;
grant execute on function public.claim_chest_reward() to service_role;