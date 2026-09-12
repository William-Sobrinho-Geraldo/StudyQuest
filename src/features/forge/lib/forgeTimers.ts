// Tempos do refino temporizado da Bigorna (espelham a RPC
// start_forge_refinement). Mantidos em sincronia com as migrations
// 20260912040000_add_forge_timers.sql e
// 20260912070000_update_forge_timer_curve.sql.

// Duração total por nível de refino ATUAL do item (em segundos).
//   +0 -> +1 : 5 min
//   +1 -> +2 : 30 min
//   +2 -> +3 : 2 horas
//   +3 -> +4 : 6 horas
//   +4 -> +5 : 12 horas
//   +5 em diante : 24 horas
const FORGE_DURATION_SECONDS: Record<number, number> = {
  0: 5 * 60,
  1: 30 * 60,
  2: 2 * 60 * 60,
  3: 6 * 60 * 60,
  4: 12 * 60 * 60,
}

const MAX_DURATION_SECONDS = 24 * 60 * 60

export function forgeDurationSeconds(enhancementLevel: number): number {
  return FORGE_DURATION_SECONDS[enhancementLevel] ?? MAX_DURATION_SECONDS
}

// Formata o tempo restante (ms) como "03h 45m 12s".
// Usa Math.ceil para nunca exibir "00h 00m 00s" antes de zerar de fato:
// frações de segundo arredondam para "01s", e a transição para o estado
// "Coletar Item" acontece quando remainingMs chega a 0 (nunca negativo).
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

// Formata uma duração total (segundos) para prévia da Bigorna,
// ex. "5 min", "30 min", "2h", "12h", "24h".
export function formatDurationPreview(seconds: number): string {
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  return `${Math.floor(seconds / 3600)}h`
}
