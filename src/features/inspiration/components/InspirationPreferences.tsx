import { Check, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../../../components/Toast'
import { useAuth } from '../../auth/AuthContext'
import { ALL_QUOTE_CATEGORIES, QUOTE_CATEGORIES } from '../lib/quoteCategories'
import { clearCachedDailyQuote } from '../lib/quoteCache'
import { updateQuotePreferences } from '../services/quoteService'

export function InspirationPreferences() {
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [selected, setSelected] = useState<string[]>(() =>
    profile?.quote_preferences && profile.quote_preferences.length > 0
      ? [...profile.quote_preferences]
      : [...ALL_QUOTE_CATEGORIES],
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const preferences = profile?.quote_preferences
    if (preferences) {
      setSelected(preferences.length > 0 ? [...preferences] : [...ALL_QUOTE_CATEGORIES])
    }
  }, [profile?.quote_preferences])

  async function toggle(categoryId: string) {
    if (!user || saving) return

    const isActive = selected.includes(categoryId)
    if (isActive && selected.length === 1) {
      showToast('Mantenha ao menos uma categoria de frases selecionada.', 'info')
      return
    }

    const next = isActive
      ? selected.filter((id) => id !== categoryId)
      : [...selected, categoryId]
    const previous = selected

    setSelected(next)
    setSaving(true)
    try {
      await updateQuotePreferences(user.id, next)
      clearCachedDailyQuote(user.id)
      await refreshProfile()
      showToast(
        isActive ? 'Categoria ocultada das frases.' : 'Categoria ativada nas frases.',
        'success',
      )
    } catch {
      setSelected(previous)
      showToast('Não foi possível salvar suas preferências.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-busy={saving} className="mt-4 w-full" data-testid="inspiration-preferences">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/15">
          <Sparkles className="h-5 w-5 text-amber-400" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold">Preferências de Inspiração</h2>
          <p className="text-xs text-slate-400">
            Escolha quais categorias de frases motivacionais aparecem na sua Home.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {QUOTE_CATEGORIES.map((category) => {
          const checked = selected.includes(category.id)
          return (
            <label
              key={category.id}
              data-testid={`inspiration-option-${category.id}`}
              className={`flex touch-manipulation select-none items-center gap-3 rounded-xl border p-3 transition ${
                checked
                  ? 'border-indigo-500/50 bg-indigo-500/10'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              <input
                type="checkbox"
                className="peer sr-only"
                checked={checked}
                disabled={saving}
                onChange={() => void toggle(category.id)}
              />
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-white transition ${
                  checked ? 'border-indigo-500 bg-indigo-600' : 'border-slate-600 bg-slate-800'
                }`}
              >
                <Check className={`h-3.5 w-3.5 ${checked ? 'opacity-100' : 'opacity-0'}`} />
              </span>
              <span className="text-sm font-medium text-slate-200">{category.label}</span>
            </label>
          )
        })}
      </div>

      {saving && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-indigo-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Salvando preferências...
        </p>
      )}
    </section>
  )
}