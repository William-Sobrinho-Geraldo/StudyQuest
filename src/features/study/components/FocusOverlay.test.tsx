import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { StudyTimerProvider, useStudyTimerContext, type StudyTimerValue } from '../context/StudyTimerContext'
import { FocusOverlay } from './FocusOverlay'

const saveStudySessionMock = vi.hoisted(() => vi.fn().mockResolvedValue({}))

vi.mock('../services/studySessionService', () => ({
  saveStudySession: saveStudySessionMock,
}))

let timerRef: { current: StudyTimerValue | null } = { current: null }

function Harness() {
  const timer = useStudyTimerContext()
  timerRef.current = timer
  return <FocusOverlay />
}

function renderOverlay() {
  return render(
    <StudyTimerProvider>
      <Harness />
    </StudyTimerProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  saveStudySessionMock.mockClear()
  timerRef.current = null
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('FocusOverlay', () => {
  it('não renderiza quando o foco não está ativo', () => {
    renderOverlay()

    expect(screen.queryByTestId('focus-overlay')).not.toBeInTheDocument()
  })

  it('exibe timer, personagem e controles ao entrar no foco', () => {
    renderOverlay()
    act(() => {
      timerRef.current?.selectDuration(25)
      timerRef.current?.start()
      timerRef.current?.openFocusMode()
    })

    expect(screen.getByTestId('focus-overlay')).toBeInTheDocument()
    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(screen.getByText('Farmando XP...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pausar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /concluir sessão/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sair do foco/i })).toBeInTheDocument()
  })

  it('pausa e retoma a sessão corretamente', () => {
    renderOverlay()
    act(() => {
      timerRef.current?.selectDuration(10)
      timerRef.current?.start()
      timerRef.current?.openFocusMode()
    })

    expect(screen.getByText('Farmando XP...')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(screen.getByRole('button', { name: /pausar/i })).toBeEnabled()

    act(() => {
      void timerRef.current?.pause()
    })

    expect(screen.getByText('Pausado — descanse um pouco')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retomar/i })).toBeInTheDocument()

    act(() => {
      void timerRef.current?.resume()
    })

    expect(screen.getByText('Farmando XP...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pausar/i })).toBeInTheDocument()
  })

  it('conclui a sessão ao clicar em Concluir Sessão', () => {
    renderOverlay()
    act(() => {
      timerRef.current?.selectDuration(5)
      timerRef.current?.start()
      timerRef.current?.openFocusMode()
    })

    act(() => {
      void timerRef.current?.finish()
    })

    expect(screen.getByText('00:00')).toBeInTheDocument()
    expect(saveStudySessionMock).toHaveBeenCalledWith({
      durationMinutes: 5,
      xp: 50,
      gold: 10,
    })
  })

  it('fecha o foco ao clicar em Sair do Foco', () => {
    renderOverlay()
    act(() => {
      timerRef.current?.selectDuration(10)
      timerRef.current?.start()
      timerRef.current?.openFocusMode()
    })

    expect(screen.getByTestId('focus-overlay')).toBeInTheDocument()

    act(() => {
      timerRef.current?.closeFocusMode()
    })

    expect(screen.queryByTestId('focus-overlay')).not.toBeInTheDocument()
  })
})