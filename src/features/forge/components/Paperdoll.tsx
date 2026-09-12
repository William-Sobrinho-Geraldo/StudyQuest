import type { KeyboardEvent } from 'react'
import { PersonStanding, Plus } from 'lucide-react'
import { SLOT_LABELS, type EquipmentSlot } from '../lib/forgeRules'
import type { EquippedItems, ForgeItem } from '../lib/forgeItems'
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
  onDetail: (id: string) => void
}

function EquipmentSlotCard({ slot, item, selected, onDetail }: EquipmentSlotCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!item) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onDetail(item.id)
    }
  }

  return (
    <div className={`absolute ${SLOT_POSITIONS[slot]}`}>
      {item ? (
        <ItemCard
          item={item}
          selected={selected}
          role="button"
          tabIndex={0}
          data-testid={`equipment-slot-${slot}`}
          aria-label={`Refinar ${item.name} de +${item.enhancementLevel}`}
          onClick={() => onDetail(item.id)}
          onKeyDown={handleKeyDown}
          className="h-24 w-24"
        />
      ) : (
        <div
          data-testid={`equipment-slot-${slot}`}
          className="flex h-24 w-24 flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/40 p-2"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {SLOT_LABELS[slot]}
          </span>
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
  characterLevel: number | null
  onDetailItem: (id: string) => void
}

export function Paperdoll({
  equipped,
  selectedItemId,
  characterLevel,
  onDetailItem,
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
            onDetail={onDetailItem}
          />
        ))}
      </div>
    </section>
  )
}
