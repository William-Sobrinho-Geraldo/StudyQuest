import { supabase } from '../../../lib/supabase'
import type { GlobalRankingPeriod } from '../lib/periods'

export const GLOBAL_RANKING_LIMIT = 10

export type RankingRelation = 'self' | 'friends' | 'pending_out' | 'pending_in' | null

export interface GlobalRankingEntry {
  minutes: number
  player_tag: string | null
  pos: number
  relation: RankingRelation
  user_id: string
}

export interface SendFriendRequestResult {
  success: boolean
  error?: string
}

export interface MyGlobalRank {
  minutes: number
  pos: number
}

const RANKING_RELATIONS: readonly string[] = ['self', 'friends', 'pending_out', 'pending_in']

function normalizeRelation(value: string | null | undefined): RankingRelation {
  if (value && RANKING_RELATIONS.includes(value)) {
    return value as RankingRelation
  }
  return null
}

export async function fetchGlobalRanking(
  period: GlobalRankingPeriod,
): Promise<GlobalRankingEntry[]> {
  const { data, error } = await supabase.rpc('get_global_ranking', {
    p_period: period,
    p_limit: GLOBAL_RANKING_LIMIT,
  })
  if (error) throw new Error(error.message)
  return (data ?? []).map((entry) => ({
    ...entry,
    relation: normalizeRelation(entry.relation),
  }))
}

export async function fetchMyGlobalRank(
  period: GlobalRankingPeriod,
): Promise<MyGlobalRank | null> {
  const { data, error } = await supabase.rpc('get_my_global_rank', { p_period: period })
  if (error) throw new Error(error.message)
  return data?.[0] ?? null
}

export async function sendFriendRequest(
  targetUserId: string,
): Promise<SendFriendRequestResult> {
  const { data, error } = await supabase.rpc('send_invite_by_user', {
    p_target_user_id: targetUserId,
  })
  if (error) return { success: false, error: error.message }
  const result = data as Record<string, unknown> | null
  if (result?.error) return { success: false, error: result.error as string }
  return { success: true }
}