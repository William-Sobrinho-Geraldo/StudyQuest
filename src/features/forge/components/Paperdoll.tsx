import type { DragEvent, KeyboardEvent } from 'react'
import { PersonStanding, Plus } from 'lucide-react'
import { SLOT_LABELS, type EquipmentSlot } from '../lib/forgeRules'
import type { EquippedItems, ForgeItem } from '../lib/forgeItems'
import { beginItemDrag, readItemDrag } from '../lib/dragAndDrop'
import { ItemBadge } from './ItemBadge'

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
  onSelect: (id: string) => void
  onDragOverSlot: (slot: EquipmentSlot | null) => void
  onDropOnSlot: (itemId: string, slot: EquipmentSlot) => void
}

function EquipmentSlotCard({
  slot,
  item,
  selected,
  draggedOver,
  onSelect,
  onDragOverSlot,
  onDropOnSlot,
}: EquipmentSlotCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!item) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(item.id)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={item !== undefined}
      data-testid={`equipment-slot-${slot}`}
      aria-label={
        item ? `Refinar ${item.name} de +${item.level}` : `Equipar ${SLOT_LABELS[slot]}`
      }
      onClick={() => {
        if (item) onSelect(item.id)
      }}
      onKeyDown={handleKeyDown}
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        if (item) beginItemDrag(event, item.id)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onDragOverSlot(slot)
      }}
      onDragLeave={(event) => {
        const related = event.relatedTarget
        if (!(related instanceof Node) || !event.currentTarget.contains(related)) {
          onDragOverSlot(null)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onDragOverSlot(null)
        const itemId = readItemDrag(event)
        if (itemId) onDropOnSlot(itemId, slot)
      }}
      className={`absolute ${SLOT_POSITIONS[slot]} flex h-24 w-24 flex-col items-center gap-1 rounded-xl border p-2 transition ${
        item
          ? `cursor-grab ${
              selected
                ? 'border-indigo-500 bg-slate-800/80 ring-2 ring-indigo-500/40'
                : draggedOver
                  ? 'border-orange-400 ring-2 ring-orange-400/40'
                  : 'border-slate-700 bg-slate-800/80 hover:border-slate-600'
            }`
          : draggedOver
            ? 'border-orange-400 border-dashed bg-orange-500/10 ring-2 ring-orange-400/30'
            : 'border-dashed border-slate-800 bg-slate-950/40 hover:border-slate-600'
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {SLOT_LABELS[slot]}
      </span>
      {item ? (
        <ItemBadge item={item} vertical />
      ) : (
        <span className="flex flex-1 items-center justify-center text-slate-700">
          <Plus className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
    </div>
  )
}

interface PaperdollProps {
  equipped: EquippedItems
  selectedItemId: string | null
  dragOverSlot: EquipmentSlot | null
  onSelectItem: (id: string) => void
  onDragOverSlot: (slot: EquipmentSlot | null) => void
  onDropOnSlot: (itemId: string, slot: EquipmentSlot) => void
}

export function Paperdoll({
  equipped,
  selectedItemId,
  dragOverSlot,
  onSelectItem,
  onDragOverSlot,
  onDropOnSlot,
}: PaperdollProps) {
  return (
    <section
      aria-label="Equipamentos equipados"
      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex items-center gap-2 text-sm">
        <PersonStanding className="h-5 w-5 text-indigo-400" aria-hidden="true" />
        <span className="font-semibold text-white">Equipamentos</span>
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
            onSelect={onSelectItem}
            onDragOverSlot={onDragOverSlot}
            onDropOnSlot={onDropOnSlot}
          />
        ))}
      </div>
    </section>
  )
}