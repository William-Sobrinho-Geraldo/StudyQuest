import { supabase } from '../../../lib/supabase'

export type StudyHistoryPeriod = 'day' | 'week' | 'month'

export interface StudyHistoryBucket {
  bucket_date: string
  hour: number
  minutes: number
  sessions: number
}

export interface SessionHistoryItem {
  id: string
  started_at: string
  duration_minutes: number
  xp: number
  gold: number
}

const PERIODS: StudyHistoryPeriod[] = ['day', 'week', 'month']

export function isStudyHistoryPeriod(value: string): value is StudyHistoryPeriod {
  return (PERIODS as string[]).includes(value)
}

export async function fetchStudyHistory(
  period: StudyHistoryPeriod,
  anchor: string,
): Promise<StudyHistoryBucket[]> {
  const { data, error } = await supabase.rpc('study_history', {
    p_period: period,
    p_anchor: anchor,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function fetchStudySessions(
  period: StudyHistoryPeriod,
  anchor: string,
): Promise<SessionHistoryItem[]> {
  const { data, error } = await supabase.rpc('study_sessions_in_range', {
    p_period: period,
    p_anchor: anchor,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}