import { useState } from 'react'
import {
  CheckCircle2,
  Coins,
  Loader2,
  MonitorPlay,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { REWARD_COLORS } from '../../../lib/rewardColors'
import { useToast } from '../../../components/Toast'
import { useStudyTimerContext } from '../context/StudyTimerContext'
import { emitStudySessionSaved } from '../lib/studyEvents'

const AD_DELAY_MS = 2_000
const AD_MULTIPLIER = 2

const PRIMARY_BUTTON =
  'flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60'

const SECONDARY_BUTTON =
  'flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-6 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'

export function VictoryModal() {
  const timer = useStudyTimerContext()
  const { showToast } = useToast()

  const [adLoading, setAdLoading] = useState(false)
  const [multiplier, setMultiplier] = useState(1)
  const [collecting, setCollecting] = useState(false)

  const result = timer.lastResult
  if (!timer.isCompleted || !result) return null

  const displayXp = result.xp * multiplier
  const displayGold = result.gold * multiplier
  const isBusy = adLoading || collecting

  const finalizeCollection = async (xp: number, gold: number, message: string) => {
    setCollecting(true)
    try {
      const { error } = await supabase.rpc('add_xp', { p_xp: xp, p_gold: gold })
      if (error) {
        throw new Error(error.message)
      }
      emitStudySessionSaved()
      showToast(message, 'success')
      timer.reset()
      timer.closeFocusMode()
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Falha ao salvar as recompensas.',
        'error',
      )
      setCollecting(false)
    }
  }

  const handleCollectAndExit = () => {
    if (isBusy) return
    void finalizeCollection(
      result.xp,
      result.gold,
      `Recompensas coletadas: +${result.xp} XP e +${result.gold} Gold`,
    )
  }

  const handleWatchAd = async () => {
    if (isBusy) return
    setAdLoading(true)
    await new Promise((resolve) => window.setTimeout(resolve, AD_DELAY_MS))
    if (!result || !timer.isCompleted) {
      setAdLoading(false)
      return
    }
    setAdLoading(false)
    setMultiplier(AD_MULTIPLIER)
    void finalizeCollection(
      result.xp * AD_MULTIPLIER,
      result.gold * AD_MULTIPLIER,
      `Anúncio concluído! Recompensas dobradas: +${result.xp * AD_MULTIPLIER} XP e +${result.gold * AD_MULTIPLIER} Gold`,
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sessão concluída"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-indigo-500/15">
          <Trophy className="h-7 w-7 text-amber-400" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">Sessão Concluída!</h2>
        <p className="mt-1 text-sm text-slate-400">
          {result.durationMinutes} minutos focados. Você farmou muito bem!
        </p>

        {multiplier > 1 && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Recompensas 2x ativas
          </span>
        )}

        <div className="mt-6 flex items-stretch justify-center gap-4">
          <div className="flex-1 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
            <Sparkles
              className={`mx-auto h-5 w-5 ${REWARD_COLORS.xpIcon}`}
              aria-hidden="true"
            />
            <p
              data-testid="victory-xp"
              className="mt-1.5 text-2xl font-bold tabular-nums text-white"
            >
              {displayXp}
            </p>
            <p className={`text-xs font-medium ${REWARD_COLORS.xp}`}>XP</p>
          </div>
          <div className="flex-1 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <Coins
              className={`mx-auto h-5 w-5 ${REWARD_COLORS.goldIcon}`}
              aria-hidden="true"
            />
            <p
              data-testid="victory-gold"
              className="mt-1.5 text-2xl font-bold tabular-nums text-white"
            >
              {displayGold}
            </p>
            <p className={`text-xs font-medium ${REWARD_COLORS.gold}`}>Gold</p>
          </div>
        </div>

        {adLoading ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-slate-300">
              <MonitorPlay
                className="h-4 w-4 animate-pulse text-indigo-400"
                aria-hidden="true"
              />
              Reproduzindo anúncio (mock)...
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-indigo-500" />
            </div>
          </div>
        ) : (
          <footer className="mt-6 flex flex-col gap-2.5">
            {multiplier > 1 ? (
              <button
                type="button"
                disabled
                className={`${PRIMARY_BUTTON} opacity-60`}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Anúncio já assistido
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleWatchAd()}
                disabled={isBusy}
                className={PRIMARY_BUTTON}
              >
                {collecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <MonitorPlay className="h-4 w-4" aria-hidden="true" />
                    Assistir Anúncio (2x Recompensas)
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleCollectAndExit}
              disabled={isBusy}
              className={SECONDARY_BUTTON}
            >
              Coletar e Sair
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}