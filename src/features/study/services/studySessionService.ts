import { supabase } from '../../../lib/supabase'
import { GOLD_PER_MINUTE, XP_PER_MINUTE } from '../lib/studyRules'

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

  const durationMinutes = Number.isFinite(summary.durationMinutes)
    ? Math.max(1, Math.round(summary.durationMinutes))
    : 1

  const xp = Number.isFinite(summary.xp)
    ? Math.max(0, Math.round(summary.xp))
    : durationMinutes * XP_PER_MINUTE
  const gold = Number.isFinite(summary.gold)
    ? Math.max(0, Math.round(summary.gold))
    : durationMinutes * GOLD_PER_MINUTE

  const record: StudySessionRecord = {
    user_id: userData.user.id,
    duration_minutes: durationMinutes,
    xp,
    gold,
    started_at: new Date(Date.now() - durationMinutes * 60_000).toISOString(),
    completed_at: new Date().toISOString(),
  }

  const { error } = await supabase.from(STUDY_SESSIONS_TABLE).insert([record])

  if (error) {
    throw new Error(error.message)
  }

  return record
}