import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Loader2, Sparkles, Zap } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useToast } from '../components/Toast'
import { createSprint } from '../features/sprints/services/sprintsService'
import { SPRINT_DURATION_OPTIONS } from '../features/sprints/lib/sprintOptions'
import type { SprintDuration } from '../types/sprints'

export function SprintCreatePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [duration, setDuration] = useState<SprintDuration>('1_week')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const sprint = await createSprint({ name: name.trim(), durationType: duration })
      showToast('Sprint criada! Você é o primeiro participante.', 'success')
      navigate(`/sprints/${sprint.id}`, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      showToast(
        message.includes('active sprint')
          ? 'Você já está em uma sprint ativa. Termine ou saia dela antes de criar outra.'
          : 'Não foi possível criar a sprint. Tente novamente.',
        'error',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600">
          <Zap className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Nova Sprint</h1>
          <p className="text-sm text-slate-400">Um desafio competitivo individual temporário.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        <div>
          <label htmlFor="sprint-name" className="mb-2 block text-sm font-medium text-slate-300">
            Nome da Sprint
          </label>
          <input
            id="sprint-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            placeholder="Ex.: Maratona de Provas"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-slate-300">Duração</legend>
          <div className="grid grid-cols-3 gap-2">
            {SPRINT_DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDuration(option.value)}
                aria-pressed={duration === option.value}
                className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border transition ${
                  duration === option.value
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs text-slate-500">{option.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <p className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
          O limite é de 10 participantes por sprint.
        </p>

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          )}
          {submitting ? 'Criando...' : 'Criar Sprint'}
        </button>
      </form>
    </AppShell>
  )
}