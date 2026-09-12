-- Atalho discreto de conclusão do refino temporizado.
--
-- complete_forge_now: conclui o refino imediatamente (+1 de refino e libera
-- a Bigorna), ignorando o timer. Usado apenas pelo botão discreto de teste no
-- rodapé da Forja — não é exposto como ação normal de monetização.
--
-- Migration idempotente.

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
    set enhancement_level = enhancement_level + 1,
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

-- Recarrega o schema no PostgREST (reflete a nova RPC).
notify pgrst, 'reload schema';
