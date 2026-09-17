import { useEffect, useRef } from 'react'
import { BookOpen, Flag, Pause, Play } from 'lucide-react'
import { useStudyTimerContext } from '../context/StudyTimerContext'
import { useModalBackHandler } from '../../../hooks/useNativeBackButton'

const PAUSE_BUTTON =
  'flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 text-base font-semibold text-slate-200 transition-transform duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'

const FINISH_BUTTON =
  'flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 text-base font-bold text-white transition-transform duration-150 active:scale-95 animate-glow-pulse'

const FINISH_TAPS_REQUIRED = 5

export function FocusOverlay() {
  const timer = useStudyTimerContext()
  const tapCountRef = useRef(0)

  const handleFinishEarly = () => {
    void timer.finishEarly()
  }

  useModalBackHandler(handleFinishEarly, timer.isFocusMode)

  useEffect(() => {
    tapCountRef.current = 0
  }, [timer.isFocusMode])

  if (!timer.isFocusMode) return null

  const handleDiscreteTap = () => {
    tapCountRef.current += 1
    if (tapCountRef.current >= FINISH_TAPS_REQUIRED) {
      tapCountRef.current = 0
      void timer.finish()
    }
  }

  return (
    <div
      data-testid="focus-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Modo Foco Total"
      className="fixed inset-0 z-40 flex h-screen w-screen flex-col overflow-hidden overscroll-none bg-slate-950 text-slate-100"
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-6">
        <header className="flex items-center justify-center pt-14">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
            Foco Total
          </span>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center pb-6">
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

        <footer className="relative pt-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="mb-8 flex items-stretch gap-3">
            {timer.isRunning ? (
              <button
                type="button"
                onClick={() => {
                  void timer.pause()
                }}
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

            <button
              type="button"
              onClick={handleFinishEarly}
              className={FINISH_BUTTON}
            >
              <Flag className="h-5 w-5" aria-hidden="true" />
              Finalizar Sessão
            </button>
          </div>

          {/* Zona de toque secreta, colada à borda inferior: conclui a sessão após 5 toques. */}
          <button
            type="button"
            data-testid="finish-session"
            aria-label="Concluir sessão"
            onClick={handleDiscreteTap}
            className="absolute bottom-0 left-0 z-10 h-6 w-full bg-transparent"
          />
        </footer>
      </div>
    </div>
  )
}
