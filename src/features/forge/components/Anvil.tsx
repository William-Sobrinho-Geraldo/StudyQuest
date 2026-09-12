import { Coins, Hammer, Loader2, X } from 'lucide-react'
import { REWARD_COLORS } from '../../../lib/rewardColors'
import { MAX_REFINE_LEVEL, SLOT_LABELS } from '../lib/forgeRules'
import { formatDurationPreview } from '../lib/forgeTimers'
import type { SelectedMeta } from '../hooks/useForge'
import { ItemBadge } from './ItemBadge'

function startButtonLabel(meta: SelectedMeta): string {
  if (meta.isMax) return `Refinar ${meta.item.name} (máximo)`
  return `Iniciar Refino ${meta.item.name} de +${meta.item.enhancementLevel} para +${
    meta.item.enhancementLevel + 1
  }`
}

interface AnvilProps {
  gold: number | null
  selectedMeta: SelectedMeta | null
  busy: boolean
  error: string | null
  onClearSelection: () => void
  onStartRefine: () => void
}

export function Anvil({
  gold,
  selectedMeta,
  busy,
  error,
  onClearSelection,
  onStartRefine,
}: AnvilProps) {
  const startDisabled =
    !selectedMeta ||
    busy ||
    selectedMeta.isMax ||
    !selectedMeta.canAfford ||
    selectedMeta.blockedByLevel

  return (
    <section
      id="anvil-section"
      aria-label="Bigorna de refino"
      aria-busy={gold === null}
      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Hammer className="h-5 w-5 text-orange-400" aria-hidden="true" />
          <span className="font-semibold text-white">Bigorna</span>
          <span className="text-xs text-slate-500">— toque em um item para prepará-lo</span>
        </div>
        <span
          data-testid="forge-gold"
          className={`flex items-center gap-1.5 text-sm font-medium ${REWARD_COLORS.gold}`}
        >
          <Coins className={`h-4 w-4 ${REWARD_COLORS.goldIcon}`} aria-hidden="true" />
          {gold === null ? '...' : gold} Gold
        </span>
      </div>

      <div className="mt-4 flex min-h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/40 p-4">
        {selectedMeta ? (
          <div
            data-testid="anvil-selected-item"
            className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="flex items-start gap-2">
              <div
                className={`flex min-w-0 flex-1 flex-col gap-2 rounded-xl border-2 p-3 ${
                  selectedMeta.blockedByLevel
                    ? 'border-red-500/40 bg-slate-800/90'
                    : 'border-orange-500/40 bg-slate-800/90'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-400">
                  {SLOT_LABELS[selectedMeta.item.slot]} pronto para refino
                </p>
                <ItemBadge item={selectedMeta.item} blocked={selectedMeta.blockedByLevel} />
              </div>

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
                Custo:{' '}
                <span className="font-semibold text-white">{selectedMeta.cost} Gold</span>
              </p>
              <p className="mt-1">
                Duração:{' '}
                <span className="font-semibold text-white">
                  {formatDurationPreview(selectedMeta.durationSeconds)}
                </span>
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
          <div
            data-testid="anvil-empty-state"
            className="flex flex-col items-center gap-2 text-center"
          >
            <Hammer className="h-8 w-8 text-slate-600" aria-hidden="true" />
            <p className="text-sm text-slate-400">
              Toque em um item do inventário ou equipado e use “Enviar para Bigorna” para
              prepará-lo no refino.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        data-testid="anvil-start-refine-button"
        aria-label={selectedMeta ? startButtonLabel(selectedMeta) : 'Iniciar refino'}
        disabled={startDisabled}
        onClick={onStartRefine}
        className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {busy
          ? 'Iniciando...'
          : selectedMeta
            ? selectedMeta.isMax
              ? `Máximo (+${MAX_REFINE_LEVEL})`
              : `Iniciar Refino +${selectedMeta.item.enhancementLevel} → +${
                  selectedMeta.item.enhancementLevel + 1
                }`
            : 'Selecione um item'}
      </button>

      {selectedMeta && !selectedMeta.isMax && !selectedMeta.canAfford && (
        <p className="mt-2 text-xs text-red-400">Gold insuficiente para iniciar o refino.</p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}
