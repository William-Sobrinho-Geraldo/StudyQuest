import { describe, expect, it } from 'vitest'
import type { ForgeItem } from '../features/forge/lib/forgeItems'
import { getItemBasePrice, getItemSalePrice } from './pricing'

function makeItem(overrides: Partial<ForgeItem> = {}): ForgeItem {
  return {
    id: 'item-1',
    slot: 'weapon',
    name: 'Lâmina de Estudo',
    itemLevel: 10,
    enhancementLevel: 0,
    rarity: 'common',
    ...overrides,
  }
}

describe('getItemBasePrice', () => {
  it('calcula o preço base de uma arma comum nível 10', () => {
    expect(getItemBasePrice('weapon', 'common', 10)).toBe(80)
  })

  it('aplica o multiplicador de raridade', () => {
    expect(getItemBasePrice('weapon', 'rare', 10)).toBe(144)
    expect(getItemBasePrice('weapon', 'epic', 10)).toBe(240)
    expect(getItemBasePrice('weapon', 'legendary', 10)).toBe(400)
  })

  it('aplica o fator de tier pelo item_level', () => {
    expect(getItemBasePrice('weapon', 'common', 20)).toBe(120)
    expect(getItemBasePrice('helmet', 'rare', 30)).toBe(180)
    expect(getItemBasePrice('chest', 'common', 10)).toBe(120)
    expect(getItemBasePrice('boots', 'epic', 40)).toBe(375)
  })
})

describe('getItemSalePrice', () => {
  it('retorna 40% do preço base, arredondado para baixo', () => {
    expect(getItemSalePrice(makeItem())).toBe(32)
    expect(getItemSalePrice(makeItem({ rarity: 'epic' }))).toBe(96)
    expect(getItemSalePrice(makeItem({ slot: 'chest', rarity: 'common' }))).toBe(48)
  })

  it('arredonda para baixo quando os 40% não são inteiros', () => {
    // boots epic nível 40 -> base 375 -> 40% = 150 (inteiro)
    expect(getItemSalePrice(makeItem({ slot: 'boots', rarity: 'epic', itemLevel: 40 }))).toBe(150)
    // weapon rare nível 10 -> base 144 -> 40% = 57.6 -> 57
    expect(getItemSalePrice(makeItem({ rarity: 'rare' }))).toBe(57)
  })
})
