import { Loader2, Trash2, X } from 'lucide-react'

interface RemoveFriendModalProps {
  playerTag: string
  busy: boolean
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

export function RemoveFriendModal({ playerTag, busy, onConfirm, onCancel }: RemoveFriendModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-friend-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-500/15">
            <Trash2 className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Fechar"
            className="grid min-h-[44px] w-11 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <h2 id="remove-friend-title" className="mt-4 text-lg font-bold text-white">
          Remover amigo
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Tem certeza que deseja remover{' '}
          <span className="font-mono font-semibold text-white">{playerTag}</span> da sua lista de
          amigos?
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/20 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            {busy ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  )
}