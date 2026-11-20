import { useEffect, useRef } from 'react'
import { Flag, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { StudyLoadingAnimation } from '../../../components/StudyLoadingAnimation'
import { useStudyTimerContext } from '../context/StudyTimerContext'
import { useModalBackHandler } from '../../../hooks/useNativeBackButton'
import { useBackgroundMusic } from '../../../hooks/useBackgroundMusic'

const PAUSE_BUTTON =
  'flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 text-base font-semibold text-slate-200 transition-transform duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'

const FINISH_BUTTON =
  'flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 text-base font-bold text-white transition-transform duration-150 active:scale-95 animate-glow-pulse'

const AUDIO_BUTTON =
  'flex min-h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white active:scale-95'

const FINISH_TAPS_REQUIRED = 5

export function FocusOverlay() {
  const timer = useStudyTimerContext()
  const { isMuted, toggle: toggleAudio } = useBackgroundMusic()
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

        <main className="flex min-h-0 flex-1 flex-col pb-6">
          <div className="flex justify-center pt-12">
            <div
              role="timer"
              aria-label="Tempo restante"
              className="font-mono text-8xl font-bold tabular-nums tracking-tight text-white"
            >
              {timer.formattedTime}
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center">
            <StudyLoadingAnimation
              className="aspect-square max-w-full w-[90vw]"
              text={timer.isRunning ? 'Farmando XP...' : 'Pausado — descanse um pouco'}
              paused={!timer.isRunning}
            />
          </div>
        </main>

        <footer className="relative pt-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="mb-8 flex items-stretch gap-3">
            <button
              type="button"
              onClick={toggleAudio}
              data-testid="focus-audio-toggle"
              aria-label={isMuted ? 'Ativar som ambiente' : 'Silenciar som ambiente'}
              title={isMuted ? 'Ativar som ambiente' : 'Silenciar som ambiente'}
              className={AUDIO_BUTTON}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Volume2 className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

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
