import type { ForgeRarity } from '../features/forge/lib/forgeItems'
import type { EquipmentSlot } from '../features/forge/lib/forgeRules'

export interface ItemStat {
  label: string
  finalValue: number
  baseValue: number
  rarityBonusPercent: number
  refineBonusPercent: number
}

const RARITY_BONUS_PERCENT: Record<ForgeRarity, number> = {
  common: 0,
  rare: 20,
  epic: 50,
  legendary: 100,
}

const CATEGORY_BASE: Record<EquipmentSlot, { label: string; perLevel: number }> = {
  weapon: { label: 'Ataque', perLevel: 2 },
  helmet: { label: 'Defesa', perLevel: 2 },
  chest: { label: 'HP', perLevel: 10 },
  boots: { label: 'Defesa', perLevel: 1 },
}

// Motor universal de status por categoria, no modelo ADITIVO: todos os bônus
// percentuais somam entre si e incidem uma única vez sobre a base.
// base = level * perLevel | final = round(base * (1 + totalBonus% / 100)).
export function getItemStats(
  category: EquipmentSlot,
  level: number,
  rarity: ForgeRarity | undefined,
  enhancementLevel: number,
): ItemStat {
  const { label, perLevel } = CATEGORY_BASE[category]
  const rarityPercent = rarity ? (RARITY_BONUS_PERCENT[rarity] ?? 0) : 0
  const refinePercent = enhancementLevel * 15
  const totalBonusPercent = rarityPercent + refinePercent
  const baseValue = level * perLevel
  const finalValue = Math.round(baseValue * (1 + totalBonusPercent / 100))
  return {
    label,
    finalValue,
    baseValue,
    rarityBonusPercent: rarityPercent,
    refineBonusPercent: refinePercent,
  }
}
