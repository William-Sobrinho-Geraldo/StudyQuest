export interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

export function getTimeRemaining(targetIso: string, now: number = Date.now()): TimeRemaining {
  const total = Math.max(0, new Date(targetIso).getTime() - now)
  const seconds = Math.floor(total / 1000)
  return {
    total,
    days: Math.floor(seconds / 86_400),
    hours: Math.floor(seconds / 3_600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
  }
}

export function formatCountdown(targetIso: string, now: number = Date.now()): string {
  const { days, hours, minutes, seconds, total } = getTimeRemaining(targetIso, now)
  if (total <= 0) return 'Encerrada'
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}