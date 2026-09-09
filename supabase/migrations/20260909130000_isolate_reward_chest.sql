-- Baú de Recompensas: bônus do jogador assíduo, fora de qualquer métrica de quest.
-- Remove o registro em rewards_log (fonte 'chest'): o ouro do baú não deve alimentar
-- o "Caçador de Ouro" (gold_earned) nem qualquer outra métrica baseada em log.
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

  return query
  select * from public.profiles where id = v_user;
end;
$$;

revoke all on function public.claim_chest_reward() from public;
grant execute on function public.claim_chest_reward() to authenticated;
grant execute on function public.claim_chest_reward() to service_role;