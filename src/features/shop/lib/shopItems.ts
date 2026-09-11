import type { EquipmentSlot } from '../../forge/lib/forgeRules'
import type { ForgeRarity } from '../../forge/lib/forgeItems'

// Raridades dos slots regulares (1-5) do mercado. Máximo é Épico.
export const SHOP_RARITIES: ForgeRarity[] = ['common', 'rare', 'epic']

// Slot 6 (Vitrine Especial): categoria aleatória e raridade Épico ou
// Lendário — o sorteio acontece em refresh_shop (banco).
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