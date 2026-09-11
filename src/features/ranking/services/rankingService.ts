import { supabase } from '../../../lib/supabase'
import type { GlobalRankingPeriod } from '../lib/periods'

export const GLOBAL_RANKING_LIMIT = 10

export interface GlobalRankingEntry {
  minutes: number
  player_tag: string | null
  pos: number
  user_id: string
}

export interface MyGlobalRank {
  minutes: number
  pos: number
}

export async function fetchGlobalRanking(
  period: GlobalRankingPeriod,
): Promise<GlobalRankingEntry[]> {
  const { data, error } = await supabase.rpc('get_global_ranking', {
    p_period: period,
    p_limit: GLOBAL_RANKING_LIMIT,
  })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchMyGlobalRank(
  period: GlobalRankingPeriod,
): Promise<MyGlobalRank | null> {
  const { data, error } = await supabase.rpc('get_my_global_rank', { p_period: period })
  if (error) throw new Error(error.message)
  return data?.[0] ?? null
}