import { Lock } from 'lucide-react'
import { useState, type ComponentPropsWithoutRef } from 'react'
import { getItemImage, getRarityGlowColor } from '../../../utils/itemVisuals'
import { getItemStats } from '../../../utils/itemStats'
import type { ForgeItem } from '../lib/forgeItems'
import { SLOT_LABELS } from '../lib/forgeRules'
import { RARITY_LABELS, rarityStyle } from '../lib/rarityStyles'

interface ItemCardProps {
  item: ForgeItem
  blocked?: boolean
  selected?: boolean
  className?: string
}

// O restante são atributos/props padrão de <div> (role, event handlers,
// aria-*, title...) repassados ao card clicável. O tooltip vive em um nó
// irmão e é montado apenas no hover/focus.
type ItemCardRootProps = Omit<
  ComponentPropsWithoutRef<'div'>,
  keyof ItemCardProps | 'children'
> & {
  'data-testid'?: string
}

export function ItemCard({
  item,
  blocked = false,
  selected = false,
  className = '',
  ...rest
}: ItemCardProps & ItemCardRootProps) {
  const { 'data-testid': dataTestId, onFocus, onBlur, ...divProps } = rest
  const [showTooltip, setShowTooltip] = useState(false)
  const { border, glow, text } = rarityStyle(item.rarity)
  const itemStat = getItemStats(item.slot, item.itemLevel, item.rarity, item.enhancementLevel)

  const cardClasses = [
    'relative flex items-center justify-center overflow-hidden rounded-xl border-2 bg-slate-800/90 touch-manipulation select-none transition-transform',
    blocked
      ? 'cursor-not-allowed border-slate-700/80 opacity-50'
      : `cursor-pointer active:scale-95 ${border} ${glow}`,
    selected && !blocked ? 'ring-2 ring-indigo-500/40' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="relative">
      <div
        {...divProps}
        data-testid={dataTestId}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={(event) => {
          setShowTooltip(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setShowTooltip(false)
          onBlur?.(event)
        }}
        className={cardClasses}
      >
        {blocked ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 opacity-50">
            <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
          </span>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 m-auto h-3/4 w-3/4 rounded-full blur-lg"
              style={{ backgroundColor: getRarityGlowColor(item.rarity) }}
            />
            <img
              src={getItemImage(item.name, item.slot)}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none relative z-10 h-full w-full select-none object-contain p-1.5 drop-shadow-sm"
            />
          </>
        )}

        {item.itemLevel > 0 && (
          <span className="absolute bottom-1 left-1.5 text-[10px] font-semibold leading-none text-slate-400">
            Lv. {item.itemLevel}
          </span>
        )}

        {item.enhancementLevel > 0 && (
          <span
            data-testid="item-enhancement"
            className={`absolute right-1.5 top-1 text-[10px] font-bold leading-none ${
              blocked ? 'text-slate-500' : text
            }`}
          >
            +{item.enhancementLevel}
          </span>
        )}
      </div>

      {showTooltip && (
        <div
          data-testid={dataTestId ? `${dataTestId}-tooltip` : undefined}
          role="tooltip"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-60 -translate-x-1/2 flex-col gap-0.5 rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-left shadow-xl backdrop-blur"
        >
          <span className="text-sm font-bold text-slate-100">{item.name}</span>
          <span className={`text-xs font-bold uppercase ${text}`}>
            {item.rarity ? RARITY_LABELS[item.rarity] : 'Desconhecido'}
          </span>
          <span className="text-xs text-slate-300">
            {SLOT_LABELS[item.slot]} · Lv. {item.itemLevel}
          </span>
          <span className="text-xs text-slate-300">Refino +{item.enhancementLevel}</span>
          <span className="text-xs text-slate-300">
            {itemStat.label}: <span className="font-semibold text-slate-100">{itemStat.finalValue}</span>
          </span>
          {blocked && (
            <span className="text-xs font-semibold text-red-400">
              Requer Nível {item.itemLevel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
