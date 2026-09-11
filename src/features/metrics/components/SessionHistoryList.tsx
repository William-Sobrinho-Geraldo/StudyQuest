import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, Coins, Sparkles } from 'lucide-react'
import type { SessionHistoryItem, StudyHistoryPeriod } from '../services/studyHistoryService'

interface SessionHistoryListProps {
  sessions: SessionHistoryItem[]
  period: StudyHistoryPeriod
}

function startParts(startedAt: string) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(startedAt))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return { day: get('day'), month: get('month'), hour: get('hour'), minute: get('minute') }
}

function startLabel(startedAt: string, period: StudyHistoryPeriod): string {
  const { day, month, hour, minute } = startParts(startedAt)
  if (period === 'day') {
    return `${hour}:${minute}`
  }
  return `${day}/${month} às ${hour}:${minute}`
}

function SortedSessionsList({ sessions, period }: SessionHistoryListProps) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  )

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((session) => (
        <li
          key={session.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200">
              {startLabel(session.started_at, period)}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-base font-semibold text-white">
              <Clock className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              {session.duration_minutes} min
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm font-semibold">
            <span className="flex items-center gap-1 text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              +{session.xp} XP
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Coins className="h-3.5 w-3.5" aria-hidden="true" />
              +{session.gold} Gold
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function SessionHistoryList({ sessions, period }: SessionHistoryListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="py-4 text-center text-sm text-slate-400">
          Nenhuma sessão registrada neste período.
        </p>
      </div>
    )
  }

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        aria-controls="session-history-list"
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-left transition-colors hover:bg-slate-800/60"
      >
        <h3 className="text-sm font-semibold text-slate-300">Sessões do período</h3>
        <span className="grid h-8 w-8 place-items-center rounded-lg text-slate-400">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
      </button>

      {isExpanded && (
        <div
          id="session-history-list"
          className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-slate-800 p-3"
        >
          <SortedSessionsList sessions={sessions} period={period} />
        </div>
      )}
    </section>
  )
}