import { useMemo, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { useToast } from '../components/Toast'
import { Anvil } from '../features/forge/components/Anvil'
import { InventoryGrid } from '../features/forge/components/InventoryGrid'
import { ItemDetailModal } from '../features/forge/components/ItemDetailModal'
import { Paperdoll } from '../features/forge/components/Paperdoll'
import { PlayerStatsPanel } from '../features/forge/components/PlayerStatsPanel'
import { SupplyChests } from '../features/forge/components/SupplyChests'
import { useForge } from '../features/forge/hooks/useForge'
import { INVENTORY_CAPACITY } from '../features/forge/lib/forgeItems'
import { type ForgeItem } from '../features/forge/lib/forgeItems'
import type { EquipmentSlot } from '../features/forge/lib/forgeRules'
import { CHEST_TIER_META, isQuestChestTier } from '../features/quests/lib/chestTiers'
import { calculateTotalStats } from '../utils/statsCalculator'

export function ForgePage() {
  const forge = useForge()
  const { showToast } = useToast()
  const [dragOverSlot, setDragOverSlot] = useState<EquipmentSlot | null>(null)
  const [anvilDragOver, setAnvilDragOver] = useState(false)
  const [draggedItemType, setDraggedItemType] = useState<EquipmentSlot | null>(null)
  const [detailItem, setDetailItem] = useState<ForgeItem | null>(null)

  const totalStats = useMemo(() => calculateTotalStats(forge.equipped), [forge.equipped])

  const handleOpenDetail = (itemId: string) => {
    const equipped = Object.values(forge.equipped).find((i) => i?.id === itemId)
    if (equipped) {
      setDetailItem(equipped)
      return
    }
    const inInventory = forge.inventory.find((i) => i.id === itemId)
    if (inInventory) setDetailItem(inInventory)
  }

  const handleEquip = (itemId: string, slot: EquipmentSlot) => {
    void forge.equipFromInventory(itemId, slot)
  }

  const handleSendToAnvil = (itemId: string) => {
    forge.selectItem(itemId)
    document.getElementById('anvil-section')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  const handleOpenChest = async (chestId: string) => {
    const item = await forge.openChest(chestId)
    if (item && item.rarity && isQuestChestTier(item.rarity)) {
      showToast(
        `Você abriu um Baú ${CHEST_TIER_META[item.rarity].label} e recebeu ${item.name} (Nível ${item.itemLevel})!`,
      )
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Forge</h1>
      <p className="mt-1 text-sm text-slate-400">
        Equipe seus itens (do seu nível ou abaixo), guarde sobressalentes no inventário e refine
        na Bigorna. Do +5 em diante o refino tem risco.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <Paperdoll
          equipped={forge.equipped}
          selectedItemId={forge.selectedItemId}
          dragOverSlot={dragOverSlot}
          draggedItemType={draggedItemType}
          characterLevel={forge.characterLevel}
          onDetailItem={handleOpenDetail}
          onDragOverSlot={setDragOverSlot}
          onDropOnSlot={(itemId, slot) => void forge.equipFromInventory(itemId, slot)}
          onDragTypeChange={setDraggedItemType}
        />

        <PlayerStatsPanel stats={totalStats} />

        <InventoryGrid
          items={forge.inventory}
          capacity={INVENTORY_CAPACITY}
          selectedItemId={forge.selectedItemId}
          characterLevel={forge.characterLevel}
          onDetailItem={handleOpenDetail}
          onDragTypeChange={setDraggedItemType}
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
          characterLevel={forge.characterLevel}
          onOpen={(chestId) => void handleOpenChest(chestId)}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
        <p className="font-semibold text-slate-200">Regras da Bigorna</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            Você só pode <span className="text-slate-300">equipar ou refinar</span> itens com
            nível menor ou igual ao seu (o item nível máximo é o seu nível arredondado para
            baixo, de 10 em 10).
          </li>
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
          <li>O Gold da tentativa é consumido no sucesso e na falha (custo maior para itens de nível mais alto).</li>
          <li>
            Arraste itens do <span className="text-slate-300">inventário</span> sobre os slots de{' '}
            <span className="text-slate-300">equipamento</span> para equipá-los, ou sobre a{' '}
            <span className="text-slate-300">Bigorna</span> para refiná-los.
          </li>
        </ul>
      </div>

      {detailItem && (
        <ItemDetailModal
          item={detailItem}
          isEquipped={Object.values(forge.equipped).some((i) => i?.id === detailItem.id)}
          onClose={() => setDetailItem(null)}
          onEquip={handleEquip}
          onSendToAnvil={handleSendToAnvil}
        />
      )}
    </AppShell>
  )
}