import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import { SocialProvider } from '../features/social/context/SocialContext'
import { AuthProvider } from '../features/auth/AuthContext'
import { SocialPage } from './SocialPage'

const { getSession, onAuthStateChange, from, rpc, channel, removeChannel } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession, onAuthStateChange },
    from,
    rpc,
    channel,
    removeChannel,
  },
}))

const USER_ID = 'user-1'

interface ChannelCallbacks {
  postgresChanges: ((payload: unknown) => void) | null
}

let tagsValue: { player_tag: string | null }
let friendsValue: {
  friendship_id: string
  peer_id: string
  peer_tag: string | null
  peer_level: number
  peer_xp: number
  created_at: string
}[]
let pendingInvitesValue: {
  friendship_id: string
  sender_id: string
  sender_tag: string | null
  sender_level: number
  sender_xp: number
  created_at: string
}[]

function setupChannel(callbacks: ChannelCallbacks) {
  const channelObj = {
    on: vi.fn((_event: string, _opts: unknown, callback: (payload: unknown) => void) => {
      callbacks.postgresChanges = callback
      return channelObj
    }),
    subscribe: vi.fn(),
  }
  channel.mockReturnValue(channelObj)
}

function mockRpc() {
  rpc.mockImplementation((fn: string) => {
    if (fn === 'get_friends') return Promise.resolve({ data: friendsValue, error: null })
    if (fn === 'get_pending_invites') return Promise.resolve({ data: pendingInvitesValue, error: null })
    if (fn === 'count_pending_invites') return Promise.resolve({ data: pendingInvitesValue.length, error: null })
    if (fn === 'remove_friend') {
      pendingInvitesValue = []
      return Promise.resolve({ data: { success: true }, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  })
}

function mockProfiles() {
  from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: tagsValue, error: null }),
        }),
      }
    }
    return { select: vi.fn() }
  })
}

const callbacks: ChannelCallbacks = { postgresChanges: null }

beforeEach(() => {
  tagsValue = { player_tag: 'william#8492' }
  friendsValue = [
    {
      friendship_id: 'fr-1',
      peer_id: 'user-2',
      peer_tag: 'ana#1234',
      peer_level: 5,
      peer_xp: 120,
      created_at: new Date().toISOString(),
    },
  ]
  pendingInvitesValue = [
    {
      friendship_id: 'inv-1',
      sender_id: 'user-3',
      sender_tag: 'caio#5678',
      sender_level: 3,
      sender_xp: 80,
      created_at: new Date().toISOString(),
    },
  ]
  callbacks.postgresChanges = null

  getSession.mockResolvedValue({
    data: { session: { user: { id: USER_ID } } },
    error: null,
  })
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
    error: null,
  })
  setupChannel(callbacks)
  mockRpc()
  mockProfiles()
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderSocialPage() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <SocialProvider>
          <MemoryRouter>
            <SocialPage />
          </MemoryRouter>
        </SocialProvider>
      </AuthProvider>
    </ToastProvider>,
  )
}

async function renderReady() {
  renderSocialPage()
  await waitFor(() => expect(screen.getByText('ana#1234')).toBeInTheDocument())
}

describe('SocialPage', () => {
  it('lista amigos e convites pendentes carregados do banco', async () => {
    await renderReady()

    expect(screen.getByText('ana#1234')).toBeInTheDocument()
    expect(screen.getByText('Nível 5')).toBeInTheDocument()
    expect(screen.getByText('william#8492')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /convites pendentes/i }))
    expect(screen.getByText('caio#5678')).toBeInTheDocument()
    expect(screen.getByText('Nível 3')).toBeInTheDocument()
  })

  it('remove um amigo após confirmação no modal', async () => {
    const user = userEvent.setup()
    await renderReady()

    await user.click(screen.getByRole('button', { name: /remover ana#1234 da lista de amigos/i }))

    const dialog = screen.getByRole('dialog', { name: /remover amigo/i })
    expect(dialog).toHaveTextContent(
      /tem certeza que deseja remover ana#1234 da sua lista de amigos/i,
    )

    await user.click(within(dialog).getByRole('button', { name: /^remover$/i }))

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('remove_friend', { p_friendship_id: 'fr-1' })
    })
    expect(screen.queryByText('ana#1234')).not.toBeInTheDocument()
    expect(screen.getByText(/removido da sua lista/i)).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /remover amigo/i })).not.toBeInTheDocument()
  })

  it('cancelar fecha o modal sem remover ninguém', async () => {
    const user = userEvent.setup()
    await renderReady()

    await user.click(screen.getByRole('button', { name: /remover ana#1234 da lista de amigos/i }))

    const dialog = screen.getByRole('dialog', { name: /remover amigo/i })
    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByRole('dialog', { name: /remover amigo/i })).not.toBeInTheDocument()
    expect(rpc).not.toHaveBeenCalledWith('remove_friend', expect.anything())
    expect(screen.getByText('ana#1234')).toBeInTheDocument()
  })

  it('reage ao Realtime: amizade aceita sai dos pendentes sem recarregar', async () => {
    await renderReady()

    await userEvent.click(screen.getByRole('tab', { name: /convites pendentes/i }))
    expect(screen.getByText('caio#5678')).toBeInTheDocument()

    pendingInvitesValue = []
    friendsValue = [
      {
        friendship_id: 'fr-2',
        peer_id: 'user-3',
        peer_tag: 'caio#5678',
        peer_level: 3,
        peer_xp: 80,
        created_at: new Date().toISOString(),
      },
    ]

    expect(callbacks.postgresChanges).not.toBeNull()
    callbacks.postgresChanges?.({
      eventType: 'UPDATE',
      schema: 'public',
      table: 'friendships',
      old: { id: 'inv-1', user_id: 'user-1', friend_id: 'user-3', status: 'pending' },
      new: { id: 'inv-1', user_id: 'user-1', friend_id: 'user-3', status: 'accepted' },
    })

    await waitFor(() => expect(screen.queryByText('caio#5678')).not.toBeInTheDocument())
  })
})