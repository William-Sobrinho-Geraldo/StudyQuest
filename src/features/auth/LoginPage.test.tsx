import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { within, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  authMocks.signUp.mockResolvedValue({ data: { session: null }, error: null })
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
    expect(screen.getByText('Heroi')).toBeInTheDocument()
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

  it('navega para o dashboard mesmo quando o usuário ainda não tem display_name', async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })
    authMocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'user-1', display_name: null },
            error: null,
          }),
        }),
      }),
    })

    renderApp('/login')
    await fillAndSubmit(credentials.email, credentials.password)

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Crie seu Herói' })).not.toBeInTheDocument()
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

describe('RegisterModal — fluxo de cadastro', () => {
  async function openRegister() {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /cadastre-se/i }))
  }

  async function fillRegister(email: string, password: string) {
    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog')
    if (email) {
      await user.type(within(dialog).getByLabelText(/email/i), email)
    }
    if (password) {
      await user.type(within(dialog).getByLabelText(/senha/i), password)
    }
    await user.click(within(dialog).getByRole('button', { name: /criar conta/i }))
  }

  it('abre o modal ao clicar em Cadastre-se', async () => {
    renderApp('/login')
    await openRegister()

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Cadastre-se')
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
  })

  it('cadastra, faz login automático e navega para a home', async () => {
    authMocks.signUp.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })

    renderApp('/login')
    await openRegister()
    await fillRegister(credentials.email, credentials.password)

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(authMocks.signUp).toHaveBeenCalledWith(credentials)
    expect(screen.getByText('Heroi')).toBeInTheDocument()
  })

  it('exibe erro e permanece no modal quando o cadastro falha', async () => {
    authMocks.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: 'User already registered' },
    })

    renderApp('/login')
    await openRegister()
    await fillRegister(credentials.email, credentials.password)

    expect(await screen.findByRole('alert')).toHaveTextContent('User already registered')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(authMocks.signUp).toHaveBeenCalledWith(credentials)
  })

  it('mostra aviso de confirmação de email quando não há sessão', async () => {
    renderApp('/login')
    await openRegister()
    await fillRegister(credentials.email, credentials.password)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Confirme seu email para ativar a conta',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(authMocks.signUp).toHaveBeenCalledWith(credentials)
  })

  it('valida senha com menos de 6 caracteres', async () => {
    renderApp('/login')
    await openRegister()
    await fillRegister(credentials.email, '12345')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A senha deve ter pelo menos 6 caracteres',
    )
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })

  it('valida o formato do email antes de chamar o Supabase', async () => {
    renderApp('/login')
    await openRegister()
    await fillRegister('email-sem-arroba', 'secret123')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email inválido. Use o formato correto: nome@exemplo.com',
    )
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })

  it('traduz o erro de email inválido retornado pelo Supabase', async () => {
    authMocks.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: 'Email address "admin@gmail.com" is invalid' },
    })

    renderApp('/login')
    await openRegister()
    await fillRegister('admin@gmail.com', 'secret123')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email inválido. Use o formato correto: nome@exemplo.com',
    )
    expect(screen.queryByText(/^Email address/)).not.toBeInTheDocument()
    expect(authMocks.signUp).toHaveBeenCalledOnce()
  })
})