import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { ALL_QUOTE_CATEGORIES } from '../lib/quoteCategories'
import { getCachedDailyQuote, saveCachedDailyQuote } from '../lib/quoteCache'
import { fetchDailyQuote, type MotivationalQuote } from '../services/quoteService'

export function DailyMotivationCard() {
  const { user, profile, profileLoading } = useAuth()
  const [quote, setQuote] = useState<MotivationalQuote | null>(null)
  const [loading, setLoading] = useState(true)

  const categories = useMemo(() => {
    const preferences = profile?.quote_preferences
    return preferences && preferences.length > 0 ? preferences : ALL_QUOTE_CATEGORIES
  }, [profile?.quote_preferences])

  useEffect(() => {
    if (!user) return
    // Espera as preferências do perfil para decidir em qual(is)
    // categoria(s) buscar a frase antes de chamar o Supabase.
    if (profileLoading) return
    let active = true

    const cached = getCachedDailyQuote(user.id)
    if (cached) {
      setQuote(cached)
      setLoading(false)
      return () => {
        active = false
      }
    }

    setQuote(null)
    setLoading(true)
    fetchDailyQuote(categories)
      .then((data) => {
        if (!active) return
        setQuote(data)
        if (data) {
          saveCachedDailyQuote(user.id, data)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user, profileLoading, categories])

  return (
    <section
      data-testid="daily-motivation-card"
      aria-busy={loading}
      className="rounded-xl border border-slate-800 bg-slate-900 p-4"
    >
      {loading ? (
        <div data-testid="daily-motivation-loading" aria-hidden="true" className="space-y-2.5">
          <div className="h-3 w-full animate-pulse rounded-full bg-slate-800" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-800" />
          <div className="ml-auto mt-3 h-2.5 w-1/3 animate-pulse rounded-full bg-slate-800" />
        </div>
      ) : quote ? (
        <blockquote data-testid="daily-motivation-quote">
          <p className="text-base font-medium italic leading-relaxed text-slate-100">
            “{quote.content}”
          </p>
          <footer
            data-testid="daily-motivation-author"
            className="mt-2 text-right text-xs text-slate-400"
          >
            — {quote.author}
          </footer>
        </blockquote>
      ) : (
        <p data-testid="daily-motivation-empty" className="text-sm text-slate-500">
          Sem frases por enquanto. Volte mais tarde.
        </p>
      )}
    </section>
  )
}