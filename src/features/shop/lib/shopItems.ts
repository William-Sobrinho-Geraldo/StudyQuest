import type { EquipmentSlot } from '../../forge/lib/forgeRules'
import type { ForgeRarity } from '../../forge/lib/forgeItems'

// Raridades suportadas pelo mercado. Máximo é Épico — tiers lendários
// ainda não existem no metadado do jogo.
export const SHOP_RARITIES: ForgeRarity[] = ['common', 'rare', 'epic']

// Slot 6 (Vitrine Especial) tem raridade fixa épica.
export const SHOWCASE_SLOT_INDEX = 6

export interface ShopSlot {
  slot: number
  rarity: ForgeRarity
  item_category: EquipmentSlot
  item_level: number
  name: string
  attack: number
  defense: number
  hp: number
  price: number
  bought: boolean
}

export interface ShopData {
  slots: ShopSlot[]
  nextRefreshAt: string
  refreshesToday: number
}

export function isShopSlot(value: unknown): value is ShopSlot {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.slot === 'number' &&
    typeof record.rarity === 'string' &&
    typeof record.item_category === 'string' &&
    typeof record.item_level === 'number' &&
    typeof record.price === 'number'
  )
}