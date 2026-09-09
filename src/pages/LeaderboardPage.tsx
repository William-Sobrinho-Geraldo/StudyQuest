import { CheckCircle2, Trophy } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { REWARD_COLORS } from '../lib/rewardColors'

const LEADERBOARD = [
  { position: 1, name: 'Mestre Alquimista', score: 2450 },
  { position: 2, name: 'Nina Torres', score: 2130 },
  { position: 3, name: 'Leo Martins', score: 1980 },
  { position: 4, name: 'Você', score: 1240 },
]

export function LeaderboardPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <p className="mt-1 text-sm text-slate-400">Os jogadores mais dedicados da semana.</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        {LEADERBOARD.map(({ position, name, score }) => (
          <div
            key={position}
            className="flex items-center justify-between border-b border-slate-800 px-5 py-4 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-indigo-300">
                {position}
              </span>
              <span className="font-medium">{name}</span>
              {position === 4 && (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              )}
            </div>
            <span className={`font-mono text-sm ${REWARD_COLORS.xp}`}>{score} XP</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
        <Trophy className="h-4 w-4 text-amber-400" aria-hidden="true" />
        Complete quests para subir no ranking.
      </div>
    </AppShell>
  )
}