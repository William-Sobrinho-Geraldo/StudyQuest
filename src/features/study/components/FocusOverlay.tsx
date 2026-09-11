import { BookOpen, Flag, Pause, Play, X } from 'lucide-react'
import { useStudyTimerContext } from '../context/StudyTimerContext'

const PAUSE_BUTTON =
  'flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-base font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'

const FINISH_BUTTON =
  'flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 text-sm font-semibold text-slate-300 transition hover:border-indigo-500 hover:text-white'

export function FocusOverlay() {
  const timer = useStudyTimerContext()

  if (!timer.isFocusMode) return null

  const handleFinish = () => {
    void timer.finish()
  }

  return (
    <div
      data-testid="focus-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Modo Foco Total"
      className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-slate-100"
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-6 py-5">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={timer.closeFocusMode}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Sair do Foco
          </button>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
            Foco Total
          </span>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center pb-10">
          <div
            role="timer"
            aria-label="Tempo restante"
            className="font-mono text-8xl font-bold tabular-nums tracking-tight text-white"
          >
            {timer.formattedTime}
          </div>

          <div className="mt-16 flex flex-col items-center">
            <div className="relative grid h-28 w-28 place-items-center rounded-2xl border-2 border-slate-800 bg-slate-900">
              <span
                aria-hidden="true"
                className="absolute inset-0 animate-pulse rounded-2xl bg-indigo-500/25 blur-xl"
              />
              <BookOpen
                className="relative h-14 w-14 animate-bounce text-indigo-400"
                aria-hidden="true"
              />
            </div>
            <p className="mt-5 animate-pulse text-sm font-medium tracking-wide text-slate-400">
              {timer.isRunning ? 'Farmando XP...' : 'Pausado — descanse um pouco'}
            </p>
          </div>
        </main>

        <footer className="flex flex-col gap-3 pb-8">
          {timer.isRunning ? (
            <button
              type="button"
              onClick={() => {
                void timer.pause()
              }}
              disabled={!timer.canPause}
              className={PAUSE_BUTTON}
            >
              <Pause className="h-5 w-5" aria-hidden="true" />
              Pausar
            </button>
          ) : timer.isPaused ? (
            <button type="button" onClick={timer.resume} className={PAUSE_BUTTON}>
              <Play className="h-5 w-5" aria-hidden="true" />
              Retomar
            </button>
          ) : null}

          <button type="button" onClick={handleFinish} className={FINISH_BUTTON}>
            <Flag className="h-4 w-4" aria-hidden="true" />
            Concluir Sessão
          </button>
        </footer>
      </div>
    </div>
  )
}