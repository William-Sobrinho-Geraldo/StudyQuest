export const BASE_XP_FOR_NEXT_LEVEL = 100

export interface LevelingTier {
  minLevel: number
  maxLevel: number
  growth: number
}

export const LEVELING_TIERS: LevelingTier[] = [
  { minLevel: 1, maxLevel: 15, growth: 0.15 },
  { minLevel: 16, maxLevel: 25, growth: 0.12 },
  { minLevel: 26, maxLevel: 40, growth: 0.1 },
  { minLevel: 41, maxLevel: 60, growth: 0.08 },
  { minLevel: 61, maxLevel: 80, growth: 0.06 },
  { minLevel: 81, maxLevel: 100, growth: 0.04 },
  { minLevel: 101, maxLevel: Number.POSITIVE_INFINITY, growth: 0.03 },
]

export function growthRateForLevel(level: number): number {
  const safe = Math.max(1, Math.floor(level))
  const tier = LEVELING_TIERS.find((t) => safe <= t.maxLevel)!
  return tier.growth
}

export function xpForNextLevel(level: number): number {
  const safe = Math.max(1, Math.floor(level))
  if (safe === 1) return BASE_XP_FOR_NEXT_LEVEL
  let previous = BASE_XP_FOR_NEXT_LEVEL
  for (let current = 2; current <= safe; current++) {
    previous = Math.round(previous * (1 + growthRateForLevel(current)))
  }
  return previous
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