import type { DragEvent } from 'react'
import { Backpack, Box } from 'lucide-react'
import { canEquip, type EquipmentSlot } from '../lib/forgeRules'
import type { ForgeItem } from '../lib/forgeItems'
import { beginItemDrag } from '../lib/dragAndDrop'
import { ItemCard } from './ItemCard'

interface InventoryCellProps {
  item: ForgeItem
  selected: boolean
  blocked: boolean
  onDetail: (id: string) => void
  onDragTypeChange: (type: EquipmentSlot | null) => void
}

function InventoryCell({ item, selected, blocked, onDetail, onDragTypeChange }: InventoryCellProps) {
  return (
    <ItemCard
      item={item}
      selected={selected}
      blocked={blocked}
      role="button"
      tabIndex={blocked ? -1 : 0}
      draggable={!blocked}
      data-testid={`inventory-item-${item.id}`}
      aria-label={
        blocked
          ? `Item ${item.name} bloqueado (requer Nível ${item.itemLevel})`
          : `Refinar ${item.name} de +${item.enhancementLevel}`
      }
      title={blocked ? `Requer personagem Nível ${item.itemLevel}` : undefined}
      onDetailClick={() => {
        if (!blocked) onDetail(item.id)
      }}
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        if (!blocked) beginItemDrag(event, item.id)
      }}
      onDragTypeChange={onDragTypeChange}
      className={blocked ? 'aspect-square p-2 cursor-not-allowed' : 'aspect-square p-2 cursor-grab'}
    />
  )
}

interface InventoryGridProps {
  items: ForgeItem[]
  capacity: number
  selectedItemId: string | null
  characterLevel: number | null
  onDetailItem: (id: string) => void
  onDragTypeChange: (type: EquipmentSlot | null) => void
}

export function InventoryGrid({
  items,
  capacity,
  selectedItemId,
  characterLevel,
  onDetailItem,
  onDragTypeChange,
}: InventoryGridProps) {
  const isBlocked = (item: ForgeItem) =>
    characterLevel !== null && !canEquip(item.itemLevel, characterLevel)

  return (
    <section
      aria-label="Inventário de itens sobressalentes"
      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Backpack className="h-5 w-5 text-indigo-400" aria-hidden="true" />
          <span className="font-semibold text-white">Inventário</span>
        </div>
        <span data-testid="inventory-count" className="text-sm text-slate-400">
          {items.length} / {capacity} itens
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: capacity }, (_, index) => {
          const item = items[index]
          return item ? (
            <InventoryCell
              key={item.id}
              item={item}
              selected={item.id === selectedItemId}
              blocked={isBlocked(item)}
              onDetail={onDetailItem}
              onDragTypeChange={onDragTypeChange}
            />
          ) : (
            <div
              key={`empty-${index}`}
              aria-hidden="true"
              className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-slate-700"
            >
              <Box className="h-5 w-5" aria-hidden="true" />
            </div>
          )
        })}
      </div>
    </section>
  )
}