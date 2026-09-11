export type SprintDuration = '1_week' | '2_weeks' | '1_month'
export type SprintStatus = 'active' | 'finished'

export interface Sprint {
  id: string
  name: string
  duration_type: string
  start_date: string
  end_date: string
  created_by: string
  max_participants: number
  status: string
}

export interface SprintParticipant {
  id: string
  sprint_id: string
  user_id: string
  joined_at: string
}