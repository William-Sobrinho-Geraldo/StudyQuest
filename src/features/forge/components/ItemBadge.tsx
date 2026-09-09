import { CHEST_TIER_META } from '../../quests/lib/chestTiers'
import type { ForgeItem } from '../lib/forgeItems'
import { SLOT_ICONS } from './slotIcons'

interface ItemBadgeProps {
  item: ForgeItem
  vertical?: boolean
}

export function ItemBadge({ item, vertical = false }: ItemBadgeProps) {
  const Icon = SLOT_ICONS[item.slot]
  const rarityMeta = item.rarity ? CHEST_TIER_META[item.rarity] : null

  return (
    <div
      className={
        vertical
          ? 'flex min-w-0 flex-col items-center gap-1.5 text-center'
          : 'flex min-w-0 items-center gap-2.5'
      }
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-800">
        <Icon className="h-4 w-4 text-orange-400" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span
          className="block truncate text-xs font-medium leading-tight text-slate-100"
          title={item.name}
        >
          {item.name}
        </span>
        {rarityMeta && (
          <span
            className={`block text-[10px] font-semibold uppercase leading-tight ${rarityMeta.textColor}`}
          >
            {rarityMeta.label}
          </span>
        )}
        <span className="block text-xs font-bold leading-tight text-indigo-300">+{item.level}</span>
      </span>
    </div>
  )
}