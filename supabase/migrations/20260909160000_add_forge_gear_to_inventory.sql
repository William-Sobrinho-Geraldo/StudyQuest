-- Inventário persistido (2ª etapa): equipamentos da Forja viram linhas no inventory.
-- Cada peça de equipamento = 1 linha (item_category = slot: weapon|helmet|chest|boots).
-- Baús de suprimentos continuam empilháveis (item_category = 'supply_chest', rarity = tier).
-- Regras de forma:
--   - supply_chest: name/level/equipped nulos/zero/false, quantity >= 1
--   - gear: name obrigatório, quantity = 1, equipped marca as 4 peças equipadas.
-- Regras de unicidade (parciais):
--   - 1 linha por (user, 'supply_chest', rarity) -> acúmulo via ON CONFLICT
--   - no máximo 1 peça equipada por slot (user, slot) where equipped

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_category text not null,
  rarity text not null,
  name text,
  level integer not null default 0,
  quantity integer not null default 1,
  equipped boolean not null default false,
  created_at timestamptz not null default now()
);

-- Migração do formato anterior (categoria 'chest' empilhável).
update public.inventory
set item_category = 'supply_chest'
where item_category = 'chest';

alter table public.inventory
  add column if not exists name text,
  add column if not exists level integer not null default 0,
  add column if not exists equipped boolean not null default false;

-- A constraint unique antiga (user, item_category, rarity) não serve: gears não são
-- empilháveis (cada peça é distinta). Remove e usa índices parciais no lugar.
alter table public.inventory
  drop constraint if exists inventory_user_id_item_category_rarity_key;

alter table public.inventory
  drop constraint if exists inventory_item_shape_check;

alter table public.inventory
  add constraint inventory_item_shape_check check (
    (
      item_category = 'supply_chest'
      and name is null
      and level = 0
      and equipped = false
      and quantity >= 1
    )
    or
    (
      item_category in ('weapon', 'helmet', 'chest', 'boots')
      and name is not null
      and length(name) > 0
      and level between 0 and 12
      and quantity = 1
    )
  );

-- Acúmulo de baús de suprimentos.
drop index if exists inventory_supply_chest_stack_idx;
create unique index inventory_supply_chest_stack_idx
  on public.inventory (user_id, item_category, rarity)
  where item_category = 'supply_chest';

-- Apenas uma peça equipada por slot.
drop index if exists inventory_equipped_slot_uidx;
create unique index inventory_equipped_slot_uidx
  on public.inventory (user_id, item_category)
  where equipped;

create index if not exists inventory_user_idx
  on public.inventory (user_id);

alter table public.inventory enable row level security;

create policy inventory_select_own on public.inventory
  for select to authenticated using (user_id = auth.uid());

create policy inventory_insert_own on public.inventory
  for insert to authenticated with check (user_id = auth.uid());

create policy inventory_update_own on public.inventory
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy inventory_delete_own on public.inventory
  for delete to authenticated using (user_id = auth.uid());

grant select on public.inventory to authenticated;
grant insert on public.inventory to authenticated;
grant update on public.inventory to authenticated;
grant delete on public.inventory to authenticated;

-- claim_quest: concede o baú de suprimentos na mesma transação da reivindicação.
create or replace function public.claim_quest(p_quest_id text)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_quest public.quests%rowtype;
  v_current bigint;
  v_inserted text;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_quest_id is null or p_quest_id = '' then
    raise exception 'quest nao informada';
  end if;

  select * into v_quest from public.quests where id = p_quest_id;
  if not found then
    raise exception 'quest desconhecida';
  end if;

  if not v_quest.enabled then
    raise exception 'quest indisponivel';
  end if;

  insert into public.quest_claims (user_id, quest_id)
  values (v_user, p_quest_id)
  on conflict (user_id, quest_id) do nothing
  returning quest_id into v_inserted;

  if v_inserted is null then
    raise exception 'quest ja reivindicada';
  end if;

  v_current := public.quest_current_value(v_user, v_quest.metric, v_quest.period);
  if v_current < v_quest.target then
    raise exception 'quest nao concluida';
  end if;

  insert into public.profiles (id, level, current_xp, gold)
  values (v_user, 1, 0, 0)
  on conflict (id) do nothing;

  update public.profiles
  set current_xp = current_xp + v_quest.reward_xp,
      gold = gold + v_quest.reward_gold
  where id = v_user;

  insert into public.rewards_log (user_id, xp, gold, source, source_id)
  values (v_user, v_quest.reward_xp, v_quest.reward_gold, 'quest', p_quest_id);

  if v_quest.reward_chest_tier is not null then
    insert into public.inventory (user_id, item_category, rarity, name, level, quantity, equipped)
    values (v_user, 'supply_chest', v_quest.reward_chest_tier, null, 0, 1, false)
    on conflict (user_id, item_category, rarity)
      where item_category = 'supply_chest'
    do update set quantity = inventory.quantity + 1;
  end if;

  return query select * from public.profiles where id = v_user;
end;
$$;

-- Nome do equipamento sorteado pela Forja, conforme slot + raridade do baú.
create or replace function public.gear_name(p_slot text, p_rarity text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_names text[] := case
    when p_rarity = 'epic' then
      case p_slot
        when 'weapon' then array['Lâmina Arcana', 'Espada do Grão-Mestre']
        when 'helmet' then array['Elmo Arcano', 'Coroa do Conhecimento']
        when 'chest' then array['Armadura Arcanista', 'Manto do Mestre']
        when 'boots' then array['Botas Arcanas', 'Grevas do Guardião']
        else array['Relíquia Épica']
      end
    when p_rarity = 'rare' then
      case p_slot
        when 'weapon' then array['Cimitarra do Foco', 'Espada do Saber']
        when 'helmet' then array['Elmo do Estudioso', 'Coroa do Foco']
        when 'chest' then array['Peitoral de Estudo', 'Túnica de Sabedoria']
        when 'boots' then array['Grevas do Aprendizado', 'Botas do Peregrino']
        else array['Relíquia Rara']
      end
    else
      case p_slot
        when 'weapon' then array['Lâmina de Estudo', 'Adaga do Iniciante']
        when 'helmet' then array['Coifa de Saber', 'Gorro do Aprendiz']
        when 'chest' then array['Túnica de Algodão', 'Manto Simples']
        when 'boots' then array['Sandálias do Caminho', 'Botas Simples']
        else array['Relíquia Comum']
      end
  end;
begin
  return v_names[1 + floor(random() * array_length(v_names, 1))];
end;
$$;

-- Abre um baú de suprimentos: consome 1 unidade e sorteia uma peça de equipamento
-- nível 0, acrescentando-a ao inventário. Tudo atômico (mesma transação).
create or replace function public.open_inventory_chest(p_inventory_id uuid)
returns table (
  id uuid,
  user_id uuid,
  item_category text,
  rarity text,
  name text,
  level integer,
  quantity integer,
  equipped boolean,
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

  if v_chest.quantity > 1 then
    update public.inventory set quantity = quantity - 1 where id = p_inventory_id;
  else
    delete from public.inventory where id = p_inventory_id;
  end if;

  v_slot := (array['weapon', 'helmet', 'chest', 'boots'])[1 + floor(random() * 4)::int];
  v_name := public.gear_name(v_slot, v_chest.rarity);

  insert into public.inventory (user_id, item_category, rarity, name, level, quantity, equipped)
  values (v_user, v_slot, v_chest.rarity, v_name, 0, 1, false)
  returning id into v_new_id;

  return query
  select i.id, i.user_id, i.item_category, i.rarity, i.name, i.level, i.quantity, i.equipped, i.created_at
  from public.inventory i
  where i.id = v_new_id;
end;
$$;

revoke all on function public.open_inventory_chest(uuid) from public;
grant execute on function public.open_inventory_chest(uuid) to authenticated;
grant execute on function public.open_inventory_chest(uuid) to service_role;

revoke all on function public.gear_name(text, text) from public;
grant execute on function public.gear_name(text, text) to service_role;

revoke all on function public.claim_quest(text) from public;
grant execute on function public.claim_quest(text) to authenticated;
grant execute on function public.claim_quest(text) to service_role;