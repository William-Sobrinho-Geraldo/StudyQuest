-- ═══════════════════════════════════════════════════════════════════
-- Venda de itens do inventário (sell_inventory_item).
--
-- O jogador pode vender equipamentos sobressalentes do inventário e
-- recuperar 40% do valor de mercado original (FLOOR do preço base).
--
-- O preço base (100%) usa exatamente a mesma fórmula da geração do
-- Mercado Rotativo (refresh_shop):
--   precoBase = baseCost(slot) × rarityMult × tierMult
--   • baseCost: weapon 80 | helmet 50 | chest 120 | boots 50
--   • rarityMult: common 1.0 | rare 1.8 | epic 3.0 | legendary 5.0
--   • tierMult: 1 + (item_level/10 - 1) × 0.5
--   valorVenda = FLOOR(precoBase × 0.4)
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.sell_inventory_item(p_user_id uuid, p_inventory_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item        public.inventory%rowtype;
  v_base_price  int;
  v_r_mult      numeric;
  v_t_mult      numeric;
  v_sale_price  int;
begin
  -- Segurança: só vende o próprio inventário.
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'usuario invalido';
  end if;

  -- 1) Item existe e pertence ao usuário.
  select * into v_item
    from public.inventory
    where inventory.id = p_inventory_id;

  if not found then
    raise exception 'item nao encontrado';
  end if;

  if v_item.user_id <> p_user_id then
    raise exception 'item nao pertence ao usuario';
  end if;

  -- 2) Não pode vender item equipado.
  if v_item.equipped then
    raise exception 'nao e possivel vender item equipado';
  end if;

  -- Baús de suprimentos não são equipamentos vendáveis.
  if v_item.item_category = 'supply_chest' then
    raise exception 'nao e possivel vender bau de suprimentos';
  end if;

  -- 3) Valor de venda: 40% do preço de mercado original.
  v_r_mult := case v_item.rarity
    when 'common'    then 1.0
    when 'rare'      then 1.8
    when 'epic'      then 3.0
    when 'legendary' then 5.0
    else 1.0
  end;
  v_t_mult := 1.0 + (v_item.item_level / 10.0 - 1) * 0.5;

  v_base_price := case v_item.item_category
    when 'weapon' then 80
    when 'helmet' then 50
    when 'chest'  then 120
    when 'boots'  then 50
    else 80
  end;
  v_base_price := round(v_base_price * v_r_mult * v_t_mult)::int;

  v_sale_price := floor(v_base_price * 0.4)::int;

  -- 4) Remove o item do inventário.
  delete from public.inventory where inventory.id = p_inventory_id;

  -- 5) Credita o Gold no perfil.
  update public.profiles
    set gold = gold + v_sale_price
    where profiles.id = p_user_id;

  if not found then
    raise exception 'perfil nao encontrado';
  end if;

  -- 6) Retorna o valor de Gold recebido.
  return v_sale_price;
end;
$$;

revoke all on function public.sell_inventory_item(uuid, uuid) from public;
grant execute on function public.sell_inventory_item(uuid, uuid) to authenticated;
grant execute on function public.sell_inventory_item(uuid, uuid) to service_role;

-- Recarrega o schema no PostgREST (reflete a nova RPC).
notify pgrst, 'reload schema';
