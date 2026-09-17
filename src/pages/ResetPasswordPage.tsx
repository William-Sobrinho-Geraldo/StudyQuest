import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Loader2, Lock, MailX } from 'lucide-react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useToast } from '../components/Toast'
import { AuthLoadingScreen } from '../features/auth/AuthLoadingScreen'
import { supabase } from '../lib/supabase'

const PASSWORD_MIN = 6
const RECOVERY_POLL_INTERVAL_MS = 250
const RECOVERY_GRACE_MS = 3000

type RecoveryState = 'checking' | 'valid' | 'invalid'

function hasRecoveryParameters(hash: string): boolean {
  return /[?#&](access_token|type=recovery)([=&#]|$)/i.test(hash)
}

function isRecoverySessionEvent(event: AuthChangeEvent, session: Session | null): boolean {
  if (!session) return false
  return (
    event === 'PASSWORD_RECOVERY' ||
    event === 'SIGNED_IN' ||
    event === 'INITIAL_SESSION' ||
    event === 'TOKEN_REFRESHED'
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [recovery, setRecovery] = useState<RecoveryState>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const passwordTooShort = password.length > 0 && password.length < PASSWORD_MIN
  const passwordsDoNotMatch = password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword
  const canSubmit =
    password.length >= PASSWORD_MIN && password === confirmPassword && confirmPassword.length > 0

  useEffect(() => {
    let active = true
    let settled = false

    const settle = (state: RecoveryState) => {
      if (!active || settled) return
      settled = true
      setRecovery(state)
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (isRecoverySessionEvent(event, session)) {
        settle('valid')
      }
    })

    async function resolveRecoverySession() {
      let session: Session | null = null
      try {
        const { data } = await supabase.auth.getSession()
        session = data.session
      } catch {
        session = null
      }

      if (session) {
        settle('valid')
        return
      }

      if (!hasRecoveryParameters(window.location.hash)) {
        settle('invalid')
        return
      }

      const startedAt = Date.now()
      const pollForSession = async () => {
        const { data: pollData } = await supabase.auth.getSession()
        if (pollData.session) {
          settle('valid')
          return
        }
        if (Date.now() - startedAt >= RECOVERY_GRACE_MS) {
          settle('invalid')
          return
        }
        window.setTimeout(() => void pollForSession(), RECOVERY_POLL_INTERVAL_MS)
      }
      void pollForSession()
    }

    void resolveRecoverySession()

    return () => {
      active = false
      authListener?.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < PASSWORD_MIN) {
      setError(`A nova senha deve ter pelo menos ${PASSWORD_MIN} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      showToast('Senha redefinida com sucesso!')
      navigate('/', { replace: true })
    } catch {
      setError('Não foi possível redefinir a senha. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (recovery === 'checking') {
    return <AuthLoadingScreen label="Verificando link de recuperação" />
  }

  if (recovery === 'invalid') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl sm:p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
            <MailX className="h-6 w-6 text-amber-400" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-slate-400">
            Não foi possível identificar uma sessão de recuperação. Solicite um novo link pela
            tela de login.
          </p>
          <Link
            to="/login"
            className="mt-6 flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <KeyRound className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold">Definir nova senha</h1>
          <p className="mt-1 text-sm text-slate-400">Escolha uma nova senha para acessar sua conta</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-300">
              Nova Senha
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="new-password"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                enterKeyHint="next"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (error) setError(null)
                }}
                placeholder="Mínimo de 6 caracteres"
                aria-describedby={passwordTooShort ? 'new-password-error' : undefined}
                className="h-12 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-12 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 grid h-10 w-10 touch-manipulation select-none -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white active:scale-95"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
            {passwordTooShort && (
              <p id="new-password-error" role="alert" className="mt-1.5 text-xs text-red-400">
                A nova senha deve ter pelo menos {PASSWORD_MIN} caracteres.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-300">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                enterKeyHint="done"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  if (error) setError(null)
                }}
                placeholder="Repita a nova senha"
                aria-describedby={passwordsDoNotMatch ? 'confirm-password-error' : undefined}
                className="h-12 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-12 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                aria-pressed={showConfirmPassword}
                className="absolute right-1 top-1/2 grid h-10 w-10 touch-manipulation select-none -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white active:scale-95"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
            {passwordsDoNotMatch && (
              <p id="confirm-password-error" role="alert" className="mt-1.5 text-xs text-red-400">
                As senhas não coincidem.
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            {submitting ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          <Link
            to="/login"
            className="inline-flex min-h-[44px] touch-manipulation select-none items-center font-semibold text-indigo-400 transition hover:text-indigo-300"
          >
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}