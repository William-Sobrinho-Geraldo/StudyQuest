import { Coins, Loader2, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import { MAX_PAUSES, generateStudyOptions } from '../lib/studyRules'
import { useStudyTimerContext } from '../context/StudyTimerContext'

const PRIMARY_BUTTON =
  'flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'

const SECONDARY_BUTTON =
  'flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-6 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:text-white'

export function StudyTimer() {
  const timer = useStudyTimerContext()

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Timer de Estudo</h2>
        {timer.status !== 'idle' && (
          <button
            type="button"
            onClick={timer.reset}
            aria-label="Reiniciar timer"
            className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-indigo-500 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {timer.status === 'idle' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {generateStudyOptions().map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => timer.selectDuration(minutes)}
              aria-pressed={minutes === timer.durationMinutes}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                minutes === timer.durationMinutes
                  ? 'border-indigo-500 bg-indigo-600 font-semibold text-white'
                  : 'border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-white'
              }`}
            >
              {minutes} min
            </button>
          ))}
        </div>
      )}

      <div className="my-8 flex flex-col items-center">
        <div
          role="timer"
          aria-label="Tempo restante"
          className="font-mono text-6xl font-bold tabular-nums text-white"
        >
          {timer.formattedTime}
        </div>
        <p className="mt-3 text-sm text-slate-400" data-testid="pauses-indicator">
          Pausas disponíveis:{' '}
          <span className="font-semibold text-white">
            {timer.pausesRemaining}/{MAX_PAUSES}
          </span>
        </p>
      </div>

      <div className="flex justify-center">
        {timer.status === 'idle' && (
          <button type="button" onClick={timer.start} className={PRIMARY_BUTTON}>
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

      {timer.isCompleted && timer.lastResult && (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center"
        >
          <p className="font-semibold text-emerald-300">Sessão concluída!</p>
          <div className="mt-2 flex items-center justify-center gap-6">
            <p className="flex items-center gap-1.5 text-sm font-medium text-white">
              <Sparkles className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              +{timer.lastResult.xp} XP
            </p>
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-300">
              <Coins className="h-4 w-4" aria-hidden="true" />
              +{timer.lastResult.gold} Gold
            </p>
          </div>

          {timer.isSaving && (
            <p className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Salvando no histórico...
            </p>
          )}

          {timer.saveError && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              {timer.saveError}
            </p>
          )}

          <button
            type="button"
            onClick={timer.reset}
            className={`${SECONDARY_BUTTON} mx-auto mt-4`}
          >
            Nova sessão
          </button>
        </div>
      )}
    </section>
  )
}