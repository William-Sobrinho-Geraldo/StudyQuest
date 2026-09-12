import { useCallback, useState } from 'react'
import { Check, Crown, Loader2, Trophy, UserCheck, UserPlus } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useToast } from '../components/Toast'
import { useAuth } from '../features/auth/AuthContext'
import { useGlobalRanking } from '../features/ranking/hooks/useGlobalRanking'
import { GLOBAL_RANKING_PERIODS } from '../features/ranking/lib/periods'
import type { GlobalRankingPeriod } from '../features/ranking/lib/periods'
import {
  sendFriendRequest,
  type GlobalRankingEntry,
  type RankingRelation,
} from '../features/ranking/services/rankingService'
import { formatMinutes } from '../utils/formatMinutes'

function getInitial(playerTag: string | null): string {
  return playerTag?.charAt(0).toUpperCase() ?? '?'
}

function friendRequestErrorMessage(code?: string): string {
  switch (code) {
    case 'already_friends_or_pending':
      return 'Vocês já são amigos ou já existe uma solicitação pendente.'
    case 'cannot_add_self':
      return 'Você não pode adicionar a si mesmo.'
    case 'player_not_found':
      return 'Jogador não encontrado.'
    default:
      return 'Não foi possível enviar a solicitação. Tente novamente.'
  }
}

interface FriendRequestButtonProps {
  relation: RankingRelation
  userId: string
  playerTag: string | null
  busy: boolean
  isOwn: boolean
  compact?: boolean
  onSend: (userId: string) => void
}

function FriendRequestButton({
  relation,
  userId,
  playerTag,
  busy,
  isOwn,
  compact = false,
  onSend,
}: FriendRequestButtonProps) {
  if (isOwn || relation === 'self') {
    return compact ? <span className="h-8 w-8 shrink-0" aria-hidden="true" /> : null
  }

  let Icon = UserPlus
  let label = 'Adicionar'
  let style =
    'border-indigo-500/40 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'
  let disabled = false

  if (busy) {
    Icon = Loader2
    label = 'Enviando...'
    style = 'border-indigo-500/50 bg-indigo-600/20 text-indigo-300'
    disabled = true
  } else if (relation === 'friends') {
    Icon = UserCheck
    label = 'Amigos'
    style = 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
    disabled = true
  } else if (relation === 'pending_out') {
    Icon = Check
    label = 'Solicitação Enviada'
    style = 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
    disabled = true
  } else if (relation === 'pending_in') {
    Icon = UserCheck
    label = 'Convite Recebido'
    style = 'border-amber-500/40 bg-amber-500/15 text-amber-300'
    disabled = true
  }

  const ariaLabel = (() => {
    const tag = playerTag ?? 'jogador'
    switch (relation) {
      case null:
        return `Adicionar ${tag} como amigo`
      case 'friends':
        return `${tag} já é seu amigo`
      case 'pending_out':
        return `Solicitação enviada para ${tag}`
      case 'pending_in':
        return `Você recebeu convite de ${tag}`
      default:
        return label
    }
  })()

  return (
    <button
      type="button"
      onClick={() => onSend(userId)}
      disabled={disabled}
      aria-label={ariaLabel}
      title={compact ? label : undefined}
      className={`touch-manipulation active:scale-95 transition-transform p-2 ${
        compact
          ? 'grid h-8 w-8 shrink-0 place-items-center rounded-lg border'
          : 'flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border text-xs font-semibold'
      } ${style} ${disabled ? 'cursor-default disabled:opacity-90' : ''}`}
    >
      <Icon className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
      {!compact && <span>{label}</span>}
    </button>
  )
}

const PODIUM_STYLES = {
  gold: {
    medal: 'bg-amber-500/20 text-amber-300',
    ring: 'border-amber-500/60',
    label: 'Ouro',
  },
  silver: {
    medal: 'bg-slate-400/20 text-slate-300',
    ring: 'border-slate-400/40',
    label: 'Prata',
  },
  bronze: {
    medal: 'bg-orange-600/20 text-orange-400',
    ring: 'border-orange-700/50',
    label: 'Bronze',
  },
} as const

type PodiumTone = keyof typeof PODIUM_STYLES

interface PodiumCardProps {
  entry: GlobalRankingEntry
  tone: PodiumTone
  leading?: boolean
  isOwn?: boolean
  busy: boolean
  onSend: (userId: string) => void
}

function PodiumCard({ entry, tone, leading = false, isOwn = false, busy, onSend }: PodiumCardProps) {
  const style = PODIUM_STYLES[tone]
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border bg-slate-900 p-3 text-center ${
        style.ring
      } ${leading ? 'pt-6' : ''}`}
    >
      {leading ? (
        <Crown className="h-6 w-6 text-amber-400" aria-hidden="true" />
      ) : (
        <span
          className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${style.medal}`}
        >
          {entry.pos}
        </span>
      )}
      <div
        className={`grid h-14 w-14 place-items-center rounded-full bg-indigo-500 text-xl font-bold text-white ${
          leading ? 'ring-4 ring-amber-500/40' : ''
        }`}
      >
        {getInitial(entry.player_tag)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold">
          {entry.player_tag ?? 'Jogador'}
          {isOwn && (
            <span className="ml-1 text-[11px] font-medium text-indigo-400">(Você)</span>
          )}
        </p>
        <p className="mt-0.5 text-xs font-medium text-amber-300/90">{style.label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{formatMinutes(entry.minutes)}</p>
      </div>
      <FriendRequestButton
        relation={entry.relation}
        userId={entry.user_id}
        playerTag={entry.player_tag}
        busy={busy}
        isOwn={isOwn}
        compact
        onSend={onSend}
      />
    </div>
  )
}

export function LeaderboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [period, setPeriod] = useState<GlobalRankingPeriod>('week')
  const { ranking, myRank, loading, error } = useGlobalRanking(period)
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set())
  const [sentIds, setSentIds] = useState<ReadonlySet<string>>(new Set())
  const ownUserId = user?.id ?? ''

  const handleSend = useCallback(
    async (userId: string) => {
      setBusyIds((current) => new Set(current).add(userId))
      try {
        const result = await sendFriendRequest(userId)
        if (!result.success) {
          showToast(friendRequestErrorMessage(result.error), 'error')
          return
        }
        setSentIds((current) => new Set(current).add(userId))
        showToast('Solicitação de amizade enviada!', 'success')
      } catch {
        showToast('Erro inesperado ao enviar a solicitação.', 'error')
      } finally {
        setBusyIds((current) => {
          const next = new Set(current)
          next.delete(userId)
          return next
        })
      }
    },
    [showToast],
  )

  return (
    <AppShell>
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600">
          <Trophy className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">Ranking Global</h1>
          <p className="text-sm text-slate-400">Hall da fama por tempo de estudo</p>
        </div>
      </header>

      <div className="mt-5 flex gap-2" role="tablist" aria-label="Período do ranking">
        {GLOBAL_RANKING_PERIODS.map(({ value, label }) => {
          const isActive = period === value
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setPeriod(value)}
              className={`min-h-[44px] flex-1 rounded-xl border px-3 text-sm font-semibold transition ${
                isActive
                  ? 'border-indigo-500/50 bg-indigo-600/20 text-indigo-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" aria-hidden="true" />
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-red-400">{error}</p>
      ) : ranking.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Nenhum dado de estudo registrado neste período ainda.
        </p>
      ) : (
        <>
          <section aria-label="Pódio" className="mt-6 grid grid-cols-3 items-end gap-2">
            {ranking[1] && (
              <PodiumCard
                entry={ranking[1]}
                tone="silver"
                isOwn={ranking[1].user_id === ownUserId}
                busy={busyIds.has(ranking[1].user_id)}
                onSend={handleSend}
              />
            )}
            {ranking[0] && (
              <PodiumCard
                entry={ranking[0]}
                tone="gold"
                leading
                isOwn={ranking[0].user_id === ownUserId}
                busy={busyIds.has(ranking[0].user_id)}
                onSend={handleSend}
              />
            )}
            {ranking[2] && (
              <PodiumCard
                entry={ranking[2]}
                tone="bronze"
                isOwn={ranking[2].user_id === ownUserId}
                busy={busyIds.has(ranking[2].user_id)}
                onSend={handleSend}
              />
            )}
          </section>

          {ranking.length > 3 && (
            <section className="mt-6" aria-label="Classificação completa">
              <h2 className="mb-3 text-sm font-semibold text-slate-300">
                Classificação completa
              </h2>
              <ol className="space-y-2">
                {ranking.slice(3).map((entry) => {
                  const isOwn = entry.user_id === ownUserId
                  const relation = sentIds.has(entry.user_id) ? 'pending_out' : entry.relation
                  return (
                    <li
                      key={entry.user_id}
                      className={`flex items-center gap-3 rounded-xl border p-3 ${
                        isOwn
                          ? 'border-indigo-500/40 bg-indigo-500/10'
                          : 'border-slate-800 bg-slate-900'
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-slate-400">
                        {entry.pos}
                      </span>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
                        {getInitial(entry.player_tag)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {entry.player_tag ?? 'Jogador'}
                          {isOwn && (
                            <span className="ml-1.5 text-xs font-medium text-indigo-400">
                              (Você)
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-400">
                          {formatMinutes(entry.minutes)}
                        </p>
                      </div>
                      <FriendRequestButton
                        relation={relation}
                        userId={entry.user_id}
                        playerTag={entry.player_tag}
                        busy={busyIds.has(entry.user_id)}
                        isOwn={isOwn}
                        onSend={handleSend}
                      />
                    </li>
                  )
                })}
              </ol>
            </section>
          )}

          {myRank && myRank.pos > 100 && (
            <div className="sticky bottom-24 z-20 mt-6 rounded-xl border border-indigo-500/40 bg-slate-900/95 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Sua posição neste período</p>
                  <p className="mt-0.5 text-lg font-bold text-indigo-300">#{myRank.pos}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-200">
                    {formatMinutes(myRank.minutes)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">de estudo</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  )
}
