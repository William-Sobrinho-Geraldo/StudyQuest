import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../features/auth/AuthContext'
import { QuestsPage } from './QuestsPage'

const { getSession, onAuthStateChange } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession, onAuthStateChange } },
}))

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
  })

  it('exibe as três categorias e as quests principais por padrão', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Quests' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quests Principais' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Quests Diárias' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Quests Semanais' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    expect(screen.getByText('Trilha de Nível (O Despertar do Herói)')).toBeInTheDocument()
    expect(screen.getByText('O Início da Jornada')).toBeInTheDocument()
    expect(screen.getByText('A Divindade Acadêmica')).toBeInTheDocument()
  })

  it('agrupa as quests principais em trilhas com título, descrição e recompensas', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Quests' })

    for (const trail of [
      'Trilha de Nível (O Despertar do Herói)',
      'Trilha de Tempo (Os Arquivos de Alexandria)',
      'Trilha de Sessões (Veterano de Guerra)',
      'Trilha da Forja (Poder Implacável)',
      'Trilha de Economia (O Tesouro do Dragão)',
    ]) {
      expect(screen.getByText(trail)).toBeInTheDocument()
    }

    expect(screen.getByText('Acumule 1.000 minutos de estudo no total.')).toBeInTheDocument()
    expect(screen.getByText('Avatar da Guerra')).toBeInTheDocument()
    expect(screen.getByText('Tenha TODOS os 4 slots Nível 100 no refino máximo (+12).')).toBeInTheDocument()
    expect(screen.getByText('Ganhe 250.000 de Ouro total na jornada.')).toBeInTheDocument()

    expect(screen.getByText('500000 XP')).toBeInTheDocument()
    expect(screen.getByText('600000 XP')).toBeInTheDocument()
    expect(screen.getByText('65000 Gold')).toBeInTheDocument()
  })

  it('mostra recompensas lado a lado e botão Reivindicar desabilitado para quests não concluídas', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Quests' })
    await user.click(screen.getByRole('button', { name: 'Quests Diárias' }))

    const questCards = screen.getAllByText(/sessão de foco/i)
    expect(questCards.length).toBeGreaterThan(0)

    expect(screen.getByText('450 XP')).toBeInTheDocument()
    expect(screen.getByText('100 Gold')).toBeInTheDocument()
    expect(screen.getByText('50 XP')).toBeInTheDocument()
    expect(screen.getByText('10 Gold')).toBeInTheDocument()

    const claimButtons = screen.getAllByRole('button', { name: 'Reivindicar' })
    expect(claimButtons).toHaveLength(9)
    for (const button of claimButtons) {
      expect(button).toBeDisabled()
    }
  })

  it('alterna para as quests semanais ao clicar no submenu', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Quests' })
    await user.click(screen.getByRole('button', { name: 'Quests Semanais' }))

    expect(screen.getByText('Resiliência Semanal')).toBeInTheDocument()
    expect(screen.getByText('Acumule 350 minutos (aprox. 6 horas) de estudo na semana.')).toBeInTheDocument()
    expect(screen.getByText('2000 XP')).toBeInTheDocument()
    expect(screen.getByText('400 Gold')).toBeInTheDocument()
    expect(screen.getByText('Chama Inapagável')).toBeInTheDocument()
    expect(screen.getByText('1200 XP')).toBeInTheDocument()

    const claimButtons = screen.getAllByRole('button', { name: 'Reivindicar' })
    for (const button of claimButtons) {
      expect(button).toBeDisabled()
    }
  })

  it('some as quests de outras categorias ao alternar de submenu', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Quests' })
    await user.click(screen.getByRole('button', { name: 'Quests Diárias' }))

    expect(screen.getByText('Aquecimento')).toBeInTheDocument()
    expect(screen.queryByText('Avatar da Guerra')).not.toBeInTheDocument()
    expect(screen.queryByText('Resiliência Semanal')).not.toBeInTheDocument()
  })
})