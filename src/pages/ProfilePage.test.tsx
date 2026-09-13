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
  study_goal: string | null
  bio: string | null
}

interface InventoryRowMock {
  item_category: string
  item_level: number
  enhancement_level: number
  rarity: string | null
}

interface SessionRowMock {
  duration_minutes: number
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
    study_goal: null,
    bio: null,
    ...overrides,
  }
}

let profileValue: ProfileRow
let inventoryRows: InventoryRowMock[]
let sessionRows: SessionRowMock[]
let questClaimRows: { id: string }[]

function queryable<T>(value: { data: T; error: unknown }) {
  const promise = Promise.resolve(value)
  return Object.assign(promise, {
    eq: () => queryable(value),
    maybeSingle: () => Promise.resolve(value),
  })
}

function mockProfiles() {
  const update = vi.fn((patch: Record<string, unknown>) => {
    Object.assign(profileValue, patch)
    return { eq: vi.fn().mockResolvedValue({ error: null }) }
  })

  from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn((_columns: string) => queryable({ data: profileValue, error: null })),
        update,
      }
    }
    if (table === 'inventory') {
      return { select: vi.fn(() => queryable({ data: inventoryRows, error: null })) }
    }
    if (table === 'study_sessions') {
      return { select: vi.fn(() => queryable({ data: sessionRows, error: null })) }
    }
    if (table === 'quest_claims') {
      return { select: vi.fn(() => queryable({ data: questClaimRows, error: null })) }
    }
    return { select: vi.fn(() => queryable({ data: [], error: null })) }
  })

  return { update }
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
  inventoryRows = []
  sessionRows = []
  questClaimRows = []
})

describe('ProfilePage', () => {
  it('exibe avatar do preset, nome e título equipado no topo', async () => {
    mockSession()
    profileValue = fullProfile({
      display_name: 'Heroi',
      avatar_id: 'comum_1',
      equipped_title: 'Novato',
      unlocked_titles: ['Novato', 'Veterano'],
    })
    const { update } = mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Heroi' })

    expect(screen.getByTestId('user-avatar-image')).toBeInTheDocument()
    expect(screen.queryByTestId('user-avatar-fallback')).not.toBeInTheDocument()
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

    expect(screen.getByTestId('user-avatar-fallback')).toHaveTextContent('A')
    expect(screen.queryByTestId('user-avatar-image')).not.toBeInTheDocument()
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

    await user.click(within(dialog).getByRole('radio', { name: /avatar aventureiro/i }))
    await user.click(within(dialog).getByRole('button', { name: /^salvar$/i }))

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({
        display_name: 'NovoNome',
        avatar_id: 'comum_1',
        study_goal: null,
        bio: null,
      })
    })
    expect(await screen.findByRole('heading', { name: 'NovoNome' })).toBeInTheDocument()
    expect(screen.getByTestId('user-avatar-image')).toBeInTheDocument()
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

  it('exibe objetivo de estudo e bio quando preenchidos', async () => {
    mockSession()
    profileValue = fullProfile({
      study_goal: 'Concurso / OAB',
      bio: 'Foco total, sem distrações.',
    })
    mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Aventureiro' })

    expect(screen.getByTestId('study-goal-badge')).toHaveTextContent('Concurso / OAB')
    expect(screen.getByText('Foco total, sem distrações.')).toBeInTheDocument()
  })

  it('exibe placeholders quando objetivo e bio estão vazios', async () => {
    mockSession()
    profileValue = fullProfile({})
    mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Aventureiro' })

    expect(screen.queryByTestId('study-goal-badge')).not.toBeInTheDocument()
    expect(screen.getByText('Definir objetivo de estudo')).toBeInTheDocument()
  })

  it('calcula e exibe os status somados dos equipamentos', async () => {
    mockSession()
    profileValue = fullProfile({})
    inventoryRows = [
      { item_category: 'weapon', item_level: 10, enhancement_level: 0, rarity: 'common' },
      { item_category: 'helmet', item_level: 10, enhancement_level: 0, rarity: 'common' },
      { item_category: 'chest', item_level: 10, enhancement_level: 0, rarity: 'common' },
      { item_category: 'boots', item_level: 10, enhancement_level: 0, rarity: 'common' },
    ]
    mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Aventureiro' })

    expect(await screen.findByTestId('combat-attack')).toHaveTextContent('20')
    expect(screen.getByTestId('combat-defense')).toHaveTextContent('30')
    expect(screen.getByTestId('combat-hp')).toHaveTextContent('100')
  })

  it('exibe métricas de foco calculadas das sessões e quests', async () => {
    mockSession()
    profileValue = fullProfile({ current_streak: 7 })
    sessionRows = [
      { duration_minutes: 60 },
      { duration_minutes: 30 },
      { duration_minutes: 40 },
    ]
    questClaimRows = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }, { id: 'q5' }]
    mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Aventureiro' })

    expect(await screen.findByTestId('focus-total-time')).toHaveTextContent('2h 10m')
    expect(screen.getByTestId('focus-sessions')).toHaveTextContent('3')
    expect(screen.getByTestId('focus-streak')).toHaveTextContent('7 dias')
    expect(screen.getByTestId('focus-quests')).toHaveTextContent('5')
  })

  it('Editar Herói salva objetivo de estudo e bio', async () => {
    const user = userEvent.setup()
    mockSession()
    profileValue = fullProfile({ display_name: 'Heroi', avatar_id: 'comum_1' })
    const { update } = mockProfiles()

    renderProfile()
    await screen.findByRole('heading', { name: 'Heroi' })

    await user.click(screen.getByRole('button', { name: /editar herói/i }))
    const dialog = screen.getByRole('dialog', { name: /editar herói/i })

    const goalInput = within(dialog).getByLabelText(/objetivo de estudo/i)
    await user.type(goalInput, 'Dev Pleno')

    const bioInput = within(dialog).getByLabelText(/^bio$/i)
    await user.type(bioInput, 'Codando até virar lenda.')

    await user.click(within(dialog).getByRole('button', { name: /^salvar$/i }))

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({
        display_name: 'Heroi',
        avatar_id: 'comum_1',
        study_goal: 'Dev Pleno',
        bio: 'Codando até virar lenda.',
      })
    })
  })
})
