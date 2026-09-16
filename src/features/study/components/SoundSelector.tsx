import { useState } from 'react'
import { Check, Music, Play, X } from 'lucide-react'
import {
  SOUND_OPTIONS,
  getSelectedSoundKey,
  playPreviewSound,
  setSelectedSoundKey,
  type CompletionSoundKey,
} from '../lib/completionSounds'

interface SoundSelectorProps {
  onClose: () => void
}

export function SoundSelector({ onClose }: SoundSelectorProps) {
  const [selected, setSelected] = useState<CompletionSoundKey>(() =>
    getSelectedSoundKey(),
  )

  const handleSelect = (key: CompletionSoundKey) => {
    setSelected(key)
    setSelectedSoundKey(key)
  }

  const handlePreview = (key: CompletionSoundKey) => {
    playPreviewSound(key)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Sons de conclusão"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
              <Music className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <h2 id="sound-selector-title" className="text-xl font-bold text-white">
              Som de Conclusão
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Escolha o efeito sonoro tocado ao encerrar o Pomodoro.
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

        <ul className="flex flex-col gap-2">
          {SOUND_OPTIONS.map((option) => {
            const isSelected = option.key === selected
            return (
              <li key={option.key} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => handleSelect(option.key)}
                  aria-pressed={isSelected}
                  aria-label={`Selecionar ${option.label}`}
                  className={`flex min-h-[52px] flex-1 items-center gap-3 rounded-lg border px-3 text-left transition active:scale-[0.99] ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 text-white ring-1 ring-indigo-500/40'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-lg" aria-hidden="true">
                    {option.emoji}
                  </span>
                  <span className="flex-1 text-sm font-semibold">{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handlePreview(option.key)}
                  aria-label={`Ouvir ${option.label}`}
                  className="grid min-h-[52px] w-14 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-indigo-500 hover:text-white active:scale-95"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex min-h-[44px] w-full touch-manipulation select-none items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
        >
          Concluído
        </button>
      </div>
    </div>
  )
}
