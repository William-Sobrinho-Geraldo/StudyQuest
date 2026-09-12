-- Refino temporizado na Bigorna + monetização por anúncios (mock).
--
-- A Bigorna agora refina 1 item por vez em tempo real:
--   * inventory.is_in_forge (boolean) : marca o item que está na Bigorna.
--   * inventory.forge_ends_at (timestamptz) : instante em que o refino termina.
--
-- Fluxo:
--   1. start_forge_refinement() -> paga o Gold (custo atual) e inicia o timer.
--   2. reduce_forge_time_ad()   -> cada anúncio corta 25% do tempo RESTANTE.
--   3. collect_forged_item()    -> ao terminar, +1 de refino e libera a Bigorna.
--
-- Não existe mais "concluir instantaneamente pagando Gold": ou o jogador espera
-- o tempo real acabar, ou assiste anúncios para reduzir o tempo restante.
--
-- Migration idempotente, pode ser aplicada em banco novo ou já migrado.

alter table public.inventory
  add column if not exists is_in_forge boolean not null default false,
  add column if not exists forge_ends_at timestamptz;

comment on column public.inventory.is_in_forge is
  'Marca o item atualmente na Bigorna (no máximo 1 por jogador).';
comment on column public.inventory.forge_ends_at is
  'Instante em que o refino temporizado termina. NULL quando a Bigorna está livre.';

-- Garantia estrutural: no máximo 1 item na Bigorna por jogador.
drop index if exists inventory_forge_single_uidx;
create unique index inventory_forge_single_uidx
  on public.inventory (user_id)
  where is_in_forge;

drop index if exists inventory_forge_active_idx;
create index inventory_forge_active_idx
  on public.inventory (forge_ends_at)
  where is_in_forge;

-- ──────────────────────────────────────────────────────────────────
-- start_forge_refinement: paga o Gold e inicia o refino temporizado.
-- ──────────────────────────────────────────────────────────────────
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

  -- Tempo total do refino conforme o nível de refino atual do item.
  v_seconds := case v_item.enhancement_level
    when 0 then 15 * 60       -- +0 -> +1
    when 1 then 60 * 60       -- +1 -> +2
    when 2 then 4 * 60 * 60   -- +2 -> +3
    when 3 then 12 * 60 * 60  -- +3 -> +4
    when 4 then 24 * 60 * 60  -- +4 -> +5
    else 48 * 60 * 60         -- +5 em diante
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

-- ──────────────────────────────────────────────────────────────────
-- reduce_forge_time_ad: corta 25% do tempo RESTANTE (anúncio mockado).
-- ──────────────────────────────────────────────────────────────────
create or replace function public.reduce_forge_time_ad(p_inventory_id uuid)
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

  if v_item.forge_ends_at <= now() then
    raise exception 'refino ja concluido';
  end if;

  -- Novo tempo = agora + 75% do tempo que ainda restava.
  update public.inventory
    set forge_ends_at = now()
      + make_interval(secs => extract(epoch from (inventory.forge_ends_at - now())) * 0.75)
    where inventory.id = p_inventory_id;

  return query
  select i.id, i.user_id, i.item_category, i.rarity, i.name,
         i.item_level, i.enhancement_level, i.quantity, i.equipped,
         i.stats, i.is_in_forge, i.forge_ends_at, i.created_at
  from public.inventory i
  where i.id = p_inventory_id;
end;
$$;

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

revoke all on function public.start_forge_refinement(uuid) from public;
grant execute on function public.start_forge_refinement(uuid) to authenticated;
grant execute on function public.start_forge_refinement(uuid) to service_role;

revoke all on function public.reduce_forge_time_ad(uuid) from public;
grant execute on function public.reduce_forge_time_ad(uuid) to authenticated;
grant execute on function public.reduce_forge_time_ad(uuid) to service_role;

revoke all on function public.collect_forged_item(uuid) from public;
grant execute on function public.collect_forged_item(uuid) to authenticated;
grant execute on function public.collect_forged_item(uuid) to service_role;

-- Recarrega o schema no PostgREST (reflete as novas colunas e RPCs).
notify pgrst, 'reload schema';
