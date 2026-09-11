import type { ForgeRarity } from './forgeItems'

export interface RarityCardStyle {
  border: string
  glow: string
  text: string
  icon: string
  chip: string
}

export const RARITY_LABELS: Record<ForgeRarity, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
}

export const RARITY_CARD_STYLES: Record<ForgeRarity, RarityCardStyle> = {
  common: {
    border: 'border-green-500/60',
    glow: 'shadow-lg shadow-green-500/10',
    text: 'text-green-400',
    icon: 'text-green-400',
    chip: 'border border-green-500/30 bg-green-500/10 text-green-300',
  },
  rare: {
    border: 'border-blue-500/60',
    glow: 'shadow-lg shadow-blue-500/15',
    text: 'text-blue-400',
    icon: 'text-blue-400',
    chip: 'border border-blue-500/30 bg-blue-500/10 text-blue-300',
  },
  epic: {
    border: 'border-purple-500/60',
    glow: 'shadow-lg shadow-purple-500/30',
    text: 'text-purple-300',
    icon: 'text-purple-300',
    chip: 'border border-purple-500/40 bg-purple-500/15 text-purple-200',
  },
  legendary: {
    border: 'border-amber-400/70',
    glow: 'shadow-lg shadow-amber-500/20',
    text: 'text-amber-300',
    icon: 'text-amber-300',
    chip: 'border border-amber-400/40 bg-amber-500/15 text-amber-200',
  },
}

const DEFAULT_STYLE = RARITY_CARD_STYLES.common

export function rarityStyle(rarity?: ForgeRarity): RarityCardStyle {
  return rarity ? (RARITY_CARD_STYLES[rarity] ?? DEFAULT_STYLE) : DEFAULT_STYLE
}