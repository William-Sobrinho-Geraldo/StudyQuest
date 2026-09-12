import { Check, Coins, Loader2, X } from 'lucide-react'
import { getItemImage } from '../../../utils/itemVisuals'
import { RARITY_LABELS, rarityStyle } from '../../forge/lib/rarityStyles'
import { SLOT_LABELS } from '../../forge/lib/forgeRules'
import { ShopStats } from './ShopCard'
import type { ShopSlot } from '../lib/shopItems'

interface ShopItemModalProps {
  slot: ShopSlot
  busy: boolean
  expired: boolean
  canAfford: boolean
  onBuy: (slotNumber: number) => void
  onClose: () => void
}

export function ShopItemModal({
  slot,
  busy,
  expired,
  canAfford,
  onBuy,
  onClose,
}: ShopItemModalProps) {
  const { text: textColor } = rarityStyle(slot.rarity)
  const isShowcase = slot.slot === 6

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-lg bg-slate-800">
              <img
                src={getItemImage(slot.name, slot.item_category)}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="pointer-events-none w-full h-full select-none object-contain p-1.5 drop-shadow-sm"
              />
            </span>
            <div>
              <h2 className={`text-lg font-bold ${textColor}`}>{slot.name}</h2>
              <p className="text-xs text-slate-400">
                {SLOT_LABELS[slot.item_category]} · Nível {slot.item_level}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isShowcase && (
          <span className="mt-3 inline-block rounded-full border border-amber-400/40 bg-slate-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
            Vitrine Especial
          </span>
        )}

        <div className="mt-4 space-y-2">
          <ShopStats slot={slot} />
        </div>

        <p className={`mt-4 text-center text-xs font-bold uppercase ${textColor}`}>
          {slot.rarity ? RARITY_LABELS[slot.rarity] : 'Desconhecido'}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
          <Coins className={`h-4 w-4 ${textColor}`} aria-hidden="true" />
          <span className={`text-lg font-bold ${textColor}`}>{slot.price}</span>
          <span className="text-xs text-slate-500">Gold</span>
        </div>

        <div className="mt-6">
          {slot.bought ? (
            <span className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 text-sm font-semibold text-green-300">
              <Check className="h-4 w-4" aria-hidden="true" />
              Item comprado
            </span>
          ) : (
            <button
              type="button"
              disabled={busy || expired || !canAfford}
              onClick={() => {
                onBuy(slot.slot)
                onClose()
              }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Comprar por {slot.price} Gold
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}