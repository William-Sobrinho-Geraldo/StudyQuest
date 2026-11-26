import { supabase } from '../../../lib/supabase'
import { GOLD_PER_MINUTE, XP_PER_MINUTE } from '../lib/studyRules'

export interface StudySessionRecord {
  id: string
  user_id: string
  duration_minutes: number
  xp: number
  gold: number
  started_at: string
  completed_at: string
  is_manual: boolean
  rewarded: boolean
  ad_rewarded: boolean
}

export interface CompleteStudySessionResult {
  id: string
  durationMinutes: number
  xp: number
  gold: number
  rewarded: boolean
  adRewarded: boolean
}

export interface ManualStudySessionResult {
  durationMinutes: number
  baseXp: number
  baseGold: number
  xp: number
  gold: number
}

interface StudySessionRow {
  id: string
  user_id: string
  duration_minutes: number
  xp: number
  gold: number
  started_at: string
  completed_at: string
  is_manual: boolean
  rewarded: boolean
  ad_rewarded: boolean
}

function firstRow(data: unknown): StudySessionRow {
  const rows = (data ?? []) as unknown[]
  if (rows.length === 0) {
    throw new Error('Falha ao processar a sessão de estudo.')
  }
  return rows[0] as StudySessionRow
}

// Cria a sessão no servidor. A recompensa base (15 XP / 3 Gold por minuto)
// é calculada exclusivamente no backend; o cliente não informa XP/Gold.
export async function createStudySession(durationMinutes: number): Promise<StudySessionRecord> {
  const { data, error } = await supabase.rpc('create_study_session', {
    p_duration_minutes: durationMinutes,
  })

  if (error) {
    throw new Error(error.message)
  }

  return firstRow(data)
}

// Conclui e credita a recompensa de uma sessão já criada, atomicamente.
// Aplica o multiplicador 2x de anúncio quando p_ad_watched é verdadeiro.
export async function completeStudySession(
  sessionId: string,
  adWatched = false,
): Promise<CompleteStudySessionResult> {
  const { data, error } = await supabase.rpc('complete_study_session', {
    p_session_id: sessionId,
    p_ad_watched: adWatched,
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = firstRow(data)
  return {
    id: row.id,
    durationMinutes: row.duration_minutes,
    xp: row.xp,
    gold: row.gold,
    rewarded: row.rewarded,
    adRewarded: row.ad_rewarded,
  }
}

// Registra uma sessão manual (tempo esquecido). O servidor aplica a
// penalização de 30% e credita XP/Gold de forma atômica.
export async function createManualStudySession(
  minutesInput: number,
): Promise<ManualStudySessionResult> {
  const { data, error } = await supabase.rpc('create_manual_study_session', {
    p_minutes: minutesInput,
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = firstRow(data)
  return {
    durationMinutes: row.duration_minutes,
    baseXp: row.duration_minutes * XP_PER_MINUTE,
    baseGold: row.duration_minutes * GOLD_PER_MINUTE,
    xp: row.xp,
    gold: row.gold,
  }
}
