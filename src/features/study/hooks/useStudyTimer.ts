import { useCallback, useMemo, useRef, useState } from 'react'
import {
  MAX_STUDY_MINUTES,
  MIN_STUDY_MINUTES,
  calculateReward,
  formatTime,
  validateStudyMinutes,
} from '../lib/studyRules'
import {
  saveStudySession,
  type StudySessionSummary,
} from '../services/studySessionService'
import { emitStudySessionSaved } from '../lib/studyEvents'

export type StudyTimerStatus = 'idle' | 'running' | 'paused' | 'completed'

export type ActionResult =
  | { ok: true }
  | { ok: false; message: string }

export interface StudyTimerResult {
  durationMinutes: number
  xp: number
  gold: number
}

interface UseStudyTimerOptions {
  saveSession?: (summary: StudySessionSummary) => Promise<unknown>
}

const TICK_MS = 1000
const DEFAULT_MINUTES = 25

export function useStudyTimer(options: UseStudyTimerOptions = {}) {
  const saveSession = options.saveSession ?? saveStudySession

  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_MINUTES)
  const [remainingMs, setRemainingMs] = useState(DEFAULT_MINUTES * 60_000)
  const [status, setStatus] = useState<StudyTimerStatus>('idle')
  const [lastResult, setLastResult] = useState<StudyTimerResult | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [sessionCompletedAt, setSessionCompletedAt] = useState<number | null>(null)
  const [isFocusMode, setIsFocusMode] = useState(false)

  const statusRef = useRef<StudyTimerStatus>('idle')
  const durationMinutesRef = useRef(DEFAULT_MINUTES)
  const baseRemainingRef = useRef(DEFAULT_MINUTES * 60_000)
  const endTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const changeStatus = useCallback((next: StudyTimerStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const openFocusMode = useCallback(() => setIsFocusMode(true), [])
  const closeFocusMode = useCallback(() => setIsFocusMode(false), [])

  const finish = useCallback(
    async (minutesOverride?: number): Promise<StudyTimerResult | null> => {
      if (completedRef.current) return null
      completedRef.current = true
      endTimeRef.current = null
      clearTimer()

      const minutes = Math.max(1, minutesOverride ?? durationMinutesRef.current)
      const reward = calculateReward(minutes)
      const result: StudyTimerResult = { durationMinutes: minutes, ...reward }

      setRemainingMs(0)
      changeStatus('completed')
      setLastResult(result)
      setSaveError(null)
      setIsSaving(true)
      try {
        await saveSession(result)
        setSessionCompletedAt(Date.now())
        emitStudySessionSaved()
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : 'Falha ao salvar a sessão no histórico.',
        )
      } finally {
        setIsSaving(false)
      }
      return result
    },
    [changeStatus, clearTimer, saveSession],
  )

  const tick = useCallback(() => {
    if (endTimeRef.current === null) return
    const remaining = Math.max(0, endTimeRef.current - Date.now())
    setRemainingMs(remaining)
    if (remaining <= 0) {
      void finish()
    }
  }, [finish])

  const start = useCallback(() => {
    if (statusRef.current !== 'idle') return
    endTimeRef.current = Date.now() + baseRemainingRef.current
    clearTimer()
    intervalRef.current = setInterval(tick, TICK_MS)
    changeStatus('running')
  }, [changeStatus, clearTimer, tick])

  const pause = useCallback((): ActionResult => {
    if (statusRef.current !== 'running') {
      return { ok: false, message: 'Só é possível pausar uma sessão em andamento.' }
    }
    if (endTimeRef.current === null) {
      return { ok: false, message: 'Sessão sem referência de tempo.' }
    }

    const remaining = Math.max(0, endTimeRef.current - Date.now())
    baseRemainingRef.current = remaining
    setRemainingMs(remaining)
    endTimeRef.current = null
    clearTimer()

    changeStatus('paused')
    return { ok: true }
  }, [changeStatus, clearTimer])

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return
    endTimeRef.current = Date.now() + baseRemainingRef.current
    clearTimer()
    intervalRef.current = setInterval(tick, TICK_MS)
    changeStatus('running')
  }, [changeStatus, clearTimer, tick])

  const selectDuration = useCallback((minutes: number): ActionResult => {
    if (statusRef.current !== 'idle') {
      return { ok: false, message: 'Não é possível alterar a duração durante uma sessão.' }
    }
    const invalid = validateStudyMinutes(minutes)
    if (invalid !== null) {
      return { ok: false, message: invalid }
    }
    const ms = minutes * 60_000
    durationMinutesRef.current = minutes
    baseRemainingRef.current = ms
    setDurationMinutes(minutes)
    setRemainingMs(ms)
    return { ok: true }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    completedRef.current = false
    endTimeRef.current = null

    const minutes = Math.min(
      Math.max(durationMinutesRef.current, MIN_STUDY_MINUTES),
      MAX_STUDY_MINUTES,
    )
    const ms = minutes * 60_000
    durationMinutesRef.current = minutes
    baseRemainingRef.current = ms

    setDurationMinutes(minutes)
    setRemainingMs(ms)
    setLastResult(null)
    setSaveError(null)
    setIsSaving(false)
    setSessionCompletedAt(null)
    changeStatus('idle')
  }, [changeStatus, clearTimer])

  const finishEarly = useCallback((): ActionResult => {
    if (statusRef.current !== 'running' && statusRef.current !== 'paused') {
      return { ok: false, message: 'Nenhuma sessão em andamento.' }
    }

    const remaining =
      endTimeRef.current !== null
        ? Math.max(0, endTimeRef.current - Date.now())
        : baseRemainingRef.current
    const totalMs = durationMinutesRef.current * 60_000
    const elapsedMs = Math.max(0, totalMs - remaining)
    const elapsedMinutes = Math.floor(elapsedMs / 60_000)

    if (elapsedMinutes < 1) {
      reset()
      closeFocusMode()
      return { ok: true }
    }

    void finish(elapsedMinutes)
    return { ok: true }
  }, [closeFocusMode, finish, reset])

  const formattedTime = useMemo(() => formatTime(remainingMs), [remainingMs])

  return {
    durationMinutes,
    remainingMs,
    formattedTime,
    status,
    isRunning: status === 'running',
    isPaused: status === 'paused',
    isCompleted: status === 'completed',
    canPause: status === 'running',
    lastResult,
    saveError,
    isSaving,
    sessionCompletedAt,
    isFocusMode,
    openFocusMode,
    closeFocusMode,
    selectDuration,
    start,
    pause,
    resume,
    finish,
    finishEarly,
    reset,
  }
}