import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import {
  MAX_REFINE_LEVEL,
  SLOTS,
  canEquip,
  refineCost,
  type EquipmentSlot,
} from '../lib/forgeRules'
import { forgeDurationSeconds } from '../lib/forgeTimers'
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
  // Custo em Gold para INICIAR o refino temporizado.
  cost: number
  // Duração total do refino (segundos) para o nível de refino atual.
  durationSeconds: number
  isMax: boolean
  canAfford: boolean
  // Regra de uso: item só pode ser refinado se item_level <= nível do personagem.
  canEquip: boolean
  blockedByLevel: boolean
}

export interface SellResult {
  success: boolean
  salePrice?: number
  error?: string
}

interface LegacyGearRow {
  user_id: string
  item_category: EquipmentSlot
  rarity: ForgeRarity
  name: string
  item_level: number
  enhancement_level: number
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
    item_level: item.itemLevel,
    enhancement_level: item.enhancementLevel,
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
  const [characterLevel, setCharacterLevel] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [adBusy, setAdBusy] = useState(false)
  const [loading, setLoading] = useState(true)
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
      const [goldResult, levelResult, rowsResult] = await Promise.all([
        supabase.from('profiles').select('gold').eq('id', user.id).maybeSingle(),
        supabase.from('profiles').select('level').eq('id', user.id).maybeSingle(),
        supabase.from('inventory').select('*').eq('user_id', user.id),
      ])

      if (!active) return

      if (goldResult.error) {
        setError(goldResult.error.message)
      } else {
        setGold(goldResult.data?.gold ?? 0)
      }

      if (levelResult.error) {
        setError(levelResult.error.message)
      } else {
        setCharacterLevel(levelResult.data?.level ?? 1)
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

  // Item atualmente na Bigorna (no máximo 1 por jogador). Pode estar no
  // inventário ou equipado.
  const activeForgeItem = useMemo<ForgeItem | null>(() => {
    const inInventory = inventory.find((item) => item.isInForge)
    if (inInventory) return inInventory
    return SLOTS.map((slot) => equipped[slot]).find((item) => item?.isInForge) ?? null
  }, [equipped, inventory])

  const activeForgeEndsAt = useMemo<string | null>(
    () => activeForgeItem?.forgeEndsAt ?? null,
    [activeForgeItem],
  )

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
    const enhancementLevel = selectedItem.enhancementLevel
    const cost = refineCost(selectedItem.itemLevel, enhancementLevel)
    const levelOk = characterLevel !== null && canEquip(selectedItem.itemLevel, characterLevel)
    return {
      item: selectedItem,
      cost,
      durationSeconds: forgeDurationSeconds(enhancementLevel),
      isMax: enhancementLevel >= MAX_REFINE_LEVEL,
      canAfford: gold !== null && gold >= cost,
      canEquip: levelOk,
      blockedByLevel: characterLevel !== null && !levelOk,
    }
  }, [characterLevel, gold, selectedItem])

  const selectItem = useCallback((itemId: string) => {
    setSelectedItemId(itemId)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItemId(null)
  }, [])

  // Aplica a linha devolvida pelo servidor (verdade) no inventário ou no
  // paperdoll, conforme onde o item vive.
  const applyAuthoritativeItem = useCallback((item: ForgeItem) => {
    setInventory((previous) => {
      const exists = previous.some((i) => i.id === item.id)
      return exists ? previous.map((i) => (i.id === item.id ? item : i)) : previous
    })
    setEquipped((previous) => {
      const slot = SLOTS.find((s) => previous[s]?.id === item.id)
      if (!slot) return previous
      return { ...previous, [slot]: item }
    })
  }, [])

  // Paga o Gold e inicia o refino temporizado (a Bigorna fica ocupada).
  const startForge = useCallback(async () => {
    if (!user || gold === null || busy || adBusy || !selectedItem) return
    if (selectedItem.isInForge) return
    if (selectedItem.enhancementLevel >= MAX_REFINE_LEVEL) return

    const cost = refineCost(selectedItem.itemLevel, selectedItem.enhancementLevel)
    if (gold < cost) {
      setError('Gold insuficiente para iniciar o refino.')
      return
    }

    const previousGold = gold
    setError(null)
    setBusy(true)
    setGold(gold - cost)

    const { data, error: rpcError } = await supabase.rpc('start_forge_refinement', {
      p_inventory_id: selectedItem.id,
    })

    if (rpcError) {
      setGold(previousGold)
      setError(rpcError.message)
      setBusy(false)
      return
    }

    const row = ((data ?? []) as InventoryRow[]).find(isGearRow)
    if (row) {
      applyAuthoritativeItem(gearRowToForgeItem(row))
    }
    setSelectedItemId(null)
    setBusy(false)
  }, [applyAuthoritativeItem, busy, adBusy, gold, selectedItem, user])

  // Anúncio (mockado): 2s de "vídeo" e corta 25% do tempo RESTANTE.
  const reduceForgeTime = useCallback(async () => {
    if (!user || busy || adBusy || !activeForgeItem) return
    setError(null)
    setAdBusy(true)

    // Mock do vídeo do anúncio.
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const { data, error: rpcError } = await supabase.rpc('reduce_forge_time_ad', {
      p_inventory_id: activeForgeItem.id,
    })

    setAdBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }

    const row = ((data ?? []) as InventoryRow[]).find(isGearRow)
    if (row) {
      applyAuthoritativeItem(gearRowToForgeItem(row))
    }
  }, [activeForgeItem, applyAuthoritativeItem, busy, adBusy, user])

  // Coleta o item refina e libera a Bigorna (+1 de refino).
  const collectForged = useCallback(async () => {
    if (!user || busy || adBusy || !activeForgeItem) return
    setError(null)
    setBusy(true)

    const { data, error: rpcError } = await supabase.rpc('collect_forged_item', {
      p_inventory_id: activeForgeItem.id,
    })

    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }

    const row = ((data ?? []) as InventoryRow[]).find(isGearRow)
    if (row) {
      applyAuthoritativeItem(gearRowToForgeItem(row))
    }
  }, [activeForgeItem, applyAuthoritativeItem, busy, adBusy, user])

  // Atalho discreto: conclui o refino imediatamente (ignora o timer).
  const completeForge = useCallback(async () => {
    if (!user || busy || adBusy || !activeForgeItem) return
    setError(null)
    setBusy(true)

    const { data, error: rpcError } = await supabase.rpc('complete_forge_now', {
      p_inventory_id: activeForgeItem.id,
    })

    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }

    const row = ((data ?? []) as InventoryRow[]).find(isGearRow)
    if (row) {
      applyAuthoritativeItem(gearRowToForgeItem(row))
    }
  }, [activeForgeItem, applyAuthoritativeItem, busy, adBusy, user])

  const equipFromInventory = useCallback(
    async (itemId: string, slot: EquipmentSlot) => {
      if (!user || busy) return
      const incoming = inventory.find((item) => item.id === itemId)
      if (!incoming) return
      if (incoming.isInForge) {
        setError('Este item está em refino na Bigorna.')
        return
      }
      if (characterLevel !== null && !canEquip(incoming.itemLevel, characterLevel)) {
        setError(
          `Item Nível ${incoming.itemLevel} requer personagem Nível ${incoming.itemLevel}.`,
        )
        return
      }

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

      const fail = (message: string) => {
        setEquipped(previousEquipped)
        setInventory(previousInventory)
        setError(message)
      }

      // Swap sequencial: primeiro desequipa a peça atual e aguarda a constraint
      // inventory_equipped_slot_uidx (user_id, slot) where equipped liberar o
      // único "equipped" do slot, só então equipa a nova. Executar as duas em
      // paralelo causava 23505 (duplicate key) quando o equip rodava primeiro.
      if (current) {
        const unequipResult = await supabase
          .from('inventory')
          .update({ equipped: false })
          .eq('id', current.id)
        if (unequipResult.error) {
          setBusy(false)
          fail(unequipResult.error.message)
          return
        }
      }

      const equipResult = await supabase
        .from('inventory')
        .update({ equipped: true })
        .eq('id', incoming.id)
      if (equipResult.error) {
        setBusy(false)
        fail(equipResult.error.message)
        return
      }

      setBusy(false)
    },
    [busy, characterLevel, equipped, inventory, user],
  )

  const openChest = useCallback(
    async (chestId: string): Promise<ForgeItem | null> => {
      if (!user || busy) return null
      setError(null)
      setBusy(true)

      const { data, error: rpcError } = await supabase.rpc('open_inventory_chest', {
        p_inventory_id: chestId,
        p_character_level: characterLevel,
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
    [busy, characterLevel, user],
  )

  // Vende um equipamento sobressalente e recupera 40% do valor de mercado.
  const sellItem = useCallback(
    async (itemId: string): Promise<SellResult> => {
      if (!user || busy) return { success: false, error: 'Ação indisponível no momento.' }
      const item = inventory.find((i) => i.id === itemId)
      if (!item) return { success: false, error: 'Item não encontrado.' }
      if (item.isInForge) return { success: false, error: 'Este item está em refino na Bigorna.' }

      setError(null)
      setBusy(true)

      const { data, error: rpcError } = await supabase.rpc('sell_inventory_item', {
        p_user_id: user.id,
        p_inventory_id: itemId,
      })

      setBusy(false)
      if (rpcError) {
        setError(rpcError.message)
        return { success: false, error: rpcError.message }
      }

      const salePrice = typeof data === 'number' ? data : 0
      setInventory((previous) => previous.filter((i) => i.id !== itemId))
      setGold((previous) => (previous === null ? salePrice : previous + salePrice))
      return { success: true, salePrice }
    },
    [busy, inventory, user],
  )

  return {
    equipped,
    inventory,
    chests,
    selectedItemId,
    selectedMeta,
    gold,
    characterLevel,
    busy,
    adBusy,
    loading,
    error,
    activeForgeItem,
    activeForgeEndsAt,
    selectItem,
    clearSelection,
    startForge,
    reduceForgeTime,
    collectForged,
    completeForge,
    equipFromInventory,
    openChest,
    sellItem,
  }
}
