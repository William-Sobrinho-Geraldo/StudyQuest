export type EquipmentSlot = 'weapon' | 'helmet' | 'chest' | 'boots'

export const SLOTS: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots']

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Arma',
  helmet: 'Elmo',
  chest: 'Peitoral',
  boots: 'Botas',
}

// Nível máximo de encantamento/refino (enhancement_level).
export const MAX_REFINE_LEVEL = 12

// Passo dos níveis de item (item_level): múltiplos de 10.
export const ITEM_LEVEL_STEP = 10

// Probabilidade de sucesso da tentativa (enhancement atual -> +1).
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

// Custo base em Gold por nível de refino (antes do fator do item).
// O custo real escala com o item_level (ver refineCost).
const BASE_REFINE_COST: Record<number, number> = {
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

// Custo de uma tentativa de refino: base por nível * fator do tier do item.
// Fator = 1 + (item_level/10 - 1) * 0.5, redondo. Ex.: item Nível 10 -> x1,
// Nível 20 -> x1.5, Nível 30 -> x2, Nível 80 -> x4.5.
export function refineCost(itemLevel: number, enhancementLevel: number): number {
  const base = BASE_REFINE_COST[enhancementLevel] ?? 0
  const tierFactor = 1 + (itemLevel / ITEM_LEVEL_STEP - 1) * 0.5
  return Math.max(0, Math.round(base * tierFactor))
}

// Chance de sucesso (0..1) para o enhancement atual.
export function successRate(enhancementLevel: number): number {
  const clamped = Math.min(Math.max(enhancementLevel, 0), MAX_REFINE_LEVEL - 1)
  return LEVEL_UP_RATE[clamped]
}

export interface RefineResult {
  slot: EquipmentSlot
  itemLevel: number
  success: boolean
  enhancementBefore: number
  enhancementAfter: number
  cost: number
  rate: number
}

export type RefineOutcome =
  | { status: 'refined'; result: RefineResult }
  | { status: 'unavailable'; reason: 'max_level' | 'insufficient_gold' }

// Núcleo determinístico: recebe rand (0 <= rand < 1) explicitamente, o que
// torna a matriz e a regressão 100% testáveis sem depender do estado global.
// O rolamento é feito no cliente para feedback imediato, mas o resultado é
// validado/persistido no banco pela RPC refine_item.
export function attemptRefine(
  slot: EquipmentSlot,
  itemLevel: number,
  enhancementLevel: number,
  gold: number,
  rand: number,
): RefineOutcome {
  if (enhancementLevel >= MAX_REFINE_LEVEL) {
    return { status: 'unavailable', reason: 'max_level' }
  }

  const cost = refineCost(itemLevel, enhancementLevel)
  if (gold < cost) {
    return { status: 'unavailable', reason: 'insufficient_gold' }
  }

  const rate = successRate(enhancementLevel)
  const success = rand < rate

  const enhancementAfter = success
    ? Math.min(enhancementLevel + 1, MAX_REFINE_LEVEL)
    : Math.max(enhancementLevel - 1, 0)

  return {
    status: 'refined',
    result: {
      slot,
      itemLevel,
      success,
      enhancementBefore: enhancementLevel,
      enhancementAfter,
      cost,
      rate,
    },
  }
}

// Regra de uso: o personagem só pode equipar/usar itens cujo item_level seja
// menor ou igual ao nível atual dele.
export function canEquip(itemLevel: number, characterLevel: number): boolean {
  return itemLevel <= characterLevel
}

// Maior tier (múltiplo de 10) que um personagem no nível dado consegue equipar.
// Ex.: nível 23 -> 20; nível 70 -> 70; nível 72 -> 70.
export function usableTier(characterLevel: number): number {
  return Math.floor(characterLevel / ITEM_LEVEL_STEP) * ITEM_LEVEL_STEP
}