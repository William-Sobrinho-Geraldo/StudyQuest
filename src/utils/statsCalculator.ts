import type { ForgeItem } from '../features/forge/lib/forgeItems'
import type { EquippedItems } from '../features/forge/lib/forgeItems'

export interface ItemStats {
  attack: number
  defense: number
  hp: number
}

export interface CharacterStats {
  attack: number
  defense: number
  hp: number
}

export function calculateItemStats(item: ForgeItem): ItemStats {
  const { slot, itemLevel, enhancementLevel } = item

  switch (slot) {
    case 'weapon':
      return {
        attack: itemLevel * 2 + enhancementLevel * 5,
        defense: 0,
        hp: 0,
      }
    case 'helmet':
    case 'boots':
      return {
        attack: 0,
        defense: itemLevel * 1 + enhancementLevel * 3,
        hp: 0,
      }
    case 'chest':
      return {
        attack: 0,
        defense: 0,
        hp: itemLevel * 10 + enhancementLevel * 20,
      }
    default:
      return { attack: 0, defense: 0, hp: 0 }
  }
}

export function calculateTotalStats(equipped: EquippedItems): CharacterStats {
  let attack = 0
  let defense = 0
  let hp = 0

  for (const item of Object.values(equipped)) {
    if (!item) continue
    const stats = calculateItemStats(item)
    attack += stats.attack
    defense += stats.defense
    hp += stats.hp
  }

  return { attack, defense, hp }
}
