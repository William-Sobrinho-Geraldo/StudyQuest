import type { DragEvent } from 'react'
import { Coins, Hammer, Loader2, X } from 'lucide-react'
import { REWARD_COLORS } from '../../../lib/rewardColors'
import { MAX_REFINE_LEVEL, SLOT_LABELS, type RefineResult } from '../lib/forgeRules'
import { readItemDrag } from '../lib/dragAndDrop'
import type { SelectedMeta } from '../hooks/useForge'
import { ItemBadge } from './ItemBadge'
import { ItemCard } from './ItemCard'

function refineButtonLabel(meta: SelectedMeta): string {
  if (meta.isMax) return `Refinar ${meta.item.name} (máximo)`
  return `Refinar ${meta.item.name} de +${meta.item.enhancementLevel} para +${
    meta.item.enhancementLevel + 1
  }`
}

interface AnvilProps {
  gold: number | null
  selectedMeta: SelectedMeta | null
  busy: boolean
  lastResult: RefineResult | null
  error: string | null
  canUseForge: boolean
  dragOver: boolean
  onDragOver: (value: boolean) => void
  onDropItem: (itemId: string) => void
  onClearSelection: () => void
  onRefine: () => void
}

export function Anvil({
  gold,
  selectedMeta,
  busy,
  lastResult,
  error,
  canUseForge,
  dragOver,
  onDragOver,
  onDropItem,
  onClearSelection,
  onRefine,
}: AnvilProps) {
  const refineDisabled =
    !canUseForge ||
    !selectedMeta ||
    busy ||
    selectedMeta.isMax ||
    !selectedMeta.canAfford ||
    selectedMeta.blockedByLevel

  return (
    <section
      aria-label="Bigorna de refino"
      aria-busy={gold === null}
      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Hammer className="h-5 w-5 text-orange-400" aria-hidden="true" />
          <span className="font-semibold text-white">Bigorna</span>
          <span className="text-xs text-slate-500">— solte o item a refinar</span>
        </div>
        <span
          data-testid="forge-gold"
          className={`flex items-center gap-1.5 text-sm font-medium ${REWARD_COLORS.gold}`}
        >
          <Coins className={`h-4 w-4 ${REWARD_COLORS.goldIcon}`} aria-hidden="true" />
          {gold === null ? '...' : gold} Gold
        </span>
      </div>

      <div
        data-testid="anvil-drop-zone"
        onDragOver={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onDragOver(true)
        }}
        onDragLeave={(event) => {
          const related = event.relatedTarget
          if (!(related instanceof Node) || !event.currentTarget.contains(related)) {
            onDragOver(false)
          }
        }}
        onDrop={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault()
          event.stopPropagation()
          onDragOver(false)
          const itemId = readItemDrag(event)
          if (itemId) onDropItem(itemId)
        }}
        className={`mt-4 flex min-h-40 items-center justify-center rounded-xl border-2 p-4 transition ${
          dragOver
            ? 'border-orange-400 bg-orange-500/10 ring-2 ring-orange-400/30'
            : 'border-dashed border-slate-700 bg-slate-950/40'
        }`}
      >
        {selectedMeta ? (
          <div
            data-testid="anvil-selected-item"
            className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="flex items-start gap-2">
              <ItemCard
                item={selectedMeta.item}
                blocked={selectedMeta.blockedByLevel}
                className="flex min-w-0 flex-1 flex-col gap-2 p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-400">
                  {SLOT_LABELS[selectedMeta.item.slot]} pronto para refino
                </p>
                <ItemBadge item={selectedMeta.item} blocked={selectedMeta.blockedByLevel} />
              </ItemCard>

              <button
                type="button"
                onClick={onClearSelection}
                aria-label="Remover item da bigorna"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="shrink-0 text-sm text-slate-400 sm:text-right">
              <p>
                Chance:{' '}
                <span className="font-semibold text-white">
                  {Math.round(selectedMeta.rate * 100)}%
                </span>
              </p>
              <p className="mt-1">
                Custo:{' '}
                <span className="font-semibold text-white">{selectedMeta.cost} Gold</span>
              </p>
              {selectedMeta.isMax && (
                <p className="mt-1 text-xs text-amber-400">Refino máximo atingido.</p>
              )}
              {selectedMeta.blockedByLevel && (
                <p className="mt-1 text-xs text-red-400">
                  Requer personagem Nível {selectedMeta.item.itemLevel}.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div data-testid="anvil-empty-state" className="flex flex-col items-center gap-2 text-center">
            <Hammer className="h-8 w-8 text-slate-600" aria-hidden="true" />
            <p className="text-sm text-slate-400">
              Solte um item aqui (inventário ou equipado) ou clique em qualquer item para
              prepará-lo no refino.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        data-testid="anvil-refine-button"
        aria-label={selectedMeta ? refineButtonLabel(selectedMeta) : 'Refinar item selecionado'}
        disabled={refineDisabled}
        onClick={onRefine}
        className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {busy
          ? 'Forjando...'
          : selectedMeta
            ? selectedMeta.isMax
              ? `Máximo (+${MAX_REFINE_LEVEL})`
              : `Refinar +${selectedMeta.item.enhancementLevel} → +${
                  selectedMeta.item.enhancementLevel + 1
                }`
            : 'Selecione um item'}
      </button>

      {selectedMeta && !selectedMeta.isMax && !selectedMeta.canAfford && (
        <p className="mt-2 text-xs text-red-400">Gold insuficiente para esta tentativa.</p>
      )}

      {lastResult && (
        <div
          role={lastResult.success ? 'status' : 'alert'}
          className={`mt-4 rounded-xl border p-4 text-sm font-medium ${
            lastResult.success
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {lastResult.success
            ? `Sucesso! ${SLOT_LABELS[lastResult.slot]} +${lastResult.enhancementBefore} → +${lastResult.enhancementAfter}`
            : `Falha! ${SLOT_LABELS[lastResult.slot]} +${lastResult.enhancementBefore} → +${lastResult.enhancementAfter}`}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}