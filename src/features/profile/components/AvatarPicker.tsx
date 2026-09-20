import { Check, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AvatarDefinition } from '../../../utils/avatars'

interface AvatarPickerProps {
  avatars: readonly AvatarDefinition[]
  selectedId: string | null
  unlockedIds: readonly string[]
  customCard?: ReactNode
  onSelect: (id: string) => void
}

export function AvatarPicker({
  avatars,
  selectedId,
  unlockedIds,
  customCard,
  onSelect,
}: AvatarPickerProps) {
  const unlockedSet = new Set(unlockedIds)

  return (
    <div className="grid grid-cols-2 gap-3">
      {customCard}
      {avatars.map((avatar) => {
        const unlocked = unlockedSet.has(avatar.id)
        const selected = selectedId === avatar.id

        return (
          <button
            key={avatar.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Avatar ${avatar.name}`}
            disabled={!unlocked}
            onClick={() => onSelect(avatar.id)}
            className={`relative flex min-h-[104px] touch-manipulation select-none flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition active:scale-95 ${
              selected
                ? 'border-indigo-500 bg-indigo-500/10 text-white ring-2 ring-indigo-500/40'
                : unlocked
                  ? 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500'
            }`}
          >
            <img
              src={avatar.imagePath}
              alt=""
              aria-hidden="true"
              draggable={false}
              className={`h-12 w-12 select-none rounded-full object-cover ${
                unlocked ? '' : 'grayscale opacity-50'
              }`}
            />
            <span className="w-full truncate">{avatar.name}</span>

            {unlocked ? (
              selected && (
                <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-indigo-500">
                  <Check className="h-3 w-3 text-white" aria-hidden="true" />
                </span>
              )
            ) : (
              <>
                <span className="absolute right-2 top-2 text-slate-500">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-[9px] leading-tight text-slate-500">
                  Disponível no Mercado
                </span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
