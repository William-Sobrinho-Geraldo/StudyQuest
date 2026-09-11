import { useState } from 'react'
import { Loader2, UserCheck, UserPlus, X } from 'lucide-react'
import { acceptLinkInvite } from '../services/socialService'
import { useToast } from '../../../components/Toast'
import { clearPendingInvite } from '../lib/inviteStorage'

interface InviteAcceptModalProps {
  playerTag: string
  onClose: () => void
}

export function InviteAcceptModal({ playerTag, onClose }: InviteAcceptModalProps) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setError(null)
    setSubmitting(true)

    try {
      clearPendingInvite()
      const result = await acceptLinkInvite(playerTag)

      if (!result.success) {
        if (result.error === 'player_not_found') {
          setError('Jogador n\u00e3o encontrado.')
          return
        }
        setError(result.error ?? 'Erro ao aceitar convite.')
        return
      }

      showToast('Voc\u00eas agora s\u00e3o amigos!', 'success')
      onClose()
    } catch {
      setError('Erro inesperado ao aceitar convite.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600">
              <UserPlus className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <h2 id="invite-title" className="text-xl font-bold">
              Convite de Amizade
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              O jogador{' '}
              <span className="font-semibold text-emerald-400">{playerTag}</span> te convidou
              para ser amigo no StudyQuest!
            </p>
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

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleAccept}
            disabled={submitting}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            )}
            {submitting ? 'Aceitando...' : 'Aceitar Convite'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-60"
          >
            Recusar
          </button>
        </div>
      </div>
    </div>
  )
}