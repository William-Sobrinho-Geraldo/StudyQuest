import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react'
import {
  MAX_PAUSES,
  MAX_STUDY_MINUTES,
  MIN_STUDY_MINUTES,
  STUDY_MINUTE_STEP,
} from '../lib/studyRules'
import { useStudyTimerContext } from '../context/StudyTimerContext'

const PRIMARY_BUTTON =
  'flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'

const STEP_BUTTON =
  'grid h-12 w-12 shrink-0 place-items-center rounded-full border border-slate-700 bg-slate-800/60 text-slate-300 transition hover:border-indigo-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-30 sm:h-14 sm:w-14'

export function StudyTimer() {
  const timer = useStudyTimerContext()

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
              aria-label="Tempo restante"
              className={`relative rounded-3xl px-4 py-3 font-mono text-6xl font-bold tabular-nums text-white transition sm:px-8 sm:py-4 sm:text-7xl ${
                inSession ? 'ring-2 ring-indigo-500/40' : ''
              }`}
            >
              {timer.formattedTime}
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

        <p className="mt-3 text-sm text-slate-400" data-testid="pauses-indicator">
          Pausas disponíveis:{' '}
          <span className="font-semibold text-white">
            {timer.pausesRemaining}/{MAX_PAUSES}
          </span>
        </p>
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
            disabled={!timer.canPause}
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
    </section>
  )
}