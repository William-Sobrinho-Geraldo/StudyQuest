export const CHEST_MAX_MINUTES = 480
export const CHEST_MAX_XP = 1000
export const CHEST_MAX_GOLD = 300

export interface IdleRewards {
  elapsedMinutes: number
  elapsedSeconds: number
  currentXp: number
  currentGold: number
  progressPercentage: number
}

export function getIdleRewards(lastChestClaim: Date | string | null): IdleRewards {
  if (!lastChestClaim) {
    return {
      elapsedMinutes: 0,
      elapsedSeconds: 0,
      currentXp: 0,
      currentGold: 0,
      progressPercentage: 0,
    }
  }

  const last = new Date(lastChestClaim).getTime()
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - last) / 1000))
  const elapsedMinutes = Math.floor(elapsedSeconds / 60)

  const cappedMinutes = Math.min(elapsedMinutes, CHEST_MAX_MINUTES)
  const fraction = cappedMinutes / CHEST_MAX_MINUTES

  return {
    elapsedMinutes,
    elapsedSeconds,
    currentXp: Math.floor(fraction * CHEST_MAX_XP),
    currentGold: Math.floor(fraction * CHEST_MAX_GOLD),
    progressPercentage: Math.min(100, Math.floor(fraction * 100)),
  }
}

export function formatElapsedTime(elapsedSeconds: number): string {
  const total = Math.max(0, Math.floor(elapsedSeconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}