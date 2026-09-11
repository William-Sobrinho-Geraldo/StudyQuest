import { describe, expect, it } from 'vitest'
import { MAX_REFINE_LEVEL } from './forgeRules'
import {
  EQUIPMENT_STORAGE_KEY,
  gearRowToForgeItem,
  isForgeRarity,
  isGearRow,
  isSupplyChestRow,
  readLegacyEquipmentState,
  type ForgeItem,
  type GearInventoryRow,
  type SupplyChestRow,
} from './forgeItems'

function gearRow(overrides: Partial<GearInventoryRow> = {}): GearInventoryRow {
  const row: GearInventoryRow = {
    id: 'row-1',
    user_id: 'user-1',
    item_category: 'weapon',
    rarity: 'rare',
    name: 'Espada do Saber',
    item_level: 20,
    enhancement_level: 4,
    quantity: 1,
    equipped: true,
  }
  return { ...row, ...overrides }
}

function chestRow(overrides: Partial<SupplyChestRow> = {}): SupplyChestRow {
  const row: SupplyChestRow = {
    id: 'chest-1',
    user_id: 'user-1',
    item_category: 'supply_chest',
    rarity: 'epic',
    name: null,
    item_level: 0,
    enhancement_level: 0,
    quantity: 2,
    equipped: false,
  }
  return { ...row, ...overrides }
}

describe('type guards e raridade', () => {
  it('reconhece raridades de baú/equipamento', () => {
    expect(isForgeRarity('common')).toBe(true)
    expect(isForgeRarity('epic')).toBe(true)
    expect(isForgeRarity('legendary')).toBe(true)
    expect(isForgeRarity(undefined)).toBe(false)
  })

  it('distingue linha de equipamento de linha de baú', () => {
    expect(isGearRow(gearRow())).toBe(true)
    expect(isSupplyChestRow(gearRow())).toBe(false)
    expect(isGearRow(chestRow())).toBe(false)
    expect(isSupplyChestRow(chestRow())).toBe(true)
  })
})

describe('gearRowToForgeItem', () => {
  it('mapeia slot, nome, item_level, enhancement_level e raridade', () => {
    const item = gearRowToForgeItem(gearRow())

    expect(item).toEqual({
      id: 'row-1',
      slot: 'weapon',
      name: 'Espada do Saber',
      itemLevel: 20,
      enhancementLevel: 4,
      rarity: 'rare',
    })
  })
})

describe('readLegacyEquipmentState', () => {
  it('retorna null quando nada foi armazenado', () => {
    window.localStorage.clear()

    expect(readLegacyEquipmentState()).toBeNull()
  })

  it('lê e saneia o estado antigo do localStorage (level antigo vira enhancement)', () => {
    window.localStorage.clear()
    const legacy: { equipped: Record<string, ForgeItem>; inventory: ForgeItem[] } = {
      equipped: {
        weapon: {
          id: 'equipped:weapon',
          slot: 'weapon',
          name: 'Espada do Aprendiz',
          itemLevel: 10,
          enhancementLevel: 7,
        },
      },
      inventory: [
        {
          id: 'spare:helmet:0',
          slot: 'helmet',
          name: 'Coifa de Saber',
          itemLevel: 10,
          enhancementLevel: 999,
        },
        {
          id: 'spare:helmet:1',
          slot: 'helmet',
          name: 'Coifa quebrada',
          itemLevel: 10,
          enhancementLevel: -4,
        },
      ],
    }
    window.localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(legacy))

    const state = readLegacyEquipmentState()

    expect(state).not.toBeNull()
    expect(state?.equipped.weapon).toMatchObject({
      id: 'equipped:weapon',
      enhancementLevel: 7,
    })
    expect(state?.inventory[0].enhancementLevel).toBe(MAX_REFINE_LEVEL)
    expect(state?.inventory[1].enhancementLevel).toBe(0)
  })

  it('valores antigos de nível sem os novos campos viram item_level padrão e enhancement', () => {
    window.localStorage.clear()
    const legacy = {
      equipped: {
        weapon: { id: 'w', slot: 'weapon', name: 'X', level: 5 },
      },
    }
    window.localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(legacy))

    const state = readLegacyEquipmentState()

    expect(state?.equipped.weapon).toMatchObject({ itemLevel: 10, enhancementLevel: 5 })
  })

  it('retorna null quando o armazenamento está corrompido', () => {
    window.localStorage.clear()
    window.localStorage.setItem(EQUIPMENT_STORAGE_KEY, '{nao-eh-json')

    expect(readLegacyEquipmentState()).toBeNull()
  })
})