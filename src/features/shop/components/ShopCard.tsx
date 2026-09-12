import { Check, Coins, Loader2, Swords, X } from 'lucide-react'
import { getItemImage } from '../../../utils/itemVisuals'
import { SLOT_LABELS } from '../../forge/lib/forgeRules'
import { RARITY_LABELS, rarityStyle } from '../../forge/lib/rarityStyles'
import { calculateItemStats } from '../../../utils/statsCalculator'
import { SHOWCASE_SLOT_INDEX, type ShopSlot } from '../lib/shopItems'

interface ShopCardProps {
  slot: ShopSlot
  gold: number | null
  busy: boolean
  expired: boolean
  canAfford: boolean
  onBuy: (slotNumber: number) => void
  onDetail: (slot: ShopSlot) => void
}

export function ShopCard({
  slot,
  gold,
  busy,
  expired,
  canAfford,
  onBuy,
  onDetail,
}: ShopCardProps) {
  const style = rarityStyle(slot.rarity)
  const isShowcase = slot.slot === SHOWCASE_SLOT_INDEX
  const disabled = busy || expired || slot.bought || !canAfford

  return (
    <div
      data-testid={`shop-slot-${slot.slot}`}
      onClick={() => onDetail(slot)}
      className={`group relative flex cursor-pointer flex-col rounded-xl border-2 bg-slate-800/90 p-4 transition hover:bg-slate-800 ${
        isShowcase
          ? 'border-amber-400/60 bg-gradient-to-br from-slate-800 to-purple-950/40 shadow-lg shadow-purple-500/20'
          : style.border
      } ${style.glow}`}
    >
      {isShowcase && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-400/40 bg-slate-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
          Vitrine Especial
        </span>
      )}

      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-lg bg-slate-900">
          <img
            src={getItemImage(slot.name, slot.item_category)}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none w-full h-full select-none object-contain p-1.5 drop-shadow-sm"
          />
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${style.chip}`}
        >
          {slot.rarity ? RARITY_LABELS[slot.rarity] : 'Desconhecido'}
        </span>
      </div>

      <p className="mt-3 truncate text-sm font-bold text-slate-100">{slot.name}</p>
      <p className="mt-0.5 text-xs text-slate-400">
        {SLOT_LABELS[slot.item_category]} · <span className="font-semibold text-slate-300">Nível {slot.item_level}</span>
      </p>

      <ShopStats slot={slot} />

      <div className="mt-2 flex items-center gap-1">
        <Coins className={`h-3.5 w-3.5 ${style.text}`} aria-hidden="true" />
        <span className={`text-sm font-bold ${style.text}`}>{slot.price}</span>
      </div>

      {slot.bought ? (
        <span className="mt-3 flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-sm font-semibold text-green-300">
          <Check className="h-4 w-4" aria-hidden="true" />
          Comprado
        </span>
      ) : (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            if (!disabled) onBuy(slot.slot)
          }}
          disabled={disabled}
          className={`mt-3 flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
            canAfford ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-700'
          }`}
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {!busy && !canAfford && <X className="h-3.5 w-3.5" aria-hidden="true" />}
          {!busy && canAfford && <Swords className="h-3.5 w-3.5" aria-hidden="true" />}
          {busy ? 'Comprando...' : canAfford ? 'Comprar' : `Faltam ${gold !== null ? slot.price - gold : ''}`}
        </button>
      )}
    </div>
  )
}

export function ShopStats({ slot }: { slot: ShopSlot }) {
  const lines: { label: string; value: number; color: string }[] = []
  const stats = {
    attack: slot.attack > 0 ? slot.attack : undefined,
    defense: slot.defense > 0 ? slot.defense : undefined,
    hp: slot.hp > 0 ? slot.hp : undefined,
  }

  if (!stats.attack && !stats.defense && !stats.hp) {
    const fallback = calculateItemStats({
      id: 'shop-preview',
      slot: slot.item_category,
      name: slot.name,
      itemLevel: slot.item_level,
      enhancementLevel: 0,
      rarity: slot.rarity,
    })
    stats.attack = fallback.attack
    stats.defense = fallback.defense
    stats.hp = fallback.hp
  }

  if (stats.attack) lines.push({ label: 'ATQ', value: stats.attack, color: 'text-red-400' })
  if (stats.defense) lines.push({ label: 'DEF', value: stats.defense, color: 'text-blue-400' })
  if (stats.hp) lines.push({ label: 'HP', value: stats.hp, color: 'text-green-400' })

  return (
    <div className="mt-2 flex gap-2">
      {lines.map(({ label, value, color }) => (
        <span
          key={label}
          className="rounded-md border border-slate-700 bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-semibold"
        >
          <span className="text-slate-500">{label} </span>
          <span className={color}>{value}</span>
        </span>
      ))}
    </div>
  )
}