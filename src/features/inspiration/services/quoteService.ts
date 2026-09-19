import { supabase } from '../../../lib/supabase'
import { ALL_QUOTE_CATEGORIES } from '../lib/quoteCategories'

export interface MotivationalQuote {
  id: string
  content: string
  author: string
  category: string
}

export async function fetchDailyQuote(categories: readonly string[]): Promise<MotivationalQuote | null> {
  // O RPC nunca deve receber um array vazio: quando o usuário não
  // definiu preferências, injeta o catálogo padrão de categorias.
  const payload =
    categories.length > 0 ? [...categories] : [...ALL_QUOTE_CATEGORIES]

  const { data, error } = await supabase.rpc('get_random_quote_by_category', {
    p_categories: payload,
  })
  if (error) {
    throw error
  }
  return data?.[0] ?? null
}

export async function updateQuotePreferences(
  userId: string,
  categories: readonly string[],
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ quote_preferences: [...categories] })
    .eq('id', userId)
  if (error) {
    throw error
  }
}