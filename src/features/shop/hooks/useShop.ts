import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import type { EquipmentSlot } from '../../forge/lib/forgeRules'
import { isShopSlot, type ShopData, type ShopSlot } from '../lib/shopItems'

interface RefreshShopRow {
  slot: number
  rarity: string
  item_category: string
  item_level: number
  name: string
  attack: number
  defense: number
  hp: number
  price: number
  bought: boolean
  next_refresh_at: string
  refreshes_today: number
}

interface BuyShopItemRow {
  shop_slot: number
  shop_bought: boolean
  inventory_id: string
  inventory_name: string
  inventory_item_category: string
  inventory_rarity: string
  inventory_item_level: number
  profile_gold: number
}

const SHOP_TABLE = 'rotating_shop' as const

export function useShop() {
  const { user } = useAuth()
  const [shop, setShop] = useState<ShopData | null>(null)
  const [gold, setGold] = useState<number | null>(null)
  const [characterLevel, setCharacterLevel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    const [shopResult, profileResult] = await Promise.all([
      supabase.from(SHOP_TABLE).select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('level, gold').eq('id', user.id).maybeSingle(),
    ])
    setLoading(false)

    if (shopResult.error) {
      setError(shopResult.error.message)
      return
    }
    if (profileResult.error) {
      setError(profileResult.error.message)
      return
    }

    setGold(profileResult.data?.gold ?? 0)
    setCharacterLevel(profileResult.data?.level ?? 1)
    if (shopResult.data) {
      setShop(shopFromRow(shopResult.data))
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = useCallback(async () => {
    if (!user || busy || characterLevel === null) return
    setBusy(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc('refresh_shop', {
      p_player_level: characterLevel,
    })

    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return false
    }

    const rows = (data ?? []) as RefreshShopRow[]
    const slots = rows
      .filter((row) => isShopSlot(row))
      .map((row) => ({
        slot: row.slot,
        rarity: row.rarity as ShopSlot['rarity'],
        item_category: row.item_category as EquipmentSlot,
        item_level: row.item_level,
        name: row.name,
        attack: row.attack,
        defense: row.defense,
        hp: row.hp,
        price: row.price,
        bought: row.bought,
      }))

    const meta = rows[0]
    setShop({
      slots,
      nextRefreshAt: meta?.next_refresh_at ?? new Date(Date.now() + 86_400_000).toISOString(),
      refreshesToday: meta?.refreshes_today ?? 0,
    })
    return true
  }, [busy, characterLevel, user])

  const buy = useCallback(
    async (slotNumber: number): Promise<boolean> => {
      if (!user || busy || !shop) return false

      const target = shop.slots.find((slot) => slot.slot === slotNumber)
      if (!target || target.bought) return false

      setBusy(true)
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('buy_shop_item', {
        p_slot_number: slotNumber,
      })

      setBusy(false)
      if (rpcError) {
        setError(rpcError.message)
        return false
      }

      const row = ((data ?? []) as BuyShopItemRow[])[0]
      if (!row) return false

      setGold(row.profile_gold)
      setShop((previous) =>
        previous
          ? {
              ...previous,
              slots: previous.slots.map((slot) =>
                slot.slot === slotNumber ? { ...slot, bought: true } : slot,
              ),
            }
          : previous,
      )
      return true
    },
    [busy, shop, user],
  )

  const canAfford = useMemo(() => {
    if (gold === null) return false
    return (price: number) => gold >= price
  }, [gold])

  const expired = useMemo(() => {
    if (!shop) return false
    return new Date(shop.nextRefreshAt).getTime() <= Date.now()
  }, [shop])

  return {
    shop,
    slots: shop?.slots ?? [],
    nextRefreshAt: shop?.nextRefreshAt ?? null,
    refreshesToday: shop?.refreshesToday ?? 0,
    gold,
    characterLevel,
    loading,
    busy,
    error,
    canAfford,
    expired,
    refresh,
    buy,
    clearError: () => setError(null),
  }
}

function shopFromRow(row: Record<string, unknown>): ShopData {
  const slots: ShopSlot[] = []
  for (let slot = 1; slot <= 6; slot += 1) {
    const rarity = row[`slot_${slot}_rarity`]
    if (typeof rarity !== 'string') continue
    slots.push({
      slot,
      rarity: rarity as ShopSlot['rarity'],
      item_category: (row[`slot_${slot}_category`] ?? 'weapon') as EquipmentSlot,
      item_level: (row[`slot_${slot}_level`] as number) ?? 10,
      name: (row[`slot_${slot}_name`] as string) ?? '',
      attack: (row[`slot_${slot}_attack`] as number) ?? 0,
      defense: (row[`slot_${slot}_defense`] as number) ?? 0,
      hp: (row[`slot_${slot}_hp`] as number) ?? 0,
      price: (row[`slot_${slot}_price`] as number) ?? 0,
      bought: Boolean(row[`slot_${slot}_bought`]),
    })
  }

  return {
    slots,
    nextRefreshAt: (row.next_refresh_at as string) ?? new Date().toISOString(),
    refreshesToday: (row.refreshes_today as number) ?? 0,
  }
}