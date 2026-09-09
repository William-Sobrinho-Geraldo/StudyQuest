import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  calculateLevelFromXp,
  getLevelProgress,
  growthRateForLevel,
  totalXpForLevel,
  xpForNextLevel,
  type LevelProgress,
} from './leveling'

describe('growthRateForLevel', () => {
  it('usa a taxa da faixa correspondente ao nível', () => {
    expect(growthRateForLevel(1)).toBe(0.15)
    expect(growthRateForLevel(15)).toBe(0.15)
    expect(growthRateForLevel(16)).toBe(0.12)
    expect(growthRateForLevel(25)).toBe(0.12)
    expect(growthRateForLevel(26)).toBe(0.1)
    expect(growthRateForLevel(40)).toBe(0.1)
    expect(growthRateForLevel(41)).toBe(0.08)
    expect(growthRateForLevel(60)).toBe(0.08)
    expect(growthRateForLevel(61)).toBe(0.06)
    expect(growthRateForLevel(80)).toBe(0.06)
    expect(growthRateForLevel(81)).toBe(0.04)
    expect(growthRateForLevel(100)).toBe(0.04)
    expect(growthRateForLevel(101)).toBe(0.03)
    expect(growthRateForLevel(10_000)).toBe(0.03)
  })

  it('trata níveis inválidos como faixa mínima', () => {
    expect(growthRateForLevel(0)).toBe(0.15)
    expect(growthRateForLevel(-5)).toBe(0.15)
    expect(growthRateForLevel(3.9)).toBe(0.15)
  })
})

describe('xpForNextLevel', () => {
  it('sempre exige mais XP que o nível anterior dentro da mesma faixa', () => {
    expect(xpForNextLevel(1)).toBe(100)
    expect(xpForNextLevel(2)).toBe(115)
    expect(xpForNextLevel(3)).toBe(132)
    expect(xpForNextLevel(4)).toBe(152)
    expect(xpForNextLevel(5)).toBe(175)
    expect(xpForNextLevel(10)).toBe(352)

    for (let level = 2; level <= 100; level++) {
      expect(xpForNextLevel(level)).toBeGreaterThan(xpForNextLevel(level - 1))
    }
  })

  it('aplica a taxa de crescimento correta em cada faixa', () => {
    const expected: Array<[number, number]> = [
      [15, 708],
      [16, 793],
      [25, 2200],
      [26, 2420],
      [40, 9193],
      [41, 9928],
      [60, 42845],
      [61, 45416],
      [80, 137409],
      [81, 142905],
      [100, 301081],
      [101, 310113],
    ]
    for (const [level, threshold] of expected) {
      expect(xpForNextLevel(level)).toBe(threshold)
    }
  })
})

describe('totalXpForLevel', () => {
  it('acumula o escalonamento de todos os níveis anteriores', () => {
    expect(totalXpForLevel(1)).toBe(0)
    expect(totalXpForLevel(2)).toBe(100)
    expect(totalXpForLevel(3)).toBe(215)
    expect(totalXpForLevel(4)).toBe(347)
    expect(totalXpForLevel(5)).toBe(499)
  })

  it('respeita as bordas das faixas de dificuldade', () => {
    const boundaries: Array<[number, number]> = [
      [15, 4053],
      [16, 4761],
      [25, 16481],
      [26, 18681],
      [40, 86388],
      [41, 95581],
      [60, 507035],
      [61, 549880],
      [80, 2083106],
      [81, 2220515],
      [100, 6174884],
    ]
    for (const [level, total] of boundaries) {
      expect(totalXpForLevel(level)).toBe(total)
    }
  })
})

describe('calculateLevelFromXp', () => {
  it('retorna nível 1 com 0 XP e com XP abaixo do primeiro limite', () => {
    expect(calculateLevelFromXp(0)).toBe(1)
    expect(calculateLevelFromXp(99)).toBe(1)
  })

  it('sobe de nível exatamente na borda do acumulado', () => {
    expect(calculateLevelFromXp(100)).toBe(2)
    expect(calculateLevelFromXp(114)).toBe(2)
    expect(calculateLevelFromXp(215)).toBe(3)
    expect(calculateLevelFromXp(347)).toBe(4)
    expect(calculateLevelFromXp(903)).toBe(7)
  })

  it('cada faixa começa apenas após o XP acumulado da faixa anterior', () => {
    expect(calculateLevelFromXp(4052)).toBe(14)
    expect(calculateLevelFromXp(4053)).toBe(15)
    expect(calculateLevelFromXp(4761)).toBe(16)
    expect(calculateLevelFromXp(16481)).toBe(25)
    expect(calculateLevelFromXp(18681)).toBe(26)
    expect(calculateLevelFromXp(95581)).toBe(41)
    expect(calculateLevelFromXp(2220515)).toBe(81)
    expect(calculateLevelFromXp(6174884)).toBe(100)
  })

  it('eleva múltiplos níveis em saltos massivos de XP', () => {
    expect(calculateLevelFromXp(10_000)).toBe(21)
    expect(calculateLevelFromXp(100_000)).toBe(41)
    expect(calculateLevelFromXp(1_000_000)).toBe(69)

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
    expect(getLevelProgress(300)).toEqual({
      level: 3,
      xpIntoLevel: 85,
      xpForNextLevel: 132,
      progress: 85 / 132,
    })
  })

  it('reconhece a borda exata do nível como marco (0% de progresso)', () => {
    expect(getLevelProgress(215)).toEqual({
      level: 3,
      xpIntoLevel: 0,
      xpForNextLevel: 132,
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