import { supabase } from '../../../lib/supabase'

export interface StudySessionSummary {
  durationMinutes: number
  xp: number
  gold: number
}

export interface StudySessionRecord {
  user_id: string
  duration_minutes: number
  xp: number
  gold: number
  started_at: string
  completed_at: string
}

const STUDY_SESSIONS_TABLE = 'study_sessions'

export async function saveStudySession(
  summary: StudySessionSummary,
): Promise<StudySessionRecord> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error('Usuário não autenticado')
  }

  const record: StudySessionRecord = {
    user_id: userData.user.id,
    duration_minutes: summary.durationMinutes,
    xp: summary.xp,
    gold: summary.gold,
    started_at: new Date(
      Date.now() - summary.durationMinutes * 60_000,
    ).toISOString(),
    completed_at: new Date().toISOString(),
  }

  const { error } = await supabase.from(STUDY_SESSIONS_TABLE).insert([record])

  if (error) {
    throw new Error(error.message)
  }

  return record
}