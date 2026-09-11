import { useParams } from 'react-router-dom'
import { Loader2, Trophy, Users } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../features/auth/AuthContext'
import { useSprint } from '../features/sprints/hooks/useSprint'
import { formatCountdown } from '../features/sprints/lib/countdown'
import { getDurationLabel } from '../features/sprints/lib/sprintOptions'
import { DEFAULT_MAX_PARTICIPANTS } from '../features/sprints/lib/sprintOptions'
import { formatMinutes } from '../utils/formatMinutes'
import type { SprintRankingEntry } from '../features/sprints/services/sprintsService'

function getInitial(playerTag: string | null): string {
  return playerTag?.charAt(0).toUpperCase() ?? '?'
}

export function SprintPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { sprint, rankings, loading, error } = useSprint(id)

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" aria-hidden="true" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <p className="text-sm text-red-400">{error}</p>
      </AppShell>
    )
  }

  if (!sprint) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">Sprint não encontrada.</p>
      </AppShell>
    )
  }

  const isFinished = sprint.status === 'finished'
  const countdown = formatCountdown(sprint.end_date)
  const max = sprint.max_participants ?? DEFAULT_MAX_PARTICIPANTS
  const participantCount = rankings.length
  const leaderMinutes = rankings[0]?.minutes ?? 0
  const ownUserId = user?.id ?? ''

  return (
    <AppShell>
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600">
          <Trophy className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{sprint.name}</h1>
          <p className="text-sm text-slate-400">{getDurationLabel(sprint.duration_type)}</p>
        </div>
      </header>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">
              {isFinished ? 'Encerrada' : 'Tempo restante'}
            </p>
            <p
              className={`mt-1 font-mono text-2xl font-bold ${
                isFinished ? 'text-slate-500' : 'text-indigo-400'
              }`}
            >
              {countdown}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-sm text-slate-300">
              <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {participantCount}/{max}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">participantes</p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Ranking por tempo de estudo</h2>

        {rankings.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum participante registrado ainda.</p>
        )}

        {rankings.length > 0 && (
          <ol className="space-y-2">
            {rankings.map((entry: SprintRankingEntry, index: number) => {
              const position = index + 1
              const isOwn = entry.user_id === ownUserId
              const widthPercent =
                leaderMinutes > 0
                  ? Math.max(1, Math.round((entry.minutes / leaderMinutes) * 100))
                  : 0
              return (
                <li
                  key={entry.participant_id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    isOwn
                      ? 'border-indigo-500/40 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-900'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      position === 1
                        ? 'bg-amber-500/20 text-amber-300'
                        : position === 2
                          ? 'bg-slate-300/10 text-slate-300'
                          : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {position}
                  </span>

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
                    {getInitial(entry.player_tag)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {entry.player_tag ?? 'Jogador'}
                      {isOwn && (
                        <span className="ml-1.5 text-xs font-medium text-indigo-400">(Você)</span>
                      )}
                    </p>

                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                          position === 1
                            ? 'bg-amber-500'
                            : isOwn
                              ? 'bg-indigo-500'
                              : 'bg-indigo-400/70'
                        }`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>

                    <p className="mt-1.5 text-xs font-medium text-slate-400">
                      {formatMinutes(entry.minutes)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </AppShell>
  )
}