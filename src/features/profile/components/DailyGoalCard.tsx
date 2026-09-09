import { Check, Pencil, Target, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'

const DEFAULT_DAILY_GOAL_MINUTES = 30
const MAX_DAILY_GOAL_MINUTES = 1200

export function DailyGoalCard() {
  const { user } = useAuth()
  const [goal, setGoal] = useState<number | null>(null)
  const [todayMinutes, setTodayMinutes] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const run = async () => {
      if (!user) return

      const [profileResult, minutesResult] = await Promise.all([
        supabase.from('profiles').select('daily_goal_minutes').eq('id', user.id).maybeSingle(),
        supabase.rpc('today_study_minutes'),
      ])

      if (!active) return

      if (!profileResult.error && typeof profileResult.data?.daily_goal_minutes === 'number') {
        setGoal(profileResult.data.daily_goal_minutes)
      } else {
        setGoal(DEFAULT_DAILY_GOAL_MINUTES)
      }
      setTodayMinutes(minutesResult.error || typeof minutesResult.data !== 'number' ? 0 : minutesResult.data)
    }

    void run()
    return () => {
      active = false
    }
  }, [user])

  const startEditing = () => {
    setInputValue(String(goal ?? DEFAULT_DAILY_GOAL_MINUTES))
    setError(null)
    setEditing(true)
  }

  const cancelEditing = () => {
    setError(null)
    setEditing(false)
  }

  const handleSave = async () => {
    const value = Number(inputValue)
    if (!Number.isInteger(value) || value < 1 || value > MAX_DAILY_GOAL_MINUTES) {
      setError(`Informe um valor inteiro entre 1 e ${MAX_DAILY_GOAL_MINUTES} min.`)
      return
    }
    if (!user) return

    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ daily_goal_minutes: value })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
    } else {
      setGoal(value)
      setEditing(false)
    }
    setSaving(false)
  }

  const loading = goal === null || todayMinutes === null

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5" aria-busy={loading}>
      <div className="flex items-start justify-between">
        <Target className="h-5 w-5 text-indigo-400" aria-hidden="true" />
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            aria-label="Editar meta diária"
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-3 text-3xl font-bold">...</p>
      ) : (
        <p className="mt-3 text-3xl font-bold" data-testid="daily-goal-value">
          {todayMinutes} / {goal} min
        </p>
      )}
      <p className="text-sm text-slate-400">Meta diária</p>

      {editing && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <input
              data-testid="daily-goal-input"
              type="number"
              min={1}
              max={MAX_DAILY_GOAL_MINUTES}
              step={1}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              aria-label="Meta diária em minutos"
              className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              aria-label="Salvar meta diária"
              className="rounded-lg bg-indigo-600 p-2 text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              aria-label="Cancelar edição da meta diária"
              className="rounded-lg border border-slate-700 p-2 text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}