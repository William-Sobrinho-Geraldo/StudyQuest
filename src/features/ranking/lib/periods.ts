export type GlobalRankingPeriod = 'week' | 'month' | 'year'

export interface GlobalRankingPeriodOption {
  value: GlobalRankingPeriod
  label: string
}

export const GLOBAL_RANKING_PERIODS: GlobalRankingPeriodOption[] = [
  { value: 'week', label: 'Última Semana' },
  { value: 'month', label: 'Último Mês' },
  { value: 'year', label: 'Último Ano' },
]