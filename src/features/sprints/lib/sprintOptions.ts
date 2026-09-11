import type { SprintDuration } from '../../../types/sprints'

export interface SprintDurationOption {
  value: SprintDuration
  label: string
  hint: string
}

export const SPRINT_DURATION_OPTIONS: SprintDurationOption[] = [
  { value: '1_week', label: '1 Semana', hint: '7 dias' },
  { value: '2_weeks', label: '2 Semanas', hint: '14 dias' },
  { value: '1_month', label: '1 Mês', hint: '30 dias' },
]

export const DEFAULT_MAX_PARTICIPANTS = 10

export function getDurationLabel(value: string): string {
  return SPRINT_DURATION_OPTIONS.find((option) => option.value === value)?.label ?? value
}