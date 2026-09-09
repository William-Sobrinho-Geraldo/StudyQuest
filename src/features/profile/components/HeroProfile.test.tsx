import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth/AuthContext'
import {
  StudyTimerProvider,
  useStudyTimerContext,
  type StudyTimerValue,
} from '../../study/context/StudyTimerContext'
import { HeroProfile } from './HeroProfile'

const { getSession, onAuthStateChange, from, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession, onAuthStateChange }, from, rpc },
}))

let timerRef: { current: StudyTimerValue | null } = { current: null }

function TimerHarness() {
  const timer = useStudyTimerContext()
  timerRef.current = timer
  return <span data-testid="timer-status">{timer.status}</span>
}

interface ProfileRow {
  level: number
  current_xp: number
  gold: number
}

const SESSION = {
  access_token: 'test-token',
  refresh_token: 'test-refresh',
  expires_in: 3600,
  expires_at: 9999999999,
  token_type: 'bearer',
  user: {
    id: 'user-123',
    email: 'aventureiro@teste.com',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
  },
}

function mockSession() {
  getSession.mockResolvedValue({ data: { session: SESSION }, error: null })
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
    error: null,
  })
}

function mockProfileFetch(rows: Array<ProfileRow | null>) {
  const maybeSingle = vi.fn()
  rows.forEach((row) => {
    maybeSingle.mockResolvedValueOnce({ data: row, error: null })
  })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })
  from.mockReturnValue({ select })
  return { select, eq, maybeSingle }
}

function renderProfile() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <StudyTimerProvider>
          <TimerHarness />
          <HeroProfile />
        </StudyTimerProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function startSession() {
  act(() => {
    timerRef.current?.start()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('HeroProfile', () => {
  it('exibe avatar, nível, XP na barra e ouro proporcional ao perfil', async () => {
    mockSession()
    const { eq } = mockProfileFetch([{ level: 1, current_xp: 50, gold: 0 }])
    renderProfile()

    await screen.findByText('50/100 XP')

    expect(screen.getByText('Nível 1')).toBeInTheDocument()
    expect(screen.getByText('aventureiro@teste.com')).toBeInTheDocument()
    expect(screen.getByTestId('hero-avatar-fallback')).toHaveTextContent('A')

    expect(eq).toHaveBeenCalledWith('id', 'user-123')

    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '50.00%' })

    expect(screen.getByTestId('hero-xp')).toHaveTextContent('50/100 XP')
    expect(screen.getByTestId('hero-gold')).toHaveTextContent('0 Gold')
  })

  it('encerra a sessão ativa, soma a recompensa dela via RPC e reage em tempo real', async () => {
    const user = userEvent.setup()
    mockSession()
    mockProfileFetch([
      { level: 1, current_xp: 50, gold: 0 },
      { level: 3, current_xp: 500, gold: 50 },
    ])
    rpc.mockResolvedValue({ data: [{ level: 3, current_xp: 500, gold: 50 }], error: null })

    renderProfile()
    await screen.findByText('50/100 XP')
    startSession()
    expect(screen.getByTestId('timer-status')).toHaveTextContent('running')

    await user.click(screen.getByRole('button', { name: 'Concluir Sessão (Teste Dev)' }))

    await screen.findByText('117/520 XP')
    expect(screen.getByText('Nível 3')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('add_xp', { p_xp: 250, p_gold: 50 })
    expect(screen.getByTestId('timer-status')).toHaveTextContent('completed')

    await waitFor(() => {
      expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '22.50%' })
    })
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '23')
    expect(screen.getByTestId('hero-gold')).toHaveTextContent('50 Gold')
  })

  it('fica desabilitado enquanto não há sessão de estudo em andamento', async () => {
    mockSession()
    mockProfileFetch([{ level: 1, current_xp: 50, gold: 0 }])

    renderProfile()
    await screen.findByText('50/100 XP')

    expect(
      screen.getByRole('button', { name: 'Concluir Sessão (Teste Dev)' }),
    ).toBeDisabled()
    expect(screen.getByTestId('timer-status')).toHaveTextContent('idle')
  })

  it('sem registro em profiles, assume nível 1 com barra vazia', async () => {
    mockSession()
    mockProfileFetch([null])
    renderProfile()

    await screen.findByText('0/100 XP')

    expect(screen.getByText('Nível 1')).toBeInTheDocument()
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '0.00%' })
    expect(screen.getByTestId('hero-gold')).toHaveTextContent('0 Gold')
  })

  it('mostra o erro da RPC sem quebrar a tela', async () => {
    const user = userEvent.setup()
    mockSession()
    mockProfileFetch([{ level: 1, current_xp: 50, gold: 0 }])
    rpc.mockResolvedValue({ data: null, error: { message: 'rate limit' } })

    renderProfile()
    await screen.findByText('50/100 XP')
    startSession()

    await user.click(screen.getByRole('button', { name: 'Concluir Sessão (Teste Dev)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('rate limit')
    expect(screen.getByText('Nível 1')).toBeInTheDocument()
  })
})