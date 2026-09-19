import { Settings2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../../../components/Toast'
import { useAuth } from '../../auth/AuthContext'
import { ALL_QUOTE_CATEGORIES, QUOTE_CATEGORIES } from '../lib/quoteCategories'
import { clearCachedDailyQuote } from '../lib/quoteCache'
import { updateQuotePreferences } from '../services/quoteService'
import { InspirationPreferencesModal } from './InspirationPreferencesModal'

export function InspirationPreferences() {
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [selected, setSelected] = useState<string[]>(() =>
    profile?.quote_preferences && profile.quote_preferences.length > 0
      ? [...profile.quote_preferences]
      : [...ALL_QUOTE_CATEGORIES],
  )
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const preferences = profile?.quote_preferences
    if (preferences) {
      setSelected(preferences.length > 0 ? [...preferences] : [...ALL_QUOTE_CATEGORIES])
    }
  }, [profile?.quote_preferences])

  async function save(preferences: readonly string[]) {
    if (!user || saving) return

    setSaving(true)
    try {
      await updateQuotePreferences(user.id, preferences)
      clearCachedDailyQuote(user.id)
      await refreshProfile()
      setModalOpen(false)
      showToast('Preferências de inspiração salvas.', 'success')
    } catch {
      showToast('Não foi possível salvar suas preferências.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const activeLabels = QUOTE_CATEGORIES.filter((category) => selected.includes(category.id)).map(
    (category) => category.label,
  )

  return (
    <section aria-busy={saving} className="mt-4 w-full" data-testid="inspiration-preferences">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/15">
            <Sparkles className="h-5 w-5 text-amber-400" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-100">Preferências de Inspiração</h2>
            <p className="mt-0.5 truncate text-sm text-slate-400">
              Ativas: {activeLabels.join(', ')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="Editar preferências de inspiração"
          data-testid="inspiration-edit-button"
          className="flex shrink-0 touch-manipulation select-none items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white active:scale-95"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          Editar
        </button>
      </div>

      {modalOpen && (
        <InspirationPreferencesModal
          initialSelected={selected}
          saving={saving}
          onSave={(preferences) => void save(preferences)}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  )
}