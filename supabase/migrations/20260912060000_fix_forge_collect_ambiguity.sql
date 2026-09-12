-- Fix 42702: "column reference 'enhancement_level' is ambiguous".
--
-- As funções `collect_forged_item` e `complete_forge_now` declaram
-- `returns table (... enhancement_level ...)`; isso cria uma variável de saída
-- com o mesmo nome da coluna da tabela. No UPDATE, a expressão
-- `enhancement_level = enhancement_level + 1` deixa o lado direito ambíguo
-- (pode ser a variável PL/pgSQL ou a coluna de inventory).
--
-- Correção: qualificar a coluna com o nome da tabela no lado direito do SET.
--
-- Migration idempotente.

-- ──────────────────────────────────────────────────────────────────
-- collect_forged_item: +1 de refino e libera a Bigorna.
-- ──────────────────────────────────────────────────────────────────
create or replace function public.collect_forged_item(p_inventory_id uuid)
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

  if v_item.user_id <> v_user then
    raise exception 'item invalido';
  end if;

  if not v_item.is_in_forge or v_item.forge_ends_at is null then
    raise exception 'item nao esta na bigorna';
  end if;

  if v_item.forge_ends_at > now() then
    raise exception 'refino em andamento';
  end if;

  update public.inventory
    set enhancement_level = inventory.enhancement_level + 1,
        is_in_forge = false,
        forge_ends_at = null
    where inventory.id = p_inventory_id;

  return query
  select i.id, i.user_id, i.item_category, i.rarity, i.name,
         i.item_level, i.enhancement_level, i.quantity, i.equipped,
         i.stats, i.is_in_forge, i.forge_ends_at, i.created_at
  from public.inventory i
  where i.id = p_inventory_id;
end;
$$;

revoke all on function public.collect_forged_item(uuid) from public;
grant execute on function public.collect_forged_item(uuid) to authenticated;
grant execute on function public.collect_forged_item(uuid) to service_role;

-- ──────────────────────────────────────────────────────────────────
-- complete_forge_now: mesmo bug (update com enhancement_level ambíguo).
-- ──────────────────────────────────────────────────────────────────
create or replace function public.complete_forge_now(p_inventory_id uuid)
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

  if v_item.user_id <> v_user then
    raise exception 'item invalido';
  end if;

  if not v_item.is_in_forge then
    raise exception 'item nao esta na bigorna';
  end if;

  update public.inventory
    set enhancement_level = inventory.enhancement_level + 1,
        is_in_forge = false,
        forge_ends_at = null
    where inventory.id = p_inventory_id;

  return query
  select i.id, i.user_id, i.item_category, i.rarity, i.name,
         i.item_level, i.enhancement_level, i.quantity, i.equipped,
         i.stats, i.is_in_forge, i.forge_ends_at, i.created_at
  from public.inventory i
  where i.id = p_inventory_id;
end;
$$;

revoke all on function public.complete_forge_now(uuid) from public;
grant execute on function public.complete_forge_now(uuid) to authenticated;
grant execute on function public.complete_forge_now(uuid) to service_role;

-- Recarrega o schema no PostgREST.
notify pgrst, 'reload schema';
