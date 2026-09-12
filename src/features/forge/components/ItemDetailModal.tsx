import { Hammer, Swords, X } from 'lucide-react'
import { getItemImage, getRarityGlowColor } from '../../../utils/itemVisuals'
import type { ForgeItem } from '../lib/forgeItems'
import { SLOT_LABELS, type EquipmentSlot } from '../lib/forgeRules'
import { RARITY_LABELS, rarityStyle } from '../lib/rarityStyles'
import { calculateItemStats } from '../../../utils/statsCalculator'

interface ItemDetailModalProps {
  item: ForgeItem
  isEquipped: boolean
  onClose: () => void
  onEquip: (itemId: string, slot: EquipmentSlot) => void
  onSendToAnvil: (itemId: string) => void
}

export function ItemDetailModal({
  item,
  isEquipped,
  onClose,
  onEquip,
  onSendToAnvil,
}: ItemDetailModalProps) {
  const { text: textColor, chip } = rarityStyle(item.rarity)
  const stats = calculateItemStats(item)

  const statLines: { label: string; value: number; color: string }[] = []
  if (stats.attack > 0) statLines.push({ label: 'Ataque', value: stats.attack, color: 'text-red-400' })
  if (stats.defense > 0) statLines.push({ label: 'Defesa', value: stats.defense, color: 'text-blue-400' })
  if (stats.hp > 0) statLines.push({ label: 'HP', value: stats.hp, color: 'text-green-400' })

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

        {statLines.length > 0 && (
          <div className="mt-6 space-y-2">
            {statLines.map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                <span className="text-xs text-slate-400">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        )}

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
      </div>
    </div>
  )
}
