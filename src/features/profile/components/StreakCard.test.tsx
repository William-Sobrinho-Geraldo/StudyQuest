import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  StudyTimerProvider,
  useStudyTimerContext,
  type StudyTimerValue,
} from '../../study/context/StudyTimerContext'
import { StreakCard } from './StreakCard'

const { rpc, saveStudySession } = vi.hoisted(() => ({
  rpc: vi.fn(),
  saveStudySession: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc },
}))

vi.mock('../../study/services/studySessionService', () => ({ saveStudySession }))

let timerRef: { current: StudyTimerValue | null } = { current: null }

function TimerProbe() {
  const timer = useStudyTimerContext()
  timerRef.current = timer
  return null
}

function renderCard() {
  return render(
    <StudyTimerProvider>
      <StreakCard />
      <TimerProbe />
    </StudyTimerProvider>,
  )
}

describe('StreakCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    timerRef.current = null
  })

  it('mostra a sequência retornada pelo RPC refresh_streak', async () => {
    rpc.mockResolvedValue({ data: 7, error: null })

    renderCard()

    expect(await screen.findByTestId('streak-value')).toHaveTextContent('7')
    expect(screen.getByText('Dias de sequência')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('refresh_streak')
  })

  it('atualiza a sequência automaticamente após concluir uma sessão', async () => {
    saveStudySession.mockResolvedValue({} as never)
    rpc
      .mockResolvedValueOnce({ data: 3, error: null })
      .mockResolvedValueOnce({ data: 4, error: null })

    renderCard()

    expect(await screen.findByTestId('streak-value')).toHaveTextContent('3')

    await act(async () => {
      await timerRef.current?.finish()
    })

    await waitFor(() => {
      expect(screen.getByTestId('streak-value')).toHaveTextContent('4')
    })
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('cai para 0 quando o RPC falha', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    renderCard()

    await waitFor(() => {
      expect(screen.getByTestId('streak-value')).toHaveTextContent('0')
    })
  })

  it('exibe placeholder enquanto carrega', () => {
    rpc.mockReturnValue(new Promise(() => undefined))

    renderCard()

    expect(screen.getByTestId('streak-value')).toHaveTextContent('...')
  })
})