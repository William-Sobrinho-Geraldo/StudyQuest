import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import { AuthProvider } from '../features/auth/AuthContext'
import { LeaderboardPage } from './LeaderboardPage'

const { getSession, onAuthStateChange, from, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession, onAuthStateChange },
    from,
    rpc,
  },
}))

const USER_ID = 'user-1'

interface RankingRow {
  pos: number
  user_id: string
  player_tag: string | null
  minutes: number
  relation: string | null
}

const rankingValue: RankingRow[] = [
  { pos: 1, user_id: 'user-2', player_tag: 'ana#1234', minutes: 300, relation: null },
  { pos: 2, user_id: 'user-1', player_tag: 'voce#0001', minutes: 200, relation: 'self' },
  { pos: 3, user_id: 'user-3', player_tag: 'caio#5678', minutes: 150, relation: 'friends' },
  { pos: 4, user_id: 'user-4', player_tag: 'bia#9012', minutes: 100, relation: null },
  { pos: 5, user_id: 'user-5', player_tag: 'duda#3456', minutes: 80, relation: 'pending_out' },
  { pos: 6, user_id: 'user-6', player_tag: 'leo#7890', minutes: 60, relation: 'pending_in' },
]

const myRankValue = [{ pos: 99, minutes: 5 }]

let sendInviteImpl: (args: Record<string, unknown>) => Promise<{ data: unknown; error: null }>

let publicProfileValue: Record<string, unknown>

function mockRpc() {
  rpc.mockImplementation((fn: string, args?: Record<string, unknown>) => {
    if (fn === 'get_global_ranking') {
      return Promise.resolve({ data: rankingValue, error: null })
    }
    if (fn === 'get_my_global_rank') {
      return Promise.resolve({ data: myRankValue, error: null })
    }
    if (fn === 'send_invite_by_user') {
      return sendInviteImpl(args ?? {})
    }
    if (fn === 'get_public_profile') {
      return Promise.resolve({ data: publicProfileValue, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  })
}

function mockProfiles() {
  from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: USER_ID }, error: null }),
          }),
        }),
      }
    }
    return { select: vi.fn() }
  })
}

function renderLeaderboard() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LeaderboardPage />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  sendInviteImpl = async () => ({ data: { success: true }, error: null })
  publicProfileValue = {
    id: 'user-4',
    display_name: 'Bia',
    player_tag: 'bia#9012',
    avatar_id: null,
    study_goal: 'Concurso',
    bio: 'Foco total',
    level: 5,
    current_xp: 120,
    current_streak: 3,
    total_minutes: 130,
    session_count: 4,
    relation: 'none',
    equipped: [{ item_category: 'weapon', item_level: 10, enhancement_level: 0, rarity: 'common' }],
  }

  getSession.mockResolvedValue({
    data: { session: { user: { id: USER_ID } } },
    error: null,
  })
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
    error: null,
  })
  mockRpc()
  mockProfiles()
})

describe('LeaderboardPage', () => {
  it('renderiza o botão de adicionar e os estados desabilitados conforme a relação', async () => {
    renderLeaderboard()
    await screen.findByText('ana#1234')

    expect(screen.getByRole('button', { name: 'Adicionar ana#1234 como amigo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Adicionar bia#9012 como amigo' })).toBeEnabled()

    expect(screen.getByRole('button', { name: 'caio#5678 já é seu amigo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Solicitação enviada para duda#3456' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Você recebeu convite de leo#7890' })).toBeDisabled()

    expect(screen.queryByRole('button', { name: 'Adicionar voce#0001 como amigo' })).toBeNull()
  })

  it('envia solicitação com loading, troca para Check e exibe toast de sucesso', async () => {
    const user = userEvent.setup()

    let resolveSend: ((value: { data: unknown; error: null }) => void) | undefined
    sendInviteImpl = () =>
      new Promise((resolve) => {
        resolveSend = resolve
      })

    renderLeaderboard()
    await screen.findByText('bia#9012')

    const biaRow = screen.getByText('bia#9012').closest('li')
    expect(biaRow).not.toBeNull()
    const addButton = within(biaRow as HTMLLIElement).getByRole('button', {
      name: 'Adicionar bia#9012 como amigo',
    })
    await user.click(addButton)

    expect(await screen.findByText('Enviando...')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('send_invite_by_user', { p_target_user_id: 'user-4' })

    resolveSend?.({ data: { success: true }, error: null })

    await waitFor(() => {
      expect(within(biaRow as HTMLLIElement).getByRole('button')).toHaveTextContent(
        'Solicitação Enviada',
      )
    })
    const sentButton = within(biaRow as HTMLLIElement).getByRole('button', {
      name: 'Solicitação enviada para bia#9012',
    })
    expect(sentButton).toBeDisabled()
    expect(screen.getByText('Solicitação de amizade enviada!')).toBeInTheDocument()
  })

  it('mostra toast de erro quando a solicitação falha', async () => {
    const user = userEvent.setup()
    sendInviteImpl = async () => ({ data: { error: 'already_friends_or_pending' }, error: null })

    renderLeaderboard()
    await screen.findByText('bia#9012')

    const biaRow = screen.getByText('bia#9012').closest('li') as HTMLLIElement
    await user.click(
      within(biaRow).getByRole('button', { name: 'Adicionar bia#9012 como amigo' }),
    )

    expect(
      await screen.findByText('Vocês já são amigos ou já existe uma solicitação pendente.'),
    ).toBeInTheDocument()
    expect(within(biaRow).getByRole('button', { name: 'Adicionar bia#9012 como amigo' })).toBeEnabled()
  })

  it('abre o perfil público ao clicar numa linha do ranking', async () => {
    const user = userEvent.setup()
    renderLeaderboard()
    await screen.findByText('bia#9012')

    await user.click(screen.getByText('bia#9012'))

    const dialog = await screen.findByRole('dialog', { name: 'Bia' })
    expect(within(dialog).getByText('Foco: Concurso')).toBeInTheDocument()
    expect(within(dialog).getByText('Foco total')).toBeInTheDocument()
    expect(within(dialog).getByTestId('public-profile-level')).toHaveTextContent('Nível 5')
    expect(within(dialog).getByRole('button', { name: '+ Adicionar Amigo' })).toBeInTheDocument()
  })

  it('não abre o modal ao clicar no botão de adicionar da linha', async () => {
    const user = userEvent.setup()
    renderLeaderboard()
    await screen.findByText('bia#9012')

    const biaRow = screen.getByText('bia#9012').closest('li') as HTMLLIElement
    await user.click(within(biaRow).getByRole('button', { name: 'Adicionar bia#9012 como amigo' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Solicitação de amizade enviada!')).toBeInTheDocument()
  })

  it('envia solicitação de amizade a partir do modal e atualiza a linha', async () => {
    const user = userEvent.setup()
    renderLeaderboard()
    await screen.findByText('bia#9012')

    const biaRow = screen.getByText('bia#9012').closest('li') as HTMLLIElement
    await user.click(within(biaRow).getByText('bia#9012'))
    const dialog = await screen.findByRole('dialog', { name: 'Bia' })

    await user.click(within(dialog).getByRole('button', { name: '+ Adicionar Amigo' }))

    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: 'Solicitação Enviada' })).toBeInTheDocument()
    })

    expect(
      within(biaRow).getByRole('button', { name: 'Solicitação enviada para bia#9012' }),
    ).toBeDisabled()
  })
})
