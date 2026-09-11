import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  fetchStudyHistory,
  type StudyHistoryBucket,
  type StudyHistoryPeriod,
} from '../services/studyHistoryService'
import { onStudySessionSaved } from '../../study/lib/studyEvents'

const WEEK_DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const PERIOD_OPTIONS: { value: StudyHistoryPeriod; label: string }[] = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
]

function todayBrt(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function parseDate(isoDate: string): number[] {
  return isoDate.split('-').map(Number)
}

function formatDate(isoDate: string): string {
  const [y, m, d] = parseDate(isoDate)
  return new Date(Date.UTC(y, m - 1, d, 12)).toISOString().slice(0, 10)
}

function shiftDays(isoDate: string, days: number): string {
  const [y, m, d] = parseDate(isoDate)
  return formatDate(`${y}-${m}-${d + days}`)
}

function shiftMonth(isoDate: string, months: number): string {
  const [y, m] = parseDate(isoDate)
  return formatDate(`${y}-${m + months}-1`)
}

function weekStart(isoDate: string): string {
  const [y, m, d] = parseDate(isoDate)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return shiftDays(isoDate, -((dow + 6) % 7))
}

function windowLabel(period: StudyHistoryPeriod, anchor: string): string {
  const utc = (isoDate: string) => new Date(isoDate + 'T12:00:00Z')
  const monthFormat = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  if (period === 'month') {
    const label = monthFormat.format(utc(anchor))
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  const dayFormat = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const weekdayFormat = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  if (period === 'day') {
    const label = weekdayFormat.format(utc(anchor))
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  const start = weekStart(anchor)
  const end = shiftDays(start, 6)
  return `Semana de ${dayFormat.format(utc(start))} a ${dayFormat.format(utc(end))}`
}

interface ChartPoint {
  key: string
  label: string
  minutes: number
  sessions: number
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartPoint }>
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
      <p>{point.label}</p>
      <p className="mt-1">
        <span className="font-semibold text-indigo-400">{point.minutes} min</span>
        {' · '}
        {point.sessions} {point.sessions === 1 ? 'sessão' : 'sessões'}
      </p>
    </div>
  )
}

export function StudyHistory() {
  const [period, setPeriod] = useState<StudyHistoryPeriod>('week')
  const [anchor, setAnchor] = useState<string>(todayBrt)
  const [buckets, setBuckets] = useState<StudyHistoryBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshEpoch, setRefreshEpoch] = useState(0)

  useEffect(() => {
    return onStudySessionSaved(() => setRefreshEpoch((epoch) => epoch + 1))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    fetchStudyHistory(period, anchor)
      .then((data) => {
        if (!active) return
        setBuckets(data)
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : 'Falha ao carregar o histórico.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [period, anchor, refreshEpoch])

  const chartData = useMemo<ChartPoint[]>(() => {
    if (period === 'day') {
      return buckets.map((bucket) => ({
        key: `hour-${bucket.hour}`,
        label: `${bucket.hour}h`,
        minutes: bucket.minutes,
        sessions: bucket.sessions,
      }))
    }
    if (period === 'week') {
      return buckets.map((bucket, index) => ({
        key: bucket.bucket_date,
        label: WEEK_DAY_LABELS[index] ?? '',
        minutes: bucket.minutes,
        sessions: bucket.sessions,
      }))
    }
    return buckets.map((bucket) => ({
      key: bucket.bucket_date,
      label: String(parseInt(bucket.bucket_date.slice(8, 10), 10)),
      minutes: bucket.minutes,
      sessions: bucket.sessions,
    }))
  }, [buckets, period])

  const totalMinutes = buckets.reduce((total, bucket) => total + bucket.minutes, 0)
  const totalSessions = buckets.reduce((total, bucket) => total + bucket.sessions, 0)

  const goDelta = (delta: number) => {
    setAnchor((current) =>
      period === 'month' ? shiftMonth(current, delta) : shiftDays(current, period === 'day' ? delta : delta * 7),
    )
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-white">Histórico de estudo</h2>
      <p className="mt-1 text-sm text-slate-400">
        Suas sessões registradas por dia, semana ou mês.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1" role="group" aria-label="Período">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={period === option.value}
              onClick={() => setPeriod(option.value)}
              className={`flex min-h-[44px] items-center rounded-md px-4 text-sm font-medium transition-colors ${
                period === option.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goDelta(-1)}
            aria-label="Período anterior"
            className="grid h-11 w-11 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span data-testid="history-window-label" className="text-sm text-slate-300">
            {windowLabel(period, anchor)}
          </span>
          <button
            type="button"
            onClick={() => goDelta(1)}
            aria-label="Próximo período"
            className="grid h-11 w-11 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors hover:text-white"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-300">Minutos estudados</h3>
          {!loading && !error && (
            <p className="flex items-center gap-1.5 text-sm text-slate-400" data-testid="history-summary">
              <History className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              {totalSessions} {totalSessions === 1 ? 'sessão' : 'sessões'} · {totalMinutes} min
            </p>
          )}
        </div>

        <div className="mt-4">
          {loading ? (
            <div role="status" className="py-12 text-center text-sm text-slate-400">
              Carregando histórico...
            </div>
          ) : error ? (
            <p role="alert" className="py-12 text-center text-sm text-red-400">
              {error}
            </p>
          ) : totalMinutes === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">
              Nenhuma sessão registrada neste período.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  tickLine={false}
                  axisLine={false}
                  interval={period === 'month' ? 1 : 0}
                  fontSize={11}
                />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#1e293b' }} content={<ChartTooltip />} />
                <Bar
                  dataKey="minutes"
                  name="minutos"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  )
}