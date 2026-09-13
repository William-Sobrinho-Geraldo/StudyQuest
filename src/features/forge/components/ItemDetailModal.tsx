import { Coins, Hammer, Swords, X } from 'lucide-react'
import { useModalBackHandler } from '../../../hooks/useNativeBackButton'
import { getItemImage, getRarityGlowColor } from '../../../utils/itemVisuals'
import { getItemStats } from '../../../utils/itemStats'
import { getItemSalePrice } from '../../../utils/pricing'
import type { ForgeItem } from '../lib/forgeItems'
import { SLOT_LABELS, type EquipmentSlot } from '../lib/forgeRules'
import { RARITY_LABELS, rarityStyle } from '../lib/rarityStyles'

interface ItemDetailModalProps {
  item: ForgeItem
  isEquipped: boolean
  onClose: () => void
  onEquip: (itemId: string, slot: EquipmentSlot) => void
  onSendToAnvil: (itemId: string) => void
  onSell: (itemId: string) => void
}

export function ItemDetailModal({
  item,
  isEquipped,
  onClose,
  onEquip,
  onSendToAnvil,
  onSell,
}: ItemDetailModalProps) {
  useModalBackHandler(onClose)

  const { text: textColor, chip } = rarityStyle(item.rarity)
  const stats = getItemStats(item.slot, item.itemLevel, item.rarity, item.enhancementLevel)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="touch-manipulation active:scale-95 transition-transform cursor-pointer p-2 -mt-2 -mr-2 text-gray-400 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center pt-2 pb-2">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 m-auto h-3/4 w-3/4 rounded-full blur-xl"
              style={{ backgroundColor: getRarityGlowColor(item.rarity) }}
            />
            <img
              src={getItemImage(item.name, item.slot)}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none relative z-10 h-full w-full select-none object-contain p-2 drop-shadow-lg"
            />
          </div>

          <h2 className={`mt-3 text-center text-xl font-bold ${textColor}`}>{item.name}</h2>
          <p className="mt-1 text-center text-xs text-slate-400">
            {SLOT_LABELS[item.slot]} · Nível {item.itemLevel} · +{item.enhancementLevel}
          </p>

          {item.rarity && (
            <span
              className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${chip}`}
            >
              {RARITY_LABELS[item.rarity]}
            </span>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
          <div className="flex justify-between text-sm text-gray-400">
            <span>{stats.label} Base</span>
            <span>{stats.baseValue}</span>
          </div>

          {stats.rarityBonusPercent > 0 && (
            <div className="mt-1 flex justify-between text-sm text-gray-400">
              <span>Bônus de Raridade</span>
              <span className={textColor}>+{stats.rarityBonusPercent}%</span>
            </div>
          )}

          {stats.refineBonusPercent > 0 && (
            <div className="mt-1 flex justify-between text-sm text-gray-400">
              <span>Bônus de Refino (+{item.enhancementLevel})</span>
              <span className="text-emerald-400">+{stats.refineBonusPercent}%</span>
            </div>
          )}

          <hr className="my-2 border-gray-700" />

          <div className="flex justify-between text-base font-bold text-white">
            <span>Total</span>
            <span className="text-emerald-400">{stats.finalValue}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {!isEquipped && (
            <button
              type="button"
              onClick={() => {
                onEquip(item.id, item.slot)
                onClose()
              }}
              className="touch-manipulation active:scale-95 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              <Swords className="h-4 w-4" aria-hidden="true" />
              Equipar
            </button>
          )}
          {item.isInForge ? (
            <div
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 text-sm font-semibold text-orange-300 ${
                isEquipped ? 'col-span-2' : ''
              }`}
            >
              <Hammer className="h-4 w-4" aria-hidden="true" />
              Em refino na Bigorna
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSendToAnvil(item.id)
                onClose()
              }}
              className={`touch-manipulation active:scale-95 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-500 ${
                isEquipped ? 'col-span-2' : ''
              }`}
            >
              <Hammer className="h-4 w-4" aria-hidden="true" />
              Enviar para Bigorna
            </button>
          )}
        </div>

        {!isEquipped && !item.isInForge && (
          <button
            type="button"
            onClick={() => onSell(item.id)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-600/20 px-4 text-sm font-semibold text-red-400 transition hover:bg-red-600/40"
          >
            <Coins className="h-4 w-4 text-amber-400" aria-hidden="true" />
            Vender por {getItemSalePrice(item)} Gold
          </button>
        )}
      </div>
    </div>
  )
}
