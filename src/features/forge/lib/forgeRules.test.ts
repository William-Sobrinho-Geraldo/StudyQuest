import { describe, expect, it } from 'vitest'
import {
  ITEM_LEVEL_STEP,
  LEVEL_UP_RATE,
  MAX_REFINE_LEVEL,
  attemptRefine,
  canEquip,
  refineCost,
  successRate,
  usableTier,
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

describe('custo de refino escala com o item_level', () => {
  it('item nível 10 usa o custo base (fator 1)', () => {
    expect(refineCost(10, 0)).toBe(25)
    expect(refineCost(10, 5)).toBe(160)
    expect(refineCost(10, 11)).toBe(2400)
  })

  it('itens de tier maior ficam mais caros', () => {
    expect(refineCost(20, 5)).toBe(240) // 160 * 1.5
    expect(refineCost(30, 5)).toBe(320) // 160 * 2
    expect(refineCost(80, 5)).toBe(720) // 160 * 4.5
  })
})

describe('restrição de uso por nível do item', () => {
  it('personagem só usa itens com item_level <= nível atual', () => {
    expect(canEquip(10, 23)).toBe(true)
    expect(canEquip(20, 23)).toBe(true)
    expect(canEquip(30, 23)).toBe(false)
    expect(canEquip(70, 72)).toBe(true)
    expect(canEquip(80, 72)).toBe(false)
  })

  it('maior tier utilizável é o múltiplo de 10 abaixo do nível', () => {
    expect(usableTier(23)).toBe(20)
    expect(usableTier(72)).toBe(70)
    expect(usableTier(70)).toBe(70)
    expect(usableTier(80)).toBe(80)
    expect(usableTier(12)).toBe(10)
  })

  it('passo dos tiers é 10', () => {
    expect(ITEM_LEVEL_STEP).toBe(10)
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
    const outcome = attemptRefine('weapon', 10, level, BIG_GOLD, rate - 0.000_001)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return

    expect(outcome.result.success).toBe(true)
    expect(outcome.result.enhancementBefore).toBe(level)
    expect(outcome.result.enhancementAfter).toBe(level + 1)
    expect(outcome.result.cost).toBe(refineCost(10, level))
    expect(outcome.result.rate).toBe(rate)
    expect(outcome.result.itemLevel).toBe(10)
  })

  it('+4 -> +5 é seguro mesmo com rand altíssimo (100%)', () => {
    const outcome = attemptRefine('helmet', 10, 4, BIG_GOLD, 0.999_999_9)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return
    expect(outcome.result.success).toBe(true)
    expect(outcome.result.enhancementAfter).toBe(5)
  })

  it('rand = 0 sempre sucede', () => {
    const outcome = attemptRefine('boots', 10, 11, BIG_GOLD, 0)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return
    expect(outcome.result.success).toBe(true)
    expect(outcome.result.enhancementAfter).toBe(MAX_REFINE_LEVEL)
  })
})

describe('caminho de falha: regressão de nível (-1)', () => {
  const tiers = [5, 6, 7, 8, 9, 10, 11]

  it.each(tiers)('falha em +%i regride exatamente para +%i', (level) => {
    const outcome = attemptRefine('chest', 10, level, BIG_GOLD, LEVEL_UP_RATE[level])

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return

    expect(outcome.result.success).toBe(false)
    expect(outcome.result.enhancementAfter).toBe(level - 1)
    expect(outcome.result.enhancementAfter).toBe(outcome.result.enhancementBefore - 1)
  })

  it('+5 com rand alto regride para +4 e o item não quebra', () => {
    const outcome = attemptRefine('weapon', 10, 5, BIG_GOLD, 0.999)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return
    expect(outcome.result.success).toBe(false)
    expect(outcome.result.enhancementAfter).toBe(4)
    expect(outcome.result.enhancementAfter).toBeGreaterThanOrEqual(0)
  })

  it('regressão nunca cai abaixo de 0', () => {
    const outcome = attemptRefine('boots', 10, 5, BIG_GOLD, 1 - 0.000_001)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return
    expect(outcome.result.enhancementAfter).toBe(4)
  })
})

describe('bloqueio de saldo e nível máximo', () => {
  it('impede tentativa com Gold insuficiente (gold < custo)', () => {
    const outcome = attemptRefine('weapon', 10, 5, refineCost(10, 5) - 1, 0.1)

    expect(outcome).toEqual({ status: 'unavailable', reason: 'insufficient_gold' })
  })

  it('permite tentativa no limite exato do custo (gold = custo)', () => {
    const outcome = attemptRefine('weapon', 10, 5, refineCost(10, 5), 0.9)

    expect(outcome.status).toBe('refined')
    if (outcome.status !== 'refined') return
    expect(outcome.result.success).toBe(false)
    expect(outcome.result.cost).toBe(refineCost(10, 5))
  })

  it('bloqueia item no refino máximo (+12)', () => {
    const outcome = attemptRefine('weapon', 10, MAX_REFINE_LEVEL, BIG_GOLD, 0.1)

    expect(outcome).toEqual({ status: 'unavailable', reason: 'max_level' })
  })
})