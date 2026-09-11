import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail, Swords } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { RegisterModal } from '../features/auth/RegisterModal'
import { EMAIL_INVALID_MESSAGE, isValidEmail, translateAuthEmailError } from '../lib/validation'

interface LoginLocationState {
  from?: { pathname?: string }
}

export function LoginPage() {
  const { signIn, isAuthenticated, processPendingInvite } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  const from = (location.state as LoginLocationState | null)?.from?.pathname ?? '/'

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setError('Informe seu email e senha.')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setError(EMAIL_INVALID_MESSAGE)
      return
    }

    setSubmitting(true)
    try {
      const result = await signIn(normalizedEmail, password)
      if (result.error) {
        setError(translateAuthEmailError(result.error) ?? result.error)
        return
      }
      processPendingInvite()
      navigate(from, { replace: true })
    } catch {
      setError('Não foi possível entrar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <Swords className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold">StudyQuest</h1>
          <p className="mt-1 text-sm text-slate-400">Acesse sua conta para continuar a jornada</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">
              Email
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                className="h-12 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
              Senha
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
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
            disabled={submitting}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Swords className="h-4 w-4" aria-hidden="true" />
            )}
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Não tem uma conta?{' '}
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="inline-flex min-h-[44px] items-center font-semibold text-indigo-400 transition hover:text-indigo-300"
          >
            Cadastre-se
          </button>
        </p>
      </div>

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
    </div>
  )
}