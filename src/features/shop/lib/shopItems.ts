import type { EquipmentSlot } from '../../forge/lib/forgeRules'
import type { ForgeRarity } from '../../forge/lib/forgeItems'

// Raridades dos slots regulares (1-5) do mercado. Máximo é Épico.
export const SHOP_RARITIES: ForgeRarity[] = ['common', 'rare', 'epic']

// Um slot do mercado pode ser equipamento ou avatar premium.
// No banco, avatares usam item_category = 'avatar' e name = id do avatar.
export type ShopItemCategory = EquipmentSlot | 'avatar'

export interface ShopSlot {
  slot: number
  rarity: ForgeRarity
  item_category: ShopItemCategory
  item_level: number
  name: string
  attack: number
  defense: number
  hp: number
  price: number
  bought: boolean
}

export function isAvatarSlot(slot: ShopSlot): boolean {
  return slot.item_category === 'avatar'
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