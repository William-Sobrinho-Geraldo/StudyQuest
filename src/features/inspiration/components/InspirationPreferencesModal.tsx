import { Check, Loader2, Settings2, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../../components/Toast'
import { useModalBackHandler } from '../../../hooks/useNativeBackButton'
import { QUOTE_CATEGORIES } from '../lib/quoteCategories'

interface InspirationPreferencesModalProps {
  initialSelected: readonly string[]
  saving: boolean
  onSave: (preferences: readonly string[]) => void
  onClose: () => void
}

export function InspirationPreferencesModal({
  initialSelected,
  saving,
  onSave,
  onClose,
}: InspirationPreferencesModalProps) {
  useModalBackHandler(onClose)
  const { showToast } = useToast()
  const [draft, setDraft] = useState<string[]>(() => [...initialSelected])

  function toggle(categoryId: string) {
    if (saving) return

    const isActive = draft.includes(categoryId)
    if (isActive && draft.length === 1) {
      showToast('Mantenha ao menos uma categoria de frases selecionada.', 'info')
      return
    }

    setDraft((current) =>
      isActive ? current.filter((id) => id !== categoryId) : [...current, categoryId],
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preferências de Inspiração"
      data-testid="inspiration-preferences-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-500/20">
              <Settings2 className="h-5 w-5 text-indigo-400" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">Preferências de Inspiração</h2>
              <p className="mt-1 max-w-64 text-sm text-slate-400">
                Selecione as categorias de frases que aparecem na sua Home. Pelo menos uma deve
                permanecer ativa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {QUOTE_CATEGORIES.map((category) => {
            const active = draft.includes(category.id)
            return (
              <button
                key={category.id}
                type="button"
                data-testid={`inspiration-chip-${category.id}`}
                aria-pressed={active}
                disabled={saving}
                onClick={() => toggle(category.id)}
                className={`flex touch-manipulation select-none items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-md'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {active && <Check className="h-4 w-4" aria-hidden="true" />}
                {category.label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={saving}
          className="mt-6 flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Salvar
            </>
          )}
        </button>
      </div>
    </div>
  )
}