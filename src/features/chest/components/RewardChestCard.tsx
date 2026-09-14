import { Clock, Coins, Gift, Loader2, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FloatingReward } from '../../../components/ui/FloatingReward'
import { REWARD_COLORS } from '../../../lib/rewardColors'
import {
  CHEST_MAX_GOLD,
  CHEST_MAX_XP,
  formatElapsedTime,
  getIdleRewards,
} from '../../../utils/idleRewards'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value)

interface RewardChestCardProps {
  onClaimed?: () => void
}

export function RewardChestCard({ onClaimed }: RewardChestCardProps) {
  const { user } = useAuth()
  const [lastClaim, setLastClaim] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [floatingReward, setFloatingReward] = useState<{ xp: number; gold: number } | null>(null)
  const [, setTick] = useState(0)
  const floatTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    setLoading(true)

    supabase
      .from('profiles')
      .select('last_chest_claim')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) {
          setError(fetchError.message)
        } else {
          setLastClaim(data?.last_chest_claim ?? new Date().toISOString())
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick((tick) => tick + 1)
    }, 1_000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    return () => {
      if (floatTimerRef.current !== null) {
        window.clearTimeout(floatTimerRef.current)
      }
    }
  }, [])

  const rewards = getIdleRewards(lastClaim)
  const canClaim = lastClaim !== null && rewards.elapsedMinutes >= 1 && !loading && !claiming

  const handleClaim = useCallback(async () => {
    if (!canClaim || claiming) return
    setClaiming(true)
    setError(null)

    const { error: claimError } = await supabase.rpc('claim_chest_reward')
    if (claimError) {
      setError(claimError.message)
    } else {
      setFloatingReward({ xp: rewards.currentXp, gold: rewards.currentGold })
      if (floatTimerRef.current !== null) {
        window.clearTimeout(floatTimerRef.current)
      }
      floatTimerRef.current = window.setTimeout(() => {
        setFloatingReward(null)
        setLastClaim(new Date().toISOString())
        onClaimed?.()
      }, 3000)
    }
    setClaiming(false)
  }, [canClaim, claiming, onClaimed, rewards])

  return (
    <div
      aria-busy={loading}
      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
      data-testid="reward-chest-card"
    >
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-fuchsia-400" aria-hidden="true" />
        <div>
          <p className="font-semibold text-white">Baú de Recompensas</p>
          <p className="text-xs text-slate-400">Acumula passivamente. Fica cheio em 8 horas.</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-3 text-3xl font-bold">...</p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span
              data-testid="chest-elapsed"
              className="flex items-center gap-1.5 text-sm text-slate-400"
            >
              <Clock className={`h-4 w-4 ${REWARD_COLORS.xpIcon}`} aria-hidden="true" />
              <strong className="font-semibold tabular-nums text-white">
                {formatElapsedTime(rewards.elapsedSeconds)}
              </strong>
            </span>
            {rewards.progressPercentage === 100 && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400">
                Baú cheio!
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-5 text-sm">
            <span data-testid="chest-xp" className={`flex items-center gap-1.5 font-medium ${REWARD_COLORS.xp}`}>
              <Sparkles className={`h-4 w-4 ${REWARD_COLORS.xpIcon}`} aria-hidden="true" />
              {formatNumber(rewards.currentXp)} / {formatNumber(CHEST_MAX_XP)} XP
            </span>
            <span data-testid="chest-gold" className={`flex items-center gap-1.5 font-medium ${REWARD_COLORS.gold}`}>
              <Coins className={`h-4 w-4 ${REWARD_COLORS.goldIcon}`} aria-hidden="true" />
              {formatNumber(rewards.currentGold)} / {formatNumber(CHEST_MAX_GOLD)} Gold
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Progresso do baú"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={rewards.progressPercentage}
            data-testid="chest-progress"
            className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-800"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 transition-[width] duration-300 ease-out"
              style={{ width: `${rewards.progressPercentage}%` }}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="relative">
              {floatingReward && (
                <FloatingReward xp={floatingReward.xp} gold={floatingReward.gold} align="right" />
              )}
              <button
                type="button"
                onClick={() => void handleClaim()}
                disabled={!canClaim || floatingReward !== null}
                className={`flex min-h-[48px] items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed ${
                  floatingReward
                    ? 'bg-green-600'
                    : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40'
                }`}
              >
                {claiming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {floatingReward ? 'Coletado!' : claiming ? 'Reivindicando...' : 'Reivindicar'}
              </button>
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}