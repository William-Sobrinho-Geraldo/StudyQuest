import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { StudyTimerProvider, useStudyTimerContext, type StudyTimerValue } from '../context/StudyTimerContext'
import { VictoryModal } from './VictoryModal'
import { ToastProvider } from '../../../components/Toast'

const saveStudySessionMock = vi.hoisted(() => vi.fn().mockResolvedValue({}))

vi.mock('../services/studySessionService', () => ({
  saveStudySession: saveStudySessionMock,
}))

const { rpc } = vi.hoisted(() => ({
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'a@b.com' } },
        error: null,
      }),
    },
    rpc,
    from: vi.fn(),
  },
}))

let timerRef: { current: StudyTimerValue | null } = { current: null }

function Harness() {
  const timer = useStudyTimerContext()
  timerRef.current = timer
  return (
    <>
      <span data-testid="timer-status">{timer.status}</span>
      <VictoryModal />
    </>
  )
}

function renderModal() {
  return render(
    <ToastProvider>
      <StudyTimerProvider>
        <Harness />
      </StudyTimerProvider>
    </ToastProvider>,
  )
}

async function finishSession() {
  act(() => {
    timerRef.current?.selectDuration(25)
    void timerRef.current?.finish()
  })
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  saveStudySessionMock.mockClear()
  rpc.mockClear()
  rpc.mockResolvedValue({ data: null, error: null })
  timerRef.current = null
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('VictoryModal', () => {
  it('exibe recompensas ao completar sessão', async () => {
    renderModal()
    await finishSession()

    expect(screen.getByRole('dialog', { name: /sessão concluída/i })).toBeInTheDocument()
    expect(screen.getByText('Sessão Concluída!')).toBeInTheDocument()
    expect(screen.getByText('25 minutos focados. Você farmou muito bem!')).toBeInTheDocument()
    expect(screen.getByTestId('victory-xp')).toHaveTextContent('250')
    expect(screen.getByTestId('victory-gold')).toHaveTextContent('50')
  })

  it('não exibe o modal quando a sessão está em andamento', async () => {
    renderModal()
    act(() => {
      timerRef.current?.selectDuration(25)
      timerRef.current?.start()
    })

    expect(screen.queryByRole('dialog', { name: /sessão concluída/i })).not.toBeInTheDocument()
  })

  it('Coletar e Sair salva a recompensa base no Supabase e fecha o modal', async () => {
    const { getByRole } = renderModal()
    await finishSession()

    await act(async () => {
      getByRole('button', { name: /coletar e sair/i }).click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('add_xp', { p_xp: 250, p_gold: 50 })
    expect(screen.queryByRole('dialog', { name: /sessão concluída/i })).not.toBeInTheDocument()
    expect(timerRef.current?.status).toBe('idle')
  })

  it('Assistir Anúncio exibe loading e dobra as recompensas', async () => {
    const { getByRole } = renderModal()
    await finishSession()

    act(() => {
      getByRole('button', { name: /assistir anúncio/i }).click()
    })

    expect(screen.getByText(/reproduzindo anúncio \(mock\)/i)).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(2_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('add_xp', { p_xp: 500, p_gold: 100 })
    expect(screen.queryByRole('dialog', { name: /sessão concluída/i })).not.toBeInTheDocument()
    expect(timerRef.current?.status).toBe('idle')
  })

  it('erro no add_xp exibe toast e mantém o modal aberto', async () => {
    rpc.mockReturnValue(Promise.resolve({ data: null, error: { message: 'rate limit' } }))
    const { getByRole } = renderModal()
    await finishSession()

    await act(async () => {
      getByRole('button', { name: /coletar e sair/i }).click()
      await vi.runAllTimersAsync()
    })

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: /sessão concluída/i })).toBeInTheDocument()
    expect(screen.getByTestId('timer-status')).toHaveTextContent('completed')
  })
})