import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { renderApp } from '../test/test-utils'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
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
  authMocks.signOut.mockResolvedValue({ error: null })
  authMocks.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
  authMocks.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'user-1',
            level: 1,
            current_xp: 0,
            gold: 0,
            created_at: new Date().toISOString(),
            current_streak: 0,
            last_streak_date: null,
            daily_goal_minutes: 30,
            last_chest_claim: new Date().toISOString(),
            player_tag: null,
            display_name: 'Heroi',
            avatar_id: null,
            equipped_title: null,
            unlocked_titles: [],
          },
          error: null,
        }),
      }),
    }),
  })
  authMocks.rpc.mockResolvedValue({ data: null, error: null })
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