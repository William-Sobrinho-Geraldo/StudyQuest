import { Capacitor } from '@capacitor/core'
import { GoogleSignIn, ErrorCode } from '@capawesome/capacitor-google-sign-in'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { generateNonce, sha256Hex } from './nonce'

export interface NativeGoogleSignInResult {
  error?: string
  session?: Session | null
}

let initializePromise: Promise<void> | null = null

// Retorna true apenas no Android nativo, onde o Credential Manager está
// disponível. No navegador (dev/prod) e no iOS usamos o fluxo OAuth clássico.
export function isNativeGoogleSignIn(): boolean {
  return Capacitor.getPlatform() === 'android'
}

function ensureInitialized(): Promise<void> {
  if (!initializePromise) {
    initializePromise = (async () => {
      const clientId = (import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? '').trim()
      if (!clientId) {
        throw new Error('Missing required environment variable: VITE_GOOGLE_WEB_CLIENT_ID')
      }
      await GoogleSignIn.initialize({ clientId })
    })().catch((error) => {
      // Permite tentar novamente após uma falha (ex.: env ausente no build).
      initializePromise = null
      throw error
    })
  }
  return initializePromise
}

// Login nativo com Google (Credential Manager) + Supabase via ID token.
//
// Fluxo:
//   1. Gera um nonce bruto `N`.
//   2. Calcula `H = sha256Hex(N)` e envia `GoogleSignIn.signIn({ nonce: H })`.
//      O Google devolve `H` como a claim `nonce` do ID token.
//   3. Chama `signInWithIdToken({ provider: 'google', token, nonce: N })`; o
//      Supabase calcula `sha256Hex(N)` e compara com a claim `nonce` do token,
//      rejeitando em caso de divergência (proteção contra replay).
export async function signInWithGoogleNative(): Promise<NativeGoogleSignInResult> {
  try {
    await ensureInitialized()

    const rawNonce = generateNonce()
    const hashedNonce = await sha256Hex(rawNonce)

    const { idToken } = await GoogleSignIn.signIn({ nonce: hashedNonce })

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      nonce: rawNonce,
    })

    if (error) {
      return { error: translateSupabaseError(error.message) }
    }

    return { session: data.session }
  } catch (error) {
    return { error: translatePluginError(error) }
  }
}

// Limpa o estado de credencial do Google no dispositivo (para que o seletor de
// conta volte a mostrar todas as contas no próximo login).
export async function signOutGoogleNative(): Promise<void> {
  try {
    await GoogleSignIn.signOut()
  } catch {
    // A limpeza do estado é best-effort; não deve derrubar o fluxo de saída.
  }
}

function translateSupabaseError(message: string): string {
  if (/provider.*(not enabled|disabled)|unsupported provider/i.test(message)) {
    return 'O login com Google ainda não está habilitado. Entre em contato com o suporte.'
  }
  if (/nonce/i.test(message)) {
    return 'Falha de segurança ao validar o login. Tente novamente.'
  }
  return message
}

function translatePluginError(error: unknown): string {
  const err = error as { code?: string; message?: string } | null
  const code = err?.code
  const message = err?.message ?? (error instanceof Error ? error.message : String(error))

  if (code === ErrorCode.SignInCanceled) {
    // O Google Play services também reporta falhas de configuração (ex.:
    // Android OAuth Client ausente no Google Cloud) como cancelamento, então
    // preservamos a mensagem original para facilitar o diagnóstico.
    if (/reauth|unregistered_on_api_console|api_console/i.test(message)) {
      return 'Não foi possível conectar à conta Google. Verifique a configuração do OAuth no Google Cloud (nome do pacote e SHA-1).'
    }
    return 'Login com Google cancelado.'
  }
  if (code === ErrorCode.NoCredentialAvailable) {
    return 'Nenhuma conta Google disponível neste dispositivo.'
  }
  if (code === ErrorCode.ProviderConfigurationError) {
    return 'Serviços do Google Play indisponíveis ou desatualizados.'
  }
  return message
}
