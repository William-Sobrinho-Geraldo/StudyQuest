import { supabase } from '../../lib/supabase'

// Scheme registrado no AndroidManifest (intent-filter) e na allowlist de
// Redirect URLs do Supabase. Mantido por compatibilidade com versões antigas
// do app que ainda podem estar no meio de um fluxo OAuth via navegador.
export const GOOGLE_REDIRECT_URI = 'studyquest://auth/callback'

export interface GoogleSignInResult {
  error?: string
}

// Inicia o fluxo de login com Google via Supabase Auth (PKCE) no NAVEGADOR.
//
// A página é redirecionada para o Google e o code é trocado automaticamente na
// volta (detectSessionInUrl). No app nativo (Android) o login com Google usa o
// Credential Manager (ver googleSignIn.ts), então este método não deve ser
// chamado lá.
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      skipBrowserRedirect: false,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return {}
}

// Trata o retorno do OAuth por deep link em versões ANTIGAS do app (fluxo via
// navegador). Apenas URLs do nosso scheme são aceitas; extrai o `code` e o
// troca por sessão (PKCE). Mantido para não interromper instalações antigas
// que ainda usavam o navegador.
export async function handleOAuthCallbackUrl(url: string): Promise<boolean> {
  if (!url.startsWith(GOOGLE_REDIRECT_URI)) {
    return false
  }

  try {
    const code = new URL(url).searchParams.get('code')
    if (!code) {
      return false
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return !error
  } catch {
    return false
  }
}
