import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorCode } from '@capawesome/capacitor-google-sign-in'
import {
  isNativeGoogleSignIn,
  signInWithGoogleNative,
  signOutGoogleNative,
} from './googleSignIn'

const mocks = vi.hoisted(() => ({
  platform: 'android',
  initialize: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signInWithIdToken: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => mocks.platform,
  },
}))

vi.mock('@capawesome/capacitor-google-sign-in', () => ({
  GoogleSignIn: {
    initialize: (...args: unknown[]) => mocks.initialize(...args),
    signIn: (...args: unknown[]) => mocks.signIn(...args),
    signOut: (...args: unknown[]) => mocks.signOut(...args),
  },
  ErrorCode: {
    SignInCanceled: 'SIGN_IN_CANCELED',
    NoCredentialAvailable: 'NO_CREDENTIAL_AVAILABLE',
    ProviderConfigurationError: 'PROVIDER_CONFIGURATION_ERROR',
  },
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: mocks.signInWithIdToken,
    },
  },
}))

beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', 'web-client-id.apps.googleusercontent.com')
  mocks.platform = 'android'
  mocks.initialize.mockReset().mockResolvedValue(undefined)
  mocks.signIn.mockReset()
  mocks.signOut.mockReset().mockResolvedValue(undefined)
  mocks.signInWithIdToken.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('isNativeGoogleSignIn', () => {
  it('retorna true no Android', () => {
    mocks.platform = 'android'
    expect(isNativeGoogleSignIn()).toBe(true)
  })

  it('retorna false no navegador', () => {
    mocks.platform = 'web'
    expect(isNativeGoogleSignIn()).toBe(false)
  })
})

describe('signInWithGoogleNative', () => {
  it('inicializa, gera nonce e autentica com signInWithIdToken', async () => {
    mocks.signIn.mockResolvedValue({ idToken: 'google-id-token' })
    mocks.signInWithIdToken.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })

    const result = await signInWithGoogleNative()

    expect(mocks.initialize).toHaveBeenCalledWith({
      clientId: 'web-client-id.apps.googleusercontent.com',
    })

    // O plugin deve receber o nonce HASHED (64 hex).
    expect(mocks.signIn).toHaveBeenCalledTimes(1)
    const signInArg = mocks.signIn.mock.calls[0][0] as { nonce: string }
    expect(signInArg.nonce).toMatch(/^[0-9a-f]{64}$/)

    // O Supabase deve receber o nonce BRUTO (diferente do hash enviado ao plugin).
    expect(mocks.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'google-id-token',
      nonce: expect.stringMatching(/^[0-9a-f]{64}$/) as unknown as string,
    })
    const idTokenArg = mocks.signInWithIdToken.mock.calls[0][0] as { nonce: string }
    expect(idTokenArg.nonce).not.toBe(signInArg.nonce)

    expect(result).toEqual({ session: { user: { id: 'user-1' } } })
  })

  it('retorna erro de segurança quando o nonce não confere', async () => {
    mocks.signIn.mockResolvedValue({ idToken: 'google-id-token' })
    mocks.signInWithIdToken.mockResolvedValue({
      data: { session: null },
      error: { message: 'Nonces mismatch' },
    })

    const result = await signInWithGoogleNative()

    expect(result.error).toBe('Falha de segurança ao validar o login. Tente novamente.')
  })

  it('retorna mensagem amigável quando o usuário cancela', async () => {
    mocks.signIn.mockRejectedValue({
      code: ErrorCode.SignInCanceled,
      message: 'The user canceled the sign-in flow.',
    })

    const result = await signInWithGoogleNative()

    expect(result.error).toBe('Login com Google cancelado.')
    expect(mocks.signInWithIdToken).not.toHaveBeenCalled()
  })

  it('traduz erro de configuração do Android OAuth Client', async () => {
    mocks.signIn.mockRejectedValue({
      code: ErrorCode.SignInCanceled,
      message: 'Account reauth failed',
    })

    const result = await signInWithGoogleNative()

    expect(result.error).toContain('Google Cloud')
  })

  it('traduz provedor não habilitado retornado pelo Supabase', async () => {
    mocks.signIn.mockResolvedValue({ idToken: 'google-id-token' })
    mocks.signInWithIdToken.mockResolvedValue({
      data: { session: null },
      error: { message: 'Provider is not enabled' },
    })

    const result = await signInWithGoogleNative()

    expect(result.error).toBe(
      'O login com Google ainda não está habilitado. Entre em contato com o suporte.',
    )
  })
})

describe('signOutGoogleNative', () => {
  it('chama o signOut do plugin', async () => {
    await signOutGoogleNative()
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
  })
})
