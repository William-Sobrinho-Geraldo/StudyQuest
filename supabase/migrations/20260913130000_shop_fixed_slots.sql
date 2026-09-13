-- ═══════════════════════════════════════════════════════════════════
-- Mercado Rotativo: vitrine fixa de 6 slots (grid 3x2).
--
-- Distribuição fixa por slot:
--   Slot 1 → weapon   (Arma)
--   Slot 2 → helmet   (Elmo)
--   Slot 3 → chest    (Peitoral)
--   Slot 4 → boots    (Bota)
--   Slot 5 → Curinga  (qualquer equipamento)
--   Slot 6 → Avatar   (vitrine exclusiva de avatares cosméticos)
--
-- Regra do Slot 6 (avatar):
--   • Somente avatares isMarketObtainable (epico_6/7/8 e lendario_1)
--     que o usuário ainda NÃO possui em profiles.unlocked_avatars.
--   • 15% de chance de lendario_1; 85% distribuído uniformemente
--     entre os épicos restantes.
--   • Sem lendario_1 no pool → 100% épicos restantes.
--   • Coleção completa → fallback amigável (item_category
--     'collection_complete'), sem botão de compra.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.refresh_shop(p_player_level int)
returns table (
  slot int,
  rarity text,
  item_category text,
  item_level int,
  name text,
  attack int,
  defense int,
  hp int,
  price int,
  bought boolean,
  next_refresh_at timestamptz,
  refreshes_today int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user          uuid := auth.uid();
  v_base_tier     int;
  v_tier_options  int[] := array[10]::int[];
  v_used_names    text[] := '{}'::text[];
  v_unlocked      text[] := '{}'::text[];
  v_epics         text[] := '{}'::text[];
  v_has_leg       boolean := false;
  v_shop          public.rotating_shop%rowtype;
  v_slot          int;
  v_rarity        text;
  v_cat           text;
  v_level         int;
  v_name          text;
  v_atk           int;
  v_def           int;
  v_hp            int;
  v_price         int;
  v_r_mult        numeric;
  v_t_mult        numeric;
  v_next          timestamptz;
  v_slots         jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- avatares já desbloqueados pelo usuário
  select coalesce(p.unlocked_avatars, '{}'::text[]) into v_unlocked
  from public.profiles p
  where p.id = v_user;

  -- épicos ainda não obtidos (para o slot 6)
  select array_agg(a.id order by a.id) into v_epics
  from (values ('epico_6'), ('epico_7'), ('epico_8')) as a(id)
  where a.id <> all(v_unlocked);
  v_epics := coalesce(v_epics, '{}'::text[]);

  v_has_leg := not ('lendario_1' = any(v_unlocked));

  -- 3 tiers do bracket: abaixo/atual/acima do piso do nível do jogador.
  v_base_tier := floor(p_player_level / 10.0) * 10;
  select array_agg(t.x order by t.x) into v_tier_options
    from unnest(array[v_base_tier - 10, v_base_tier, v_base_tier + 10]) as t(x)
    where t.x between 10 and 100;
  if v_tier_options is null or cardinality(v_tier_options) = 0 then
    v_tier_options := array[10]::int[];
  end if;

  -- garante existência da linha do shop
  insert into public.rotating_shop (user_id) values (v_user)
    on conflict (user_id) do nothing;

  select * into v_shop from public.rotating_shop where rotating_shop.user_id = v_user;

  v_next := now() + interval '24 hours';

  for v_slot in 1..6 loop
    if v_slot = 6 then
      -- ── Slot 6: vitrine exclusiva de avatar ─────────────────────
      if cardinality(v_epics) = 0 and not v_has_leg then
        v_rarity := 'common';
        v_cat    := 'collection_complete';
        v_level  := 0;
        v_name   := '';
        v_atk    := 0;
        v_def    := 0;
        v_hp     := 0;
        v_price  := 0;
      elsif v_has_leg and (cardinality(v_epics) = 0 or random() < 0.15) then
        v_rarity := 'legendary';
        v_cat    := 'avatar';
        v_level  := 0;
        v_name   := 'lendario_1';
        v_atk    := 0;
        v_def    := 0;
        v_hp     := 0;
        v_price  := public.avatar_shop_price('legendary');
      else
        v_rarity := 'epic';
        v_cat    := 'avatar';
        v_level  := 0;
        v_name   := v_epics[1 + floor(random() * cardinality(v_epics))::int];
        v_atk    := 0;
        v_def    := 0;
        v_hp     := 0;
        v_price  := public.avatar_shop_price('epic');
      end if;
    else
      -- ── Slots 1-5: equipamento ───────────────────────────────────
      v_rarity := public.rarity_for_slot();

      if v_slot <= 4 then
        v_cat := (array['weapon', 'helmet', 'chest', 'boots'])[v_slot];
      else
        v_cat := public.random_slot_category();
      end if;

      v_level := v_tier_options[public.random_int(1, cardinality(v_tier_options))];

      v_name := public.gear_name(v_cat, v_rarity, v_used_names);
      v_used_names := v_used_names || v_name;

      v_atk := case when v_cat = 'weapon' then v_level * 2 else 0 end;
      v_def := case when v_cat in ('helmet','boots') then v_level else 0 end;
      v_hp  := case when v_cat = 'chest' then v_level * 10 else 0 end;

      v_r_mult := case v_rarity
        when 'common'    then 1.0
        when 'rare'      then 1.8
        when 'epic'      then 3.0
        when 'legendary' then 5.0
        else 1.0
      end;
      v_t_mult := 1.0 + (v_level / 10.0 - 1) * 0.5;

      v_price := case v_cat
        when 'weapon' then 80
        when 'helmet' then 50
        when 'chest'  then 120
        when 'boots'  then 50
      end;
      v_price := round(v_price * v_r_mult * v_t_mult)::int;
    end if;

    -- persiste no slot correspondente
    execute format(
      'update public.rotating_shop
         set slot_%s_rarity   = $1,
             slot_%s_category = $2,
             slot_%s_level    = $3,
             slot_%s_name     = $4,
             slot_%s_attack   = $5,
             slot_%s_defense  = $6,
             slot_%s_hp       = $7,
             slot_%s_price    = $8,
             slot_%s_bought   = false
       where user_id = $9',
      v_slot, v_slot, v_slot, v_slot,
      v_slot, v_slot, v_slot, v_slot, v_slot
    ) using v_rarity, v_cat, v_level, v_name, v_atk, v_def, v_hp, v_price, v_user;

    -- acumula para retorno
    v_slots := v_slots || jsonb_build_object(
      'slot', v_slot,
      'rarity', v_rarity,
      'item_category', v_cat,
      'item_level', v_level,
      'name', v_name,
      'attack', v_atk,
      'defense', v_def,
      'hp', v_hp,
      'price', v_price,
      'bought', false
    );
  end loop;

  -- atualiza meta
  update public.rotating_shop as rs
    set next_refresh_at = v_next,
        refreshes_today = rs.refreshes_today + 1
    where rs.user_id = v_user;

  -- retorno: slots + meta
  return query
  select
    (elem->>'slot')::int,
    (elem->>'rarity')::text,
    (elem->>'item_category')::text,
    (elem->>'item_level')::int,
    (elem->>'name')::text,
    (elem->>'attack')::int,
    (elem->>'defense')::int,
    (elem->>'hp')::int,
    (elem->>'price')::int,
    (elem->>'bought')::boolean,
    v_next,
    (select rs2.refreshes_today from public.rotating_shop rs2 where rs2.user_id = v_user)
  from jsonb_array_elements(v_slots) elem;
end;
$$;

revoke all on function public.refresh_shop(int) from public;
grant execute on function public.refresh_shop(int) to authenticated;
grant execute on function public.refresh_shop(int) to service_role;


-- pick_shop_avatar deixou de ser usado (sorteio do slot 6 agora é inline).
drop function if exists public.pick_shop_avatar(text[], text[], text);


-- ═══════════════════════════════════════════════════════════════════
-- buy_shop_item(p_slot_number) — com guarda para 'collection_complete'.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.buy_shop_item(p_slot_number int)
returns table (
  shop_slot int,
  shop_bought boolean,
  inventory_id uuid,
  inventory_name text,
  inventory_item_category text,
  inventory_rarity text,
  inventory_item_level int,
  profile_gold int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_shop     public.rotating_shop%rowtype;
  v_price    int;
  v_rarity   text;
  v_cat      text;
  v_level    int;
  v_name     text;
  v_atk      int;
  v_def      int;
  v_hp       int;
  v_bought   boolean;
  v_new_id   uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_slot_number < 1 or p_slot_number > 6 then
    raise exception 'slot invalido';
  end if;

  select * into v_shop from public.rotating_shop where rotating_shop.user_id = v_user;
  if not found then
    raise exception 'shop nao encontrado';
  end if;

  v_rarity := case p_slot_number
    when 1 then v_shop.slot_1_rarity
    when 2 then v_shop.slot_2_rarity
    when 3 then v_shop.slot_3_rarity
    when 4 then v_shop.slot_4_rarity
    when 5 then v_shop.slot_5_rarity
    when 6 then v_shop.slot_6_rarity
  end;
  v_cat := case p_slot_number
    when 1 then v_shop.slot_1_category
    when 2 then v_shop.slot_2_category
    when 3 then v_shop.slot_3_category
    when 4 then v_shop.slot_4_category
    when 5 then v_shop.slot_5_category
    when 6 then v_shop.slot_6_category
  end;
  v_level := case p_slot_number
    when 1 then v_shop.slot_1_level
    when 2 then v_shop.slot_2_level
    when 3 then v_shop.slot_3_level
    when 4 then v_shop.slot_4_level
    when 5 then v_shop.slot_5_level
    when 6 then v_shop.slot_6_level
  end;
  v_name := case p_slot_number
    when 1 then v_shop.slot_1_name
    when 2 then v_shop.slot_2_name
    when 3 then v_shop.slot_3_name
    when 4 then v_shop.slot_4_name
    when 5 then v_shop.slot_5_name
    when 6 then v_shop.slot_6_name
  end;
  v_price := case p_slot_number
    when 1 then v_shop.slot_1_price
    when 2 then v_shop.slot_2_price
    when 3 then v_shop.slot_3_price
    when 4 then v_shop.slot_4_price
    when 5 then v_shop.slot_5_price
    when 6 then v_shop.slot_6_price
  end;
  v_atk := case p_slot_number
    when 1 then v_shop.slot_1_attack
    when 2 then v_shop.slot_2_attack
    when 3 then v_shop.slot_3_attack
    when 4 then v_shop.slot_4_attack
    when 5 then v_shop.slot_5_attack
    when 6 then v_shop.slot_6_attack
  end;
  v_def := case p_slot_number
    when 1 then v_shop.slot_1_defense
    when 2 then v_shop.slot_2_defense
    when 3 then v_shop.slot_3_defense
    when 4 then v_shop.slot_4_defense
    when 5 then v_shop.slot_5_defense
    when 6 then v_shop.slot_6_defense
  end;
  v_hp := case p_slot_number
    when 1 then v_shop.slot_1_hp
    when 2 then v_shop.slot_2_hp
    when 3 then v_shop.slot_3_hp
    when 4 then v_shop.slot_4_hp
    when 5 then v_shop.slot_5_hp
    when 6 then v_shop.slot_6_hp
  end;
  v_bought := case p_slot_number
    when 1 then v_shop.slot_1_bought
    when 2 then v_shop.slot_2_bought
    when 3 then v_shop.slot_3_bought
    when 4 then v_shop.slot_4_bought
    when 5 then v_shop.slot_5_bought
    when 6 then v_shop.slot_6_bought
  end;

  if v_rarity is null then
    raise exception 'slot vazio';
  end if;

  if v_bought then
    raise exception 'item ja comprado';
  end if;

  if v_cat = 'collection_complete' then
    raise exception 'colecao completa';
  end if;

  if v_cat = 'avatar' then
    -- Avatar: desconta gold e desbloqueia (evita duplicata).
    update public.profiles
      set gold = gold - v_price,
          unlocked_avatars = array_append(coalesce(unlocked_avatars, '{}'::text[]), v_name)
      where profiles.id = v_user
        and gold >= v_price
        and not (v_name = any(coalesce(unlocked_avatars, '{}'::text[])));
    if not found then
      raise exception 'gold insuficiente ou avatar ja desbloqueado';
    end if;
  else
    -- Equipamento: desconta gold.
    update public.profiles
      set gold = gold - v_price
      where profiles.id = v_user and gold >= v_price;
    if not found then
      raise exception 'gold insuficiente';
    end if;

    -- insere no inventário (stats jsonb com attack/defense/hp)
    insert into public.inventory
      (user_id, item_category, rarity, name, item_level, enhancement_level,
       quantity, equipped, stats)
    values
      (v_user, v_cat, v_rarity, v_name, v_level, 0, 1, false,
       jsonb_build_object('attack', v_atk, 'defense', v_def, 'hp', v_hp))
    returning inventory.id into v_new_id;
  end if;

  -- marca slot como comprado
  execute format(
    'update public.rotating_shop set slot_%s_bought = true where user_id = $1',
    p_slot_number
  ) using v_user;

  return query
  select
    p_slot_number,
    true,
    v_new_id,
    v_name,
    v_cat,
    v_rarity,
    v_level,
    (select gold from public.profiles where profiles.id = v_user);
end;
$$;

revoke all on function public.buy_shop_item(int) from public;
grant execute on function public.buy_shop_item(int) to authenticated;
grant execute on function public.buy_shop_item(int) to service_role;
