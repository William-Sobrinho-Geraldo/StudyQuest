-- Rebalanceamento da curva de tempo do refino temporizado da Bigorna.
--
-- Nova escala (baseada no enhancement_level ATUAL do item):
--   0 (+0 -> +1)          : 5 minutes
--   1 (+1 -> +2)          : 30 minutes
--   2 (+2 -> +3)          : 2 hours
--   3 (+3 -> +4)          : 6 hours
--   4 (+4 -> +5)          : 12 hours
--   5 ou superior (+5+)   : 24 hours
--
-- `reduce_forge_time_ad` (corte de 25% do tempo restante) e
-- `collect_forged_item` (referências explícitas a inventory.enhancement_level)
-- permanecem inalterados.
--
-- Migration idempotente.

create or replace function public.start_forge_refinement(p_inventory_id uuid)
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
  is_in_forge boolean,
  forge_ends_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item public.inventory%rowtype;
  v_cost integer;
  v_seconds integer;
  v_busy boolean;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_item
    from public.inventory
    where inventory.id = p_inventory_id;

  if not found then
    raise exception 'item nao encontrado';
  end if;

  if v_item.user_id <> v_user or v_item.item_category = 'supply_chest' then
    raise exception 'item invalido';
  end if;

  if v_item.item_level > coalesce((
    select level from public.profiles where profiles.id = v_user
  ), 0) then
    raise exception 'nivel insuficiente';
  end if;

  if v_item.enhancement_level >= 12 then
    raise exception 'refino maximo';
  end if;

  -- Bigorna só refina 1 item por vez.
  select exists (
    select 1
    from public.inventory
    where inventory.user_id = v_user and inventory.is_in_forge
  ) into v_busy;

  if v_busy then
    raise exception 'Bigorna ocupada';
  end if;

  -- Custo em Gold (mesmo do refino instantâneo): pago APENAS para iniciar.
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
    where profiles.id = v_user and gold >= v_cost;

  if not found then
    raise exception 'gold insuficiente';
  end if;

  -- Nova curva de tempo conforme o nível de refino atual do item.
  v_seconds := case v_item.enhancement_level
    when 0 then 5 * 60        -- +0 -> +1
    when 1 then 30 * 60       -- +1 -> +2
    when 2 then 2 * 60 * 60   -- +2 -> +3
    when 3 then 6 * 60 * 60   -- +3 -> +4
    when 4 then 12 * 60 * 60  -- +4 -> +5
    else 24 * 60 * 60         -- +5 em diante
  end;

  update public.inventory
    set is_in_forge = true,
        forge_ends_at = now() + make_interval(secs => v_seconds)
    where inventory.id = p_inventory_id;

  return query
  select i.id, i.user_id, i.item_category, i.rarity, i.name,
         i.item_level, i.enhancement_level, i.quantity, i.equipped,
         i.stats, i.is_in_forge, i.forge_ends_at, i.created_at
  from public.inventory i
  where i.id = p_inventory_id;
end;
$$;

revoke all on function public.start_forge_refinement(uuid) from public;
grant execute on function public.start_forge_refinement(uuid) to authenticated;
grant execute on function public.start_forge_refinement(uuid) to service_role;

-- Recarrega o schema no PostgREST.
notify pgrst, 'reload schema';
