import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  Music,
  Pause,
  Play,
  RotateCcw,
  Timer,
  TimerOff,
} from 'lucide-react'
import {
  MAX_STUDY_MINUTES,
  MIN_STUDY_MINUTES,
  STUDY_MINUTE_STEP,
} from '../lib/studyRules'
import { useStudyTimerContext } from '../context/StudyTimerContext'
import { useStudyPreferences } from '../hooks/useStudyPreferences'
import { useToast } from '../../../components/Toast'
import { SoundSelector } from './SoundSelector'

const PRIMARY_BUTTON =
  'flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'

const STEP_BUTTON =
  'grid h-12 w-12 shrink-0 place-items-center rounded-full border border-slate-700 bg-slate-800/60 text-slate-300 transition hover:border-indigo-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-30 sm:h-14 sm:w-14'

const TOGGLE_BUTTON_BASE =
  'grid h-11 w-11 place-items-center rounded-lg border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

const TOGGLE_OFF =
  'border-slate-700 bg-slate-800/40 text-slate-500 hover:border-slate-600 hover:text-slate-300'

const TOGGLE_OVERTIME_ON =
  'border-indigo-500/60 bg-indigo-500/15 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.35)]'

const TOGGLE_ALARM_ON =
  'border-amber-500/60 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'

export function StudyTimer() {
  const timer = useStudyTimerContext()
  const { alarmEnabled, overtimeEnabled, setAlarmEnabled, setOvertimeEnabled } =
    useStudyPreferences()
  const { showToast } = useToast()
  const [soundSelectorOpen, setSoundSelectorOpen] = useState(false)

  const handleToggleOvertime = () => {
    const next = !overtimeEnabled
    setOvertimeEnabled(next)
    showToast(
      next
        ? 'Tempo Excedente ativado: Sua sessão continuará rodando após o tempo zerar para acumular XP bônus sem interrupções.'
        : 'Tempo Excedente desativado: O timer pausará ao chegar em 00:00.',
      'info',
      5000,
    )
  }

  const handleToggleAlarm = () => {
    const next = !alarmEnabled
    setAlarmEnabled(next)
    showToast(
      next ? '🔊 Alarme sonoro ativado.' : '🔇 Alarme sonoro silenciado.',
      'info',
      2000,
    )
  }

  const decreaseMinutes = () => {
    timer.selectDuration(
      Math.max(MIN_STUDY_MINUTES, timer.durationMinutes - STUDY_MINUTE_STEP),
    )
  }

  const increaseMinutes = () => {
    timer.selectDuration(
      Math.min(MAX_STUDY_MINUTES, timer.durationMinutes + STUDY_MINUTE_STEP),
    )
  }

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    timer.selectDuration(Number(event.target.value))
  }

  const handleStart = () => {
    timer.start()
    timer.openFocusMode()
  }

  const inSession = timer.status !== 'idle'

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Timer de Estudo</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleOvertime}
            aria-pressed={overtimeEnabled}
            aria-label={
              overtimeEnabled
                ? 'Alternar Tempo Excedente (Atualmente ativado)'
                : 'Alternar Tempo Excedente (Atualmente desativado)'
            }
            title={
              overtimeEnabled
                ? 'Tempo excedente ativo: ao zerar, o timer segue contando XP bônus'
                : 'Tempo excedente desativado: o timer pausará ao chegar em 00:00'
            }
            className={`${TOGGLE_BUTTON_BASE} ${
              overtimeEnabled ? TOGGLE_OVERTIME_ON : TOGGLE_OFF
            }`}
          >
            {overtimeEnabled ? (
              <Timer className="h-4 w-4" aria-hidden="true" />
            ) : (
              <TimerOff className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleAlarm}
            aria-pressed={alarmEnabled}
            aria-label={
              alarmEnabled
                ? 'Alternar Alarme Sonoro (Atualmente ativado)'
                : 'Alternar Alarme Sonoro (Atualmente desativado)'
            }
            title={
              overtimeEnabled && !alarmEnabled
                ? 'Alarme desligado no tempo excedente. Toque para forçar o som.'
                : alarmEnabled
                  ? 'Alarme sonoro ativo'
                  : 'Alarme sonoro desativado'
            }
            className={`${TOGGLE_BUTTON_BASE} ${
              alarmEnabled ? TOGGLE_ALARM_ON : TOGGLE_OFF
            }`}
          >
            {alarmEnabled ? (
              <Bell className="h-4 w-4" aria-hidden="true" />
            ) : (
              <BellOff className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSoundSelectorOpen(true)}
            aria-label="Escolher som de conclusão"
            title="Escolher som de conclusão"
            className={`${TOGGLE_BUTTON_BASE} ${TOGGLE_OFF}`}
          >
            <Music className="h-4 w-4" aria-hidden="true" />
          </button>
          {inSession && (
            <button
              type="button"
              onClick={timer.reset}
              aria-label="Reiniciar timer"
              className="grid h-11 w-11 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-indigo-500 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
          aria-hidden="true"
        />
        <p className="text-xs leading-relaxed text-amber-200/90">
          Mantenha o StudyQuest aberto. Minimizar o app por mais de 20s cancelará a sessão
          sem XP.
        </p>
      </div>

      <div className="mt-10 flex flex-col items-center">
        <div className="flex w-full items-center justify-center gap-6">
          {!inSession && (
            <button
              type="button"
              onClick={decreaseMinutes}
              disabled={timer.durationMinutes <= MIN_STUDY_MINUTES}
              aria-label="Diminuir 5 minutos"
              className={STEP_BUTTON}
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </button>
          )}

          <div className="relative">
            {inSession && (
              <span
                aria-hidden="true"
                className="absolute inset-0 animate-pulse rounded-3xl bg-indigo-500/20 blur-2xl"
              />
            )}
            <div
              role="timer"
              aria-label={timer.isOvertime ? 'Tempo excedente' : 'Tempo restante'}
              className={`relative rounded-3xl px-4 py-3 font-mono text-6xl font-bold tabular-nums transition sm:px-8 sm:py-4 sm:text-7xl ${
                timer.isOvertime
                  ? 'text-amber-400 ring-2 ring-amber-500/40'
                  : inSession
                    ? 'text-white ring-2 ring-indigo-500/40'
                    : 'text-white'
              }`}
            >
              {timer.isOvertime ? timer.formattedOvertime : timer.formattedTime}
            </div>
          </div>

          {!inSession && (
            <button
              type="button"
              onClick={increaseMinutes}
              disabled={timer.durationMinutes >= MAX_STUDY_MINUTES}
              aria-label="Aumentar 5 minutos"
              className={STEP_BUTTON}
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </button>
          )}
        </div>

        {!inSession && (
          <div className="mt-8 w-full max-w-xs">
            <input
              type="range"
              min={MIN_STUDY_MINUTES}
              max={MAX_STUDY_MINUTES}
              step={STUDY_MINUTE_STEP}
              value={timer.durationMinutes}
              onChange={handleSliderChange}
              aria-label="Duração da sessão em minutos"
              className="w-full cursor-pointer accent-indigo-500"
            />
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>{MIN_STUDY_MINUTES} min</span>
              <span className="font-semibold text-slate-300">
                {timer.durationMinutes} min
              </span>
              <span>{MAX_STUDY_MINUTES} min</span>
            </div>
          </div>
        )}

      </div>

      <div className="flex justify-center">
        {!inSession && (
          <button type="button" onClick={handleStart} className={PRIMARY_BUTTON}>
            <Play className="h-4 w-4" aria-hidden="true" />
            Iniciar
          </button>
        )}

        {timer.isRunning && (
          <button
            type="button"
            onClick={timer.pause}
            className={PRIMARY_BUTTON}
          >
            <Pause className="h-4 w-4" aria-hidden="true" />
            Pausar
          </button>
        )}

        {timer.isPaused && (
          <button type="button" onClick={timer.resume} className={PRIMARY_BUTTON}>
            <Play className="h-4 w-4" aria-hidden="true" />
            Retomar
          </button>
        )}
      </div>

      {soundSelectorOpen && <SoundSelector onClose={() => setSoundSelectorOpen(false)} />}
    </section>
  )
}