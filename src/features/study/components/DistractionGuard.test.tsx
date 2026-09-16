import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import {
  StudyTimerProvider,
  useStudyTimerContext,
  type StudyTimerValue,
} from '../context/StudyTimerContext'
import { DistractionGuard } from './DistractionGuard'
import { ToastProvider } from '../../../components/Toast'

const saveStudySessionMock = vi.hoisted(() => vi.fn().mockResolvedValue({}))

vi.mock('../services/studySessionService', () => ({
  saveStudySession: saveStudySessionMock,
}))

const { scheduleDistractionAlert, scheduleSessionCancelledNotification, schedulePausedExpiringWarning, cancelPendingDistractionNotifications, clearPendingFocusNotifications, scheduleCompletionNotification, cancelCompletionNotification } = vi.hoisted(() => ({
  scheduleDistractionAlert: vi.fn().mockResolvedValue(undefined),
  scheduleSessionCancelledNotification: vi.fn().mockResolvedValue(undefined),
  schedulePausedExpiringWarning: vi.fn().mockResolvedValue(undefined),
  cancelPendingDistractionNotifications: vi.fn().mockResolvedValue(undefined),
  clearPendingFocusNotifications: vi.fn().mockResolvedValue(undefined),
  scheduleCompletionNotification: vi.fn().mockResolvedValue(undefined),
  cancelCompletionNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/distractionNotifications', () => ({
  DISTRACTION_GRACE_SECONDS: 20,
  PAUSED_GRACE_SECONDS: 15 * 60,
  scheduleDistractionAlert,
  scheduleSessionCancelledNotification,
  schedulePausedExpiringWarning,
  cancelPendingDistractionNotifications,
  clearPendingFocusNotifications,
  scheduleCompletionNotification,
  cancelCompletionNotification,
}))

const appStateMock = vi.hoisted(() => {
  let callback: ((state: { isActive: boolean }) => void) | null = null
  return {
    addListener: vi.fn((_event: string, cb: (state: { isActive: boolean }) => void) => {
      callback = cb
      return Promise.resolve({ remove: vi.fn() })
    }),
    trigger: (isActive: boolean) => callback?.({ isActive }),
  }
})

vi.mock('@capacitor/app', () => ({
  App: { addListener: appStateMock.addListener },
}))

let timerRef: { current: StudyTimerValue | null } = { current: null }

function Harness() {
  const timer = useStudyTimerContext()
  timerRef.current = timer
  return <DistractionGuard />
}

function renderGuard() {
  timerRef.current = null
  return render(
    <ToastProvider>
      <StudyTimerProvider>
        <Harness />
      </StudyTimerProvider>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  saveStudySessionMock.mockClear()
  timerRef.current = null
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('DistractionGuard', () => {
  it('não exibe o modal quando não há sessão cancelada', () => {
    renderGuard()

    expect(
      screen.queryByRole('dialog', { name: /sessão abandonada/i }),
    ).not.toBeInTheDocument()
  })

  it('exibe o modal de falha quando a sessão é cancelada por distração', () => {
    renderGuard()

    act(() => {
      timerRef.current?.selectDuration(25)
      timerRef.current?.start()
      timerRef.current?.openFocusMode()
    })
    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(25_000)
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(
      screen.getByRole('dialog', { name: /sessão abandonada/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Sessão Abandonada!')).toBeInTheDocument()
    expect(
      screen.getByText(/perdeu as recompensas desta rodada/i),
    ).toBeInTheDocument()

    act(() => {
      screen.getByRole('button', { name: /entendi/i }).click()
    })

    expect(
      screen.queryByRole('dialog', { name: /sessão abandonada/i }),
    ).not.toBeInTheDocument()
  })

  it('mostra toast de recuperação ao voltar em menos de 20 segundos', () => {
    renderGuard()

    act(() => {
      timerRef.current?.selectDuration(25)
      timerRef.current?.start()
    })
    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(
      screen.getByText('Sessão recuperada a tempo! Mantenha o foco.'),
    ).toBeInTheDocument()
  })
})
