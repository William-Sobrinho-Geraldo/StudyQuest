import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { renderApp } from '../test/test-utils'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      signInWithPassword: authMocks.signInWithPassword,
      signOut: authMocks.signOut,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
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
  authMocks.signOut.mockResolvedValue({ error: null })
  authMocks.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('AppShell — encerramento de sessão', () => {
  it('faz logout e redireciona para /login', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })

    renderApp('/')
    await screen.findByRole('heading', { name: 'Dashboard' })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /sair/i }))

    expect(await screen.findByRole('heading', { name: 'StudyQuest' })).toBeInTheDocument()
    expect(authMocks.signOut).toHaveBeenCalledOnce()
  })
})