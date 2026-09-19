import type { MotivationalQuote } from '../services/quoteService'

const STORAGE_PREFIX = 'studyquest:daily_quote:v1'

export function getTodayLocalKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getStorageKey(userId: string, dateKey: string): string {
  return `${STORAGE_PREFIX}:${userId}:${dateKey}`
}

export function getCachedDailyQuote(userId: string): MotivationalQuote | null {
  const key = getStorageKey(userId, getTodayLocalKey())
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { quote: MotivationalQuote } | null
    if (
      !parsed ||
      typeof parsed.quote?.content !== 'string' ||
      typeof parsed.quote?.author !== 'string'
    ) {
      return null
    }
    return parsed.quote
  } catch {
    return null
  }
}

export function saveCachedDailyQuote(userId: string, quote: MotivationalQuote): void {
  const todayKey = getTodayLocalKey()
  try {
    window.localStorage.setItem(
      getStorageKey(userId, todayKey),
      JSON.stringify({ quote }),
    )
    const staleKeys: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key && key.startsWith(`${STORAGE_PREFIX}:${userId}:`) && key !== getStorageKey(userId, todayKey)) {
        staleKeys.push(key)
      }
    }
    for (const key of staleKeys) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // localStorage indisponível: o cache é apenas uma otimização.
  }
}

export function clearCachedDailyQuote(userId: string): void {
  try {
    const keys: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key && key.startsWith(`${STORAGE_PREFIX}:${userId}:`)) {
        keys.push(key)
      }
    }
    for (const key of keys) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // localStorage indisponível: o cache é apenas uma otimização.
  }
}