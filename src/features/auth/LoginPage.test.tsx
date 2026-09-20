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
  updateUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
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
      updateUser: authMocks.updateUser,
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
    from: authMocks.from,
    rpc: authMocks.rpc,
  },
}))

const credentials = { email: 'hero@studyquest.dev', password: 'senha-secreta' }

const signUpPayload = {
  email: credentials.email,
  password: credentials.password,
  options: { data: { full_name: 'Hero' } },
}

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
  authMocks.updateUser.mockResolvedValue({ data: { user: null }, error: null })
  authMocks.resetPasswordForEmail.mockResolvedValue({ data: null, error: null })
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
  authMocks.rpc.mockResolvedValue({ data: true, error: null })
})

afterEach(() => {
  vi.clearAllMocks()
})

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup()
  if (email) {
    await user.type(await screen.findByLabelText(/email/i), email)
  }
  if (password) {
    await user.type(await screen.findByLabelText('Senha', { selector: 'input' }), password)
  }
  await user.click(await screen.findByRole('button', { name: /entrar/i }))
}

describe('LoginPage — fluxo de autenticação', () => {
  it('autentica com credenciais válidas e navega para o dashboard', async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })

    renderApp('/login')
    await fillAndSubmit(credentials.email, credentials.password)

    expect(await screen.findByRole('heading', { name: 'Bem-vindo, Herói' })).toBeInTheDocument()
    expect(authMocks.signInWithPassword).toHaveBeenCalledWith(credentials)
    expect(await screen.findByText('Heroi')).toBeInTheDocument()
  })

  it('exibe erro e permanece no login quando as credenciais são inválidas', async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    })

    renderApp('/login')
    await fillAndSubmit(credentials.email, credentials.password)

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
    expect(screen.queryByRole('heading', { name: 'Bem-vindo, Herói' })).not.toBeInTheDocument()
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

    expect(await screen.findByRole('heading', { name: 'Bem-vindo, Herói' })).toBeInTheDocument()
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

  it('alterna a visibilidade da senha pelo olhinho', async () => {
    renderApp('/login')

    const user = userEvent.setup()
    const passwordInput = await screen.findByLabelText('Senha', { selector: 'input' })

    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(await screen.findByRole('button', { name: 'Mostrar senha' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await user.click(await screen.findByRole('button', { name: 'Mostrar senha' }))

    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }))

    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})

describe('RegisterModal — fluxo de cadastro', () => {
  async function openRegister() {
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /cadastre-se/i }))
  }

  async function fillRegister(email: string, password: string, confirmPassword?: string) {
    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/nome/i), 'Hero')
    if (email) {
      await user.type(within(dialog).getByLabelText(/email/i), email)
    }
    if (password) {
      await user.type(within(dialog).getByLabelText('Senha'), password)
    }
    await user.type(within(dialog).getByLabelText('Confirmar Senha'), confirmPassword ?? password)
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

    expect(await screen.findByRole('heading', { name: 'Bem-vindo, Herói' })).toBeInTheDocument()
    expect(authMocks.signUp).toHaveBeenCalledWith(signUpPayload)
    expect(await screen.findByText('Heroi')).toBeInTheDocument()
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
    expect(authMocks.signUp).toHaveBeenCalledWith(signUpPayload)
  })

  it('mostra aviso de confirmação de email quando não há sessão', async () => {
    renderApp('/login')
    await openRegister()
    await fillRegister(credentials.email, credentials.password)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Confirme seu email para ativar a conta',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(authMocks.signUp).toHaveBeenCalledWith(signUpPayload)
  })

  it('mantém o botão desabilitado com senha menor que 6 caracteres', async () => {
    renderApp('/login')
    await openRegister()

    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/nome/i), 'Hero')
    await user.type(within(dialog).getByLabelText(/email/i), credentials.email)
    await user.type(within(dialog).getByLabelText('Senha'), '12345')
    await user.type(within(dialog).getByLabelText('Confirmar Senha'), '12345')

    expect(within(dialog).getByRole('button', { name: /criar conta/i })).toBeDisabled()
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })

  it('mantém o botão desabilitado sem nome', async () => {
    renderApp('/login')
    await openRegister()

    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/email/i), credentials.email)
    await user.type(within(dialog).getByLabelText('Senha'), credentials.password)
    await user.type(within(dialog).getByLabelText('Confirmar Senha'), credentials.password)

    expect(within(dialog).getByRole('button', { name: /criar conta/i })).toBeDisabled()
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })

  it('mantém o botão desabilitado enquanto faltam campos ou as senhas divergem', async () => {
    renderApp('/login')
    await openRegister()

    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog')
    const submit = within(dialog).getByRole('button', { name: /criar conta/i })

    expect(submit).toBeDisabled()

    await user.type(within(dialog).getByLabelText(/nome/i), 'Hero')
    await user.type(within(dialog).getByLabelText(/email/i), credentials.email)
    await user.type(within(dialog).getByLabelText('Senha'), credentials.password)

    expect(submit).toBeDisabled()

    await user.type(within(dialog).getByLabelText('Confirmar Senha'), 'senha-diferente')

    expect(submit).toBeDisabled()

    await user.clear(within(dialog).getByLabelText('Confirmar Senha'))
    await user.type(within(dialog).getByLabelText('Confirmar Senha'), credentials.password)

    expect(submit).toBeEnabled()
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })

  it('exibe aviso quando as senhas não coincidem', async () => {
    renderApp('/login')
    await openRegister()

    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/nome/i), 'Hero')
    await user.type(within(dialog).getByLabelText(/email/i), credentials.email)
    await user.type(within(dialog).getByLabelText('Senha'), credentials.password)
    await user.type(within(dialog).getByLabelText('Confirmar Senha'), 'senha-diferente')

    expect(await screen.findByRole('alert')).toHaveTextContent('As senhas não coincidem')
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })

  it('alterna a visibilidade da senha e da confirmação pelo olhinho', async () => {
    renderApp('/login')
    await openRegister()

    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog')
    const passwordInput = within(dialog).getByLabelText('Senha')
    const confirmInput = within(dialog).getByLabelText('Confirmar Senha')

    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmInput).toHaveAttribute('type', 'password')

    await user.click(within(dialog).getByRole('button', { name: 'Mostrar senha' }))
    await user.click(within(dialog).getByRole('button', { name: 'Mostrar confirmação' }))

    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(confirmInput).toHaveAttribute('type', 'text')

    await user.click(within(dialog).getByRole('button', { name: 'Ocultar senha' }))
    await user.click(within(dialog).getByRole('button', { name: 'Ocultar confirmação' }))

    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmInput).toHaveAttribute('type', 'password')
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

describe('ForgotPasswordModal — recuperação de senha', () => {
  async function openForgotPassword() {
    const user = userEvent.setup()
    renderApp('/login')
    await user.click(await screen.findByRole('button', { name: /esqueci minha senha/i }))
  }

  async function fillEmail(email: string) {
    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog')
    if (email) {
      await user.type(within(dialog).getByLabelText(/email/i), email)
    }
    await user.click(within(dialog).getByRole('button', { name: /enviar link/i }))
  }

  it('abre o modal ao clicar em Esqueci minha senha', async () => {
    await openForgotPassword()

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Esqueci minha senha')
    expect(screen.getByRole('button', { name: /enviar link/i })).toBeInTheDocument()
  })

  it('envia o email com redirect para a página de redefinição e mostra sucesso', async () => {
    await openForgotPassword()
    await fillEmail(credentials.email)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'enviamos um link de recuperação',
    )
    expect(authMocks.rpc).toHaveBeenCalledWith('check_email_exists', {
      email_input: credentials.email,
    })
    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith(credentials.email, {
      redirectTo: expect.stringContaining('/reset-password'),
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('exibe erro amigável e não envia o link quando o e-mail não existe', async () => {
    authMocks.rpc.mockResolvedValue({ data: false, error: null })

    await openForgotPassword()
    await fillEmail(credentials.email)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail não encontrado na nossa base de dados.',
    )
    expect(authMocks.rpc).toHaveBeenCalledWith('check_email_exists', {
      email_input: credentials.email,
    })
    expect(authMocks.resetPasswordForEmail).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('interrompe o fluxo quando a verificação falha no Supabase', async () => {
    authMocks.rpc.mockResolvedValue({ data: null, error: { message: 'RPC falhou' } })

    await openForgotPassword()
    await fillEmail(credentials.email)

    expect(await screen.findByRole('alert')).toHaveTextContent('RPC falhou')
    expect(authMocks.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('valida o formato do email antes de chamar o Supabase', async () => {
    await openForgotPassword()
    await fillEmail('sem-arroba')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email inválido. Use o formato correto: nome@exemplo.com',
    )
    expect(authMocks.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('exige email antes de chamar o Supabase', async () => {
    await openForgotPassword()
    await fillEmail('')

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe seu email.')
    expect(authMocks.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('exibe o erro retornado pelo Supabase', async () => {
    authMocks.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'For security purposes, you can only request this after 60 seconds.' },
    })

    await openForgotPassword()
    await fillEmail(credentials.email)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'For security purposes, you can only request this after 60 seconds.',
    )
    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledOnce()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})