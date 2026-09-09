export type EquipmentSlot = 'weapon' | 'helmet' | 'chest' | 'boots'

export const SLOTS: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots']

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Arma',
  helmet: 'Elmo',
  chest: 'Peitoral',
  boots: 'Botas',
}

export const MAX_REFINE_LEVEL = 12

// Probabilidade de sucesso da tentativa (nível atual -> nível +1).
// +0 a +4: 100% (seguro). A partir do +5 o refino passa a ter risco:
// +5->+6 80% | +6->+7 65% | +7->+8 50% | +8->+9 35% |
// +9->+10 20% | +10->+11 10% | +11->+12 5%.
export const LEVEL_UP_RATE: Record<number, number> = {
  0: 1,
  1: 1,
  2: 1,
  3: 1,
  4: 1,
  5: 0.8,
  6: 0.65,
  7: 0.5,
  8: 0.35,
  9: 0.2,
  10: 0.1,
  11: 0.05,
}

// Custo em Gold da tentativa, por nível atual do item.
export const REFINE_COST: Record<number, number> = {
  0: 25,
  1: 35,
  2: 50,
  3: 75,
  4: 100,
  5: 160,
  6: 260,
  7: 400,
  8: 650,
  9: 1000,
  10: 1600,
  11: 2400,
}

export function successRate(level: number): number {
  const clamped = Math.min(Math.max(level, 0), MAX_REFINE_LEVEL - 1)
  return LEVEL_UP_RATE[clamped]
}

export interface RefineResult {
  slot: EquipmentSlot
  success: boolean
  levelBefore: number
  levelAfter: number
  cost: number
  rate: number
}

export type RefineOutcome =
  | { status: 'refined'; result: RefineResult }
  | { status: 'unavailable'; reason: 'max_level' | 'insufficient_gold' }

// Núcleo determinístico: recebe rand (0 <= rand < 1) explicitamente, o que
// torna a matriz e a regressão 100% testáveis sem depender do estado global.
export function attemptRefine(
  slot: EquipmentSlot,
  level: number,
  gold: number,
  rand: number,
): RefineOutcome {
  if (level >= MAX_REFINE_LEVEL) {
    return { status: 'unavailable', reason: 'max_level' }
  }

  const cost = REFINE_COST[level]
  if (gold < cost) {
    return { status: 'unavailable', reason: 'insufficient_gold' }
  }

  const rate = successRate(level)
  const success = rand < rate

  const levelAfter = success
    ? Math.min(level + 1, MAX_REFINE_LEVEL)
    : Math.max(level - 1, 0)

  return {
    status: 'refined',
    result: { slot, success, levelBefore: level, levelAfter, cost, rate },
  }
}