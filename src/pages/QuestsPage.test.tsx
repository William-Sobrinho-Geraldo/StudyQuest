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

    expect(screen.getByText('Estude 20 minutos por dia durante 7 dias seguidos')).toBeInTheDocument()
    expect(screen.getByText('Complete a sua primeira sessão de estudo')).toBeInTheDocument()
    expect(screen.getByText('Alcance o nível 10')).toBeInTheDocument()
  })

  it('mostra as recompensas em XP e Gold ao lado de cada quest', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Quests' })

    expect(screen.getByText('500 XP')).toBeInTheDocument()
    expect(screen.getByText('100 Gold')).toBeInTheDocument()
    expect(screen.getByText('100 XP')).toBeInTheDocument()
    expect(screen.getByText('20 Gold')).toBeInTheDocument()
  })

  it('alterna para as quests diárias ao clicar no submenu', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Quests' })
    await user.click(screen.getByRole('button', { name: 'Quests Diárias' }))

    expect(screen.getByRole('button', { name: 'Quests Diárias' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Complete a sua meta diária de estudo')).toBeInTheDocument()
    expect(screen.getByText('Conclua 3 sessões de estudo hoje')).toBeInTheDocument()
    expect(screen.getByText('150 XP')).toBeInTheDocument()
    expect(screen.queryByText('Estude 20 minutos por dia durante 7 dias seguidos')).not.toBeInTheDocument()
  })

  it('alterna para as quests semanais ao clicar no submenu', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Quests' })
    await user.click(screen.getByRole('button', { name: 'Quests Semanais' }))

    expect(screen.getByText('Acumule 5 horas de estudo nesta semana')).toBeInTheDocument()
    expect(screen.getByText('Mantenha a sequência de estudos por 7 dias')).toBeInTheDocument()
    expect(screen.getByText('600 XP')).toBeInTheDocument()
    expect(screen.getByText('120 Gold')).toBeInTheDocument()
  })
})