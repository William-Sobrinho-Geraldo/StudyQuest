import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail, Sparkles } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { useToast } from '../components/Toast'
import { completeSignupWithInvite } from '../features/social/lib/inviteFlow'
import { EMAIL_INVALID_MESSAGE, isValidEmail, translateAuthEmailError } from '../lib/validation'

export function RegisterPage() {
  const { signUp, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setInfo(null)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setError('Informe seu email e senha.')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setError(EMAIL_INVALID_MESSAGE)
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      const result = await signUp(normalizedEmail, password)
      if (result.error) {
        setError(translateAuthEmailError(result.error) ?? result.error)
        return
      }
      if (result.needsEmailConfirmation) {
        setInfo('Cadastro criado! Confirme seu email para ativar a conta.')
        return
      }

      const invite = await completeSignupWithInvite()
      if (invite.hadInvite) {
        if (invite.accepted) {
          showToast(`Conta criada! Você e ${invite.playerTag} agora são amigos!`)
        } else {
          showToast('Conta criada, mas o convite não pôde ser vinculado. Tente novamente mais tarde.', 'info')
        }
      }
      navigate('/', { replace: true })
    } catch {
      setError('Não foi possível concluir o cadastro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold">StudyQuest</h1>
          <p className="mt-1 text-sm text-slate-400">Crie sua conta e comece sua jornada</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium text-slate-300">
              Email
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="register-email"
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
            <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-slate-300">
              Senha
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 6 caracteres"
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

          {info && (
            <p
              role="status"
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
            >
              {info}
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
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {submitting ? 'Cadastrando...' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Já tem uma conta?{' '}
          <Link
            to="/login"
            className="inline-flex min-h-[44px] items-center font-semibold text-indigo-400 transition hover:text-indigo-300"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}