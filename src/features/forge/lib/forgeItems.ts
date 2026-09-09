import { MAX_REFINE_LEVEL, SLOTS, type EquipmentSlot } from './forgeRules'

export type ForgeRarity = 'common' | 'rare' | 'epic'

export interface ForgeItem {
  id: string
  slot: EquipmentSlot
  name: string
  level: number
  rarity?: ForgeRarity
}

// Equipados viraram um mapeamento parcial: usuários novos começam sem peças.
export type EquippedItems = Partial<Record<EquipmentSlot, ForgeItem>>

export const EQUIPMENT_STORAGE_KEY = 'studyquest.forge.equipment'
export const LEGACY_LEVELS_STORAGE_KEY = 'studyquest.forge.levels'

export const INVENTORY_CAPACITY = 24

const FORGE_RARITIES: ForgeRarity[] = ['common', 'rare', 'epic']

export function isForgeRarity(value: unknown): value is ForgeRarity {
  return FORGE_RARITIES.includes(value as ForgeRarity)
}

// Uma peça de equipamento persistida no Supabase = 1 linha do inventory.
export interface GearInventoryRow {
  id: string
  user_id: string
  item_category: EquipmentSlot
  rarity: ForgeRarity
  name: string
  level: number
  quantity: 1
  equipped: boolean
}

// Baú de suprimentos: empilhável, mesmas colunas, forma especial.
export interface SupplyChestRow {
  id: string
  user_id: string
  item_category: 'supply_chest'
  rarity: ForgeRarity
  name: null
  level: 0
  quantity: number
  equipped: false
}

export type InventoryRow = GearInventoryRow | SupplyChestRow

export function isGearRow(row: InventoryRow): row is GearInventoryRow {
  return row.item_category !== 'supply_chest'
}

export function isSupplyChestRow(row: InventoryRow): row is SupplyChestRow {
  return row.item_category === 'supply_chest'
}

export function gearRowToForgeItem(row: GearInventoryRow): ForgeItem {
  return {
    id: row.id,
    slot: row.item_category,
    name: row.name,
    level: row.level,
    rarity: row.rarity,
  }
}

function sanitizeLevel(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value)
    ? Math.min(Math.max(value, 0), MAX_REFINE_LEVEL)
    : 0
}

function sanitizeSlot(value: unknown, fallback?: EquipmentSlot): EquipmentSlot {
  return SLOTS.includes(value as EquipmentSlot)
    ? (value as EquipmentSlot)
    : (fallback ?? 'weapon')
}

function sanitizeItem(raw: unknown, fallbackSlot?: EquipmentSlot): ForgeItem | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === 'string' && record.id.length > 0 ? record.id : null
  if (!id) return null
  return {
    id,
    slot: sanitizeSlot(record.slot, fallbackSlot),
    name:
      typeof record.name === 'string' && record.name.length > 0
        ? record.name
        : `Item ${sanitizeSlot(record.slot, fallbackSlot)}`,
    level: sanitizeLevel(record.level),
  }
}

function sanitizeEquipped(raw: unknown): EquippedItems {
  if (typeof raw !== 'object' || raw === null) return {}
  const record = raw as Record<string, unknown>
  const result: EquippedItems = {}
  for (const slot of SLOTS) {
    const item = sanitizeItem(record[slot], slot)
    if (item) {
      result[slot] = { ...item, slot }
    }
  }
  return result
}

function sanitizeInventory(raw: unknown): ForgeItem[] {
  if (!Array.isArray(raw)) return []
  const items: ForgeItem[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    const item = sanitizeItem(entry)
    if (!item || seen.has(item.id)) continue
    seen.add(item.id)
    items.push(item)
  }
  return items
}

// Importação única do estado antigo (localStorage) para o banco. Usado apenas
// quando o usuário ainda não possui inventário no Supabase.
export function readLegacyEquipmentState(): {
  equipped: EquippedItems
  inventory: ForgeItem[]
} | null {
  try {
    const raw = window.localStorage.getItem(EQUIPMENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { equipped?: unknown; inventory?: unknown }
    return {
      equipped: sanitizeEquipped(parsed.equipped),
      inventory: sanitizeInventory(parsed.inventory),
    }
  } catch {
    return null
  }
}