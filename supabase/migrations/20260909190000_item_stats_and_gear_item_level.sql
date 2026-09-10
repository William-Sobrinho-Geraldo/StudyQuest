-- Estrutura preparada para bônus de stats + sorteio de item_level centralizado.
--   * inventory.stats (jsonb, nullable): stats próprias da instância gerada.
--     Hoje não há lógica (NULL); a coluna garante contrato estável para
--     multiplicadores futuros derivados de rarity + item_level sem nova migration.
--   * gear_item_level(int): única fonte da regra de sorteio do item_level do baú
--     (50/50 múltiplo de 10 que o jogador já usa / próximo acima).
--   * open_inventory_chest / refine_item passam a devolver `stats` no retorno
--     (contrato de leitura pronto para quando a coluna sair do null).
--   * Remove o overload legado open_inventory_chest(uuid), código morto que
--     referencia a coluna `level` já removida.
--
-- Migration idempotente, pode ser aplicada em banco novo ou já migrado.

-- 1) Coluna de stats por instância (nullable, sem lógica por enquanto).
alter table public.inventory
  add column if not exists stats jsonb;

comment on column public.inventory.stats is
  'Stats próprias da instância (jsonb). NULL hoje; pronto para multiplicadores derivados de rarity + item_level.';

-- Regra de forma: stats pode ser NULL ou um objeto JSON (nunca array/primitivo).
alter table public.inventory
  drop constraint if exists inventory_item_shape_check;

alter table public.inventory
  add constraint inventory_item_shape_check check (
    (
      item_category = 'supply_chest'
      and name is null
      and item_level = 0
      and enhancement_level = 0
      and equipped = false
      and quantity >= 1
      and (stats is null or jsonb_typeof(stats) = 'object')
    )
    or
    (
      item_category in ('weapon', 'helmet', 'chest', 'boots')
      and name is not null
      and length(name) > 0
      and item_level in (10, 20, 30, 40, 50, 60, 70, 80, 90, 100)
      and enhancement_level between 0 and 12
      and quantity = 1
      and (stats is null or jsonb_typeof(stats) = 'object')
    )
  );

-- 2) Sorteio centralizado do item_level do baú (regra de negócio única).
--    50% o múltiplo de 10 que o jogador já usa (floor(level/10)*10),
--    50% o próximo acima (ceil(level/10)*10); mínimo 10, teto 100 (max tier).
--    Ex.: nível 23 -> 20 ou 30; nível 72 -> 70 ou 80.
create or replace function public.gear_item_level(p_level int)
returns integer
language plpgsql
set search_path = ''
as $$
begin
  if p_level is null or p_level < 1 then
    return 10;
  end if;

  if floor(random() * 2) = 0 then
    return greatest(10, least(100, (floor(p_level::numeric / 10) * 10)::int));
  else
    return greatest(10, least(100, (ceil(p_level::numeric / 10) * 10)::int));
  end if;
end;
$$;

revoke all on function public.gear_item_level(integer) from public;
grant execute on function public.gear_item_level(integer) to service_role;

-- 3) Abre um baú de suprimentos: consome 1 unidade e sorteia/insere uma peça
--    com o item_level vindo de gear_item_level(). O item herda a raridade do baú.
--    Lê profiles.level caso o cliente não o tenha enviado. Devolve `stats`.
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
    update public.inventory set quantity = quantity - 1 where id = p_inventory_id;
  else
    delete from public.inventory where id = p_inventory_id;
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

-- 4) Bigorna (server): valida a tentativa de refino e persiste o resultado.
--    Recreada para devolver `stats` no retorno (mesma regra, sem mudança de lógica).
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

  -- Regra de uso: item com item_level acima do nível do personagem não pode ser
  -- refinado/utilizado (mesma regra de equipar).
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

  -- Custo: tabela flat por nível de refino * fator do item (1 + (item_level/10 - 1) * 0.5).
  -- Refino +0 -> +5 seguro (100%); +6 em diante falha regride 1 nível.
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

  -- Validar saldo suficiente.
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
  where id = p_inventory_id;

  return query
  select i.id, i.user_id, i.item_category, i.rarity, i.name, i.item_level, i.enhancement_level, i.quantity, i.equipped, i.stats, i.created_at
  from public.inventory i
  where i.id = p_inventory_id;
end;
$$;

-- Grants das funções alteradas (o overload legado open_inventory_chest(uuid) some).
revoke all on function public.open_inventory_chest(uuid, integer) from public;
grant execute on function public.open_inventory_chest(uuid, integer) to authenticated;
grant execute on function public.open_inventory_chest(uuid, integer) to service_role;

revoke all on function public.refine_item(uuid, boolean, integer) from public;
grant execute on function public.refine_item(uuid, boolean, integer) to authenticated;
grant execute on function public.refine_item(uuid, boolean, integer) to service_role;

revoke all on function public.gear_name(text, text) from public;
grant execute on function public.gear_name(text, text) to service_role;

-- Recarrega o schema no PostgREST (reflete stats e as RPCs).
notify pgrst, 'reload schema';