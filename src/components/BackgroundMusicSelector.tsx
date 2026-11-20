import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Check, ListMusic, X } from 'lucide-react'
import { useBackgroundMusic } from '../hooks/useBackgroundMusic'
import { useModalBackHandler } from '../hooks/useNativeBackButton'

const OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 'max(24px, env(safe-area-inset-top, 24px))',
  paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
  paddingLeft: 16,
  paddingRight: 16,
  backgroundColor: 'rgba(2, 6, 23, 0.7)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
}

const CARD_STYLE: CSSProperties = {
  maxHeight: 'calc(100dvh - 64px)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
  maxWidth: 384,
  borderRadius: 16,
  border: '1px solid #1e293b',
  backgroundColor: '#0f172a',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
}

const LIST_STYLE: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '16px 20px',
}

export function BackgroundMusicSelector() {
  const { tracks, trackId, setTrack } = useBackgroundMusic()
  const [open, setOpen] = useState(false)

  useModalBackHandler(() => setOpen(false), open)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            style={OVERLAY_STYLE}
            role="dialog"
            aria-modal="true"
            aria-label="Sons de concentração"
            onClick={() => setOpen(false)}
          >
            <div style={CARD_STYLE} onClick={(event) => event.stopPropagation()}>
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 p-5">
                <div className="min-w-0">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <ListMusic className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <h2
                    id="background-music-selector-title"
                    className="text-xl font-bold text-white"
                  >
                    Sons de concentração
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Escolha a trilha tocada durante seus estudos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  className="grid h-11 w-11 shrink-0 touch-manipulation select-none place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white active:scale-95"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <ul style={LIST_STYLE}>
                {tracks.map((track) => {
                  const isSelected = track.id === trackId
                  return (
                    <li key={track.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setTrack(track.id)}
                        aria-pressed={isSelected}
                        aria-label={`Selecionar ${track.name}`}
                        className={`flex min-h-[52px] w-full items-center gap-3 rounded-lg border px-3 text-left transition active:scale-[0.99] ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/10 text-white ring-1 ring-indigo-500/40'
                            : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{track.name}</span>
                          <span className="block text-xs text-slate-400">{track.description}</span>
                        </span>
                        {isSelected && (
                          <Check
                            className="h-4 w-4 shrink-0 text-indigo-400"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="shrink-0 border-t border-slate-800 p-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] w-full touch-manipulation select-none items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
                >
                  Concluído
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="background-music-selector"
        aria-label="Escolher som de concentração"
        title="Escolher som"
        className="shrink-0 p-2 rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
      >
        <ListMusic className="h-5 w-5" aria-hidden="true" />
      </button>

      {modal}
    </>
  )
}

export default BackgroundMusicSelector
