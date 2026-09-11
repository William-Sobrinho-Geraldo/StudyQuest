import { supabase } from '../../../lib/supabase'
import type { Sprint, SprintDuration } from '../../../types/sprints'

export interface SprintDraft {
  name: string
  durationType: SprintDuration
}

export interface SprintRankingEntry {
  participant_id: string
  user_id: string
  player_tag: string | null
  minutes: number
}

export async function createSprint(draft: SprintDraft): Promise<Sprint> {
  const { data, error } = await supabase.rpc('create_sprint', {
    p_name: draft.name,
    p_duration_type: draft.durationType,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function fetchSprint(sprintId: string): Promise<Sprint | null> {
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('id', sprintId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function fetchSprintParticipantCount(sprintId: string): Promise<number> {
  const { count, error } = await supabase
    .from('sprint_participants')
    .select('id', { count: 'exact', head: true })
    .eq('sprint_id', sprintId)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function fetchMyActiveSprint(
  userId: string,
): Promise<{ sprint_id: string } | null> {
  const { data, error } = await supabase
    .from('sprint_participants')
    .select('sprint_id, sprints(status)')
    .eq('user_id', userId)
    .eq('sprints.status', 'active')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? { sprint_id: data.sprint_id } : null
}

export async function fetchIsParticipant(
  sprintId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('sprint_participants')
    .select('id')
    .eq('sprint_id', sprintId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data !== null
}

export async function joinSprint(sprintId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('not_authenticated')
  const { error } = await supabase
    .from('sprint_participants')
    .insert({ sprint_id: sprintId, user_id: userData.user.id })
  if (error) throw new Error(error.message)
}

export async function fetchSprintRankings(
  sprintId: string,
): Promise<SprintRankingEntry[]> {
  const { data, error } = await supabase.rpc('get_sprint_rankings', {
    p_sprint_id: sprintId,
  })
  if (error) throw new Error(error.message)
  return data ?? []
}