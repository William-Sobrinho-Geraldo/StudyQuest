import { Flame } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function StreakCard() {
  const [streak, setStreak] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    void supabase.rpc('refresh_streak').then(({ data, error }) => {
      if (!active) return
      if (error || typeof data !== 'number') {
        setStreak(0)
        return
      }
      setStreak(data)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5" aria-busy={streak === null}>
      <Flame className="h-5 w-5 text-orange-400" aria-hidden="true" />
      <p className="mt-3 text-3xl font-bold" data-testid="streak-value">
        {streak === null ? '...' : streak}
      </p>
      <p className="text-sm text-slate-400">Dias de sequência</p>
    </div>
  )
}