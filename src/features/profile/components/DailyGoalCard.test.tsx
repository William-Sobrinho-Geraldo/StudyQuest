import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth/AuthContext'
import {
  StudyTimerProvider,
  useStudyTimerContext,
  type StudyTimerValue,
} from '../../study/context/StudyTimerContext'
import { DailyGoalCard } from './DailyGoalCard'

const { getSession, onAuthStateChange, from, rpc, saveStudySession } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  saveStudySession: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession, onAuthStateChange }, from, rpc },
}))

vi.mock('../../study/services/studySessionService', () => ({ saveStudySession }))

const SESSION = {
  access_token: 'test-token',
  refresh_token: 'test-refresh',
  expires_in: 3600,
  expires_at: 9999999999,
  token_type: 'bearer',
  user: {
    id: 'user-123',
    email: 'meta@teste.com',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
  },
} satisfies Session

function mockSession() {
  getSession.mockResolvedValue({ data: { session: SESSION }, error: null })
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
    error: null,
  })
}

function mockGoal(goal: number | null) {
  from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: goal === null ? null : { daily_goal_minutes: goal }, error: null }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  })
}

let timerRef: { current: StudyTimerValue | null } = { current: null }

function TimerProbe() {
  const timer = useStudyTimerContext()
  timerRef.current = timer
  return null
}

function renderCard() {
  return render(
    <AuthProvider>
      <StudyTimerProvider>
        <DailyGoalCard />
        <TimerProbe />
      </StudyTimerProvider>
    </AuthProvider>,
  )
}

describe('DailyGoalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession()
    timerRef.current = null
  })

  it('mostra o estudo de hoje e a meta diária do perfil', async () => {
    mockGoal(120)
    rpc.mockResolvedValue({ data: 90, error: null })

    renderCard()

    expect(await screen.findByText('90 / 120 min')).toBeInTheDocument()
    expect(screen.getByTestId('daily-goal-value')).toHaveTextContent('90 / 120 min')
  })

  it('cai para a meta padrão (30) quando o perfil não tem meta', async () => {
    mockGoal(null)
    rpc.mockResolvedValue({ data: 45, error: null })

    renderCard()

    expect(await screen.findByText('45 / 30 min')).toBeInTheDocument()
  })

  it('salva uma nova meta via update na profiles', async () => {
    const user = userEvent.setup()
    mockGoal(120)
    rpc.mockResolvedValue({ data: 90, error: null })

    renderCard()

    await screen.findByText('90 / 120 min')
    await user.click(screen.getByRole('button', { name: 'Editar meta diária' }))

    const input = screen.getByTestId('daily-goal-input')
    await user.clear(input)
    await user.type(input, '150')
    await user.click(screen.getByRole('button', { name: 'Salvar meta diária' }))

    await waitFor(() => {
      expect(from).toHaveBeenCalledWith('profiles')
    })

    const updateCall = from.mock.results.find((result) => result.value.update)
    expect(updateCall?.value.update).toHaveBeenCalledWith({ daily_goal_minutes: 150 })
    expect(await screen.findByText('90 / 150 min')).toBeInTheDocument()
  })

  it('rejeita valor acima do máximo de 20h', async () => {
    const user = userEvent.setup()
    mockGoal(120)
    rpc.mockResolvedValue({ data: 90, error: null })

    renderCard()

    await screen.findByText('90 / 120 min')
    await user.click(screen.getByRole('button', { name: 'Editar meta diária' }))

    const input = screen.getByTestId('daily-goal-input')
    await user.clear(input)
    await user.type(input, '1300')
    await user.click(screen.getByRole('button', { name: 'Salvar meta diária' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('entre 1 e 1200')
  })

  it('cancela a edição sem alterar a meta', async () => {
    const user = userEvent.setup()
    mockGoal(120)
    rpc.mockResolvedValue({ data: 90, error: null })

    renderCard()

    await screen.findByText('90 / 120 min')
    await user.click(screen.getByRole('button', { name: 'Editar meta diária' }))

    const input = screen.getByTestId('daily-goal-input')
    await user.clear(input)
    await user.type(input, '999')
    await user.click(screen.getByRole('button', { name: 'Cancelar edição da meta diária' }))

    expect(screen.getByText('90 / 120 min')).toBeInTheDocument()
  })

  it('atualiza os minutos de hoje logo após concluir uma sessão', async () => {
    saveStudySession.mockResolvedValue({} as never)
    mockGoal(40)
    rpc
      .mockResolvedValueOnce({ data: 100, error: null })
      .mockResolvedValueOnce({ data: 120, error: null })

    renderCard()

    expect(await screen.findByText('100 / 40 min')).toBeInTheDocument()

    await act(async () => {
      await timerRef.current?.finish()
    })

    expect(screen.getByText('120 / 40 min')).toBeInTheDocument()
  })
})