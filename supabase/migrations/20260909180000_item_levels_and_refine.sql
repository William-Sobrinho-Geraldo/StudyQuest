-- Camada de níveis de item + refino até +12.
--   * item_level       : nível base do item (múltiplo de 10, ex. 10/20/30/...).
--   * enhancement_level: nível de encantamento/refino atual (+0 até +12).
--                             (coluna `level` antiga -> renomeada para `enhancement_level`)
--
-- Regras de negócio:
--   - O personagem só pode EQUIPAR itens com item_level <= profiles.level.
--   - O baú sorteia o item_level: 50% o múltiplo de 10 imediato que o jogador já
--     usa (floor(level/10)*10) e 50% o próximo múltiplo acima (ceil(level/10)*10),
--     respeitando o teto de 10 em 10 do nível do jogador.
--   - A Bigorna refina o `enhancement_level` (bigorna_client faz a tentativa
--     no cliente com chance/custo idênticos; bigorna_server valida e aplica).
--   - Refino +0->+5 é 100% seguro; +6 em diante a chance cai até 5% no +11->+12.
--   - Em falha o item perde 1 nível de refino; nunca quebra.
--   - O custo em Gold escala com o item_level base do item.
--
-- Migration idempotente, pode ser aplicada em banco novo ou já migrado.

alter table public.inventory
  drop constraint if exists inventory_item_shape_check;

alter table public.inventory
  add column if not exists item_level integer not null default 10,
  add column if not exists enhancement_level integer not null default 0;

-- Preserva o valor do refino antigo (coluna `level` -> `enhancement_level`) antes
-- de descartar a coluna legada. Idempotente: se `level` já foi removida, não faz nada.
update public.inventory
set enhancement_level = level
where level is not null;

alter table public.inventory
  drop column if exists level;

-- Baús e peças antigas não tinham item_level; assume o nível base 10.
update public.inventory
set item_level = 10
where item_category <> 'supply_chest' and item_level is null;

-- Regra de forma dos registros (item_level multiplicado por 10).
alter table public.inventory
  add constraint inventory_item_shape_check check (
    (
      item_category = 'supply_chest'
      and name is null
      and item_level = 0
      and enhancement_level = 0
      and equipped = false
      and quantity >= 1
    )
    or
    (
      item_category in ('weapon', 'helmet', 'chest', 'boots')
      and name is not null
      and length(name) > 0
      and item_level in (10, 20, 30, 40, 50, 60, 70, 80, 90, 100)
      and enhancement_level between 0 and 12
      and quantity = 1
    )
  );

-- Nome do equipamento sorteado pela Forja conforme slot + raridade + tier.
-- Adiciona sufixo de tier (ex. "Lâmina de Estudo (20)") para identificar o item_level.
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

-- Abre um baú de suprimentos: escolhe um item_level adequado ao nível atual do
-- personagem (50% o múltiplo de 10 que ele já usa, 50% o próximo acima), rola o
-- slot + raridade e insere a peça com enhancement_level 0. Lê profiles.level
-- caso o cliente não o tenha enviado (chamadas diretas via cliente da alteração
-- precisam popular p_character_level; padrão = NULL para o servidor derivar).
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
  if v_lvl is null or v_lvl < 1 then
    v_lvl := 1;
  end if;

  -- Sorteio do item_level: 50% floor(lvl/10)*10, 50% ceil(lvl/10)*10.
  -- Ex.: lvl 72 -> 70 (50%) ou 80 (50%). Mínimo 10 (item que o jogador pode usar).
  -- Usa divisão numérica (::numeric) para ceil/floor corretos em níveis divisíveis.
  if floor(random() * 2) = 0 then
    v_item_level := greatest(10, (floor(v_lvl::numeric / 10) * 10)::int);
  else
    v_item_level := greatest(10, (ceil(v_lvl::numeric / 10) * 10)::int);
  end if;

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
  select i.id, i.user_id, i.item_category, i.rarity, i.name, i.item_level, i.enhancement_level, i.quantity, i.equipped, i.created_at
  from public.inventory i
  where i.id = v_new_id;
end;
$$;

-- Bigorna (server): valida a tentativa de refino no banco e persiste o resultado
-- de forma atômica (item + gold). O rolamento em si é feito no cliente (mesma
-- chance/custo) para feedback instantâneo; esta RPC é a fonte da verdade e
-- protege contra trapaça. Devolve o resultado de exatamente uma tentativa.
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
  select i.id, i.user_id, i.item_category, i.rarity, i.name, i.item_level, i.enhancement_level, i.quantity, i.equipped, i.created_at
  from public.inventory i
  where i.id = p_inventory_id;
end;
$$;

-- claim_quest concede o baú de suprimentos na mesma transação. Recreada aqui
-- porque a coluna `level` foi renomeada para `enhancement_level` e os baús
-- agora também carregam `item_level`.
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
    insert into public.inventory (user_id, item_category, rarity, name, item_level, enhancement_level, quantity, equipped)
    values (v_user, 'supply_chest', v_quest.reward_chest_tier, null, 0, 0, 1, false)
    on conflict (user_id, item_category, rarity)
      where item_category = 'supply_chest'
    do update set quantity = inventory.quantity + 1;
  end if;

  return query select * from public.profiles where id = v_user;
end;
$$;

revoke all on function public.claim_quest(text) from public;
grant execute on function public.claim_quest(text) to authenticated;
grant execute on function public.claim_quest(text) to service_role;

-- Grants para as funções novas/alteradas.
revoke all on function public.open_inventory_chest(uuid, integer) from public;
grant execute on function public.open_inventory_chest(uuid, integer) to authenticated;
grant execute on function public.open_inventory_chest(uuid, integer) to service_role;

revoke all on function public.refine_item(uuid, boolean, integer) from public;
grant execute on function public.refine_item(uuid, boolean, integer) to authenticated;
grant execute on function public.refine_item(uuid, boolean, integer) to service_role;

revoke all on function public.gear_name(text, text) from public;
grant execute on function public.gear_name(text, text) to service_role;

-- Recarrega o schema no PostgREST (reflete as novas colunas e RPCs).
notify pgrst, 'reload schema';