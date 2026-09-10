import { Lock } from 'lucide-react'
import type { ForgeItem } from '../lib/forgeItems'
import { RARITY_LABELS, rarityStyle } from '../lib/rarityStyles'
import { SLOT_ICONS } from './slotIcons'

interface ItemBadgeProps {
  item: ForgeItem
  vertical?: boolean
  blocked?: boolean
}

export function ItemBadge({ item, vertical = false, blocked = false }: ItemBadgeProps) {
  const Icon = SLOT_ICONS[item.slot]
  const style = rarityStyle(item.rarity)

  return (
    <div
      className={
        vertical
          ? 'flex min-w-0 flex-col items-center gap-1.5 text-center'
          : 'flex min-w-0 items-center gap-2.5'
      }
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-800 ${
          blocked ? 'opacity-50' : ''
        }`}
      >
        {blocked ? (
          <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
        ) : (
          <Icon className={`h-4 w-4 ${style.icon}`} aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0">
        <span
          className="block truncate text-xs font-medium leading-tight text-slate-100"
          title={item.name}
        >
          {item.name}
        </span>
        <span className="block text-[10px] font-semibold uppercase leading-tight text-slate-500">
          Nível {item.itemLevel}
          {item.rarity && (
            <span
              className={`ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 font-bold normal-case ${style.chip}`}
            >
              {RARITY_LABELS[item.rarity]}
            </span>
          )}
        </span>
        {item.enhancementLevel > 0 && (
          <span
            data-testid="item-enhancement"
            className={`block text-xs font-bold leading-tight ${
              blocked ? 'text-slate-500' : style.text
            }`}
          >
            +{item.enhancementLevel}
          </span>
        )}
        {blocked && (
          <span className="block text-[10px] font-semibold uppercase leading-tight text-red-400">
            Requer Nível {item.itemLevel}
          </span>
        )}
      </span>
    </div>
  )
}