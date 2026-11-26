import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { StudyTimerProvider, useStudyTimerContext, type StudyTimerValue } from '../context/StudyTimerContext'
import { FocusOverlay } from './FocusOverlay'

vi.mock('@lottiefiles/dotlottie-web', () => {
  class DotLottieMock {
    static setWasmUrl = vi.fn()
    play = vi.fn()
    pause = vi.fn()
    destroy = vi.fn()
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
  }
  return {
    DotLottie: DotLottieMock,
    setWasmUrl: vi.fn(),
  }
})

const createStudySessionMock = vi.hoisted(() =>
  vi.fn(async (durationMinutes: number) => ({
    id: 'sess-1',
    user_id: 'u1',
    duration_minutes: durationMinutes,
    xp: durationMinutes * 15,
    gold: durationMinutes * 3,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    is_manual: false,
    rewarded: false,
    ad_rewarded: false,
  })),
)

vi.mock('../services/studySessionService', () => ({
  createStudySession: createStudySessionMock,
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
  createStudySessionMock.mockClear()
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
    expect(screen.getByRole('button', { name: /finalizar sessão/i })).toBeInTheDocument()
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

  it('silencia e reativa o som ambiente sem pausar o cronômetro', () => {
    renderOverlay()
    act(() => {
      timerRef.current?.selectDuration(10)
      timerRef.current?.start()
      timerRef.current?.openFocusMode()
    })

    const audioButton = screen.getByRole('button', { name: /silenciar som ambiente/i })
    expect(audioButton).toBeInTheDocument()

    act(() => {
      audioButton.click()
    })

    expect(screen.getByRole('button', { name: /ativar som ambiente/i })).toBeInTheDocument()
    expect(timerRef.current?.status).toBe('running')
    expect(screen.getByText('Farmando XP...')).toBeInTheDocument()

    act(() => {
      screen.getByRole('button', { name: /ativar som ambiente/i }).click()
    })

    expect(screen.getByRole('button', { name: /silenciar som ambiente/i })).toBeInTheDocument()
    expect(timerRef.current?.status).toBe('running')
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
    expect(createStudySessionMock).toHaveBeenCalledWith(5)
  })

  it('só conclui a sessão após 5 toques no botão discreto do rodapé', () => {
    renderOverlay()
    act(() => {
      timerRef.current?.selectDuration(5)
      timerRef.current?.start()
      timerRef.current?.openFocusMode()
    })

    const button = screen.getByTestId('finish-session')

    for (let i = 0; i < 4; i++) {
      act(() => {
        button.click()
      })
    }
    expect(timerRef.current?.status).toBe('running')
    expect(createStudySessionMock).not.toHaveBeenCalled()

    act(() => {
      button.click()
    })

    expect(timerRef.current?.status).toBe('completed')
    expect(createStudySessionMock).toHaveBeenCalledWith(5)
  })

  it('abandona a sessão ao clicar em Finalizar Sessão antes de 1 minuto', () => {
    renderOverlay()
    act(() => {
      timerRef.current?.selectDuration(10)
      timerRef.current?.start()
      timerRef.current?.openFocusMode()
    })

    expect(screen.getByTestId('focus-overlay')).toBeInTheDocument()

    act(() => {
      screen.getByRole('button', { name: /finalizar sessão/i }).click()
    })

    expect(screen.queryByTestId('focus-overlay')).not.toBeInTheDocument()
    expect(timerRef.current?.status).toBe('idle')
    expect(timerRef.current?.formattedTime).toBe('10:00')
    expect(createStudySessionMock).not.toHaveBeenCalled()
  })

  it('salva o progresso parcial ao clicar em Finalizar Sessão após 1 minuto', async () => {
    renderOverlay()
    act(() => {
      timerRef.current?.selectDuration(60)
      timerRef.current?.start()
      timerRef.current?.openFocusMode()
    })
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 30_000)
    })

    act(() => {
      screen.getByRole('button', { name: /finalizar sessão/i }).click()
    })

    expect(timerRef.current?.status).toBe('completed')

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(createStudySessionMock).toHaveBeenCalledWith(2)
    expect(timerRef.current?.lastResult).toEqual({
      sessionId: 'sess-1',
      durationMinutes: 2,
      xp: 30,
      gold: 6,
    })
  })
})