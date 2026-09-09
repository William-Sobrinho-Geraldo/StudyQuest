import { useCallback, useEffect, useState } from 'react'
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

export const FORGE_STORAGE_KEY = 'studyquest.forge.levels'

type SlotLevels = Record<EquipmentSlot, number>

function defaultLevels(): SlotLevels {
  return {
    weapon: 0,
    helmet: 0,
    chest: 0,
    boots: 0,
  }
}

function loadStoredLevels(): SlotLevels {
  const defaults = defaultLevels()
  try {
    const raw = window.localStorage.getItem(FORGE_STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<Record<EquipmentSlot, unknown>>
    const levels = { ...defaults }
    for (const slot of SLOTS) {
      const value = parsed[slot]
      if (typeof value === 'number' && Number.isInteger(value)) {
        levels[slot] = Math.min(Math.max(value, 0), MAX_REFINE_LEVEL)
      }
    }
    return levels
  } catch {
    return defaults
  }
}

function persistLevels(levels: SlotLevels): void {
  window.localStorage.setItem(FORGE_STORAGE_KEY, JSON.stringify(levels))
}

export interface SlotMeta {
  level: number
  rate: number
  cost: number
  isMax: boolean
  canAfford: boolean
}

export function useForge() {
  const { user } = useAuth()
  const [levels, setLevels] = useState<SlotLevels>(loadStoredLevels)
  const [gold, setGold] = useState<number | null>(null)
  const [busySlot, setBusySlot] = useState<EquipmentSlot | null>(null)
  const [lastResult, setLastResult] = useState<RefineResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true

    supabase
      .from('profiles')
      .select('gold')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) {
          setError(fetchError.message)
        } else {
          setGold(data?.gold ?? 0)
        }
      })

    return () => {
      active = false
    }
  }, [user])

  const getSlotMeta = useCallback(
    (slot: EquipmentSlot): SlotMeta => {
      const level = levels[slot]
      return {
        level,
        rate: successRate(level),
        cost: REFINE_COST[level] ?? 0,
        isMax: level >= MAX_REFINE_LEVEL,
        canAfford: gold !== null && gold >= (REFINE_COST[level] ?? 0),
      }
    },
    [gold, levels],
  )

  const refine = useCallback(
    async (slot: EquipmentSlot) => {
      if (!user || gold === null || busySlot) return

      const outcome = attemptRefine(slot, levels[slot], gold, Math.random())
      if (outcome.status === 'unavailable') {
        setError(
          outcome.reason === 'max_level'
            ? 'Este item já está no refino máximo.'
            : 'Gold insuficiente para essa tentativa.',
        )
        return
      }

      const result = outcome.result
      const previousLevels = levels
      const previousGold = gold
      const nextLevels = { ...levels, [slot]: result.levelAfter }
      const nextGold = gold - result.cost

      setError(null)
      setBusySlot(slot)
      setLastResult(result)
      setLevels(nextLevels)
      persistLevels(nextLevels)
      setGold(nextGold)

      const { error: saveError } = await supabase
        .from('profiles')
        .update({ gold: nextGold })
        .eq('id', user.id)

      if (saveError) {
        setLevels(previousLevels)
        persistLevels(previousLevels)
        setGold(previousGold)
        setLastResult(null)
        setError(saveError.message)
      }

      setBusySlot(null)
    },
    [busySlot, gold, levels, user],
  )

  return {
    levels,
    gold,
    busySlot,
    lastResult,
    error,
    refine,
    getSlotMeta,
    canUseForge: gold !== null,
  }
}