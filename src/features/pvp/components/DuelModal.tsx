import { useEffect, useRef, useState } from 'react'
import { Shield, Swords, Trophy } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useModalBackHandler } from '../../../hooks/useNativeBackButton'
import { UserAvatar } from '../../../components/UserAvatar'
import { executeDuel, type DuelResult } from '../services/duelService'

const BATTLE_DURATION_MS = 2500

interface DuelModalProps {
  defenderId: string
  defenderName: string
  defenderAvatarId: string | null
  onClose: () => void
}

export function DuelModal({
  defenderId,
  defenderName,
  defenderAvatarId,
  onClose,
}: DuelModalProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [phase, setPhase] = useState<'battling' | 'result'>('battling')
  const [result, setResult] = useState<DuelResult | null>(null)

  const duelPromiseRef = useRef<Promise<DuelResult> | null>(null)

  useModalBackHandler(onClose)

  const attackerId = user?.id ?? ''
  const attackerName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Você'
  const attackerAvatarId = profile?.avatar_id ?? null

  useEffect(() => {
    if (!attackerId) return

    // Garante que a RPC seja disparada uma única vez, mesmo com o
    // double-invoke de effects do StrictMode em desenvolvimento.
    let promise = duelPromiseRef.current
    if (!promise) {
      promise = executeDuel(attackerId, defenderId)
      duelPromiseRef.current = promise
    }

    let active = true
    const delay = new Promise((resolve) => window.setTimeout(resolve, BATTLE_DURATION_MS))

    void (async () => {
      const [duelResult] = await Promise.all([promise, delay])
      if (!active) return
      setResult(duelResult)
      setPhase('result')
    })()

    return () => {
      active = false
    }
  }, [attackerId, defenderId])

  async function handleLeave() {
    await refreshProfile()
    onClose()
  }

  const isVictory =
    phase === 'result' && !!result && result.success && result.outcome.winner_id === attackerId
  const isDefeat =
    phase === 'result' && !!result && result.success && result.outcome.winner_id !== attackerId
  const hasError = phase === 'result' && !!result && !result.success

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Duelo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {phase === 'battling' ? (
          <>
            <h2 className="text-center text-2xl font-black tracking-tight text-white">Duelo!</h2>
            <p className="mt-1 text-center text-sm text-slate-400">Preparando a arena...</p>

            <div className="mt-8 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <UserAvatar
                  avatarId={attackerAvatarId}
                  name={attackerName}
                  className="h-20 w-20 rounded-2xl border border-slate-700 shadow-lg ring-4 ring-indigo-500/30 animate-pulse"
                />
                <p className="max-w-full truncate text-sm font-semibold text-slate-200">
                  {attackerName}
                </p>
              </div>

              <div className="flex shrink-0 animate-pulse flex-col items-center gap-1">
                <Swords size={48} className="text-rose-500" aria-hidden="true" />
                <span className="text-2xl font-black text-rose-400">VS</span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <UserAvatar
                  avatarId={defenderAvatarId}
                  name={defenderName}
                  className="h-20 w-20 rounded-2xl border border-slate-700 shadow-lg ring-4 ring-rose-500/30 animate-pulse"
                />
                <p className="max-w-full truncate text-sm font-semibold text-slate-200">
                  {defenderName}
                </p>
              </div>
            </div>

            <p className="mt-8 animate-pulse text-center text-sm text-slate-400">
              Calculando o confronto...
            </p>
          </>
        ) : (
          <>
            {isVictory && (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-amber-500/40 bg-amber-500/10">
                  <Trophy className="h-8 w-8 text-amber-400" aria-hidden="true" />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-amber-400">VITÓRIA!</h2>
                <p className="text-lg font-bold text-emerald-400">
                  +{result?.success ? result.outcome.honor_earned : 0} Honra
                </p>
                <p className="text-sm text-slate-400">Você derrotou {defenderName} na arena!</p>
              </div>
            )}

            {isDefeat && (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-slate-700 bg-slate-800/60">
                  <Shield className="h-8 w-8 text-slate-500" aria-hidden="true" />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-red-400">DERROTA</h2>
                <p className="text-sm text-slate-400">
                  {defenderName} se defendeu com sucesso.
                </p>
              </div>
            )}

            {hasError && (
              <div className="flex flex-col items-center gap-2 text-center">
                <h2 className="text-xl font-bold text-slate-200">Duelo indisponível</h2>
                <p role="alert" className="text-sm text-red-400">
                  {result && !result.success ? result.error : 'Não foi possível concluir o duelo.'}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleLeave()}
              className="mt-8 flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-rose-600 text-base font-semibold text-white transition hover:bg-rose-500 active:scale-95"
            >
              Sair da Arena
            </button>
          </>
        )}
      </div>
    </div>
  )
}
