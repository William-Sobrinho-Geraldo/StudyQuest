-- ============================================================
-- PvP Assíncrono (V1): honra, duelos e RPC de combate instantâneo.
--
--   * profiles.honor_points / duels_won / duels_lost: placar PvP.
--   * public.compute_duel_power(uuid): "Poder Base" de um jogador,
--     igual a (level * 10) + ataque/defesa dos itens equipados.
--     A fórmula dos itens replica src/utils/itemStats.ts (modelo aditivo
--     de raridade + refino sobre a base por nível).
--   * public.execute_duel(uuid, uuid): resolve o duelo no backend,
--     aplica recompensas e devolve o resultado em jsonb.
--
-- Combate: Poder Final = Poder Base * Fator de Sorte (0.8..1.2).
--   * Atacante vence  -> +10 honra / +1 vitória (atacante), +1 derrota (defensor).
--   * Defensor vence  -> +5 honra / +1 vitória (defensor), +1 derrota (atacante).
-- ============================================================

-- 1. Colunas de PvP em profiles
-- ============================================================
alter table public.profiles
  add column if not exists honor_points integer not null default 0,
  add column if not exists duels_won integer not null default 0,
  add column if not exists duels_lost integer not null default 0;


-- 2. Helper: Poder Base de um jogador (level + itens equipados)
-- ============================================================
create or replace function public.compute_duel_power(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_level integer;
  v_attack numeric := 0;
  v_defense numeric := 0;
  v_rarity_bonus numeric;
  v_per_level numeric;
  v_final numeric;
  r record;
begin
  select coalesce(level, 0) into v_level
  from public.profiles
  where id = p_user_id;

  -- Somatório de Ataque (weapon) + Defesa (helmet/boots) dos equipamentos.
  -- chest contribui com HP e não entra no poder de duelo nesta V1.
  for r in
    select i.item_category,
           i.item_level,
           coalesce(i.enhancement_level, 0) as enhancement_level,
           i.rarity
    from public.inventory i
    where i.user_id = p_user_id
      and i.equipped = true
  loop
    v_rarity_bonus := case coalesce(r.rarity, 'common')
      when 'common' then 0
      when 'rare' then 20
      when 'epic' then 50
      when 'legendary' then 100
      else 0
    end;

    case r.item_category
      when 'weapon' then
        v_per_level := 2;
        v_final := round(
          (r.item_level::numeric * v_per_level)
          * (1 + (v_rarity_bonus + r.enhancement_level * 15) / 100.0)
        );
        v_attack := v_attack + v_final;
      when 'helmet' then
        v_per_level := 2;
        v_final := round(
          (r.item_level::numeric * v_per_level)
          * (1 + (v_rarity_bonus + r.enhancement_level * 15) / 100.0)
        );
        v_defense := v_defense + v_final;
      when 'boots' then
        v_per_level := 1;
        v_final := round(
          (r.item_level::numeric * v_per_level)
          * (1 + (v_rarity_bonus + r.enhancement_level * 15) / 100.0)
        );
        v_defense := v_defense + v_final;
      else
        null;
    end case;
  end loop;

  return v_level * 10 + v_attack + v_defense;
end;
$$;

revoke all on function public.compute_duel_power(uuid) from public;
grant execute on function public.compute_duel_power(uuid) to service_role;


-- 3. RPC: execute_duel
-- ============================================================
create or replace function public.execute_duel(p_attacker_id uuid, p_defender_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_attacker_power numeric;
  v_defender_power numeric;
  v_attacker_final numeric;
  v_defender_final numeric;
  v_winner uuid;
  v_honor_earned integer := 0;
begin
  if v_caller is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  if p_attacker_id is null or p_defender_id is null then
    return jsonb_build_object('error', 'ids_required');
  end if;

  if p_attacker_id = p_defender_id then
    return jsonb_build_object('error', 'cannot_duel_self');
  end if;

  if p_attacker_id <> v_caller then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  if not exists (select 1 from public.profiles where id = p_attacker_id) then
    return jsonb_build_object('error', 'attacker_not_found');
  end if;

  if not exists (select 1 from public.profiles where id = p_defender_id) then
    return jsonb_build_object('error', 'defender_not_found');
  end if;

  v_attacker_power := public.compute_duel_power(p_attacker_id);
  v_defender_power := public.compute_duel_power(p_defender_id);

  -- Fator de Sorte independente para cada lado (0.8 .. 1.2).
  v_attacker_final := v_attacker_power * (0.8 + random() * 0.4);
  v_defender_final := v_defender_power * (0.8 + random() * 0.4);

  if v_attacker_final > v_defender_final then
    v_winner := p_attacker_id;
    v_honor_earned := 10;

    update public.profiles
    set honor_points = honor_points + 10,
        duels_won = duels_won + 1
    where id = p_attacker_id;

    update public.profiles
    set duels_lost = duels_lost + 1
    where id = p_defender_id;
  else
    v_winner := p_defender_id;
    v_honor_earned := 5;

    update public.profiles
    set duels_lost = duels_lost + 1
    where id = p_attacker_id;

    update public.profiles
    set honor_points = honor_points + 5,
        duels_won = duels_won + 1
    where id = p_defender_id;
  end if;

  return jsonb_build_object(
    'winner_id', v_winner,
    'attacker_power', round(v_attacker_final, 2),
    'defender_power', round(v_defender_final, 2),
    'honor_earned', v_honor_earned
  );
end;
$$;

revoke all on function public.execute_duel(uuid, uuid) from public;
grant execute on function public.execute_duel(uuid, uuid) to authenticated;
grant execute on function public.execute_duel(uuid, uuid) to service_role;
