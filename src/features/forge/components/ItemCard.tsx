import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { ForgeItem } from '../lib/forgeItems'
import { SLOT_LABELS } from '../lib/forgeRules'
import { RARITY_LABELS, rarityStyle } from '../lib/rarityStyles'

interface ItemCardProps {
  item: ForgeItem
  blocked?: boolean
  selected?: boolean
  accent?: boolean
  children?: ReactNode
  className?: string
}

// O rest são atributos/props padrão de <div> (role, draggable, event handlers,
// data-testid, aria-*, title...) repassados ao elemento raiz do card.
type ItemCardRootProps = Omit<ComponentPropsWithoutRef<'div'>, keyof ItemCardProps>

export function ItemCard({
  item,
  blocked = false,
  selected = false,
  accent = false,
  children,
  className = '',
  ...rest
}: ItemCardProps & ItemCardRootProps) {
  const { border, glow, text } = rarityStyle(item.rarity)

  const cardClasses = [
    'group relative rounded-xl border-2 bg-slate-800/90 transition',
    blocked ? 'border-slate-700/80 opacity-50' : `${border} ${glow}`,
    !blocked && selected ? 'ring-2 ring-indigo-500/40' : '',
    !blocked && accent ? 'ring-2 ring-orange-400/50' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cardClasses} {...rest}>
      {children}
      <div
        role="tooltip"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-max max-w-60 -translate-x-1/2 flex-col gap-0.5 rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-left shadow-xl backdrop-blur group-hover:block group-focus:block"
      >
        <span className="text-sm font-bold text-slate-100">{item.name}</span>
        <span className={`text-xs font-bold uppercase ${text}`}>
          {item.rarity ? RARITY_LABELS[item.rarity] : 'Desconhecido'}
        </span>
        <span className="text-xs text-slate-300">
          {SLOT_LABELS[item.slot]} · Lv. {item.itemLevel}
        </span>
        <span className="text-xs text-slate-300">Refino +{item.enhancementLevel}</span>
      </div>
    </div>
  )
}