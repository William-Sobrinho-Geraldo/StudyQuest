export const MIN_STUDY_MINUTES = 5
export const MAX_STUDY_MINUTES = 60
export const STUDY_MINUTE_STEP = 5
export const MAX_PAUSES = 2
export const XP_PER_MINUTE = 10
export const GOLD_PER_MINUTE = 2

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

export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}