import { useState } from 'react'
import { AppShell } from '../components/AppShell'
import { useToast } from '../components/Toast'
import { Anvil } from '../features/forge/components/Anvil'
import { InventoryGrid } from '../features/forge/components/InventoryGrid'
import { Paperdoll } from '../features/forge/components/Paperdoll'
import { SupplyChests } from '../features/forge/components/SupplyChests'
import { useForge } from '../features/forge/hooks/useForge'
import { INVENTORY_CAPACITY } from '../features/forge/lib/forgeItems'
import type { EquipmentSlot } from '../features/forge/lib/forgeRules'
import { CHEST_TIER_META } from '../features/quests/lib/chestTiers'

export function ForgePage() {
  const forge = useForge()
  const { showToast } = useToast()
  const [dragOverSlot, setDragOverSlot] = useState<EquipmentSlot | null>(null)
  const [anvilDragOver, setAnvilDragOver] = useState(false)

  const handleOpenChest = async (chestId: string) => {
    const item = await forge.openChest(chestId)
    if (item && item.rarity) {
      showToast(
        `Você abriu um Baú ${CHEST_TIER_META[item.rarity].label} e recebeu ${item.name}!`,
      )
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Forge</h1>
      <p className="mt-1 text-sm text-slate-400">
        Equipe seus itens, guarde sobressalentes no inventário e refine na Bigorna. Do +5 em
        diante o refino tem risco.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[3fr_minmax(0,2fr)]">
        <Paperdoll
          equipped={forge.equipped}
          selectedItemId={forge.selectedItemId}
          dragOverSlot={dragOverSlot}
          onSelectItem={forge.selectItem}
          onDragOverSlot={setDragOverSlot}
          onDropOnSlot={(itemId, slot) => void forge.equipFromInventory(itemId, slot)}
        />

        <Anvil
          gold={forge.gold}
          selectedMeta={forge.selectedMeta}
          busy={forge.busy}
          lastResult={forge.lastResult}
          error={forge.error}
          canUseForge={forge.canUseForge}
          dragOver={anvilDragOver}
          onDragOver={setAnvilDragOver}
          onDropItem={forge.selectItem}
          onClearSelection={forge.clearSelection}
          onRefine={() => void forge.refine()}
        />
      </div>

      <div className="mt-4">
        <SupplyChests
          chests={forge.chests}
          busy={forge.busy}
          onOpen={(chestId) => void handleOpenChest(chestId)}
        />
      </div>

      <div className="mt-4">
        <InventoryGrid
          items={forge.inventory}
          capacity={INVENTORY_CAPACITY}
          selectedItemId={forge.selectedItemId}
          onSelectItem={forge.selectItem}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
        <p className="font-semibold text-slate-200">Regras da Bigorna</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <span className="text-slate-300">+0 até +5</span> é sempre seguro (100% de sucesso).
          </li>
          <li>
            Do <span className="text-slate-300">+5 em diante</span> a chance cai: 80% → 65% → 50%
            → 35% → 20% → 10% → 5%.
          </li>
          <li>
            Em caso de falha, o item <span className="text-slate-300">perde 1 nível</span>. O item{' '}
            <span className="text-slate-300">nunca quebra</span>.
          </li>
          <li>O Gold da tentativa é consumido no sucesso e na falha.</li>
          <li>
            Arraste itens do <span className="text-slate-300">inventário</span> sobre os slots de{' '}
            <span className="text-slate-300">equipamento</span> para equipá-los, ou sobre a{' '}
            <span className="text-slate-300">Bigorna</span> para refiná-los.
          </li>
        </ul>
      </div>
    </AppShell>
  )
}