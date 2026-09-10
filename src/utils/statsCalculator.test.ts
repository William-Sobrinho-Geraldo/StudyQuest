import { describe, expect, it } from 'vitest'
import {
  calculateItemStats,
  calculateTotalStats,
  type CharacterStats,
  type ItemStats,
} from './statsCalculator'
import type { EquippedItems, ForgeItem } from '../features/forge/lib/forgeItems'

function makeItem(
  overrides: Partial<ForgeItem> & { slot: ForgeItem['slot'] },
): ForgeItem {
  return {
    id: 'test-id',
    name: 'Test Item',
    itemLevel: 0,
    enhancementLevel: 0,
    rarity: 'common',
    ...overrides,
  }
}

describe('calculateItemStats', () => {
  it('weapon grants only attack, defense and hp are 0', () => {
    const stats: ItemStats = calculateItemStats(
      makeItem({ slot: 'weapon', itemLevel: 30, enhancementLevel: 5 }),
    )
    expect(stats.attack).toBe(30 * 2 + 5 * 5) // 60 + 25 = 85
    expect(stats.defense).toBe(0)
    expect(stats.hp).toBe(0)
  })

  it('helmet grants only defense, attack and hp are 0', () => {
    const stats: ItemStats = calculateItemStats(
      makeItem({ slot: 'helmet', itemLevel: 20, enhancementLevel: 3 }),
    )
    expect(stats.attack).toBe(0)
    expect(stats.defense).toBe(20 * 1 + 3 * 3) // 20 + 9 = 29
    expect(stats.hp).toBe(0)
  })

  it('boots grants only defense, attack and hp are 0', () => {
    const stats: ItemStats = calculateItemStats(
      makeItem({ slot: 'boots', itemLevel: 40, enhancementLevel: 7 }),
    )
    expect(stats.attack).toBe(0)
    expect(stats.defense).toBe(40 * 1 + 7 * 3) // 40 + 21 = 61
    expect(stats.hp).toBe(0)
  })

  it('chest grants only hp, attack and defense are 0', () => {
    const stats: ItemStats = calculateItemStats(
      makeItem({ slot: 'chest', itemLevel: 50, enhancementLevel: 10 }),
    )
    expect(stats.attack).toBe(0)
    expect(stats.defense).toBe(0)
    expect(stats.hp).toBe(50 * 10 + 10 * 20) // 500 + 200 = 700
  })

  it('returns all zeros for zero-level items', () => {
    const stats: ItemStats = calculateItemStats(
      makeItem({ slot: 'weapon', itemLevel: 0, enhancementLevel: 0 }),
    )
    expect(stats).toEqual({ attack: 0, defense: 0, hp: 0 })
  })

  it('scales linearly with enhancement level', () => {
    const base = calculateItemStats(
      makeItem({ slot: 'weapon', itemLevel: 10, enhancementLevel: 0 }),
    )
    const enhanced = calculateItemStats(
      makeItem({ slot: 'weapon', itemLevel: 10, enhancementLevel: 3 }),
    )
    expect(enhanced.attack - base.attack).toBe(3 * 5)
  })
})

describe('calculateTotalStats', () => {
  it('returns zeros for empty equipment', () => {
    const stats: CharacterStats = calculateTotalStats({})
    expect(stats).toEqual({ attack: 0, defense: 0, hp: 0 })
  })

  it('sums stats from multiple equipped items', () => {
    const equipped: EquippedItems = {
      weapon: makeItem({ id: 'w', slot: 'weapon', itemLevel: 30, enhancementLevel: 5 }),
      helmet: makeItem({ id: 'h', slot: 'helmet', itemLevel: 20, enhancementLevel: 3 }),
      chest: makeItem({ id: 'c', slot: 'chest', itemLevel: 40, enhancementLevel: 2 }),
      boots: makeItem({ id: 'b', slot: 'boots', itemLevel: 10, enhancementLevel: 1 }),
    }
    const stats = calculateTotalStats(equipped)
    expect(stats.attack).toBe(30 * 2 + 5 * 5)   // 85
    expect(stats.defense).toBe(20 * 1 + 3 * 3 + 10 * 1 + 1 * 3) // 29 + 13 = 42
    expect(stats.hp).toBe(40 * 10 + 2 * 20)     // 440
  })

  it('skips empty slots', () => {
    const equipped: EquippedItems = {
      weapon: makeItem({ id: 'w', slot: 'weapon', itemLevel: 10, enhancementLevel: 0 }),
    }
    const stats = calculateTotalStats(equipped)
    expect(stats).toEqual({ attack: 20, defense: 0, hp: 0 })
  })

  it('accumulates defense from helmet and boots separately', () => {
    const equipped: EquippedItems = {
      helmet: makeItem({ id: 'h', slot: 'helmet', itemLevel: 10, enhancementLevel: 2 }),
      boots: makeItem({ id: 'b', slot: 'boots', itemLevel: 10, enhancementLevel: 2 }),
    }
    const stats = calculateTotalStats(equipped)
    expect(stats.attack).toBe(0)
    expect(stats.defense).toBe((10 + 2 * 3) * 2) // (10+6)*2 = 32
    expect(stats.hp).toBe(0)
  })
})
