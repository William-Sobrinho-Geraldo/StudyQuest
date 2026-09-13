import { describe, expect, it } from 'vitest'
import { computeCombatTotals, formatStudyDuration } from './equippedStats'

describe('computeCombatTotals', () => {
  it('returns zero totals when no items are equipped', () => {
    expect(computeCombatTotals([])).toEqual({ attack: 0, defense: 0, hp: 0 })
  })

  it('sums attack from weapons only', () => {
    expect(
      computeCombatTotals([
        { category: 'weapon', level: 10, rarity: 'common', enhancementLevel: 0 },
        { category: 'weapon', level: 20, rarity: 'common', enhancementLevel: 0 },
      ]),
    ).toEqual({ attack: 20 + 40, defense: 0, hp: 0 })
  })

  it('sums defense from helmet and boots', () => {
    expect(
      computeCombatTotals([
        { category: 'helmet', level: 10, rarity: 'common', enhancementLevel: 0 },
        { category: 'boots', level: 10, rarity: 'common', enhancementLevel: 0 },
      ]),
    ).toEqual({ attack: 0, defense: 20 + 10, hp: 0 })
  })

  it('sums hp from chest only', () => {
    expect(
      computeCombatTotals([
        { category: 'chest', level: 10, rarity: 'common', enhancementLevel: 0 },
      ]),
    ).toEqual({ attack: 0, defense: 0, hp: 100 })
  })

  it('combines all slots and applies rarity bonuses', () => {
    expect(
      computeCombatTotals([
        { category: 'weapon', level: 10, rarity: 'rare', enhancementLevel: 0 },
        { category: 'helmet', level: 10, rarity: 'common', enhancementLevel: 0 },
        { category: 'chest', level: 10, rarity: 'epic', enhancementLevel: 0 },
        { category: 'boots', level: 10, rarity: 'common', enhancementLevel: 0 },
      ]),
    ).toEqual({ attack: 24, defense: 30, hp: 150 })
  })
})

describe('formatStudyDuration', () => {
  it('formats minutes only below an hour', () => {
    expect(formatStudyDuration(0)).toBe('0m')
    expect(formatStudyDuration(40)).toBe('40m')
  })

  it('formats hours and minutes', () => {
    expect(formatStudyDuration(1960)).toBe('32h 40m')
    expect(formatStudyDuration(60)).toBe('1h 0m')
  })

  it('clamps negative values to zero', () => {
    expect(formatStudyDuration(-5)).toBe('0m')
  })
})
