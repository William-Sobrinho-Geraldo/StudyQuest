import { useState, type FormEvent } from 'react'
import { KeyRound, Loader2, Mail, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useModalBackHandler } from '../../hooks/useNativeBackButton'
import { EMAIL_INVALID_MESSAGE, isValidEmail, translateAuthEmailError } from '../../lib/validation'

interface ForgotPasswordModalProps {
  onClose: () => void
}

export function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  useModalBackHandler(onClose)

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setInfo(null)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Informe seu email.')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setError(EMAIL_INVALID_MESSAGE)
      return
    }

    setSubmitting(true)
    try {
      const { data: emailExists, error: checkError } = await supabase.rpc(
        'check_email_exists',
        { email_input: normalizedEmail },
      )
      if (checkError) {
        setError(translateAuthEmailError(checkError.message) ?? checkError.message)
        return
      }
      if (!emailExists) {
        setError('E-mail não encontrado na nossa base de dados.')
        return
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) {
        setError(translateAuthEmailError(resetError.message) ?? resetError.message)
        return
      }
      setInfo('Se o e-mail estiver cadastrado, enviamos um link de recuperação.')
    } catch {
      setError('Não foi possível enviar o link. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
              <KeyRound className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <h2 id="forgot-password-title" className="text-xl font-bold">
              Esqueci minha senha
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Informe seu email e enviaremos um link de recuperação.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-11 w-11 touch-manipulation select-none place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="forgot-password-email" className="mb-1.5 block text-sm font-medium text-slate-300">
              Email
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="forgot-password-email"
                name="email"
                type="email"
                autoComplete="email"
                enterKeyHint="send"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
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
            className="flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            {submitting ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>
      </div>
    </div>
  )
}