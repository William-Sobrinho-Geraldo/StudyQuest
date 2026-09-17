import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail, Sparkles, User, X } from 'lucide-react'
import { useAuth } from './AuthContext'
import { useModalBackHandler } from '../../hooks/useNativeBackButton'
import { useToast } from '../../components/Toast'
import { completeSignupWithInvite } from '../social/lib/inviteFlow'
import { EMAIL_INVALID_MESSAGE, isValidEmail, translateAuthEmailError } from '../../lib/validation'

const PASSWORD_MIN = 6

interface RegisterModalProps {
  onClose: () => void
}

export function RegisterModal({ onClose }: RegisterModalProps) {
  useModalBackHandler(onClose)

  const { signUp } = useAuth()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const passwordsDoNotMatch =
    password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= PASSWORD_MIN &&
    confirmPassword.length > 0 &&
    password === confirmPassword

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setInfo(null)

    const trimmedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()
    if (!trimmedName) {
      setError('Informe seu nome.')
      return
    }
    if (!normalizedEmail || !password) {
      setError('Informe seu email e senha.')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setError(EMAIL_INVALID_MESSAGE)
      return
    }
    if (password.length < PASSWORD_MIN) {
      setError(`A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setSubmitting(true)
    try {
      const result = await signUp(normalizedEmail, password, trimmedName)
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
      onClose()
    } catch {
      setError('Não foi possível concluir o cadastro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
              <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <h2 id="register-title" className="text-xl font-bold">
              Cadastre-se
            </h2>
            <p className="mt-1 text-sm text-slate-400">Crie sua conta e comece sua jornada.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-11 w-11 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="register-name" className="mb-1.5 block text-sm font-medium text-slate-300">
              Nome
            </label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                enterKeyHint="next"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                className="h-12 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

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
                enterKeyHint="next"
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
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                enterKeyHint="next"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (error) setError(null)
                }}
                placeholder="Mínimo de 6 caracteres"
                className="h-12 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-12 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 grid h-10 w-10 touch-manipulation select-none -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 active:scale-95"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="mb-1.5 block text-sm font-medium text-slate-300">
              Confirmar Senha
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                enterKeyHint="done"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  if (error) setError(null)
                }}
                placeholder="Repita a senha"
                aria-describedby={passwordsDoNotMatch ? 'register-confirm-password-error' : undefined}
                className="h-12 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-12 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                aria-pressed={showConfirmPassword}
                className="absolute right-1 top-1/2 grid h-10 w-10 touch-manipulation select-none -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 active:scale-95"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
            {passwordsDoNotMatch && (
              <p id="register-confirm-password-error" role="alert" className="mt-1.5 text-xs text-red-400">
                As senhas não coincidem
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
            disabled={!canSubmit || submitting}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {submitting ? 'Cadastrando...' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}