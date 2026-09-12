import { Coins, Hammer, Loader2 } from 'lucide-react'
import { getItemImage, getRarityGlowColor } from '../../../utils/itemVisuals'
import { REWARD_COLORS } from '../../../lib/rewardColors'
import type { ForgeItem } from '../lib/forgeItems'
import { SLOT_LABELS } from '../lib/forgeRules'
import { RARITY_LABELS, rarityStyle } from '../lib/rarityStyles'
import { useCountdown } from '../hooks/useCountdown'

interface ForgeTimerPanelProps {
  item: ForgeItem
  endsAt: string | null
  gold: number | null
  adBusy: boolean
  error: string | null
  onWatchAd: () => void
  onCollect: () => void
}

export function ForgeTimerPanel({
  item,
  endsAt,
  gold,
  adBusy,
  error,
  onWatchAd,
  onCollect,
}: ForgeTimerPanelProps) {
  const { formatted, isDone } = useCountdown(endsAt)
  const style = rarityStyle(item.rarity)

  return (
    <section
      id="anvil-section"
      aria-label="Refino em andamento"
      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Hammer className="h-5 w-5 text-orange-400" aria-hidden="true" />
          <span className="font-semibold text-white">Bigorna</span>
          <span className="text-xs text-slate-500">— refino em andamento</span>
        </div>
        <span
          data-testid="forge-gold"
          className={`flex items-center gap-1.5 text-sm font-medium ${REWARD_COLORS.gold}`}
        >
          <Coins className={`h-4 w-4 ${REWARD_COLORS.goldIcon}`} aria-hidden="true" />
          {gold === null ? '...' : gold} Gold
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/40 p-6 text-center">
        <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-slate-800">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 m-auto h-3/4 w-3/4 rounded-full blur-lg"
            style={{ backgroundColor: getRarityGlowColor(item.rarity) }}
          />
          <img
            src={getItemImage(item.name, item.slot)}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none relative z-10 h-full w-full select-none object-contain p-2 drop-shadow-sm"
          />
        </span>

        <div>
          <p className={`text-base font-bold ${style.text}`}>{item.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {SLOT_LABELS[item.slot]} · Nível {item.itemLevel}
            {item.rarity && (
              <span className={`ml-1 font-bold uppercase ${style.text}`}>
                · {RARITY_LABELS[item.rarity]}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            +{item.enhancementLevel}{' '}
            <span className="text-slate-400">→</span> +{item.enhancementLevel + 1}
          </p>
        </div>

        {isDone ? (
          <button
            type="button"
            data-testid="forge-collect-button"
            onClick={onCollect}
            className="touch-manipulation mt-1 flex min-h-[48px] w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-transform active:scale-95 hover:bg-emerald-500"
          >
            Coletar Item
          </button>
        ) : (
          <>
            <p
              data-testid="forge-countdown"
              className="text-3xl font-bold tabular-nums tracking-tight text-white"
            >
              {formatted}
            </p>
            <button
              type="button"
              data-testid="forge-watch-ad-button"
              onClick={onWatchAd}
              disabled={adBusy}
              className="touch-manipulation mt-1 flex min-h-[48px] w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-amber-950 transition-transform active:scale-95 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {adBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Carregando anúncio...
                </>
              ) : (
                <>📺 Assistir Anúncio (-25% tempo)</>
              )}
            </button>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}
