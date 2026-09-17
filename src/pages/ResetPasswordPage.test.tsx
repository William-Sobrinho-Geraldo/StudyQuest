import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { renderApp } from '../test/test-utils'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      updateUser: authMocks.updateUser,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
    from: authMocks.from,
    rpc: authMocks.rpc,
  },
}))

const NEW_PASSWORD = 'nova-senha-segura'

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
  authMocks.updateUser.mockResolvedValue({ data: { user: null }, error: null })
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
  window.history.replaceState(null, '', '/')
})

async function fillPasswordFields(password: string, confirm: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Nova Senha'), password)
  await user.type(screen.getByLabelText('Confirmar Nova Senha'), confirm)
  await user.click(screen.getByRole('button', { name: /redefinir senha/i }))
}

describe('ResetPasswordPage — redefinição de senha', () => {
  it('exibe o formulário quando há sessão de recuperação', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })

    renderApp('/reset-password')

    expect(await screen.findByRole('heading', { name: 'Definir nova senha' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nova Senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar Nova Senha')).toBeInTheDocument()
  })

  it('alterna a visibilidade das senhas com o botão de olhinho', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })
    const user = userEvent.setup()

    renderApp('/reset-password')
    await screen.findByRole('heading', { name: 'Definir nova senha' })

    const passwordInput = screen.getByLabelText('Nova Senha')
    const confirmInput = screen.getByLabelText('Confirmar Nova Senha')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar confirmação' }))
    expect(confirmInput).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Ocultar confirmação' }))
    expect(confirmInput).toHaveAttribute('type', 'password')
  })

  it('mantém o botão desabilitado até os campos serem iguais e válidos', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })
    const user = userEvent.setup()

    renderApp('/reset-password')
    await screen.findByRole('heading', { name: 'Definir nova senha' })

    const submitButton = screen.getByRole('button', { name: 'Redefinir senha' })
    const passwordInput = screen.getByLabelText('Nova Senha')
    const confirmInput = screen.getByLabelText('Confirmar Nova Senha')

    expect(submitButton).toBeDisabled()

    await user.type(passwordInput, '123')
    expect(submitButton).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A nova senha deve ter pelo menos 6 caracteres.',
    )

    await user.type(passwordInput, '456')
    await user.type(confirmInput, '654321')
    expect(submitButton).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('As senhas não coincidem.')

    await user.clear(confirmInput)
    await user.type(confirmInput, '123456')
    expect(submitButton).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('valida senha com menos de 6 caracteres sem chamar o Supabase', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })

    renderApp('/reset-password')
    await screen.findByRole('heading', { name: 'Definir nova senha' })
    await fillPasswordFields('12345', '12345')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A nova senha deve ter pelo menos 6 caracteres.',
    )
    expect(authMocks.updateUser).not.toHaveBeenCalled()
  })

  it('valida quando as senhas não coincidem', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })

    renderApp('/reset-password')
    await screen.findByRole('heading', { name: 'Definir nova senha' })
    await fillPasswordFields(NEW_PASSWORD, 'outra-senha')

    expect(await screen.findByRole('alert')).toHaveTextContent('As senhas não coincidem.')
    expect(authMocks.updateUser).not.toHaveBeenCalled()
  })

  it('redefine a senha e navega para o dashboard com sucesso', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })

    renderApp('/reset-password')
    await screen.findByRole('heading', { name: 'Definir nova senha' })
    await fillPasswordFields(NEW_PASSWORD, NEW_PASSWORD)

    await screen.findByRole('heading', { name: 'Bem-vindo, Herói' })
    expect(authMocks.updateUser).toHaveBeenCalledWith({ password: NEW_PASSWORD })
    expect(screen.getByRole('status')).toHaveTextContent('Senha redefinida com sucesso!')
  })

  it('exibe a mensagem de link expirado quando não há sessão', async () => {
    renderApp('/reset-password')

    expect(await screen.findByRole('heading', { name: 'Link inválido ou expirado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ir para o login/i })).toBeInTheDocument()
    expect(authMocks.updateUser).not.toHaveBeenCalled()
  })

  it('não exibe o erro enquanto a checagem da sessão está pendente', async () => {
    let release!: () => void
    const gate = new Promise<{ data: { session: Session | null }; error: null }>((resolve) => {
      release = () => resolve({ data: { session: null }, error: null })
    })
    authMocks.getSession.mockReturnValue(gate)

    renderApp('/reset-password')

    expect(screen.getByRole('status')).toHaveTextContent('Verificando link de recuperação')
    expect(screen.queryByRole('heading', { name: 'Link inválido ou expirado' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Definir nova senha' })).not.toBeInTheDocument()

    release()

    expect(await screen.findByRole('heading', { name: 'Link inválido ou expirado' })).toBeInTheDocument()
  })

  it('aceita a sessão de recuperação estabelecida via tokens no hash', async () => {
    window.history.replaceState(
      null,
      '',
      '/reset-password#access_token=abc&refresh_token=def&type=recovery',
    )

    let calls = 0
    authMocks.getSession.mockImplementation(async () => {
      calls += 1
      return { data: { session: calls >= 4 ? makeSession() : null }, error: null }
    })

    renderApp('/reset-password')

    expect(
      await screen.findByRole('heading', { name: 'Definir nova senha' }, { timeout: 3000 }),
    ).toBeInTheDocument()
  })

  it('exibe o erro retornado pelo Supabase no updateUser', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: makeSession() },
      error: null,
    })
    authMocks.updateUser.mockResolvedValue({
      data: null,
      error: { message: 'Password update requires reauthentication' },
    })

    renderApp('/reset-password')
    await screen.findByRole('heading', { name: 'Definir nova senha' })
    await fillPasswordFields(NEW_PASSWORD, NEW_PASSWORD)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password update requires reauthentication',
    )
    expect(authMocks.updateUser).toHaveBeenCalledWith({ password: NEW_PASSWORD })
  })
})