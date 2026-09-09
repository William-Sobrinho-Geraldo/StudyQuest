import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import {
  MAX_REFINE_LEVEL,
  REFINE_COST,
  SLOTS,
  attemptRefine,
  successRate,
  type EquipmentSlot,
  type RefineResult,
} from '../lib/forgeRules'
import {
  gearRowToForgeItem,
  isGearRow,
  isSupplyChestRow,
  readLegacyEquipmentState,
  type EquippedItems,
  type ForgeItem,
  type ForgeRarity,
  type InventoryRow,
  type SupplyChestRow,
} from '../lib/forgeItems'

export interface SelectedMeta {
  item: ForgeItem
  rate: number
  cost: number
  isMax: boolean
  canAfford: boolean
}

interface LegacyGearRow {
  user_id: string
  item_category: EquipmentSlot
  rarity: ForgeRarity
  name: string
  level: number
  quantity: 1
  equipped: boolean
}

function makeLegacyGearRow(
  userId: string,
  item: ForgeItem,
  equipped: boolean,
): LegacyGearRow {
  return {
    user_id: userId,
    item_category: item.slot,
    rarity: 'common',
    name: item.name,
    level: item.level,
    quantity: 1,
    equipped,
  }
}

export function useForge() {
  const { user } = useAuth()
  const [equipped, setEquipped] = useState<EquippedItems>({})
  const [inventory, setInventory] = useState<ForgeItem[]>([])
  const [chests, setChests] = useState<SupplyChestRow[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [gold, setGold] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastResult, setLastResult] = useState<RefineResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let active = true

    const applyRows = (rows: InventoryRow[]) => {
      const nextEquipped: EquippedItems = {}
      const nextInventory: ForgeItem[] = []
      const nextChests: SupplyChestRow[] = []
      for (const row of rows) {
        if (isSupplyChestRow(row)) {
          nextChests.push(row)
        } else if (isGearRow(row)) {
          const item = gearRowToForgeItem(row)
          if (row.equipped) {
            nextEquipped[row.item_category] = item
          } else {
            nextInventory.push(item)
          }
        }
      }
      setEquipped(nextEquipped)
      setInventory(nextInventory)
      setChests(nextChests)
    }

    const load = async () => {
      const [goldResult, rowsResult] = await Promise.all([
        supabase.from('profiles').select('gold').eq('id', user.id).maybeSingle(),
        supabase.from('inventory').select('*').eq('user_id', user.id),
      ])

      if (!active) return

      if (goldResult.error) {
        setError(goldResult.error.message)
      } else {
        setGold(goldResult.data?.gold ?? 0)
      }

      if (rowsResult.error) {
        setError(rowsResult.error.message)
        setLoading(false)
        return
      }

      let rows = (rowsResult.data ?? []) as InventoryRow[]
      if (rows.length === 0) {
        const legacy = readLegacyEquipmentState()
        if (legacy) {
          const legacyRows: LegacyGearRow[] = []
          for (const slot of SLOTS) {
            const item = legacy.equipped[slot]
            if (item) legacyRows.push(makeLegacyGearRow(user.id, item, true))
          }
          for (const item of legacy.inventory) {
            legacyRows.push(makeLegacyGearRow(user.id, item, false))
          }
          const { data: inserted } = await supabase
            .from('inventory')
            .insert(legacyRows)
            .select()
          rows = (inserted ?? legacyRows) as InventoryRow[]
        }
      }

      if (active) applyRows(rows)
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [user])

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null
    const spare = inventory.find((item) => item.id === selectedItemId)
    if (spare) return spare
    return (
      SLOTS.map((slot) => equipped[slot]).find((item) => item?.id === selectedItemId) ?? null
    )
  }, [equipped, inventory, selectedItemId])

  const selectedMeta: SelectedMeta | null = useMemo(() => {
    if (!selectedItem) return null
    const level = selectedItem.level
    return {
      item: selectedItem,
      rate: successRate(level),
      cost: REFINE_COST[level] ?? 0,
      isMax: level >= MAX_REFINE_LEVEL,
      canAfford: gold !== null && gold >= (REFINE_COST[level] ?? 0),
    }
  }, [gold, selectedItem])

  const selectItem = useCallback((itemId: string) => {
    setSelectedItemId(itemId)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItemId(null)
  }, [])

  const refine = useCallback(async () => {
    if (!user || gold === null || busy || !selectedItem) return

    const outcome = attemptRefine(selectedItem.slot, selectedItem.level, gold, Math.random())
    if (outcome.status === 'unavailable') {
      setError(
        outcome.reason === 'max_level'
          ? 'Este item já está no refino máximo.'
          : 'Gold insuficiente para essa tentativa.',
      )
      return
    }

    const result = outcome.result
    const previousEquipped = equipped
    const previousInventory = inventory
    const previousGold = gold
    const nextGold = gold - result.cost
    const nextItem: ForgeItem = { ...selectedItem, level: result.levelAfter }
    const isEquippedPiece = SLOTS.some((slot) => equipped[slot]?.id === selectedItem.id)

    let nextEquipped = previousEquipped
    let nextInventory = previousInventory
    if (isEquippedPiece) {
      nextEquipped = { ...previousEquipped, [selectedItem.slot]: nextItem }
    } else {
      nextInventory = previousInventory.map((item) =>
        item.id === selectedItem.id ? nextItem : item,
      )
    }

    setError(null)
    setBusy(true)
    setLastResult(result)
    setEquipped(nextEquipped)
    setInventory(nextInventory)
    setGold(nextGold)

    const [goldResult, itemResult] = await Promise.all([
      supabase.from('profiles').update({ gold: nextGold }).eq('id', user.id),
      supabase.from('inventory').update({ level: result.levelAfter }).eq('id', selectedItem.id),
    ])

    const failed = goldResult.error ?? itemResult.error
    if (failed) {
      setEquipped(previousEquipped)
      setInventory(previousInventory)
      setGold(previousGold)
      setLastResult(null)
      setError(failed.message)
    }

    setBusy(false)
  }, [busy, equipped, gold, inventory, selectedItem, user])

  const equipFromInventory = useCallback(
    async (itemId: string, slot: EquipmentSlot) => {
      if (!user || busy) return
      const incoming = inventory.find((item) => item.id === itemId)
      if (!incoming) return

      const current = equipped[slot]
      const previousEquipped = equipped
      const previousInventory = inventory

      setError(null)
      setBusy(true)
      setEquipped((previous) => ({ ...previous, [slot]: { ...incoming, slot } }))
      setInventory((previous) => [
        ...previous.filter((item) => item.id !== itemId),
        ...(current ? [{ ...current, slot }] : []),
      ])

      // Primeiro desequipa a peça atual (índice único por slot), depois equipa a nova.
      const unequipPromise = current
        ? supabase.from('inventory').update({ equipped: false }).eq('id', current.id)
        : Promise.resolve({ data: null, error: null })
      const equipPromise = supabase
        .from('inventory')
        .update({ equipped: true })
        .eq('id', incoming.id)

      const [unequipResult, equipResult] = await Promise.all([unequipPromise, equipPromise])
      const failed = unequipResult.error ?? equipResult.error
      if (failed) {
        setEquipped(previousEquipped)
        setInventory(previousInventory)
        setError(failed.message)
      }
      setBusy(false)
    },
    [busy, equipped, inventory, user],
  )

  const openChest = useCallback(
    async (chestId: string): Promise<ForgeItem | null> => {
      if (!user || busy) return null
      setError(null)
      setBusy(true)

      const { data, error: rpcError } = await supabase.rpc('open_inventory_chest', {
        p_inventory_id: chestId,
      })

      setBusy(false)
      if (rpcError) {
        setError(rpcError.message)
        return null
      }

      const rows = (data ?? []) as InventoryRow[]
      const row = rows.find(isGearRow)
      if (!row) return null

      const item = gearRowToForgeItem(row)
      setChests((previous) =>
        previous
          .map((chest) =>
            chest.id === chestId ? { ...chest, quantity: chest.quantity - 1 } : chest,
          )
          .filter((chest) => chest.quantity > 0),
      )
      setInventory((previous) => [...previous, item])
      return item
    },
    [busy, user],
  )

  return {
    equipped,
    inventory,
    chests,
    selectedItemId,
    selectedMeta,
    gold,
    busy,
    loading,
    lastResult,
    error,
    canUseForge: gold !== null,
    selectItem,
    clearSelection,
    refine,
    equipFromInventory,
    openChest,
  }
}