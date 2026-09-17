import { Coins, Gift, Loader2, MonitorPlay, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FloatingReward } from '../../../components/ui/FloatingReward'
import { AndroidOnlyAdNotice } from '../../../components/ui/AndroidOnlyAdNotice'
import { REWARD_COLORS } from '../../../lib/rewardColors'
import { supabase } from '../../../lib/supabase'
import { showRewardedAd } from '../../../services/AdService'
import { useAuth } from '../../auth/AuthContext'
import { isAndroid } from '../../../utils/platform'
import {
  getDailyAdViews,
  MERCHANT_BLESSING_GOLD,
  MERCHANT_BLESSING_XP,
  MERCHANT_DAILY_LIMIT,
} from '../../../utils/merchantBlessing'

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value)

interface MerchantBlessingResult {
  xp: number
  gold: number
  daily_ad_views: number
  limit: number
}

interface MerchantBlessingModalProps {
  onClose: () => void
  onClaimed?: () => void
}

export function MerchantBlessingModal({ onClose, onClaimed }: MerchantBlessingModalProps) {
  const { profile, refreshProfile } = useAuth()
  const [dailyViews, setDailyViews] = useState(() => getDailyAdViews(profile))
  const [watching, setWatching] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [reward, setReward] = useState<{ xp: number; gold: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const floatTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setDailyViews(getDailyAdViews(profile))
  }, [profile])

  useEffect(() => {
    return () => {
      if (floatTimerRef.current !== null) {
        window.clearTimeout(floatTimerRef.current)
      }
    }
  }, [])

  const hasReachedLimit = dailyViews >= MERCHANT_DAILY_LIMIT
  const busy = watching || claiming || reward !== null

  const handleWatch = useCallback(async () => {
    if (!isAndroid() || busy || hasReachedLimit) return
    setError(null)
    setWatching(true)
    try {
      const watched = await showRewardedAd()
      if (!watched) {
        setWatching(false)
        return
      }
      setWatching(false)
      setClaiming(true)
      const { data, error: rpcError } = await supabase.rpc('claim_merchant_blessing')
      if (rpcError) {
        setError(rpcError.message)
        setClaiming(false)
        return
      }
      const result = data as unknown as MerchantBlessingResult
      setReward({ xp: result.xp, gold: result.gold })
      setDailyViews(result.daily_ad_views)
      setClaiming(false)
      void refreshProfile()
      onClaimed?.()
      floatTimerRef.current = window.setTimeout(() => {
        setReward(null)
        onClose()
      }, 3000)
    } catch (watchError) {
      setError(
        watchError instanceof Error ? watchError.message : 'Falha ao carregar a Visão Mágica.',
      )
      setWatching(false)
      setClaiming(false)
    }
  }, [busy, hasReachedLimit, onClaimed, onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bênção do Mercador"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-fuchsia-500/15">
          <Gift className="h-7 w-7 text-fuchsia-400" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">Bênção do Mercador</h2>
        <p className="mt-1 text-sm text-slate-400">
          Assista a uma Visão Mágica e receba 10% de um baú cheio.
        </p>

        <div className="relative mt-6 flex items-stretch justify-center gap-4">
          {reward && <FloatingReward xp={reward.xp} gold={reward.gold} />}
          <div className="flex-1 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
            <Sparkles className={`mx-auto h-5 w-5 ${REWARD_COLORS.xpIcon}`} aria-hidden="true" />
            <p
              data-testid="merchant-xp"
              className="mt-1.5 text-2xl font-bold tabular-nums text-white"
            >
              {formatNumber(MERCHANT_BLESSING_XP)}
            </p>
            <p className={`text-xs font-medium ${REWARD_COLORS.xp}`}>XP</p>
          </div>
          <div className="flex-1 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <Coins className={`mx-auto h-5 w-5 ${REWARD_COLORS.goldIcon}`} aria-hidden="true" />
            <p
              data-testid="merchant-gold"
              className="mt-1.5 text-2xl font-bold tabular-nums text-white"
            >
              {formatNumber(MERCHANT_BLESSING_GOLD)}
            </p>
            <p className={`text-xs font-medium ${REWARD_COLORS.gold}`}>Gold</p>
          </div>
        </div>

        <p
          data-testid="merchant-counter"
          className="mt-4 text-sm font-medium text-slate-400"
        >
          Resgates hoje: {dailyViews}/{MERCHANT_DAILY_LIMIT}
        </p>

        {hasReachedLimit && (
          <p className="mt-2 text-sm font-medium text-amber-400">
            O Mercador precisa descansar. Volte amanhã!
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {isAndroid() ? (
          <button
            type="button"
            data-testid="merchant-watch"
            onClick={() => void handleWatch()}
            disabled={busy || hasReachedLimit}
            className={`mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${
              reward
                ? 'bg-green-600'
                : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40'
            }`}
          >
            {reward ? (
              'Coletado!'
            ) : watching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Carregando Visão Mágica...
              </>
            ) : claiming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Reivindicando...
              </>
            ) : hasReachedLimit ? (
              'Limite diário atingido'
            ) : (
              <>
                <MonitorPlay className="h-4 w-4" aria-hidden="true" />
                Assistir Visão Mágica
              </>
            )}
          </button>
        ) : (
          <div className="mt-5">
            <AndroidOnlyAdNotice />
          </div>
        )}
      </div>
    </div>
  )
}
