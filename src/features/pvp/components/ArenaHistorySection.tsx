import { Shield, Star, Swords } from 'lucide-react'
import { getWinRate } from '../lib/duelStats'

interface ArenaHistorySectionProps {
  honorPoints: number
  duelsWon: number
  duelsLost: number
}

// Grade de métricas do "Histórico de Arena": honra, vitórias e taxa de vitórias.
export function ArenaHistorySection({
  honorPoints,
  duelsWon,
  duelsLost,
}: ArenaHistorySectionProps) {
  const winRate = getWinRate(duelsWon, duelsLost)

  return (
    <div className="grid grid-cols-3 gap-2.5">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <Star className="h-5 w-5 text-amber-400" aria-hidden="true" />
        <p className="mt-1 text-xs text-slate-400">Honra</p>
        <p data-testid="arena-honor" className="mt-0.5 text-base font-bold text-white">
          {honorPoints}
        </p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <Swords className="h-5 w-5 text-rose-400" aria-hidden="true" />
        <p className="mt-1 text-xs text-slate-400">Vitórias</p>
        <p data-testid="arena-wins" className="mt-0.5 text-base font-bold text-white">
          {duelsWon}
        </p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <Shield className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        <p className="mt-1 text-xs text-slate-400">Vitórias %</p>
        <p data-testid="arena-winrate" className="mt-0.5 text-base font-bold text-white">
          {winRate}%
        </p>
      </div>
    </div>
  )
}
