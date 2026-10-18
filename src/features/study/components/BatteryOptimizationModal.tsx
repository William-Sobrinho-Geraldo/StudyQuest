import { useState } from 'react'
import { BatteryCharging, Check, Settings, X } from 'lucide-react'
import {
  isBatteryOptimizationEnabled,
  requestIgnoreBatteryOptimization,
} from '../lib/backgroundSession'

interface BatteryOptimizationModalProps {
  onConfirmed: () => void
  onDismiss: () => void
}

export function BatteryOptimizationModal({
  onConfirmed,
  onDismiss,
}: BatteryOptimizationModalProps) {
  const [checking, setChecking] = useState(false)
  const [openedSettings, setOpenedSettings] = useState(false)
  const [stillOptimized, setStillOptimized] = useState(false)

  const handleOpenSettings = () => {
    setOpenedSettings(true)
    void requestIgnoreBatteryOptimization()
  }

  const handleVerify = async () => {
    setChecking(true)
    const optimizationEnabled = await isBatteryOptimizationEnabled()
    setChecking(false)
    if (optimizationEnabled) {
      setStillOptimized(true)
      return
    }
    setStillOptimized(false)
    onConfirmed()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Otimização de bateria"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600">
              <BatteryCharging className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Garanta o alarme em segundo plano
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Alguns celulares (Xiaomi, Samsung e outros) encerram o app durante
              o foco e o alarme não toca com a tela bloqueada. Desative a
              otimização de bateria para o StudyQuest.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar"
            className="grid h-11 w-11 touch-manipulation select-none place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenSettings}
          className="mb-2 flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Desativar otimização de bateria
        </button>

        <button
          type="button"
          onClick={() => void handleVerify()}
          disabled={checking}
          className="mb-2 flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 text-sm font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {checking ? 'Verificando...' : 'Já desativei, continuar'}
        </button>

        {openedSettings && !stillOptimized && (
          <p className="mt-3 text-center text-xs text-emerald-200/90">
            Na tela que abriu, escolha “Permitir” / “Sem restrições” e volte para
            continuar.
          </p>
        )}

        {stillOptimized && (
          <p className="mt-3 text-center text-xs text-amber-200/90">
            A otimização de bateria ainda está ativa. Você pode continuar assim
            mesmo, mas o alarme pode ser silenciado com o app em segundo plano.
          </p>
        )}

        <button
          type="button"
          onClick={onConfirmed}
          className="mt-3 w-full text-center text-xs font-medium text-slate-400 underline transition-colors hover:text-slate-200"
        >
          Continuar assim mesmo
        </button>
      </div>
    </div>
  )
}
