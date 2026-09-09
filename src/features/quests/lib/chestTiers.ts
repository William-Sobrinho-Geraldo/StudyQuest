export type QuestChestTier = 'common' | 'rare' | 'epic'

export interface ChestTierMeta {
  label: string
  textColor: string
}

export const CHEST_TIER_META: Record<QuestChestTier, ChestTierMeta> = {
  common: { label: 'Comum', textColor: 'text-slate-300' },
  rare: { label: 'Raro', textColor: 'text-blue-400' },
  epic: { label: 'Épico', textColor: 'text-purple-400' },
}

export function isQuestChestTier(value: unknown): value is QuestChestTier {
  return value === 'common' || value === 'rare' || value === 'epic'
}