import { useState, type FormEvent } from 'react'
import { Bug, LifeBuoy, Lightbulb, Loader2, MessageSquare, Send, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useModalBackHandler } from '../../hooks/useNativeBackButton'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'

export type FeedbackType = 'bug' | 'suggestion' | 'other'

const MESSAGE_MAX = 500

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: typeof Bug }[] = [
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'suggestion', label: 'Sugestão', icon: Lightbulb },
  { value: 'other', label: 'Outro', icon: MessageSquare },
]

interface FeedbackModalProps {
  onClose: () => void
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  useModalBackHandler(onClose)

  const { user } = useAuth()
  const { showToast } = useToast()

  const [type, setType] = useState<FeedbackType>('suggestion')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      setError('Escreva uma mensagem antes de enviar.')
      return
    }
    if (!user) {
      setError('Você precisa estar conectado para enviar feedback.')
      return
    }

    setSubmitting(true)
    try {
      const { error: insertError } = await supabase.from('user_feedbacks').insert({
        user_id: user.id,
        type,
        message: trimmedMessage,
        user_email: user.email ?? null,
        user_name: user.user_metadata.full_name ?? null,
      })

      if (insertError) {
        setError('Não foi possível enviar o feedback. Tente novamente.')
        return
      }

      showToast('Obrigado pelo feedback! Ele ajuda a melhorar o StudyQuest.')
      onClose()
    } catch {
      setError('Não foi possível enviar o feedback. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
              <LifeBuoy className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <h2 id="feedback-title" className="text-xl font-bold">
              Enviar Feedback
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Conte para a gente como podemos melhorar sua jornada.
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

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-slate-300">
              Tipo de feedback
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = type === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setType(option.value)}
                    className={`flex min-h-[72px] touch-manipulation select-none flex-col items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition active:scale-95 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-white ring-2 ring-indigo-500/40'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="feedback-message" className="mb-1.5 block text-sm font-medium text-slate-300">
              Mensagem
            </label>
            <textarea
              id="feedback-message"
              name="message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value)
                if (error) setError(null)
              }}
              maxLength={MESSAGE_MAX}
              rows={4}
              placeholder="Descreva o problema ou a sua ideia..."
              className="w-full resize-none whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            <p className="mt-1 text-xs text-slate-500">
              {message.trim().length}/{MESSAGE_MAX} caracteres
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex min-h-[44px] w-full touch-manipulation select-none items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 active:scale-95 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
