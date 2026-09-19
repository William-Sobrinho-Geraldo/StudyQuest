import { supabase } from '../../../lib/supabase'
import {
  GOLD_PER_MINUTE,
  XP_PER_MINUTE,
  calculateManualReward,
  calculateReward,
  validateManualStudyMinutes,
} from '../lib/studyRules'

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
  is_manual?: boolean
}

export interface ManualStudySessionResult {
  durationMinutes: number
  baseXp: number
  baseGold: number
  xp: number
  gold: number
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

export async function saveManualStudySession(
  minutesInput: number,
): Promise<ManualStudySessionResult> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error('Usuário não autenticado')
  }

  const invalid = validateManualStudyMinutes(minutesInput)
  if (invalid !== null) {
    throw new Error(invalid)
  }

  const durationMinutes = Math.round(minutesInput)
  const base = calculateReward(durationMinutes)
  const manual = calculateManualReward(durationMinutes)

  const record: StudySessionRecord = {
    user_id: userData.user.id,
    duration_minutes: durationMinutes,
    xp: manual.xp,
    gold: manual.gold,
    started_at: new Date(Date.now() - durationMinutes * 60_000).toISOString(),
    completed_at: new Date().toISOString(),
    is_manual: true,
  }

  const { error: insertError } = await supabase
    .from(STUDY_SESSIONS_TABLE)
    .insert([record])

  if (insertError) {
    throw new Error(insertError.message)
  }

  const { error: xpError } = await supabase.rpc('add_xp', {
    p_xp: manual.xp,
    p_gold: manual.gold,
  })

  if (xpError) {
    throw new Error(xpError.message)
  }

  return {
    durationMinutes,
    baseXp: base.xp,
    baseGold: base.gold,
    xp: manual.xp,
    gold: manual.gold,
  }
}