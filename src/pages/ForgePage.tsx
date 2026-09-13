import { useMemo, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { useToast } from '../components/Toast'
import { Anvil } from '../features/forge/components/Anvil'
import { ForgeTimerPanel } from '../features/forge/components/ForgeTimerPanel'
import { InventoryGrid } from '../features/forge/components/InventoryGrid'
import { ItemDetailModal } from '../features/forge/components/ItemDetailModal'
import { Paperdoll } from '../features/forge/components/Paperdoll'
import { PlayerStatsPanel } from '../features/forge/components/PlayerStatsPanel'
import { SellConfirmationModal } from '../features/forge/components/SellConfirmationModal'
import { SupplyChests } from '../features/forge/components/SupplyChests'
import { useForge } from '../features/forge/hooks/useForge'
import { INVENTORY_CAPACITY } from '../features/forge/lib/forgeItems'
import { type ForgeItem } from '../features/forge/lib/forgeItems'
import { canEquip, type EquipmentSlot } from '../features/forge/lib/forgeRules'
import { CHEST_TIER_META, isQuestChestTier } from '../features/quests/lib/chestTiers'
import { calculateTotalStats } from '../utils/statsCalculator'
import { getItemSalePrice } from '../utils/pricing'

export function ForgePage() {
  const forge = useForge()
  const { showToast } = useToast()
  const [detailItem, setDetailItem] = useState<ForgeItem | null>(null)
  const [sellItem, setSellItem] = useState<ForgeItem | null>(null)

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
    if (forge.activeForgeItem) {
      showToast('A Bigorna já está refinando um item.', 'info')
      return
    }
    forge.selectItem(itemId)
    document.getElementById('anvil-section')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  const handleSell = (itemId: string) => {
    const target = forge.inventory.find((item) => item.id === itemId)
    if (!target) return
    setDetailItem(null)
    setSellItem(target)
  }

  const handleConfirmSell = async () => {
    if (!sellItem) return
    const result = await forge.sellItem(sellItem.id)
    if (result.success) {
      showToast(`Item vendido por ${result.salePrice} Gold!`)
    } else {
      showToast(result.error ?? 'Não foi possível vender o item.', 'error')
    }
    setSellItem(null)
  }

  const handleStartRefine = () => {
    void forge.startForge()
  }

  const handleWatchAd = () => {
    void forge.reduceForgeTime()
  }

  const handleCollect = () => {
    void forge.collectForged()
  }

  const handleCompleteNow = () => {
    void forge.completeForge()
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
        Equipe seus itens (do seu nível ou abaixo), guarde sobressalentes no inventário e
        refine na Bigorna. Pague Gold para iniciar o refino e aguarde o tempo real — ou assista
        anúncios para acelerar.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <Paperdoll
          equipped={forge.equipped}
          selectedItemId={forge.selectedItemId}
          characterLevel={forge.characterLevel}
          onDetailItem={handleOpenDetail}
        />

        <PlayerStatsPanel stats={totalStats} />

        <InventoryGrid
          items={forge.inventory}
          capacity={INVENTORY_CAPACITY}
          selectedItemId={forge.selectedItemId}
          characterLevel={forge.characterLevel}
          onDetailItem={handleOpenDetail}
        />

        {forge.activeForgeItem ? (
          <ForgeTimerPanel
            item={forge.activeForgeItem}
            endsAt={forge.activeForgeEndsAt}
            gold={forge.gold}
            adBusy={forge.adBusy}
            error={forge.error}
            onWatchAd={handleWatchAd}
            onCollect={handleCollect}
          />
        ) : (
          <Anvil
            gold={forge.gold}
            selectedMeta={forge.selectedMeta}
            busy={forge.busy}
            error={forge.error}
            onClearSelection={forge.clearSelection}
            onStartRefine={handleStartRefine}
          />
        )}
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
            A Bigorna refina <span className="text-slate-300">1 item por vez</span>, em tempo
            real. Você paga o custo em Gold apenas para iniciar o refino.
          </li>
          <li>
            O tempo do refino escala com o nível atual: <span className="text-slate-300">+0→+1 5 min</span>,{' '}
            <span className="text-slate-300">+1→+2 30 min</span>, <span className="text-slate-300">+2→+3 2h</span>,{' '}
            <span className="text-slate-300">+3→+4 6h</span>, <span className="text-slate-300">+4→+5 12h</span> e{' '}
            <span className="text-slate-300">+5 em diante 24h</span>.
          </li>
          <li>
            Assista anúncios para <span className="text-slate-300">cortar 25% do tempo restante</span>{' '}
            por vídeo — quantas vezes quiser.
          </li>
          <li>
            Quando o tempo acabar, toque em <span className="text-slate-300">Coletar Item</span> para
            ganhar +1 de refino e liberar a Bigorna.
          </li>
        </ul>
      </div>

      {detailItem && (
        <ItemDetailModal
          item={detailItem}
          isEquipped={Object.values(forge.equipped).some((i) => i?.id === detailItem.id)}
          canEquip={
            forge.characterLevel !== null &&
            canEquip(detailItem.itemLevel, forge.characterLevel)
          }
          onClose={() => setDetailItem(null)}
          onEquip={handleEquip}
          onSendToAnvil={handleSendToAnvil}
          onSell={handleSell}
        />
      )}

      {sellItem && (
        <SellConfirmationModal
          itemName={sellItem.name}
          salePrice={getItemSalePrice(sellItem)}
          busy={forge.busy}
          onConfirm={() => void handleConfirmSell()}
          onClose={() => setSellItem(null)}
        />
      )}

      {/* Atalho de teste: conclui o refino de forma sutil e sem texto. */}
      {forge.activeForgeItem && (
        <button
          type="button"
          data-testid="complete-forge-now"
          aria-label="Concluir refino"
          onClick={handleCompleteNow}
          className="fixed bottom-16 left-1/2 z-40 h-4 w-24 -translate-x-1/2 rounded-full bg-slate-500/25 opacity-40 transition hover:opacity-80"
        />
      )}
    </AppShell>
  )
}
