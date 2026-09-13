import { Coins, X } from 'lucide-react'

interface SellConfirmationModalProps {
  itemName: string
  salePrice: number
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}

export function SellConfirmationModal({
  itemName,
  salePrice,
  busy,
  onConfirm,
  onClose,
}: SellConfirmationModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15">
            <Coins className="h-5 w-5 text-amber-400" aria-hidden="true" />
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mt-4 text-lg font-bold text-slate-100">Confirmar Venda</h2>
        <p className="mt-2 text-sm text-slate-400">
          Tem certeza que deseja vender{' '}
          <span className="font-semibold text-slate-200">{itemName}</span>? Você receberá{' '}
          <span className="font-semibold text-amber-400">{salePrice} Gold</span>.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Vender
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
