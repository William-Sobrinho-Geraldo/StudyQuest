import { Lock } from 'lucide-react'
import { useRef, useState, type ComponentPropsWithoutRef, type DragEvent } from 'react'
import type { ForgeItem } from '../lib/forgeItems'
import { SLOT_LABELS, type EquipmentSlot } from '../lib/forgeRules'
import { setItemDragSlot } from '../lib/dragAndDrop'
import { RARITY_LABELS, rarityStyle } from '../lib/rarityStyles'
import { SLOT_ICONS } from './slotIcons'

// Imagem 1x1 transparente usada como ghost do drag (evita snapshot do DOM).
const TRANSPARENT_DRAG_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

interface ItemCardProps {
  item: ForgeItem
  blocked?: boolean
  selected?: boolean
  accent?: boolean
  dragTarget?: boolean
  className?: string
  onDragTypeChange?: (type: EquipmentSlot | null) => void
  onDetailClick?: () => void
}

// O rest são atributos/props padrão de <div> (role, event handlers, aria-*,
// title...) repassados ao quadrado draggable do card. O tooltip vive em um nó
// irmão e só é montado fora do arrasto para nunca entrar na ghost image.
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
  accent = false,
  dragTarget = false,
  className = '',
  onDragTypeChange,
  onDetailClick,
  ...rest
}: ItemCardProps & ItemCardRootProps) {
  const {
    'data-testid': dataTestId,
    onDragStart: originalDragStart,
    onDragEnd: originalDragEnd,
    onFocus: originalFocus,
    onBlur: originalBlur,
    ...divProps
  } = rest
  const [isDragging, setIsDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const pointerDownTime = useRef(0)
  const didDrag = useRef(false)
  const Icon = SLOT_ICONS[item.slot]
  const { border, glow, icon: iconColor, text } = rarityStyle(item.rarity)

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    didDrag.current = true
    setIsDragging(true)
    setShowTooltip(false)
    if (typeof event.dataTransfer.setDragImage === 'function') {
      const dragIcon = new Image()
      dragIcon.src = TRANSPARENT_DRAG_IMAGE
      event.dataTransfer.setDragImage(dragIcon, 0, 0)
    }
    setItemDragSlot(event, item.slot)
    onDragTypeChange?.(item.slot)
    originalDragStart?.(event)
  }

  const handleDragEnd = (event: DragEvent<HTMLDivElement>) => {
    setIsDragging(false)
    setShowTooltip(false)
    onDragTypeChange?.(null)
    originalDragEnd?.(event)
  }

  const handlePointerDown = () => {
    pointerDownTime.current = performance.now()
    didDrag.current = false
  }

  const handlePointerUp = () => {
    const elapsed = performance.now() - pointerDownTime.current
    if (!didDrag.current && elapsed < 300) {
      onDetailClick?.()
    }
  }

  const ringClass = !blocked
    ? selected
      ? 'ring-2 ring-indigo-500/40'
      : accent
        ? 'ring-2 ring-orange-400/50'
        : dragTarget
          ? 'ring-2 ring-white/40'
          : ''
    : ''

  const cardClasses = [
    'relative flex items-center justify-center rounded-xl border-2 bg-slate-800/90 transition',
    blocked ? 'border-slate-700/80 opacity-50' : `${border} ${glow}`,
    ringClass,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const tooltipVisible = showTooltip && !isDragging

  return (
    <div className="relative">
      <div
        {...divProps}
        data-testid={dataTestId}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={(event) => {
          setShowTooltip(true)
          originalFocus?.(event)
        }}
        onBlur={(event) => {
          setShowTooltip(false)
          originalBlur?.(event)
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className={cardClasses}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 ${
            blocked ? 'opacity-50' : ''
          }`}
        >
          {blocked ? (
            <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
          ) : (
            <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden="true" />
          )}
        </span>

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

      {tooltipVisible && (
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