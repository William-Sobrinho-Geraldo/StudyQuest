import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import {
  MAX_STUDY_MINUTES,
  MIN_STUDY_MINUTES,
  calculateRewardSeconds,
  formatTime,
  validateStudyMinutes,
} from '../lib/studyRules'
import {
  saveStudySession,
  type StudySessionSummary,
} from '../services/studySessionService'
import { emitStudySessionSaved } from '../lib/studyEvents'
import { readAlarmEnabled } from '../lib/studyPreferences'
import { playCompletionSound } from '../lib/completionSounds'
import {
  DISTRACTION_GRACE_SECONDS,
  PAUSED_GRACE_SECONDS,
  cancelCompletionNotification,
  cancelPendingDistractionNotifications,
  clearPendingFocusNotifications,
  scheduleCompletionNotification,
  scheduleDistractionAlert,
  schedulePausedExpiringWarning,
  scheduleSessionCancelledNotification,
} from '../lib/distractionNotifications'

export type StudyTimerStatus = 'idle' | 'running' | 'paused' | 'completed'

export type DistractionCancelReason = 'focus' | 'paused'

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
const SCREEN_LOCK_CONFIRMATION_MS = 2000

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
  const [distractionCancelled, setDistractionCancelled] = useState(false)
  const [distractionCancelReason, setDistractionCancelReason] =
    useState<DistractionCancelReason | null>(null)
  const [distractionRecoveryCount, setDistractionRecoveryCount] = useState(0)

  const statusRef = useRef<StudyTimerStatus>('idle')
  const durationMinutesRef = useRef(DEFAULT_MINUTES)
  const baseRemainingRef = useRef(DEFAULT_MINUTES * 60_000)
  const endTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)
  const backgroundTimestampRef = useRef<number | null>(null)
  const backgroundModeRef = useRef<'focus' | 'paused' | null>(null)
  const distractionConfirmedRef = useRef(false)
  const backgroundValidationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const screenLockedRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const clearValidationTimeout = useCallback(() => {
    if (backgroundValidationTimeoutRef.current !== null) {
      clearTimeout(backgroundValidationTimeoutRef.current)
      backgroundValidationTimeoutRef.current = null
    }
  }, [])

  const clearAllBackgroundTracking = useCallback(() => {
    backgroundTimestampRef.current = null
    backgroundModeRef.current = null
    distractionConfirmedRef.current = false
    screenLockedRef.current = false
    clearValidationTimeout()
  }, [clearValidationTimeout])

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
      clearAllBackgroundTracking()
      void cancelCompletionNotification()
      void clearPendingFocusNotifications()

      const targetMinutes = Math.max(1, minutesOverride ?? durationMinutesRef.current)
      const totalSeconds = targetMinutes * 60
      const reward = calculateRewardSeconds(totalSeconds)
      const result: StudyTimerResult = {
        durationMinutes: totalSeconds / 60,
        ...reward,
      }

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
    [changeStatus, clearAllBackgroundTracking, clearTimer, saveSession],
  )

  const tick = useCallback(() => {
    if (statusRef.current !== 'running') return
    if (endTimeRef.current === null) return
    const remaining = endTimeRef.current - Date.now()
    if (remaining > 0) {
      setRemainingMs(remaining)
      return
    }

    setRemainingMs(0)
    if (readAlarmEnabled()) {
      playCompletionSound()
    }
    void finish()
  }, [finish])

  const start = useCallback(() => {
    if (statusRef.current !== 'idle') return
    clearAllBackgroundTracking()
    endTimeRef.current = Date.now() + baseRemainingRef.current
    clearTimer()
    intervalRef.current = setInterval(tick, TICK_MS)
    changeStatus('running')
    void scheduleCompletionNotification(endTimeRef.current)
  }, [changeStatus, clearAllBackgroundTracking, clearTimer, tick])

  const pause = useCallback((): ActionResult => {
    if (statusRef.current !== 'running') {
      return { ok: false, message: 'Só é possível pausar uma sessão em andamento.' }
    }

    clearAllBackgroundTracking()

    if (endTimeRef.current === null) {
      return { ok: false, message: 'Sessão sem referência de tempo.' }
    }
    const remaining = Math.max(0, endTimeRef.current - Date.now())
    baseRemainingRef.current = remaining
    setRemainingMs(remaining)
    endTimeRef.current = null

    clearTimer()
    void cancelCompletionNotification()
    changeStatus('paused')
    return { ok: true }
  }, [changeStatus, clearAllBackgroundTracking, clearTimer])

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return
    clearAllBackgroundTracking()
    endTimeRef.current = Date.now() + baseRemainingRef.current
    clearTimer()
    intervalRef.current = setInterval(tick, TICK_MS)
    changeStatus('running')
    void scheduleCompletionNotification(endTimeRef.current)
  }, [changeStatus, clearAllBackgroundTracking, clearTimer, tick])

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
    clearAllBackgroundTracking()
    void cancelCompletionNotification()
    void clearPendingFocusNotifications()
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
  }, [changeStatus, clearAllBackgroundTracking, clearTimer])

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

  const cancelSessionDueToDistraction = useCallback(
    (reason: DistractionCancelReason) => {
      reset()
      closeFocusMode()
      setDistractionCancelReason(reason)
      setDistractionCancelled(true)
    },
    [closeFocusMode, reset],
  )

  const dismissDistractionCancel = useCallback(() => {
    setDistractionCancelled(false)
    setDistractionCancelReason(null)
  }, [])

  const handleNativeScreenOff = useCallback(() => {
    screenLockedRef.current = true
    clearValidationTimeout()
  }, [clearValidationTimeout])

  const handleNativeScreenOn = useCallback(() => {
    screenLockedRef.current = false
  }, [])

  const handleAppStateChange = useCallback(
    (isActive: boolean) => {
      if (isActive) {
        const leftAt = backgroundTimestampRef.current
        const mode = backgroundModeRef.current
        const wasDistraction = distractionConfirmedRef.current

        clearAllBackgroundTracking()

        if (leftAt === null || mode === null) return

        if (!wasDistraction) {
          // Bloqueio de tela (nativo ou WebView congelada antes da validação).
          // Sem notificações nem penalidade — apenas reconcilia o contador.
          tick()
          return
        }

        void cancelPendingDistractionNotifications()

        const elapsed = (Date.now() - leftAt) / 1000
        if (mode === 'focus') {
          if (elapsed >= DISTRACTION_GRACE_SECONDS) {
            cancelSessionDueToDistraction('focus')
          } else {
            setDistractionRecoveryCount((count) => count + 1)
          }
        } else if (elapsed >= PAUSED_GRACE_SECONDS) {
          cancelSessionDueToDistraction('paused')
        } else {
          setDistractionRecoveryCount((count) => count + 1)
        }
        return
      }

      const currentStatus = statusRef.current
      let mode: 'focus' | 'paused' | null = null
      if (currentStatus === 'running') {
        mode = 'focus'
      } else if (currentStatus === 'paused') {
        mode = 'paused'
      }

      if (mode === null) return

      backgroundTimestampRef.current = Date.now()
      backgroundModeRef.current = mode
      distractionConfirmedRef.current = false
      clearValidationTimeout()

      backgroundValidationTimeoutRef.current = setTimeout(() => {
        if (screenLockedRef.current) {
          return
        }
        distractionConfirmedRef.current = true
        if (mode === 'focus') {
          void scheduleDistractionAlert()
          void scheduleSessionCancelledNotification()
        } else {
          void schedulePausedExpiringWarning()
        }
      }, SCREEN_LOCK_CONFIRMATION_MS)
    },
    [cancelSessionDueToDistraction, clearAllBackgroundTracking, clearValidationTimeout, tick],
  )

  useEffect(() => {
    if (statusRef.current !== 'running') {
      void clearPendingFocusNotifications()
    }
  }, [])

  useEffect(() => {
    let handle: PluginListenerHandle | undefined
    let disposed = false

    void CapacitorApp.addListener('appStateChange', (state) => {
      handleAppStateChange(state.isActive)
    }).then((registered) => {
      if (disposed) {
        void registered.remove()
        return
      }
      handle = registered
    })

    return () => {
      disposed = true
      if (handle) {
        void handle.remove()
      }
    }
  }, [handleAppStateChange])

  useEffect(() => {
    return () => {
      clearValidationTimeout()
    }
  }, [clearValidationTimeout])

  useEffect(() => {
    window.addEventListener('onNativeScreenOff', handleNativeScreenOff)
    window.addEventListener('onNativeScreenOn', handleNativeScreenOn)
    return () => {
      window.removeEventListener('onNativeScreenOff', handleNativeScreenOff)
      window.removeEventListener('onNativeScreenOn', handleNativeScreenOn)
    }
  }, [handleNativeScreenOff, handleNativeScreenOn])

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
    distractionCancelled,
    distractionCancelReason,
    distractionRecoveryCount,
    dismissDistractionCancel,
  }
}
