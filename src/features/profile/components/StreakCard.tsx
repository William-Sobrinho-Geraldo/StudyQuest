import { Flame } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useStudyTimerContext } from '../../study/context/StudyTimerContext'

export function StreakCard() {
  const { sessionCompletedAt } = useStudyTimerContext()
  const [streak, setStreak] = useState<number | null>(null)

  const refreshStreak = useCallback(async () => {
    const { data, error } = await supabase.rpc('refresh_streak')
    if (error || typeof data !== 'number') {
      setStreak(0)
      return
    }
    setStreak(data)
  }, [])

  useEffect(() => {
    void refreshStreak()
  }, [refreshStreak])

  useEffect(() => {
    if (sessionCompletedAt === null) return
    void refreshStreak()
  }, [sessionCompletedAt, refreshStreak])

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