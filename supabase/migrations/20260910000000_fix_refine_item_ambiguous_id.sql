-- Fix: column reference "id" is ambiguous in refine_item e open_inventory_chest.
--
-- Ambas as funções declararam `returns table (id uuid, ...)` cujas colunas de
-- saída passam a competir com `inventory.id` no escopo PL/pgSQL. Qualificar
-- os WHERE de UPDATE/DELETE com o nome da tabela resolve a ambiguidade.

-- ──────────────────────────────────────────────────────────────────
-- open_inventory_chest
-- ──────────────────────────────────────────────────────────────────
drop function if exists public.open_inventory_chest(uuid);
drop function if exists public.open_inventory_chest(uuid, integer);

create or replace function public.open_inventory_chest(p_inventory_id uuid, p_character_level int default null)
returns table (
  id uuid,
  user_id uuid,
  item_category text,
  rarity text,
  name text,
  item_level integer,
  enhancement_level integer,
  quantity integer,
  equipped boolean,
  stats jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_chest public.inventory%rowtype;
  v_slot text;
  v_name text;
  v_item_level integer;
  v_lvl integer;
  v_new_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_chest from public.inventory where id = p_inventory_id;
  if not found then
    raise exception 'bau nao encontrado';
  end if;

  if v_chest.user_id <> v_user or v_chest.item_category <> 'supply_chest' then
    raise exception 'inventario invalido';
  end if;

  v_lvl := p_character_level;
  if v_lvl is null then
    select level into v_lvl from public.profiles where id = v_user;
  end if;

  v_item_level := public.gear_item_level(v_lvl);

  if v_chest.quantity > 1 then
    update public.inventory set quantity = quantity - 1 where inventory.id = p_inventory_id;
  else
    delete from public.inventory where inventory.id = p_inventory_id;
  end if;

  v_slot := (array['weapon', 'helmet', 'chest', 'boots'])[1 + floor(random() * 4)::int];
  v_name := public.gear_name(v_slot, v_chest.rarity);

  insert into public.inventory
    (user_id, item_category, rarity, name, item_level, enhancement_level, quantity, equipped)
  values (v_user, v_slot, v_chest.rarity, v_name, v_item_level, 0, 1, false)
  returning id into v_new_id;

  return query
  select i.id, i.user_id, i.item_category, i.rarity, i.name, i.item_level, i.enhancement_level, i.quantity, i.equipped, i.stats, i.created_at
  from public.inventory i
  where i.id = v_new_id;
end;
$$;

revoke all on function public.open_inventory_chest(uuid, integer) from public;
grant execute on function public.open_inventory_chest(uuid, integer) to authenticated;
grant execute on function public.open_inventory_chest(uuid, integer) to service_role;

-- ──────────────────────────────────────────────────────────────────
-- refine_item
-- ──────────────────────────────────────────────────────────────────
drop function if exists public.refine_item(uuid, boolean, integer);

create or replace function public.refine_item(p_inventory_id uuid, p_success boolean, p_enhancement_level int)
returns table (
  id uuid,
  user_id uuid,
  item_category text,
  rarity text,
  name text,
  item_level integer,
  enhancement_level integer,
  quantity integer,
  equipped boolean,
  stats jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item public.inventory%rowtype;
  v_current_enhancement integer;
  v_cost integer;
  v_next_enhancement integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_item from public.inventory where id = p_inventory_id;
  if not found then
    raise exception 'item nao encontrado';
  end if;

  if v_item.user_id <> v_user or v_item.item_category = 'supply_chest' then
    raise exception 'item invalido';
  end if;

  if v_item.item_level > coalesce((select level from public.profiles where id = v_user), 0) then
    raise exception 'nivel insuficiente';
  end if;

  v_current_enhancement := v_item.enhancement_level;
  if p_enhancement_level <> v_current_enhancement then
    raise exception 'item desatualizado';
  end if;

  if v_item.enhancement_level >= 12 then
    raise exception 'refino maximo';
  end if;

  v_cost := (case v_item.enhancement_level
    when 0 then 25
    when 1 then 35
    when 2 then 50
    when 3 then 75
    when 4 then 100
    when 5 then 160
    when 6 then 260
    when 7 then 400
    when 8 then 650
    when 9 then 1000
    when 10 then 1600
    when 11 then 2400
    else 0
  end) * round(1 + (v_item.item_level / 10 - 1) * 0.5);

  update public.profiles
  set gold = gold - v_cost
  where id = v_user and gold >= v_cost;

  if not found then
    raise exception 'gold insuficiente';
  end if;

  v_next_enhancement := case
    when p_success then v_current_enhancement + 1
    else greatest(v_current_enhancement - 1, 0)
  end;

  update public.inventory
  set enhancement_level = v_next_enhancement
  where inventory.id = p_inventory_id;

  return query
  select i.id, i.user_id, i.item_category, i.rarity, i.name, i.item_level, i.enhancement_level, i.quantity, i.equipped, i.stats, i.created_at
  from public.inventory i
  where i.id = p_inventory_id;
end;
$$;

revoke all on function public.refine_item(uuid, boolean, integer) from public;
grant execute on function public.refine_item(uuid, boolean, integer) to authenticated;
grant execute on function public.refine_item(uuid, boolean, integer) to service_role;
