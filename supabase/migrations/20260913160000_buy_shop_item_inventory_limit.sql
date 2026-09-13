-- ═══════════════════════════════════════════════════════════════════
-- Bloqueio de inventário cheio na compra do mercado.
--
-- A capacidade máxima do inventário de equipamentos é 24 itens
-- (INVENTORY_CAPACITY no frontend). A RPC buy_shop_item não validava
-- esse limite, permitindo comprar equipamentos com inventário 24/24.
--
-- Regra adicionada:
--   • Conta o inventário atual do usuário.
--   • Se o item NÃO for um 'avatar' (avatares vão para profiles, sem
--     ocupar espaço físico) E a contagem >= 24, aborta com
--     RAISE EXCEPTION 'INVENTORY_FULL'.
--   • Avatares continuam compráveis normalmente.
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
  v_user            uuid := auth.uid();
  v_shop            public.rotating_shop%rowtype;
  v_price           int;
  v_rarity          text;
  v_cat             text;
  v_level           int;
  v_name            text;
  v_atk             int;
  v_def             int;
  v_hp              int;
  v_bought          boolean;
  v_new_id          uuid;
  v_inventory_count int;
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

  if v_rarity is null then
    raise exception 'slot vazio';
  end if;

  if v_bought then
    raise exception 'item ja comprado';
  end if;

  select count(*) into v_inventory_count
    from public.inventory
    where inventory.user_id = v_user;

  if v_cat <> 'avatar' and v_inventory_count >= 24 then
    raise exception 'INVENTORY_FULL';
  end if;

  if v_cat = 'avatar' then
    -- Avatar: desconta gold e desbloqueia no perfil (não vai para inventory).
    update public.profiles
      set gold = gold - v_price,
          unlocked_avatars = array_append(coalesce(unlocked_avatars, '{}'::text[]), v_name)
      where profiles.id = v_user
        and gold >= v_price
        and not (v_name = any(coalesce(unlocked_avatars, '{}'::text[])));
    if not found then
      raise exception 'gold insuficiente ou avatar ja desbloqueado';
    end if;
  else
    -- Equipamento: desconta gold.
    update public.profiles
      set gold = gold - v_price
      where profiles.id = v_user and gold >= v_price;
    if not found then
      raise exception 'gold insuficiente';
    end if;

    insert into public.inventory
      (user_id, item_category, rarity, name, item_level, enhancement_level,
       quantity, equipped, stats)
    values
      (v_user, v_cat, v_rarity, v_name, v_level, 0, 1, false,
       jsonb_build_object('attack', v_atk, 'defense', v_def, 'hp', v_hp))
    returning inventory.id into v_new_id;
  end if;

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
