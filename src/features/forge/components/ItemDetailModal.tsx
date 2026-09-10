import { X } from 'lucide-react'
import type { ForgeItem } from '../lib/forgeItems'
import { SLOT_LABELS } from '../lib/forgeRules'
import { SLOT_ICONS } from './slotIcons'
import { RARITY_LABELS, rarityStyle } from '../lib/rarityStyles'
import { calculateItemStats } from '../../../utils/statsCalculator'

interface ItemDetailModalProps {
  item: ForgeItem
  onClose: () => void
}

export function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const Icon = SLOT_ICONS[item.slot]
  const { text: textColor } = rarityStyle(item.rarity)
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
        className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
              <Icon className={`h-5 w-5 ${textColor}`} aria-hidden="true" />
            </span>
            <div>
              <h2 className={`text-lg font-bold ${textColor}`}>{item.name}</h2>
              <p className="text-xs text-slate-400">
                {SLOT_LABELS[item.slot]} · Nível {item.itemLevel}
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

        {item.enhancementLevel > 0 && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
            <span className="text-xs text-slate-400">Refino</span>
            <span className={`ml-2 text-sm font-bold ${textColor}`}>+{item.enhancementLevel}</span>
          </div>
        )}

        {statLines.length > 0 && (
          <div className="mt-4 space-y-2">
            {statLines.map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                <span className="text-xs text-slate-400">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {item.rarity && (
          <p className={`mt-4 text-center text-xs font-bold uppercase ${textColor}`}>
            {RARITY_LABELS[item.rarity]}
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-800 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
