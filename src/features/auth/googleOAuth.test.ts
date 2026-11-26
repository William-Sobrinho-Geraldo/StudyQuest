import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GOOGLE_REDIRECT_URI,
  handleOAuthCallbackUrl,
  signInWithGoogle,
} from './googleOAuth'

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: mocks.signInWithOAuth,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
    },
  },
}))

beforeEach(() => {
  mocks.signInWithOAuth.mockReset()
  mocks.exchangeCodeForSession.mockReset()
  mocks.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null })
  mocks.exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: null })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('signInWithGoogle', () => {
  it('chama o OAuth com redirect para a própria origem e skipBrowserRedirect=false', async () => {
    mocks.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://projeto.supabase.co/auth/v1/authorize' },
      error: null,
    })

    const result = await signInWithGoogle()

    expect(result).toEqual({})
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin, skipBrowserRedirect: false },
    })
  })

  it('retorna o erro quando o Supabase rejeita a autorização', async () => {
    mocks.signInWithOAuth.mockResolvedValue({
      data: {},
      error: { message: 'Unsupported provider' },
    })

    const result = await signInWithGoogle()

    expect(result).toEqual({ error: 'Unsupported provider' })
  })
})

describe('handleOAuthCallbackUrl', () => {
  it('troca o code por sessão e retorna true', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    })

    const handled = await handleOAuthCallbackUrl(
      `${GOOGLE_REDIRECT_URI}?code=abc123`,
    )

    expect(handled).toBe(true)
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc123')
  })

  it('ignora URLs fora do scheme do app', async () => {
    const handled = await handleOAuthCallbackUrl('https://malicioso.com/auth/callback?code=abc')

    expect(handled).toBe(false)
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('ignora URLs sem code', async () => {
    const handled = await handleOAuthCallbackUrl(GOOGLE_REDIRECT_URI)

    expect(handled).toBe(false)
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('retorna false quando a troca de code falha', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'invalid code' },
    })

    const handled = await handleOAuthCallbackUrl(`${GOOGLE_REDIRECT_URI}?code=ruim`)

    expect(handled).toBe(false)
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('ruim')
  })
})
