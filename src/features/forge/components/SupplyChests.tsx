import { Gift, Loader2 } from 'lucide-react'
import { CHEST_TIER_META } from '../../quests/lib/chestTiers'
import type { SupplyChestRow } from '../lib/forgeItems'

interface SupplyChestsProps {
  chests: SupplyChestRow[]
  busy: boolean
  characterLevel: number | null
  onOpen: (chestId: string) => void
}

export function SupplyChests({ chests, busy, characterLevel, onOpen }: SupplyChestsProps) {
  if (chests.length === 0) return null

  return (
    <section
      aria-label="Baús de suprimentos"
      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex items-center gap-2 text-sm">
        <Gift className="h-5 w-5 text-amber-400" aria-hidden="true" />
        <span className="font-semibold text-white">Baús de Suprimentos</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Ganhos ao concluir missões. O nível do item sorteado acompanha seu personagem
        (Nível {characterLevel ?? '...'}): 50% o tier que você já usa e 50% o próximo acima.
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        {chests.map((chest) => {
          const meta = CHEST_TIER_META[chest.rarity]
          return (
            <div
              key={chest.id}
              data-testid={`supply-chest-${chest.rarity}`}
              className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3"
            >
              <Gift className={`h-5 w-5 ${meta.textColor}`} aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-white">Baú {meta.label}</p>
                <p className="text-xs text-slate-400">Quantidade: {chest.quantity}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onOpen(chest.id)}
                aria-label={`Abrir baú ${meta.label}`}
                className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                Abrir
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}