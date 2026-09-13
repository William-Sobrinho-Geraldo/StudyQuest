import type { ForgeRarity } from '../features/forge/lib/forgeItems'
import type { EquipmentSlot } from '../features/forge/lib/forgeRules'
import { getItemStats } from './itemStats'

export interface EquippedItemStatInput {
  category: EquipmentSlot
  level: number
  rarity: ForgeRarity | undefined
  enhancementLevel: number
}

export interface CombatTotals {
  attack: number
  defense: number
  hp: number
}

// Somatório dos status de todos os equipamentos atualmente equipados.
// Ataque vem das armas, Defesa de elmo + botas e HP do peitoral.
export function computeCombatTotals(items: EquippedItemStatInput[]): CombatTotals {
  let attack = 0
  let defense = 0
  let hp = 0

  for (const item of items) {
    const { finalValue } = getItemStats(
      item.category,
      item.level,
      item.rarity,
      item.enhancementLevel,
    )
    switch (item.category) {
      case 'weapon':
        attack += finalValue
        break
      case 'helmet':
      case 'boots':
        defense += finalValue
        break
      case 'chest':
        hp += finalValue
        break
    }
  }

  return { attack, defense, hp }
}

// Formata minutos totais de estudo em "32h 40m" / "40m".
export function formatStudyDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.floor(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  return `${hours}h ${rest}m`
}
