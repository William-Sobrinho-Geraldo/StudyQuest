import { supabase } from '../../../lib/supabase'
import type { GlobalRankingPeriod } from '../lib/periods'

export const GLOBAL_RANKING_LIMIT = 10

export type RankingRelation = 'self' | 'friends' | 'pending_out' | 'pending_in' | null

export type PublicProfileRelation =
  | 'self'
  | 'none'
  | 'pending_out'
  | 'pending_in'
  | 'accepted'

export interface EquippedItemSummary {
  item_category: string
  item_level: number
  enhancement_level: number
  rarity: string | null
}

export interface PublicProfile {
  id: string
  display_name: string | null
  player_tag: string | null
  avatar_id: string | null
  study_goal: string | null
  bio: string | null
  level: number
  current_xp: number
  current_streak: number
  honor_points: number
  duels_won: number
  duels_lost: number
  total_minutes: number
  session_count: number
  relation: PublicProfileRelation
  equipped: EquippedItemSummary[]
}

export interface GlobalRankingEntry {
  minutes: number
  player_tag: string | null
  avatar_id: string | null
  pos: number
  relation: RankingRelation
  user_id: string
}

export function friendRequestErrorMessage(code?: string): string {
  switch (code) {
    case 'already_friends_or_pending':
      return 'Vocês já são amigos ou já existe uma solicitação pendente.'
    case 'cannot_add_self':
      return 'Você não pode adicionar a si mesmo.'
    case 'player_not_found':
      return 'Jogador não encontrado.'
    default:
      return 'Não foi possível enviar a solicitação. Tente novamente.'
  }
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
    avatar_id: typeof entry.avatar_id === 'string' ? entry.avatar_id : null,
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

function normalizePublicRelation(value: unknown): PublicProfileRelation {
  if (
    value === 'self' ||
    value === 'none' ||
    value === 'pending_out' ||
    value === 'pending_in' ||
    value === 'accepted'
  ) {
    return value
  }
  return 'none'
}

export async function fetchPublicProfile(targetUserId: string): Promise<PublicProfile> {
  const { data, error } = await supabase.rpc('get_public_profile', {
    p_target_user_id: targetUserId,
  })
  if (error) throw new Error(error.message)

  const raw = data as Record<string, unknown> | null
  if (!raw) throw new Error('Perfil não encontrado.')

  const equipped = Array.isArray(raw.equipped)
    ? (raw.equipped as EquippedItemSummary[])
    : []

  return {
    id: typeof raw.id === 'string' ? raw.id : targetUserId,
    display_name: typeof raw.display_name === 'string' ? raw.display_name : null,
    player_tag: typeof raw.player_tag === 'string' ? raw.player_tag : null,
    avatar_id: typeof raw.avatar_id === 'string' ? raw.avatar_id : null,
    study_goal: typeof raw.study_goal === 'string' ? raw.study_goal : null,
    bio: typeof raw.bio === 'string' ? raw.bio : null,
    level: typeof raw.level === 'number' ? raw.level : 1,
    current_xp: typeof raw.current_xp === 'number' ? raw.current_xp : 0,
    current_streak: typeof raw.current_streak === 'number' ? raw.current_streak : 0,
    honor_points: typeof raw.honor_points === 'number' ? raw.honor_points : 0,
    duels_won: typeof raw.duels_won === 'number' ? raw.duels_won : 0,
    duels_lost: typeof raw.duels_lost === 'number' ? raw.duels_lost : 0,
    total_minutes: typeof raw.total_minutes === 'number' ? raw.total_minutes : 0,
    session_count: typeof raw.session_count === 'number' ? raw.session_count : 0,
    relation: normalizePublicRelation(raw.relation),
    equipped,
  }
}