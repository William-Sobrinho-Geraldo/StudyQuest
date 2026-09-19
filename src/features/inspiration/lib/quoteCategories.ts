export interface QuoteCategory {
  id: string
  label: string
}

export const QUOTE_CATEGORIES: readonly QuoteCategory[] = [
  { id: 'Militar', label: 'Militares' },
  { id: 'Científica', label: 'Científicas' },
  { id: 'Religiosa', label: 'Religiosas' },
  { id: 'Filosófica', label: 'Filosóficas' },
  { id: 'Produtividade', label: 'Produtividade' },
] as const

export const ALL_QUOTE_CATEGORIES: readonly string[] = QUOTE_CATEGORIES.map(
  (category) => category.id,
)

export function getQuoteCategoryLabel(categoryId: string): string {
  return QUOTE_CATEGORIES.find((category) => category.id === categoryId)?.label ?? categoryId
}