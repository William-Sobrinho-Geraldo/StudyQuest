import { useEffect, useState } from 'react'
import { formatCountdown } from '../lib/forgeTimers'

export interface CountdownState {
  remainingMs: number
  formatted: string
  isDone: boolean
}

// Contador em tempo real a partir de `endsAt` (ISO timestamptz).
// Atualiza a cada segundo e marca `isDone` quando o tempo zera.
export function useCountdown(endsAt: string | null): CountdownState {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!endsAt) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [endsAt])

  const target = endsAt ? new Date(endsAt).getTime() : null
  const remainingMs = target === null ? 0 : Math.max(0, target - now)

  return {
    remainingMs,
    formatted: formatCountdown(remainingMs),
    isDone: target !== null && remainingMs <= 0,
  }
}
