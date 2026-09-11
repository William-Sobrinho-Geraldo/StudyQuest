import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth/AuthContext'
import { emitStudySessionSaved } from '../../study/lib/studyEvents'
import { HeroProfile } from './HeroProfile'

const { getSession, onAuthStateChange, from } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession, onAuthStateChange }, from },
}))

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

function fullProfile() {
  return {
    id: SESSION.user.id,
    level: 1,
    current_xp: 0,
    gold: 0,
    created_at: '2026-01-01T00:00:00Z',
    current_streak: 0,
    last_streak_date: null,
    daily_goal_minutes: 30,
    last_chest_claim: null,
    player_tag: null,
    display_name: 'Aventureiro',
    avatar_id: null,
    equipped_title: null,
    unlocked_titles: [],
  }
}

function mockProfileFetch(rows: Array<ProfileRow | null>) {
  const maybeSingle = vi.fn()
  rows.forEach((row) => {
    maybeSingle.mockResolvedValueOnce({ data: row, error: null })
  })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn((columns: string) => {
    if (columns === '*') {
      return {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: fullProfile(), error: null }),
        }),
      }
    }
    return { eq }
  })
  from.mockReturnValue({ select })
  return { select, eq, maybeSingle }
}

function renderProfile() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <HeroProfile />
      </AuthProvider>
    </MemoryRouter>,
  )
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
    expect(screen.getByText('Aventureiro')).toBeInTheDocument()
    expect(screen.getByTestId('hero-avatar-fallback')).toHaveTextContent('A')
    expect(screen.getByRole('link', { name: /aventureiro/i })).toHaveAttribute('href', '/profile')

    expect(eq).toHaveBeenCalledWith('id', 'user-123')

    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '50.00%' })

    expect(screen.getByTestId('hero-xp')).toHaveTextContent('50/100 XP')
    expect(screen.getByTestId('hero-gold')).toHaveTextContent('0 Gold')
  })

  it('atualiza o perfil quando uma sessão de estudo é concluída', async () => {
    mockSession()
    mockProfileFetch([
      { level: 1, current_xp: 50, gold: 0 },
      { level: 2, current_xp: 150, gold: 20 },
    ])
    renderProfile()
    await screen.findByText('50/100 XP')

    act(() => {
      emitStudySessionSaved()
    })

    expect(await screen.findByText('50/115 XP')).toBeInTheDocument()
    expect(screen.getByText('Nível 2')).toBeInTheDocument()
    expect(screen.getByTestId('hero-gold')).toHaveTextContent('20 Gold')
  })

  it('sem registro em profiles, assume nível 1 com barra vazia', async () => {
    mockSession()
    mockProfileFetch([null])
    renderProfile()

    await waitFor(() => {
      expect(screen.getByText('Nível 1')).toBeInTheDocument()
      expect(screen.getByText('0/100 XP')).toBeInTheDocument()
      expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '0.00%' })
      expect(screen.getByTestId('hero-gold')).toHaveTextContent('0 Gold')
    })
  })

  it('expõe erro de carregamento do perfil sem quebrar a tela', async () => {
    mockSession()
    const maybeSingle = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'connection refused' },
    })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn((columns: string) => {
      if (columns === '*') {
        return {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: fullProfile(), error: null }),
          }),
        }
      }
      return { eq }
    })
    from.mockReturnValue({ select })
    renderProfile()

    expect(await screen.findByRole('alert')).toHaveTextContent('connection refused')
  })
})