import { useState } from 'react'
import { Check, Coins, Loader2, PenLine, ShieldAlert, X } from 'lucide-react'
import { useToast } from '../../../components/Toast'
import {
  MANUAL_PENALTY_PERCENT,
  MANUAL_REWARD_MULTIPLIER,
  MAX_MANUAL_STUDY_MINUTES,
  MIN_MANUAL_STUDY_MINUTES,
  calculateManualReward,
  calculateReward,
  validateManualStudyMinutes,
} from '../lib/studyRules'
import {
  saveManualStudySession,
  type ManualStudySessionResult,
} from '../services/studySessionService'
import { emitStudySessionSaved } from '../lib/studyEvents'

const MANUAL_CALC_LABEL = 'text-sm text-slate-400'
const MANUAL_CALC_VALUE = 'text-sm font-semibold text-slate-200'

interface ManualStudyModalProps {
  onClose: () => void
}

export function ManualStudyModal({ onClose }: ManualStudyModalProps) {
  const { showToast } = useToast()
  const [minutesInput, setMinutesInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const parsedMinutes = Number(minutesInput)
  const validMinutes = Number.isInteger(parsedMinutes) && parsedMinutes > 0
  const calculationValid = validMinutes && validateManualStudyMinutes(parsedMinutes) === null

  const base = validMinutes ? calculateReward(parsedMinutes) : null
  const manual = validMinutes ? calculateManualReward(parsedMinutes) : null
  const receivedPercent = Math.round(MANUAL_REWARD_MULTIPLIER * 100)

  const handleSubmit = async () => {
    const minutes = Number(minutesInput)
    const invalid = validateManualStudyMinutes(minutes)
    if (invalid !== null) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result: ManualStudySessionResult = await saveManualStudySession(minutes)
      emitStudySessionSaved()
      showToast(
        `Sessão de ${result.durationMinutes}min registada! +${result.xp} XP (${receivedPercent}%) adicionados`,
        'success',
      )
      onClose()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Falha ao registrar a sessão.',
      )
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Registar Estudo Offline"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-500/20">
              <PenLine className="h-5 w-5 text-purple-400" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">Registar Estudo Offline</h2>
              <p className="mt-1 text-sm text-slate-400">
                Esqueceu de usar o timer? Registre o tempo estudado agora.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          <ShieldAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-amber-200/90">
            Registros manuais rendem apenas {receivedPercent}% das recompensas (penalização
            de {MANUAL_PENALTY_PERCENT}%) e estão limitados a {MAX_MANUAL_STUDY_MINUTES} min
            por lançamento para evitar abusos.
          </p>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-medium text-slate-300">
            Tempo estudado (minutos)
          </span>
          <input
            data-testid="manual-minutes-input"
            type="number"
            min={MIN_MANUAL_STUDY_MINUTES}
            max={MAX_MANUAL_STUDY_MINUTES}
            step={1}
            inputMode="numeric"
            enterKeyHint="done"
            value={minutesInput}
            onChange={(event) => {
              setMinutesInput(event.target.value)
              setError(null)
            }}
            placeholder="Ex.: 60"
            aria-label="Tempo estudado em minutos"
            className="mt-2 h-12 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-base text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </label>

        <div
          data-testid="manual-reward-calc"
          className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
        >
          {calculationValid && base && manual ? (
            <div className="space-y-2.5">
              <p className="flex items-center justify-between gap-3">
                <span className={MANUAL_CALC_LABEL}>XP Base</span>
                <span data-testid="manual-xp-base" className={MANUAL_CALC_VALUE}>
                  {base.xp} XP
                </span>
              </p>
              <p className="flex items-center justify-between gap-3 text-red-400/90">
                <span className="text-sm text-red-300/80">
                  Penalização por Registo Manual (-{MANUAL_PENALTY_PERCENT}%)
                </span>
                <span data-testid="manual-xp-penalty" className="text-sm font-semibold">
                  -{base.xp - manual.xp} XP
                </span>
              </p>
              <p
                className="flex items-center justify-between gap-3 border-t border-slate-800 pt-2.5"
              >
                <span className="text-sm font-bold text-emerald-400">
                  Recompensa Final ({receivedPercent}%)
                </span>
                <span
                  data-testid="manual-xp-final"
                  className="text-lg font-bold tabular-nums text-emerald-400"
                >
                  {manual.xp} XP
                </span>
              </p>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                <span className="flex items-center gap-1.5 text-sm text-amber-300">
                  <Coins className="h-4 w-4" aria-hidden="true" />
                  Gold final ({receivedPercent}%)
                </span>
                <span
                  data-testid="manual-gold-final"
                  className="text-sm font-bold tabular-nums text-amber-300"
                >
                  {manual.gold} Gold
                </span>
              </div>
              <p className="text-xs text-slate-500">
                O tempo registado soma ao histórico de estudo e à sua meta diária,
                mesmo recebendo a recompensa reduzida.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Informe os minutos estudados para ver o cálculo das recompensas.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <footer className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || !validMinutes}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-purple-600 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Registrando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Registrar sessão
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
          >
            Cancelar
          </button>
        </footer>
      </div>
    </div>
  )
}