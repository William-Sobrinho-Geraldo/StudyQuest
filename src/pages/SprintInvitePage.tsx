import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, Loader2, LogIn, Users, Zap } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useToast } from '../components/Toast'
import { useAuth } from '../features/auth/AuthContext'
import {
  fetchIsParticipant,
  fetchMyActiveSprint,
  fetchSprint,
  fetchSprintParticipantCount,
  joinSprint,
} from '../features/sprints/services/sprintsService'
import { getDurationLabel } from '../features/sprints/lib/sprintOptions'
import type { Sprint } from '../types/sprints'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function SprintInvitePage() {
  const [params] = useSearchParams()
  const sprintId = params.get('sprint_id') ?? ''
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [count, setCount] = useState(0)
  const [isParticipant, setIsParticipant] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  const load = useCallback(async () => {
    if (!sprintId || !user) return
    try {
      const [sprintData, participantCount, alreadyParticipant] = await Promise.all([
        fetchSprint(sprintId),
        fetchSprintParticipantCount(sprintId),
        fetchIsParticipant(sprintId, user.id),
      ])
      setSprint(sprintData)
      setCount(participantCount)
      setIsParticipant(alreadyParticipant)
    } catch {
      showToast('Não foi possível carregar o convite.', 'error')
    } finally {
      setLoading(false)
    }
  }, [sprintId, user, showToast])

  useEffect(() => {
    void load()
  }, [load])

  async function handleJoin() {
    if (!sprintId || !user) return
    setJoining(true)
    try {
      const activeSprint = await fetchMyActiveSprint(user.id)
      if (activeSprint && activeSprint.sprint_id !== sprintId) {
        showToast(
          'Você já está em uma sprint ativa. Termine ou saia dela antes de participar de outra.',
          'error',
        )
        return
      }
      await joinSprint(sprintId)
      showToast('Você entrou na sprint!', 'success')
      navigate(`/sprints/${sprintId}`, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      showToast(
        message.includes('active sprint')
          ? 'Você já está em uma sprint ativa.'
          : 'Não foi possível entrar na sprint.',
        'error',
      )
    } finally {
      setJoining(false)
    }
  }

  if (!sprintId) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">Convite inválido: nenhuma sprint especificada.</p>
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" aria-hidden="true" />
        </div>
      </AppShell>
    )
  }

  if (!sprint) {
    return (
      <AppShell>
        <p className="text-sm text-red-400">Sprint não encontrada ou indisponível.</p>
      </AppShell>
    )
  }

  const isFinished = sprint.status === 'finished'
  const isFull = count >= sprint.max_participants
  const isSameActive = isParticipant && sprint.status === 'active'

  return (
    <AppShell>
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600">
          <Zap className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Convite de Sprint</h1>
          <p className="text-sm text-slate-400">Convite para uma sprint de estudo.</p>
        </div>
      </header>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-bold">{sprint.name}</h2>

        <dl className="mt-4 space-y-2 text-sm text-slate-300">
          <div className="flex justify-between">
            <dt className="text-slate-400">Duração</dt>
            <dd>{getDurationLabel(sprint.duration_type)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Termina em</dt>
            <dd className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              {formatDate(sprint.end_date)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Lotação</dt>
            <dd className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              {count}/{sprint.max_participants}
            </dd>
          </div>
        </dl>

        {isSameActive && (
          <p className="mt-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm text-indigo-300">
            Você já participa desta sprint.
          </p>
        )}

        {isFinished && (
          <p className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-400">
            Esta sprint já foi encerrada.
          </p>
        )}

        {!isFinished && !isSameActive && isFull && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            Lotação cheia. Aguarde uma vaga disponível.
          </p>
        )}

        <button
          type="button"
          disabled={joining || isFinished || isFull || isSameActive}
          onClick={isSameActive ? () => navigate(`/sprints/${sprintId}`) : handleJoin}
          className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {joining ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : isSameActive ? (
            <LogIn className="h-5 w-5" aria-hidden="true" />
          ) : (
            <LogIn className="h-5 w-5" aria-hidden="true" />
          )}
          {joining
            ? 'Entrando...'
            : isSameActive
              ? 'Abrir Sprint'
              : isFinished
                ? 'Sprint Encerrada'
                : isFull
                  ? 'Lotação Cheia'
                  : 'Participar da Sprint'}
        </button>
      </section>
    </AppShell>
  )
}