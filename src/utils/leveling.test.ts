import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  calculateLevelFromXp,
  getLevelProgress,
  totalXpForLevel,
  xpForNextLevel,
  type LevelProgress,
} from './leveling'

describe('xpForNextLevel', () => {
  it('segue a fórmula 100 * (nível ^ 1.5) arredondada', () => {
    expect(xpForNextLevel(1)).toBe(100)
    expect(xpForNextLevel(2)).toBe(283)
    expect(xpForNextLevel(3)).toBe(520)
    expect(xpForNextLevel(4)).toBe(800)
    expect(xpForNextLevel(5)).toBe(1118)
  })
})

describe('totalXpForLevel', () => {
  it('acumula o escalonamento de todos os níveis anteriores', () => {
    expect(totalXpForLevel(1)).toBe(0)
    expect(totalXpForLevel(2)).toBe(100)
    expect(totalXpForLevel(3)).toBe(383)
    expect(totalXpForLevel(4)).toBe(903)
    expect(totalXpForLevel(5)).toBe(1703)
    expect(totalXpForLevel(6)).toBe(2821)
  })
})

describe('calculateLevelFromXp', () => {
  it('retorna nível 1 com 0 XP e com XP abaixo do primeiro limite', () => {
    expect(calculateLevelFromXp(0)).toBe(1)
    expect(calculateLevelFromXp(99)).toBe(1)
  })

  it('sobe de nível exatamente na borda do acumulado', () => {
    expect(calculateLevelFromXp(100)).toBe(2)
    expect(calculateLevelFromXp(382)).toBe(2)
    expect(calculateLevelFromXp(383)).toBe(3)
    expect(calculateLevelFromXp(903)).toBe(4)
    expect(calculateLevelFromXp(2821)).toBe(6)
    expect(calculateLevelFromXp(2820)).toBe(5)
  })

  it('eleva múltiplos níveis em saltos massivos de XP', () => {
    expect(calculateLevelFromXp(1_000_000)).toBe(57)
    const huge = 57
    expect(huge).toBeGreaterThan(50)
    const base = calculateLevelFromXp(1000)
    expect(huge).toBeGreaterThan(base * 5)

    for (const xp of [10_000, 100_000, 1_000_000, 10_000_000]) {
      const level = calculateLevelFromXp(xp)
      expect(totalXpForLevel(level)).toBeLessThanOrEqual(xp)
      expect(totalXpForLevel(level + 1)).toBeGreaterThan(xp)
    }
  })

  it('mantém consistência nível x acumulado em um sweep completo', () => {
    for (let xp = 0; xp <= 5_000; xp += 1) {
      const level = calculateLevelFromXp(xp)
      expect(totalXpForLevel(level)).toBeLessThanOrEqual(xp)
      expect(xp).toBeLessThan(totalXpForLevel(level + 1))
    }
  })
})

describe('getLevelProgress', () => {
  it('retorna a estrutura tipada esperada', () => {
    const progress: LevelProgress = getLevelProgress(0)
    expectTypeOf(progress).toEqualTypeOf<{
      level: number
      xpIntoLevel: number
      xpForNextLevel: number
      progress: number
    }>()
  })

  it('posição inicial: 0 XP = nível 1, barra vazia', () => {
    expect(getLevelProgress(0)).toEqual({
      level: 1,
      xpIntoLevel: 0,
      xpForNextLevel: 100,
      progress: 0,
    })
  })

  it('progresso proporcional dentro do nível atual', () => {
    expect(getLevelProgress(50)).toEqual({
      level: 1,
      xpIntoLevel: 50,
      xpForNextLevel: 100,
      progress: 0.5,
    })
    expect(getLevelProgress(150)).toEqual({
      level: 2,
      xpIntoLevel: 50,
      xpForNextLevel: 283,
      progress: 50 / 283,
    })
  })

  it('reconhece a borda exata do nível como marco (0% de progresso)', () => {
    expect(getLevelProgress(383)).toEqual({
      level: 3,
      xpIntoLevel: 0,
      xpForNextLevel: 520,
      progress: 0,
    })
  })

  it('nunca ultrapassa 100% nem aceita XP negativo', () => {
    const { progress } = getLevelProgress(-500)
    expect(progress).toBe(0)

    for (let xp = 0; xp <= 10_000; xp += 1) {
      const p = getLevelProgress(xp)
      expect(p.progress).toBeGreaterThanOrEqual(0)
      expect(p.progress).toBeLessThan(1)
      expect(p.xpIntoLevel).toBe(xp - totalXpForLevel(p.level))
    }
  })
})