export interface DuelTitle {
  label: string
  className: string
}

// Título cosmético de PvP derivado do número de vitórias em duelos.
export function getDuelTitle(wins: number): DuelTitle {
  if (wins >= 50) return { label: 'Lenda da Arena', className: 'text-amber-400' }
  if (wins >= 20) return { label: 'Gladiador do Foco', className: 'text-purple-400' }
  if (wins >= 5) return { label: 'Desafiante', className: 'text-blue-400' }
  return { label: 'Iniciante', className: 'text-slate-400' }
}

// Taxa de vitórias (0-100), arredondada. Retorna 0 quando não há duelos.
export function getWinRate(wins: number, losses: number): number {
  const total = wins + losses
  if (total <= 0) return 0
  return Math.round((wins / total) * 100)
}
