import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { renderApp } from '../../test/test-utils'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
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
  },
}))

function makeSession(overrides: Partial<Session> = {}): Session {
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
    ...overrides,
  }
}

beforeEach(() => {
  authMocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
  authMocks.signInWithPassword.mockResolvedValue({ data: { session: null }, error: null })
  authMocks.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
  authMocks.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  })
  authMocks.rpc.mockResolvedValue({ data: null, error: null })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('ProtectedRoute — barreira de rotas protegidas', () => {
  it('redireciona usuário não autenticado de rota protegida para /login', async () => {
    renderApp('/forge')

    expect(await screen.findByRole('heading', { name: 'StudyQuest' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Forge' })).not.toBeInTheDocument()
  })

  it('permite o acesso à rota protegida quando autenticado', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })

    renderApp('/leaderboard')

    expect(await screen.findByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'StudyQuest' })).not.toBeInTheDocument()
  })

  it('mostra o estado de carregamento enquanto a sessão é restaurada', async () => {
    authMocks.getSession.mockReturnValue(new Promise(() => {}))

    renderApp('/')

    expect(screen.getByRole('status')).toHaveTextContent('Carregando sessão...')
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument()
  })

  it('redireciona usuário autenticado que visita /login para o dashboard', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })

    renderApp('/login')

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})