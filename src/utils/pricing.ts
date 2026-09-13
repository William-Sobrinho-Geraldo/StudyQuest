import type { ForgeItem, ForgeRarity } from '../features/forge/lib/forgeItems'
import type { EquipmentSlot } from '../features/forge/lib/forgeRules'

// Taxa de revenda: o jogador recupera 40% do valor de mercado original.
export const SALE_RATE = 0.4

// Custo base por categoria (slot), idêntico ao usado na geração do Mercado.
const CATEGORY_BASE_COST: Record<EquipmentSlot, number> = {
  weapon: 80,
  helmet: 50,
  chest: 120,
  boots: 50,
}

// Multiplicador de raridade, idêntico ao usado na geração do Mercado.
const RARITY_MULTIPLIER: Record<ForgeRarity, number> = {
  common: 1,
  rare: 1.8,
  epic: 3,
  legendary: 5,
}

// Preço base (100%) do item no Mercado: baseCost(slot) × rarityMult × tierMult,
// exatamente como o banco calcula em refresh_shop.
export function getItemBasePrice(
  slot: EquipmentSlot,
  rarity: ForgeRarity | undefined,
  itemLevel: number,
): number {
  const baseCost = CATEGORY_BASE_COST[slot] ?? 80
  const rarityMult = rarity ? (RARITY_MULTIPLIER[rarity] ?? 1) : 1
  const tierMult = 1 + (itemLevel / 10 - 1) * 0.5
  return Math.round(baseCost * rarityMult * tierMult)
}

// Valor de revenda: FLOOR(preco_base * 0.4). Espelha a RPC sell_inventory_item
// para que a UI mostre exatamente o que o banco vai processar.
export function getItemSalePrice(item: ForgeItem): number {
  return Math.floor(getItemBasePrice(item.slot, item.rarity, item.itemLevel) * SALE_RATE)
}
