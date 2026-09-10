import type { DragEvent, KeyboardEvent } from 'react'
import { PersonStanding, Plus } from 'lucide-react'
import { SLOT_LABELS, type EquipmentSlot } from '../lib/forgeRules'
import type { EquippedItems, ForgeItem } from '../lib/forgeItems'
import { beginItemDrag, readItemDrag } from '../lib/dragAndDrop'
import { ItemCard } from './ItemCard'

const SLOT_POSITIONS: Record<EquipmentSlot, string> = {
  helmet: 'left-1/2 top-0 -translate-x-1/2',
  weapon: 'left-[calc(50%-10.5rem)] top-[116px]',
  chest: 'left-1/2 top-[116px] -translate-x-1/2',
  boots: 'left-1/2 top-[232px] -translate-x-1/2',
}

interface EquipmentSlotCardProps {
  slot: EquipmentSlot
  item: ForgeItem | undefined
  selected: boolean
  draggedOver: boolean
  draggedItemType: EquipmentSlot | null
  onDetail: (id: string) => void
  onDragOverSlot: (slot: EquipmentSlot | null) => void
  onDropOnSlot: (itemId: string, slot: EquipmentSlot) => void
  onDragTypeChange: (type: EquipmentSlot | null) => void
}

function EquipmentSlotCard({
  slot,
  item,
  selected,
  draggedOver,
  draggedItemType,
  onDetail,
  onDragOverSlot,
  onDropOnSlot,
  onDragTypeChange,
}: EquipmentSlotCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!item) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onDetail(item.id)
    }
  }

  const dropTargetProps = {
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      if (draggedItemType !== slot) return
      event.preventDefault()
      event.stopPropagation()
      onDragOverSlot(slot)
    },
    onDragLeave: (event: DragEvent<HTMLDivElement>) => {
      const related = event.relatedTarget
      if (!(related instanceof Node) || !event.currentTarget.contains(related)) {
        onDragOverSlot(null)
      }
    },
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      if (draggedItemType !== slot) return
      event.preventDefault()
      event.stopPropagation()
      onDragOverSlot(null)
      const itemId = readItemDrag(event)
      if (itemId) onDropOnSlot(itemId, slot)
    },
  }

  const dropHintVisible = draggedItemType === slot

  const slotLabel = (
    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
      {SLOT_LABELS[slot]}
    </span>
  )

  return (
    <div className={`absolute ${SLOT_POSITIONS[slot]}`}>
      {item ? (
        <ItemCard
          item={item}
          selected={selected}
          accent={draggedOver}
          dragTarget={dropHintVisible}
          role="button"
          tabIndex={0}
          draggable
          data-testid={`equipment-slot-${slot}`}
          aria-label={`Refinar ${item.name} de +${item.enhancementLevel}`}
          onClick={() => onDetail(item.id)}
          onKeyDown={handleKeyDown}
          onDragStart={(event: DragEvent<HTMLDivElement>) => beginItemDrag(event, item.id)}
          onDragTypeChange={onDragTypeChange}
          onDetailClick={() => onDetail(item.id)}
          {...dropTargetProps}
          className="h-24 w-24 cursor-grab"
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          data-testid={`equipment-slot-${slot}`}
          aria-label={`Equipar ${SLOT_LABELS[slot]}`}
          {...dropTargetProps}
          className={`flex h-24 w-24 flex-col items-center gap-1 rounded-xl border-2 border-dashed p-2 transition ${
            draggedOver
              ? 'border-orange-400 bg-orange-500/10 ring-2 ring-orange-400/30'
              : dropHintVisible
                ? 'border-slate-500 bg-slate-800/70 ring-2 ring-white/40'
                : 'border-slate-800 bg-slate-950/40 hover:border-slate-600'
          }`}
        >
          {slotLabel}
          <span className="flex flex-1 items-center justify-center text-slate-700">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      )}
    </div>
  )
}

interface PaperdollProps {
  equipped: EquippedItems
  selectedItemId: string | null
  dragOverSlot: EquipmentSlot | null
  draggedItemType: EquipmentSlot | null
  characterLevel: number | null
  onDetailItem: (id: string) => void
  onDragOverSlot: (slot: EquipmentSlot | null) => void
  onDropOnSlot: (itemId: string, slot: EquipmentSlot) => void
  onDragTypeChange: (type: EquipmentSlot | null) => void
}

export function Paperdoll({
  equipped,
  selectedItemId,
  dragOverSlot,
  draggedItemType,
  characterLevel,
  onDetailItem,
  onDragOverSlot,
  onDropOnSlot,
  onDragTypeChange,
}: PaperdollProps) {
  return (
    <section
      aria-label="Equipamentos equipados"
      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <PersonStanding className="h-5 w-5 text-indigo-400" aria-hidden="true" />
          <span className="font-semibold text-white">Equipamentos</span>
        </div>
        <span data-testid="forge-character-level" className="text-xs text-slate-400">
          Personagem Nível {characterLevel ?? '...'}
        </span>
      </div>

      <div className="relative mt-4 h-[328px]">
        <PersonStanding
          className="absolute left-1/2 top-[150px] h-40 w-40 -translate-x-1/2 text-slate-800/60"
          aria-hidden="true"
        />
        {(Object.keys(SLOT_LABELS) as EquipmentSlot[]).map((slot) => (
          <EquipmentSlotCard
            key={slot}
            slot={slot}
            item={equipped[slot]}
            selected={equipped[slot]?.id === selectedItemId}
            draggedOver={dragOverSlot === slot}
            draggedItemType={draggedItemType}
            onDetail={onDetailItem}
            onDragOverSlot={onDragOverSlot}
            onDropOnSlot={onDropOnSlot}
            onDragTypeChange={onDragTypeChange}
          />
        ))}
      </div>
    </section>
  )
}