import { useState } from 'react'
import { AlarmClock, Check, Settings, X } from 'lucide-react'
import {
  hasExactAlarmPermission,
  openExactAlarmSettings,
} from '../lib/distractionNotifications'

interface ExactAlarmSettingsModalProps {
  onConfirm: () => void
  onClose: () => void
}

export function ExactAlarmSettingsModal({
  onConfirm,
  onClose,
}: ExactAlarmSettingsModalProps) {
  const [checking, setChecking] = useState(false)
  const [openedSettings, setOpenedSettings] = useState(false)

  const handleOpenSettings = () => {
    setOpenedSettings(true)
    void openExactAlarmSettings()
  }

  const handleVerify = async () => {
    setChecking(true)
    const granted = await hasExactAlarmPermission()
    setChecking(false)
    if (granted) {
      onConfirm()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Permissão de alarmes exatos"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600">
              <AlarmClock className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Ativar Alarmes e Lembretes
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Para que o alarme toque com a tela bloqueada, ative a permissão de
              Alarmes e Lembretes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-11 w-11 touch-manipulation select-none place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenSettings}
          className="mb-2 flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Abrir Configurações
        </button>

        <button
          type="button"
          onClick={() => void handleVerify()}
          disabled={checking}
          className="mb-2 flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {checking ? 'Verificando...' : 'Já ativei, verificar'}
        </button>

        {openedSettings && (
          <p className="mt-3 text-center text-xs text-amber-200/90">
            Ative a opção “Permitir criar alarmes e lembretes” e volte para
            verificar.
          </p>
        )}
      </div>
    </div>
  )
}
