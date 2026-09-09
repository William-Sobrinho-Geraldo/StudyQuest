import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../features/auth/AuthContext'
import { type QuestProgressRow } from '../features/quests/services/questsService'
import { QuestsPage } from './QuestsPage'

const { getSession, onAuthStateChange, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession, onAuthStateChange },
    rpc,
  },
}))

function makeQuest(overrides: Partial<QuestProgressRow>): QuestProgressRow {
  return {
    id: 'daily-1',
    category: 'daily',
    trail: null,
    title: 'Quest',
    description: 'Descrição da quest.',
    metric: 'sessions',
    period: 'day',
    target: 1,
    reward_xp: 100,
    reward_gold: 20,
    enabled: true,
    current_value: 0,
    completed: false,
    claimed: false,
    ...overrides,
  }
}

const catalog: QuestProgressRow[] = [
  makeQuest({
    id: 'daily-1',
    title: 'Aquecimento',
    description: 'Complete 1 sessão de foco (qualquer duração).',
    target: 1,
    current_value: 1,
    completed: true,
  }),
  makeQuest({
    id: 'daily-6',
    title: 'Maratona Diária',
    description: 'Acumule 90 minutos de estudo.',
    metric: 'minutes',
    target: 90,
    current_value: 45,
    reward_xp: 450,
    reward_gold: 100,
  }),
  makeQuest({
    id: 'daily-9',
    title: 'O Aprendiz da Forja',
    description: 'Faça 1 tentativa de refino no dia.',
    metric: 'forge',
    reward_xp: 50,
    reward_gold: 10,
  }),
  makeQuest({
    id: 'weekly-1',
    category: 'weekly',
    title: 'Resiliência Semanal',
    description: 'Acumule 150 minutos (2.5 horas) de estudo na semana.',
    metric: 'minutes',
    period: 'week',
    target: 150,
    current_value: 60,
    reward_xp: 800,
    reward_gold: 150,
  }),
  makeQuest({
    id: 'main-level-1',
    category: 'main',
    trail: 'Trilha de Nível (O Despertar do Herói)',
    title: 'O Início da Jornada',
    description: 'Alcance o nível 5.',
    metric: 'level',
    period: 'all',
    target: 5,
    current_value: 3,
    reward_xp: 1000,
    reward_gold: 200,
  }),
  makeQuest({
    id: 'main-forge-10',
    category: 'main',
    trail: 'Trilha da Forja (Poder Implacável)',
    title: 'Avatar da Guerra',
    description: 'Tenha TODOS os 4 slots Nível 100 no refino máximo (+12).',
    metric: 'forge',
    period: 'all',
    reward_xp: 500000,
    reward_gold: 100000,
  }),
]

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <QuestsPage />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('QuestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
      error: null,
    })
    let rows = catalog.map((quest) => ({ ...quest }))
    rpc.mockImplementation((fn: string, args?: { p_quest_id?: string }) => {
      if (fn === 'claim_quest') {
        rows = rows.map((quest) =>
          quest.id === args?.p_quest_id ? { ...quest, claimed: true } : quest,
        )
        return Promise.resolve({ data: null, error: null })
      }
      return Promise.resolve({ data: rows, error: null })
    })
  })

  it('exibe as três categorias e abre as quests diárias por padrão', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Quests' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quests Diárias' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Quests Semanais' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Quests Principais' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    expect(screen.getByText('Aquecimento')).toBeInTheDocument()
    expect(screen.getByText('Maratona Diária')).toBeInTheDocument()
    expect(screen.queryByText('Trilha de Nível (O Despertar do Herói)')).not.toBeInTheDocument()
  })

  it('agrupa as quests principais por trilha ao clicar no submenu', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Quests' })
    await user.click(screen.getByRole('button', { name: 'Quests Principais' }))

    expect(screen.getByRole('button', { name: 'Quests Principais' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Trilha de Nível (O Despertar do Herói)')).toBeInTheDocument()
    expect(screen.getByText('Trilha da Forja (Poder Implacável)')).toBeInTheDocument()
    expect(screen.getByText('O Início da Jornada')).toBeInTheDocument()
    expect(screen.getByText('Avatar da Guerra')).toBeInTheDocument()
  })

  it('mostra progresso, recompensas lado a lado e habilita Reivindicar apenas na quest concluída', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Quests' })
    await user.click(screen.getByRole('button', { name: 'Quests Diárias' }))

    expect(await screen.findByText('Aquecimento')).toBeInTheDocument()
    expect(screen.getByText('1/1 sessões')).toBeInTheDocument()
    expect(screen.getByText('Concluída')).toBeInTheDocument()
    expect(screen.getByText('100 XP')).toBeInTheDocument()
    expect(screen.getByText('20 Gold')).toBeInTheDocument()

    expect(screen.getByText('Maratona Diária')).toBeInTheDocument()
    expect(screen.getByText('45/90 min')).toBeInTheDocument()
    expect(screen.getByText('450 XP')).toBeInTheDocument()
    expect(screen.getByText('100 Gold')).toBeInTheDocument()

    expect(screen.getByText('O Aprendiz da Forja')).toBeInTheDocument()
    expect(screen.getByText('50 XP')).toBeInTheDocument()
    expect(screen.getByText('10 Gold')).toBeInTheDocument()

    const claimButtons = screen.getAllByRole('button', { name: 'Reivindicar' })
    expect(claimButtons).toHaveLength(3)
    expect(claimButtons.filter((button) => !(button as HTMLButtonElement).disabled)).toHaveLength(1)
  })

  it('reivindica uma quest concluída e volta a listá-la como Reivindicado', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Quests' })
    await user.click(screen.getByRole('button', { name: 'Quests Diárias' }))

    const claimButton = screen
      .getAllByRole('button', { name: 'Reivindicar' })
      .find((button) => !(button as HTMLButtonElement).disabled)
    expect(claimButton).toBeDefined()
    if (claimButton) await user.click(claimButton)

    expect(rpc).toHaveBeenCalledWith('claim_quest', { p_quest_id: 'daily-1' })
    expect(await screen.findByRole('button', { name: 'Reivindicado' })).toBeDisabled()
    expect(screen.getByText(/100 XP/)).toBeInTheDocument()
  })

  it('alterna para as quests semanais ao clicar no submenu', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Quests' })
    await user.click(screen.getByRole('button', { name: 'Quests Semanais' }))

    expect(await screen.findByText('Resiliência Semanal')).toBeInTheDocument()
    expect(screen.getByText('60/150 min')).toBeInTheDocument()
    expect(screen.getByText('800 XP')).toBeInTheDocument()
    expect(screen.getByText('150 Gold')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reivindicar' })).toBeDisabled()
  })

  it('reporta erro ao falhar o carregamento das quests', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'network down' } })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('network down')
  })
})