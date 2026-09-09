-- Inventário do jogador + concessão de baús no claim das quests.
-- item_category: 'chest' por enquanto (futuro: 'weapon', 'helmet', etc.).
-- rarity: 'common' | 'rare' | 'epic' (ou futuras raridades de itens).

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_category text not null,
  rarity text not null,
  quantity integer not null default 1 check (quantity >= 1),
  created_at timestamptz not null default now(),
  -- Acúmulo de empilháveis: uma linha por categoria/raridade do usuário.
  unique (user_id, item_category, rarity)
);

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

-- claim_quest passa a conceder o baú no inventário quando a quest possui
-- reward_chest_tier. O INSERT é feito na mesma transação da reivindicação.
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

  -- Baú de suprimentos: acumula a quantidade ou cria a linha (mesma transação).
  if v_quest.reward_chest_tier is not null then
    insert into public.inventory (user_id, item_category, rarity, quantity)
    values (v_user, 'chest', v_quest.reward_chest_tier, 1)
    on conflict (user_id, item_category, rarity)
    do update set quantity = inventory.quantity + 1;
  end if;

  return query select * from public.profiles where id = v_user;
end;
$$;