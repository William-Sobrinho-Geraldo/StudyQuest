import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { renderApp } from '../../test/test-utils'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      signInWithPassword: authMocks.signInWithPassword,
      signOut: authMocks.signOut,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
  },
}))

const credentials = { email: 'hero@studyquest.dev', password: 'senha-secreta' }

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
      email: credentials.email,
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
})

afterEach(() => {
  vi.clearAllMocks()
})

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup()
  if (email) {
    await user.type(screen.getByLabelText(/email/i), email)
  }
  if (password) {
    await user.type(screen.getByLabelText(/senha/i), password)
  }
  await user.click(screen.getByRole('button', { name: /entrar/i }))
}

describe('LoginPage — fluxo de autenticação', () => {
  it('autentica com credenciais válidas e navega para o dashboard', async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })

    renderApp('/login')
    await fillAndSubmit(credentials.email, credentials.password)

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(authMocks.signInWithPassword).toHaveBeenCalledWith(credentials)
    expect(screen.getByText(credentials.email)).toBeInTheDocument()
  })

  it('exibe erro e permanece no login quando as credenciais são inválidas', async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    })

    renderApp('/login')
    await fillAndSubmit(credentials.email, credentials.password)

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toHaveValue(credentials.email)
    expect(authMocks.signInWithPassword).toHaveBeenCalledWith(credentials)
  })

  it('não chama o Supabase quando os campos estão vazios', async () => {
    renderApp('/login')
    await fillAndSubmit('', '')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe seu email e senha.',
    )
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled()
  })
})