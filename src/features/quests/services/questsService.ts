import { supabase } from '../../../lib/supabase'
import type { QuestChestTier } from '../lib/chestTiers'

export type QuestCategoryId = 'daily' | 'weekly' | 'main'

export interface QuestProgressRow {
  id: string
  category: QuestCategoryId
  trail: string | null
  title: string
  description: string
  metric: string
  period: 'day' | 'week' | 'all'
  target: number
  reward_xp: number
  reward_gold: number
  reward_chest_tier?: QuestChestTier | null
  enabled: boolean
  current_value: number
  completed: boolean
  claimed: boolean
}

export async function syncUserQuests(): Promise<void> {
  const { error } = await supabase.rpc('sync_user_quests')

  if (error) {
    console.error('Falha ao sincronizar reset das quests:', error.message)
  }
}

export async function fetchQuestProgress(): Promise<QuestProgressRow[]> {
  await syncUserQuests()

  const { data, error } = await supabase.rpc('quest_progress')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as QuestProgressRow[]
}

export async function claimQuest(questId: string): Promise<void> {
  const { error } = await supabase.rpc('claim_quest', { p_quest_id: questId })

  if (error) {
    throw new Error(error.message)
  }
}