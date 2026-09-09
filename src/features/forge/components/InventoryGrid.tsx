import type { DragEvent, KeyboardEvent } from 'react'
import { Backpack, Box } from 'lucide-react'
import type { ForgeItem } from '../lib/forgeItems'
import { beginItemDrag } from '../lib/dragAndDrop'
import { ItemBadge } from './ItemBadge'

interface InventoryCellProps {
  item: ForgeItem
  selected: boolean
  onSelect: (id: string) => void
}

function InventoryCell({ item, selected, onSelect }: InventoryCellProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(item.id)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      data-testid={`inventory-item-${item.id}`}
      aria-label={`Refinar ${item.name} de +${item.level}`}
      onClick={() => onSelect(item.id)}
      onKeyDown={handleKeyDown}
      onDragStart={(event: DragEvent<HTMLDivElement>) => beginItemDrag(event, item.id)}
      className={`flex h-24 cursor-grab flex-col items-center gap-1 rounded-xl border p-2 transition ${
        selected
          ? 'border-indigo-500 bg-slate-800 ring-2 ring-indigo-500/40'
          : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
      }`}
    >
      <ItemBadge item={item} vertical />
    </div>
  )
}

interface InventoryGridProps {
  items: ForgeItem[]
  capacity: number
  selectedItemId: string | null
  onSelectItem: (id: string) => void
}

export function InventoryGrid({
  items,
  capacity,
  selectedItemId,
  onSelectItem,
}: InventoryGridProps) {
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

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: capacity }, (_, index) => {
          const item = items[index]
          return item ? (
            <InventoryCell
              key={item.id}
              item={item}
              selected={item.id === selectedItemId}
              onSelect={onSelectItem}
            />
          ) : (
            <div
              key={`empty-${index}`}
              aria-hidden="true"
              className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-slate-700"
            >
              <Box className="h-5 w-5" aria-hidden="true" />
            </div>
          )
        })}
      </div>
    </section>
  )
}