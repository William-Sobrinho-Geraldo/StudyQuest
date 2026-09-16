import { BookOpen, Flag, Pause, Play, Trophy } from 'lucide-react'
import { useStudyTimerContext } from '../context/StudyTimerContext'
import { useModalBackHandler } from '../../../hooks/useNativeBackButton'

const PAUSE_BUTTON =
  'flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-base font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'

const COLLECT_BUTTON =
  'flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 text-base font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50'

export function FocusOverlay() {
  const timer = useStudyTimerContext()

  const handleFinishEarly = () => {
    void timer.finishEarly()
  }

  useModalBackHandler(handleFinishEarly, timer.isFocusMode)

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
      className="fixed inset-0 z-40 flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-950 text-slate-100"
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-6 pb-5">
        <header className="flex items-center justify-between gap-3 pt-14">
          {timer.isOvertime ? (
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
              Meta atingida
            </span>
          ) : (
            <button
              type="button"
              onClick={handleFinishEarly}
              className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
            >
              <Flag className="h-4 w-4" aria-hidden="true" />
              Finalizar Agora
            </button>
          )}
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
            Foco Total
          </span>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center pb-10">
          {timer.isOvertime && (
            <div
              data-testid="overtime-banner"
              className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
            >
              <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
              Sessão Estendida • Farmando XP Bônus
            </div>
          )}

          <div
            role="timer"
            aria-label={timer.isOvertime ? 'Tempo excedente' : 'Tempo restante'}
            className={`font-mono text-8xl font-bold tabular-nums tracking-tight ${
              timer.isOvertime ? 'text-amber-400' : 'text-white'
            }`}
          >
            {timer.isOvertime ? timer.formattedOvertime : timer.formattedTime}
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
              {timer.isOvertime
                ? timer.isPaused
                  ? 'Sessão estendida pausada'
                  : 'Sessão Estendida • Farmando XP Bônus'
                : timer.isRunning
                  ? 'Farmando XP...'
                  : 'Pausado — descanse um pouco'}
            </p>
          </div>
        </main>

        <footer className="flex flex-col gap-3 pb-8">
          {timer.isOvertime ? (
            <>
              {timer.isPaused ? (
                <button type="button" onClick={timer.resume} className={PAUSE_BUTTON}>
                  <Play className="h-5 w-5" aria-hidden="true" />
                  Retomar
                </button>
              ) : (
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
              )}
              <button type="button" onClick={handleFinish} className={COLLECT_BUTTON}>
                <Trophy className="h-5 w-5" aria-hidden="true" />
                Finalizar Sessão e Coletar XP
              </button>
            </>
          ) : timer.isRunning ? (
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
        </footer>
      </div>

      {/* Atalho de teste: conclui a sessão de forma sutil e sem texto. */}
      <button
        type="button"
        data-testid="finish-session"
        aria-label="Concluir sessão"
        onClick={handleFinish}
        className="absolute bottom-1.5 left-1/2 h-4 w-24 -translate-x-1/2 rounded-full bg-slate-500/25 opacity-40 transition hover:opacity-80"
      />
    </div>
  )
}