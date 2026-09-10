-- ═══════════════════════════════════════════════════════════════════
-- Mercado Rotativo (Rotating Shop)
-- 6 slots por usuário, refresh com cooldown de 24h,
-- restrição de raridade (máx. Épico), escalonamento por brackets
-- de nível, e escala de atributos/prices por item_level × rarity.
-- ═══════════════════════════════════════════════════════════════════

-- ── helpers ────────────────────────────────────────────────────────
create or replace function public.random_int(p_min int, p_max int)
returns int
language sql
immutable
as $$
  select p_min + floor(random() * (p_max - p_min + 1))::int;
$$;

create or replace function public.rarity_for_slot()
returns text
language sql
immutable
as $$
  select case
    when random() < 0.50 then 'common'
    when random() < 0.70 then 'rare'
    else 'epic'
  end;
$$;

create or replace function public.random_slot_category()
returns text
language sql
immutable
as $$
  select (array['weapon','helmet','chest','boots'])
    [public.random_int(1, 4)];
$$;

-- ── table ──────────────────────────────────────────────────────────
create table if not exists public.rotating_shop (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  refreshes_today int         not null default 0,
  next_refresh_at timestamptz not null default now(),
  -- slots 1-5: raridades sorteadas (common|rare|epic)
  slot_1_rarity   text, slot_1_category text, slot_1_level int,
  slot_1_name     text, slot_1_attack   int,  slot_1_defense int,
  slot_1_hp       int,  slot_1_price    int,  slot_1_bought  boolean not null default false,
  -- slots 2-5 idênticos
  slot_2_rarity   text, slot_2_category text, slot_2_level int,
  slot_2_name     text, slot_2_attack   int,  slot_2_defense int,
  slot_2_hp       int,  slot_2_price    int,  slot_2_bought  boolean not null default false,
  slot_3_rarity   text, slot_3_category text, slot_3_level int,
  slot_3_name     text, slot_3_attack   int,  slot_3_defense int,
  slot_3_hp       int,  slot_3_price    int,  slot_3_bought  boolean not null default false,
  slot_4_rarity   text, slot_4_category text, slot_4_level int,
  slot_4_name     text, slot_4_attack   int,  slot_4_defense int,
  slot_4_hp       int,  slot_4_price    int,  slot_4_bought  boolean not null default false,
  slot_5_rarity   text, slot_5_category text, slot_5_level int,
  slot_5_name     text, slot_5_attack   int,  slot_5_defense int,
  slot_5_hp       int,  slot_5_price    int,  slot_5_bought  boolean not null default false,
  -- slot 6: Vitrine Especial — sempre épico
  slot_6_rarity   text not null default 'epic', slot_6_category text, slot_6_level int,
  slot_6_name     text, slot_6_attack   int,  slot_6_defense int,
  slot_6_hp       int,  slot_6_price    int,  slot_6_bought  boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.rotating_shop enable row level security;

create policy "Users read own shop"
  on public.rotating_shop for select
  using (auth.uid() = user_id);

create index if not exists idx_rotating_shop_next
  on public.rotating_shop (next_refresh_at);

-- ═══════════════════════════════════════════════════════════════════
-- refresh_shop(p_player_level) → 6 slots novos
--
-- Regras de negócio:
--   • baseTier = floor(p_player_level / 10) * 10   (piso ≥ 10)
--   • item_level sorteado entre {baseTier-10, baseTier, baseTier+10}
--   • Slots 1-5: raridade ponderada (common 50% / rare 35% / epic 15%)
--   • Slot 6: raridade fixa "epic"
--   • Preço = baseCost(slot) × rarityMult × tierMult
--   • Stats conforme fórmulas existentes (weapon → atk, helmet/boots → def, chest → hp)
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
  v_user     uuid := auth.uid();
  v_base_tier int;
  v_tier_options int[];
  v_shop    public.rotating_shop%rowtype;
  v_slot    int;
  v_rarity  text;
  v_cat     text;
  v_level   int;
  v_name    text;
  v_atk     int;
  v_def     int;
  v_hp      int;
  v_price   int;
  v_r_mult  numeric;
  v_t_mult  numeric;
  v_next    timestamptz;
  v_slots   jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- escalonamento por brackets (mínimo nível 10)
  v_base_tier := greatest(floor(p_player_level / 10.0) * 10, 10)::int;
  v_tier_options := array[
    greatest(v_base_tier - 10, 10),
    v_base_tier,
    least(v_base_tier + 10, 100)
  ];

  -- garante existência da linha do shop
  insert into public.rotating_shop (user_id) values (v_user)
    on conflict (user_id) do nothing;

  select * into v_shop from public.rotating_shop where rotating_shop.user_id = v_user;

  v_next := now() + interval '24 hours';

  -- gera os 6 slots
  for v_slot in 1..6 loop
    -- raridade: slot 6 sempre épico
    v_rarity := case when v_slot = 6 then 'epic' else public.rarity_for_slot() end;

    -- slot (weapon/helmet/chest/boots)
    v_cat := public.random_slot_category();

    -- nível dentro do bracket
    v_level := v_tier_options[public.random_int(1, 3)];

    -- nome
    v_name := public.gear_name(v_cat, v_rarity);

    -- stats
    v_atk := case when v_cat = 'weapon' then v_level * 2 else 0 end;
    v_def := case when v_cat in ('helmet','boots') then v_level else 0 end;
    v_hp  := case when v_cat = 'chest' then v_level * 10 else 0 end;

    -- preço: base × rarity × tier
    v_r_mult := case v_rarity
      when 'common' then 1.0
      when 'rare'   then 1.8
      when 'epic'   then 3.0
    end;
    v_t_mult := 1.0 + (v_level / 10.0 - 1) * 0.5;

    v_price := case v_cat
      when 'weapon' then 80
      when 'helmet' then 50
      when 'chest'  then 120
      when 'boots'  then 50
    end;
    v_price := round(v_price * v_r_mult * v_t_mult)::int;

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
    (select rs.refreshes_today from public.rotating_shop rs where rs.user_id = v_user)
  from jsonb_array_elements(v_slots) elem;
end;
$$;

revoke all on function public.refresh_shop(int) from public;
grant execute on function public.refresh_shop(int) to authenticated;
grant execute on function public.refresh_shop(int) to service_role;

-- ═══════════════════════════════════════════════════════════════════
-- buy_shop_item(p_slot_number) → item adicionado ao inventário
--
-- Validações:
--   • Slot existe e não foi comprado ainda
--   • Usuário possui gold suficiente
--   • Atomicidade: desconta gold + insere item + marca slot
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

  -- extrai dados do slot
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

  -- validações
  if v_rarity is null then
    raise exception 'slot vazio';
  end if;

  if v_bought then
    raise exception 'item ja comprado';
  end if;

  -- desconta gold
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
