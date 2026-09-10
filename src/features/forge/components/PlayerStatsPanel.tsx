import type { CharacterStats } from '../../../utils/statsCalculator'

interface PlayerStatsPanelProps {
  stats: CharacterStats
}

const STAT_DISPLAY = [
  { key: 'attack' as const, icon: '⚔️', label: 'Ataque', color: 'text-red-400' },
  { key: 'defense' as const, icon: '🛡️', label: 'Defesa', color: 'text-blue-400' },
  { key: 'hp' as const, icon: '❤️', label: 'HP', color: 'text-green-400' },
]

export function PlayerStatsPanel({ stats }: PlayerStatsPanelProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3">
      {STAT_DISPLAY.map(({ key, icon, label, color }) => (
        <div key={key} className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">{icon}</span>
          <span className="text-xs text-slate-400">{label}</span>
          <span className={`text-sm font-bold ${color}`}>{stats[key]}</span>
        </div>
      ))}
    </div>
  )
}
