export function xpForNextLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5))
}

export function totalXpForLevel(level: number): number {
  let total = 0
  for (let current = 1; current < level; current++) {
    total += xpForNextLevel(current)
  }
  return total
}

export function calculateLevelFromXp(xp: number): number {
  let currentLevel = 1
  let remaining = Math.max(0, Math.floor(xp))
  while (remaining >= xpForNextLevel(currentLevel)) {
    remaining -= xpForNextLevel(currentLevel)
    currentLevel += 1
  }
  return currentLevel
}

export interface LevelProgress {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  progress: number
}

export function getLevelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(xp))
  const level = calculateLevelFromXp(safeXp)
  const xpIntoLevel = safeXp - totalXpForLevel(level)
  const nextLevelXp = xpForNextLevel(level)
  const progress = Math.max(0, Math.min(1, xpIntoLevel / nextLevelXp))
  return { level, xpIntoLevel, xpForNextLevel: nextLevelXp, progress }
}