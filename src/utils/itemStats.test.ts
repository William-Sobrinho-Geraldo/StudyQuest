import { describe, expect, it } from 'vitest'
import { getItemStats } from './itemStats'

describe('getItemStats', () => {
  it('weapon grants Ataque = level * 2', () => {
    expect(getItemStats('weapon', 10, 'common', 0)).toEqual({
      label: 'Ataque',
      finalValue: 20,
      baseValue: 20,
      rarityBonusPercent: 0,
      refineBonusPercent: 0,
    })
  })

  it('helmet grants Defesa = level * 2', () => {
    expect(getItemStats('helmet', 10, 'common', 0)).toEqual({
      label: 'Defesa',
      finalValue: 20,
      baseValue: 20,
      rarityBonusPercent: 0,
      refineBonusPercent: 0,
    })
  })

  it('chest grants HP = level * 10', () => {
    expect(getItemStats('chest', 10, 'common', 0)).toEqual({
      label: 'HP',
      finalValue: 100,
      baseValue: 100,
      rarityBonusPercent: 0,
      refineBonusPercent: 0,
    })
  })

  it('boots grants Defesa = level * 1', () => {
    expect(getItemStats('boots', 10, 'common', 0)).toEqual({
      label: 'Defesa',
      finalValue: 10,
      baseValue: 10,
      rarityBonusPercent: 0,
      refineBonusPercent: 0,
    })
  })

  it('exposes the rarity bonus percent', () => {
    expect(getItemStats('weapon', 10, 'common', 0).rarityBonusPercent).toBe(0)
    expect(getItemStats('weapon', 10, 'rare', 0).rarityBonusPercent).toBe(20)
    expect(getItemStats('weapon', 10, 'epic', 0).rarityBonusPercent).toBe(50)
    expect(getItemStats('weapon', 10, 'legendary', 0).rarityBonusPercent).toBe(100)
  })

  it('applies the rarity bonus additively', () => {
    // 10 * 2 * (1 + 100/100) = 40
    expect(getItemStats('weapon', 10, 'legendary', 0).finalValue).toBe(40)
    // 10 * 10 * (1 + 50/100) = 150
    expect(getItemStats('chest', 10, 'epic', 0).finalValue).toBe(150)
  })

  it('sums rarity and refine bonuses before applying them to the base', () => {
    // base 30*2=60, rarity 20 + refine 75 = 95% => 60 * 1.95 = 117
    expect(getItemStats('weapon', 30, 'rare', 5)).toEqual({
      label: 'Ataque',
      finalValue: 117,
      baseValue: 60,
      rarityBonusPercent: 20,
      refineBonusPercent: 75,
    })
  })

  it('exposes the refine bonus percent as enhancementLevel * 15', () => {
    expect(getItemStats('weapon', 1, 'common', 1).refineBonusPercent).toBe(15)
    expect(getItemStats('weapon', 1, 'common', 4).refineBonusPercent).toBe(60)
  })

  it('rounds fractional values instead of flooring (float bug: 229 -> 230)', () => {
    // 20 * 10 * (1 + 15/100) = 200 * 1.15 = 229.9999... -> round = 230
    expect(getItemStats('chest', 20, 'common', 1).finalValue).toBe(230)
  })

  it('treats undefined rarity as common', () => {
    expect(getItemStats('chest', 10, undefined, 0)).toEqual({
      label: 'HP',
      finalValue: 100,
      baseValue: 100,
      rarityBonusPercent: 0,
      refineBonusPercent: 0,
    })
  })
})
