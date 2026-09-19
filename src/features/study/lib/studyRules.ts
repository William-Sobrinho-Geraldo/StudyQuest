export const MIN_STUDY_MINUTES = 5
export const MAX_STUDY_MINUTES = 90
export const STUDY_MINUTE_STEP = 5
export const XP_PER_MINUTE = 10
export const GOLD_PER_MINUTE = 2
export const XP_PER_SECOND = XP_PER_MINUTE / 60
export const GOLD_PER_SECOND = GOLD_PER_MINUTE / 60

// Registo manual de tempo esquecido: recompensa reduzida ("tudo calculado a 30%").
export const MANUAL_REWARD_MULTIPLIER = 0.3
export const MANUAL_PENALTY_PERCENT = 70
export const MIN_MANUAL_STUDY_MINUTES = 1
export const MAX_MANUAL_STUDY_MINUTES = 180

export interface Reward {
  xp: number
  gold: number
}

export function validateStudyMinutes(minutes: number): string | null {
  if (!Number.isInteger(minutes)) {
    return 'O tempo de estudo deve ser um número inteiro de minutos.'
  }
  if (minutes < MIN_STUDY_MINUTES || minutes > MAX_STUDY_MINUTES) {
    return `O tempo de estudo deve estar entre ${MIN_STUDY_MINUTES} e ${MAX_STUDY_MINUTES} minutos.`
  }
  if (minutes % STUDY_MINUTE_STEP !== 0) {
    return `O tempo de estudo deve ser um múltiplo de ${STUDY_MINUTE_STEP} minutos (${MIN_STUDY_MINUTES}, ${MIN_STUDY_MINUTES + STUDY_MINUTE_STEP}, ...).`
  }
  return null
}

export function generateStudyOptions(): number[] {
  const options: number[] = []
  for (let minutes = MIN_STUDY_MINUTES; minutes <= MAX_STUDY_MINUTES; minutes += STUDY_MINUTE_STEP) {
    options.push(minutes)
  }
  return options
}

export function calculateReward(minutes: number): Reward {
  return {
    xp: minutes * XP_PER_MINUTE,
    gold: minutes * GOLD_PER_MINUTE,
  }
}

export function validateManualStudyMinutes(minutes: number): string | null {
  if (!Number.isInteger(minutes)) {
    return 'O tempo estudado deve ser um número inteiro de minutos.'
  }
  if (minutes < MIN_MANUAL_STUDY_MINUTES || minutes > MAX_MANUAL_STUDY_MINUTES) {
    return `O tempo registado manualmente deve estar entre ${MIN_MANUAL_STUDY_MINUTES} e ${MAX_MANUAL_STUDY_MINUTES} minutos.`
  }
  return null
}

export function calculateManualReward(minutes: number): Reward {
  const base = calculateReward(minutes)
  return {
    xp: Math.floor(base.xp * MANUAL_REWARD_MULTIPLIER),
    gold: Math.floor(base.gold * MANUAL_REWARD_MULTIPLIER),
  }
}

export function calculateRewardSeconds(totalSeconds: number): Reward {
  const safe = Math.max(0, totalSeconds)
  return {
    xp: Math.round(safe * XP_PER_SECOND),
    gold: Math.round(safe * GOLD_PER_SECOND),
  }
}

export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

