import { Coins, Footprints, Hammer, HardHat, Loader2, Shield, Sword, type LucideIcon } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import {
  MAX_REFINE_LEVEL,
  SLOT_LABELS,
  type EquipmentSlot,
} from '../features/forge/lib/forgeRules'
import { useForge } from '../features/forge/hooks/useForge'
import { REWARD_COLORS } from '../lib/rewardColors'

const SLOT_ICONS: Record<EquipmentSlot, LucideIcon> = {
  weapon: Sword,
  helmet: HardHat,
  chest: Shield,
  boots: Footprints,
}

function slotButtonLabel(slot: EquipmentSlot, level: number, isMax: boolean): string {
  if (isMax) return `Refinar ${SLOT_LABELS[slot]} (máximo)`
  return `Refinar ${SLOT_LABELS[slot]} de +${level} para +${level + 1}`
}

export function ForgePage() {
  const forge = useForge()
  const { gold, busySlot, lastResult, error, refine, getSlotMeta } = forge

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Forge</h1>
      <p className="mt-1 text-sm text-slate-400">
        Aprimore seus equipamentos com refinos. Do +5 em diante o refino tem risco.
      </p>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Hammer className="h-5 w-5 text-orange-400" aria-hidden="true" />
          <span className="font-semibold text-white">Bigorna</span>
        </div>
        <span
          data-testid="forge-gold"
          className={`flex items-center gap-1.5 text-sm font-medium ${REWARD_COLORS.gold}`}
        >
          <Coins className={`h-4 w-4 ${REWARD_COLORS.goldIcon}`} aria-hidden="true" />
          {gold === null ? '...' : gold} Gold
        </span>
      </div>

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
            ? `Sucesso! ${SLOT_LABELS[lastResult.slot]} +${lastResult.levelBefore} → +${lastResult.levelAfter}`
            : `Falha! ${SLOT_LABELS[lastResult.slot]} +${lastResult.levelBefore} → +${lastResult.levelAfter}`}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(Object.keys(SLOT_LABELS) as EquipmentSlot[]).map((slot) => {
          const Icon = SLOT_ICONS[slot]
          const meta = getSlotMeta(slot)
          const busy = busySlot === slot

          return (
            <div
              key={slot}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              aria-busy={gold === null}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                    <Icon className="h-5 w-5 text-orange-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">{SLOT_LABELS[slot]}</p>
                    <p data-testid={`forge-level-${slot}`} className="text-sm text-indigo-300">
                      +{meta.level}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400">
                  <p>
                    Chance: <span className="font-semibold text-white">{Math.round(meta.rate * 100)}%</span>
                  </p>
                  <p className="mt-0.5">
                    Custo: <span className="font-semibold text-white">{meta.cost} Gold</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label={slotButtonLabel(slot, meta.level, meta.isMax)}
                disabled={!forge.canUseForge || meta.isMax || !meta.canAfford || busy}
                onClick={() => void refine(slot)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {busy
                  ? 'Forjando...'
                  : meta.isMax
                    ? `Máximo (+${MAX_REFINE_LEVEL})`
                    : `Refinar +${meta.level} → +${meta.level + 1}`}
              </button>

              {!meta.isMax && !meta.canAfford && (
                <p className="mt-2 text-xs text-red-400">Gold insuficiente para esta tentativa.</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
        <p className="font-semibold text-slate-200">Regras da Bigorna</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <span className="text-slate-300">+0 até +5</span> é sempre seguro (100% de sucesso).
          </li>
          <li>
            Do <span className="text-slate-300">+5 em diante</span> a chance cai: 80% → 65% → 50% →
            35% → 20% → 10% → 5%.
          </li>
          <li>
            Em caso de falha, o item <span className="text-slate-300">perde 1 nível</span>. O item{' '}
            <span className="text-slate-300">nunca quebra</span>.
          </li>
          <li>O Gold da tentativa é consumido no sucesso e na falha.</li>
        </ul>
      </div>
    </AppShell>
  )
}