import { useEffect, useRef } from 'react'
import { HeartCrack } from 'lucide-react'
import { useStudyTimerContext } from '../context/StudyTimerContext'
import { useToast } from '../../../components/Toast'

export function DistractionGuard() {
  const timer = useStudyTimerContext()
  const { showToast } = useToast()
  const previousRecovery = useRef(timer.distractionRecoveryCount)

  useEffect(() => {
    if (timer.distractionRecoveryCount > previousRecovery.current) {
      previousRecovery.current = timer.distractionRecoveryCount
      showToast('Sessão recuperada a tempo! Mantenha o foco.', 'info')
    }
  }, [timer.distractionRecoveryCount, showToast])

  if (!timer.distractionCancelled) return null

  const isPaused = timer.distractionCancelReason === 'paused'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Sessão abandonada"
    >
      <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-red-500/15">
          <HeartCrack className="h-7 w-7 text-red-400" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">
          {isPaused ? 'Sessão Expirada!' : 'Sessão Abandonada!'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {isPaused
            ? 'Sua sessão pausada ficou sem atividade por mais de 15 minutos e foi encerrada.'
            : 'Você ficou fora do aplicativo por mais de 20 segundos e perdeu as recompensas desta rodada.'}
        </p>
        <button
          type="button"
          onClick={timer.dismissDistractionCancel}
          className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-lg bg-red-600 px-6 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}
