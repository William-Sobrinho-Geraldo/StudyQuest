import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../features/auth/AuthContext'
import { ProfilePage } from './ProfilePage'

const { getSession, onAuthStateChange, from } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession, onAuthStateChange }, from },
}))

interface ProfileRow {
  id: string
  level: number
  current_xp: number
  gold: number
  created_at: string
  current_streak: number
  last_streak_date: string | null
  daily_goal_minutes: number
  last_chest_claim: string | null
  player_tag: string | null
  display_name: string
  avatar_id: string | null
  equipped_title: string | null
  unlocked_titles: string[]
}

const USER_ID = 'user-123'

function mockSession(email = 'hero@studyquest.dev') {
  getSession.mockResolvedValue({
    data: {
      session: {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        expires_at: 9999999999,
        token_type: 'bearer',
        user: {
          id: USER_ID,
          email,
          user_metadata: {},
          app_metadata: {},
          aud: 'authenticated',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    },
    error: null,
  })
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
    error: null,
  })
}

function fullProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: USER_ID,
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
    ...overrides,
  }
}

let profileValue: ProfileRow

function mockProfiles() {
  const select = vi.fn((columns: string) => {
    if (columns === '*') {
      return {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: profileValue, error: null }),
        }),
      }
    }
    return { eq: vi.fn(), maybeSingle: vi.fn() }
  })
  const update = vi.fn((patch: Record<string, unknown>) => {
    Object.assign(profileValue, patch)
    return { eq: vi.fn().mockResolvedValue({ error: null }) }
  })
  from.mockReturnValue({ select, update })
  return { select, update }
}

function renderProfile() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <ProfilePage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProfilePage', () => {
  it('exibe avatar do preset, nome e título equipado no topo', async () => {
    mockSession()
    profileValue = fullProfile({
      display_name: 'Heroi',
      avatar_id: 'warrior',
      equipped_title: 'Novato',
      unlocked_titles: ['Novato', 'Veterano'],
    })
    const { update } = mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Heroi' })

    expect(screen.getByTestId('hero-avatar-preset')).toBeInTheDocument()
    expect(screen.queryByTestId('hero-avatar-fallback')).not.toBeInTheDocument()
    expect(screen.getByTestId('equipped-title-badge')).toHaveTextContent('Novato')

    const novatoButton = screen.getByRole('button', { name: /novato/i, pressed: true })
    expect(novatoButton).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /veterano/i, pressed: false })).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  it('sem avatar e sem título, exibe inicial do e-mail e nenhum badge', async () => {
    mockSession()
    profileValue = fullProfile({ display_name: 'Aventureiro' })
    mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Aventureiro' })

    expect(screen.getByTestId('hero-avatar-fallback')).toHaveTextContent('H')
    expect(screen.queryByTestId('hero-avatar-preset')).not.toBeInTheDocument()
    expect(screen.queryByTestId('equipped-title-badge')).not.toBeInTheDocument()
  })

  it('exibe empty state quando não há títulos desbloqueados', async () => {
    mockSession()
    profileValue = fullProfile({})
    mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Aventureiro' })

    expect(
      screen.getByText('Nenhum título desbloqueado ainda. Vença Sprints para ganhar honrarias.'),
    ).toBeInTheDocument()
  })

  it('equipa um título ao clicar e reflete imediatamente na UI', async () => {
    const user = userEvent.setup()
    mockSession()
    profileValue = fullProfile({
      display_name: 'Heroi',
      unlocked_titles: ['Novato', 'Veterano'],
    })
    const { update } = mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Heroi' })
    expect(screen.queryByTestId('equipped-title-badge')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /veterano/i }))

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ equipped_title: 'Veterano' })
    })
    expect(update.mock.calls[0][0]).toEqual({ equipped_title: 'Veterano' })

    expect(await screen.findByTestId('equipped-title-badge')).toHaveTextContent('Veterano')
    expect(screen.getByRole('button', { name: /veterano/i, pressed: true })).toBeInTheDocument()
  })

  it('Editar Herói muda nome e avatar e reflete no cabeçalho', async () => {
    const user = userEvent.setup()
    mockSession()
    profileValue = fullProfile({ display_name: 'Heroi' })
    const { update } = mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Heroi' })

    await user.click(screen.getByRole('button', { name: /editar herói/i }))
    const dialog = screen.getByRole('dialog', { name: /editar herói/i })

    const nameInput = within(dialog).getByLabelText(/nome do herói/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'NovoNome')

    await user.click(within(dialog).getByRole('radio', { name: /avatar guerreiro/i }))
    await user.click(within(dialog).getByRole('button', { name: /^salvar$/i }))

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ display_name: 'NovoNome', avatar_id: 'warrior' })
    })
    expect(await screen.findByRole('heading', { name: 'NovoNome' })).toBeInTheDocument()
    expect(screen.getByTestId('hero-avatar-preset')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /editar herói/i })).not.toBeInTheDocument()
  })

  it('valida nome curto no Editar Herói e não salva', async () => {
    const user = userEvent.setup()
    mockSession()
    profileValue = fullProfile({})
    const { update } = mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Aventureiro' })

    await user.click(screen.getByRole('button', { name: /editar herói/i }))
    const dialog = screen.getByRole('dialog', { name: /editar herói/i })

    const nameInput = within(dialog).getByLabelText(/nome do herói/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Ab')

    await user.click(within(dialog).getByRole('button', { name: /^salvar$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O nome do herói deve ter entre 3 e 15 caracteres.',
    )
    expect(update).not.toHaveBeenCalled()
  })
})