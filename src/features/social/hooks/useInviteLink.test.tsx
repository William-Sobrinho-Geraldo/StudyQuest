import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '../../auth/AuthContext'
import { useInviteLink } from './useInviteLink'

const PENDING_INVITE_KEY = 'studyquest_pending_invite'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
      signOut: authMocks.signOut,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
    from: authMocks.from,
    rpc: authMocks.rpc,
    channel: authMocks.channel,
    removeChannel: authMocks.removeChannel,
  },
}))

function makeSession() {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_at: 4_107_000_000,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-1',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'hero@studyquest.dev',
      created_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
    },
  }
}

// Simula o InviteLinkHandler: instância única fora das Rotas, que sobrevive
// à navegação e mantém o pendingInvite.
function InviteProbe() {
  const { pendingInvite, processPendingInvite, dismissInvite } = useInviteLink()
  const location = useLocation()
  return (
    <div>
      <span data-testid="location">
        {location.pathname}
        {location.search}
      </span>
      <span data-testid="pending">{pendingInvite?.tag ?? 'none'}</span>
      <span data-testid="stored">{localStorage.getItem(PENDING_INVITE_KEY) ?? 'null'}</span>
      <button type="button" onClick={processPendingInvite}>
        process
      </button>
      <button type="button" onClick={dismissInvite}>
        dismiss
      </button>
    </div>
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <InviteProbe />
        <Routes>
          <Route path="/" element={<div>HOME</div>} />
          <Route path="/invite" element={<div>INVITE</div>} />
          <Route path="/register" element={<div>REGISTER</div>} />
          <Route path="/login" element={<div>LOGIN</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  authMocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
  authMocks.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
  authMocks.channel.mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })
  authMocks.removeChannel.mockResolvedValue('ok')
  authMocks.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useInviteLink — captura global do convite', () => {
  it('salva o convite no localStorage e redireciona deslogado para /register', async () => {
    renderAt('/invite?ref=ana%231234')

    expect(await screen.findByText('REGISTER')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/register')
    expect(screen.getByTestId('location')).not.toHaveTextContent('ref=')
    expect(screen.getByTestId('pending')).toHaveTextContent('none')

    const stored = JSON.parse(localStorage.getItem(PENDING_INVITE_KEY) as string)
    expect(stored.tag).toBe('ana#1234')
  })

  it('logado: limpia a URL, mantém o convite salvo e redireciona para o dashboard', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: makeSession() }, error: null })

    renderAt('/invite?ref=ana%231234')

    expect(await screen.findByText('HOME')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
    expect(screen.getByTestId('location')).not.toHaveTextContent('ref=')
    expect(screen.getByTestId('pending')).toHaveTextContent('ana#1234')
    expect(localStorage.getItem(PENDING_INVITE_KEY)).not.toBeNull()
  })

  it('processPendingInvite reabre o convite salvo sem apagar o localStorage', async () => {
    localStorage.setItem(
      PENDING_INVITE_KEY,
      JSON.stringify({ tag: 'ana#1234', timestamp: 1_234 }),
    )

    renderAt('/')
    expect(await screen.findByTestId('pending')).toHaveTextContent('none')

    await userEvent.click(screen.getByRole('button', { name: 'process' }))

    expect(screen.getByTestId('pending')).toHaveTextContent('ana#1234')
    expect(localStorage.getItem(PENDING_INVITE_KEY)).not.toBeNull()
  })

  it('dismissInvite fecha o modal e remove o convite do localStorage', async () => {
    localStorage.setItem(
      PENDING_INVITE_KEY,
      JSON.stringify({ tag: 'ana#1234', timestamp: 1_234 }),
    )

    renderAt('/')
    await userEvent.click(screen.getByRole('button', { name: 'process' }))
    expect(screen.getByTestId('pending')).toHaveTextContent('ana#1234')

    await userEvent.click(screen.getByRole('button', { name: 'dismiss' }))

    expect(screen.getByTestId('pending')).toHaveTextContent('none')
    expect(localStorage.getItem(PENDING_INVITE_KEY)).toBeNull()
  })
})