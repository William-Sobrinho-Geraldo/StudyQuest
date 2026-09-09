import { describe, expect, it } from 'vitest'
import {
  LEVEL_UP_RATE,
  MAX_REFINE_LEVEL,
  REFINE_COST,
  attemptRefine,
  successRate,
} from './forgeRules'

const BIG_GOLD = 100_000

describe('matriz de probabilidades (successRate)', () => {
  it('+0 a +5 é 100% de sucesso', () => {
    for (const level of [0, 1, 2, 3, 4]) {
      expect(successRate(level)).toBe(1)
    }
  })

  it('tiers de risco da matriz são exatos', () => {
    const matrix: Array<[number, number]> = [
      [5, 0.8],
      [6, 0.65],
      [7, 0.5],
      [8, 0.35],
      [9, 0.2],
      [10, 0.1],
      [11, 0.05],
    ]
    for (const [level, rate] of matrix) {
      expect(successRate(level)).toBe(rate)
    }
  })
})

describe('caminho feliz: rand dentro da taxa de sucesso de cada tier', () => {
  const tiers: Array<[number, number]> = [
    [5, 0.8],
    [6, 0.65],
    [7, 0.5],
    [8, 0.35],
    [9, 0.2],
    [10, 0.1],
    [11, 0.05],
  ]

  it.each(tiers)('+%i -> +%i sucede com rand = taxa - epsilon (rate %f)', (level, rate) => {
    const outcome = attemptRefine('weapon', level, BIG_GOLD, rate - 0.000_001)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return

    expect(outcome.result.success).toBe(true)
    expect(outcome.result.levelBefore).toBe(level)
    expect(outcome.result.levelAfter).toBe(level + 1)
    expect(outcome.result.cost).toBe(REFINE_COST[level])
    expect(outcome.result.rate).toBe(rate)
  })

  it('+4 -> +5 é seguro mesmo com rand altíssimo (100%)', () => {
    const outcome = attemptRefine('helmet', 4, BIG_GOLD, 0.999_999_9)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return
    expect(outcome.result.success).toBe(true)
    expect(outcome.result.levelAfter).toBe(5)
  })

  it('rand = 0 sempre sucede', () => {
    const outcome = attemptRefine('boots', 11, BIG_GOLD, 0)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return
    expect(outcome.result.success).toBe(true)
    expect(outcome.result.levelAfter).toBe(MAX_REFINE_LEVEL)
  })
})

describe('caminho de falha: regressão de nível (-1)', () => {
  const tiers = [5, 6, 7, 8, 9, 10, 11]

  it.each(tiers)('falha em +%i regride exatamente para +%i', (level) => {
    const outcome = attemptRefine('chest', level, BIG_GOLD, LEVEL_UP_RATE[level])

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return

    expect(outcome.result.success).toBe(false)
    expect(outcome.result.levelAfter).toBe(level - 1)
    expect(outcome.result.levelAfter).toBe(outcome.result.levelBefore - 1)
  })

  it('+5 com rand alto regride para +4 e o item não quebra', () => {
    const outcome = attemptRefine('weapon', 5, BIG_GOLD, 0.999)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return
    expect(outcome.result.success).toBe(false)
    expect(outcome.result.levelAfter).toBe(4)
    expect(outcome.result.levelAfter).toBeGreaterThanOrEqual(0)
  })

  it('regressão nunca cai abaixo de 0', () => {
    const outcome = attemptRefine('boots', 5, BIG_GOLD, 1 - 0.000_001)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return
    expect(outcome.result.levelAfter).toBe(4)
  })
})

describe('bloqueio de saldo e nível máximo', () => {
  it('impede tentativa com Gold insuficiente (gold < custo)', () => {
    const outcome = attemptRefine('weapon', 5, REFINE_COST[5] - 1, 0.1)

    expect(outcome).toEqual({ status: 'unavailable', reason: 'insufficient_gold' })
  })

  it('permite tentativa no limite exato do custo (gold = custo)', () => {
    const outcome = attemptRefine('weapon', 5, REFINE_COST[5], 0.9)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return
    expect(outcome.result.success).toBe(false)
    expect(outcome.result.cost).toBe(REFINE_COST[5])
  })

  it('bloqueia item no refino máximo (+12)', () => {
    const outcome = attemptRefine('weapon', MAX_REFINE_LEVEL, BIG_GOLD, 0.1)

    expect(outcome).toEqual({ status: 'unavailable', reason: 'max_level' })
  })
})