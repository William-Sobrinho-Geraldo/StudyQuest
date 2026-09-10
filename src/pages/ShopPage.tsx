import { AlertTriangle, Loader2, PlayCircle, RefreshCw, Sparkles, Store, Video, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../features/auth/AuthContext'
import { ShopCard } from '../features/shop/components/ShopCard'
import { ShopItemModal } from '../features/shop/components/ShopItemModal'
import { useShop } from '../features/shop/hooks/useShop'
import { SHOWCASE_SLOT_INDEX, type ShopSlot } from '../features/shop/lib/shopItems'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function CountdownTimer({ targetIso, now }: { targetIso: string; now: number }) {
  const remaining = Math.max(0, Math.floor((new Date(targetIso).getTime() - now) / 1000))
  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-slate-500 leading-none">
        Atualização gratuita em
      </span>
      <div className="flex items-baseline gap-0.5 font-mono text-sm font-bold tabular-nums text-slate-200 leading-none">
        {hours > 0 && (
          <>
            <TimeBlock value={pad2(hours)} label="h" urgent={false} />
            <span className="text-slate-600">:</span>
          </>
        )}
        <TimeBlock value={pad2(minutes)} label="m" urgent={remaining <= 600} />
        <span className="text-slate-600">:</span>
        <TimeBlock value={pad2(seconds)} label="s" urgent={remaining <= 60} />
      </div>
    </div>
  )
}

function TimeBlock({ value, label, urgent }: { value: string; label: string; urgent: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-px ${urgent ? 'text-amber-400' : ''}`}>
      <span>{value}</span>
      <span className="text-[10px] font-semibold text-slate-500">{label}</span>
    </span>
  )
}

function SkipWaitModal({
  onWatchAd,
  onClose,
  busy,
}: {
  onWatchAd: () => void
  onClose: () => void
  busy: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
            <Video className="h-5 w-5 text-amber-400" aria-hidden="true" />
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mt-4 text-lg font-bold text-slate-100">Aguarde a rotação</h2>
        <p className="mt-2 text-sm text-slate-400">
          O mercado ainda está em rotação. Deseja assistir a um vídeo para pular o tempo e
          atualizar agora?
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onWatchAd}
            disabled={busy}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <PlayCircle className="h-5 w-5" aria-hidden="true" />
            )}
            Assistir Vídeo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            Voltar a Esperar
          </button>
        </div>
      </div>
    </div>
  )
}

export function ShopPage() {
  const { user } = useAuth()
  const shop = useShop()
  const [selected, setSelected] = useState<ShopSlot | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState<string | null>(null)
  const [showSkipModal, setShowSkipModal] = useState(false)

  useEffect(() => {
    if (shop.nextRefreshAt) {
      const timer = window.setInterval(() => setNow(Date.now()), 1_000)
      return () => window.clearInterval(timer)
    }
  }, [shop.nextRefreshAt])

  const canAfford = useCallback(
    (price: number) => shop.gold !== null && shop.gold >= price,
    [shop.gold],
  )

  const showcaseSlot = shop.slots.find((slot) => slot.slot === SHOWCASE_SLOT_INDEX)
  const regularSlots = shop.slots.filter((slot) => slot.slot !== SHOWCASE_SLOT_INDEX)

  const handleBuy = useCallback(
    async (slotNumber: number) => {
      const success = await shop.buy(slotNumber)
      setToast(
        success ? 'Item adicionado ao seu inventário!' : shop.error ?? 'Não foi possível comprar.',
      )
      window.setTimeout(() => setToast(null), 2500)
    },
    [shop],
  )

  const handleRefresh = useCallback(async () => {
    const success = await shop.refresh()
    setToast(
      success ? 'Mercado rotativo atualizado!' : shop.error ?? 'Não foi possível atualizar.',
    )
    window.setTimeout(() => setToast(null), 2500)
  }, [shop])

  const handleRefreshClick = useCallback(() => {
    if (shop.expired || shop.slots.length === 0) {
      void handleRefresh()
    } else {
      setShowSkipModal(true)
    }
  }, [shop.expired, shop.slots.length, handleRefresh])

  const handleSkipAd = useCallback(async () => {
    setShowSkipModal(false)
    await handleRefresh()
  }, [handleRefresh])

  const selectedMeta = selected
    ? {
        canAfford: canAfford(selected.price),
        expired: shop.expired,
      }
    : null

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Store className="h-6 w-6 text-amber-400" aria-hidden="true" />
            Mercado Rotativo
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Bem-vindo(a), {user?.email ?? 'explorador(a)'}.
          </p>
        </div>
        {shop.gold !== null && (
          <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-300">
            {shop.gold} Gold
          </span>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {shop.expired ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Oferta expirada — atualize o mercado.
            </span>
          ) : shop.nextRefreshAt ? (
            <CountdownTimer targetIso={shop.nextRefreshAt} now={now} />
          ) : (
            <span className="text-xs text-slate-400">Carregando...</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleRefreshClick()}
          disabled={shop.busy}
          className="flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {shop.busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          )}
          {shop.expired || shop.slots.length === 0 ? 'Atualizar Mercado' : 'Pular Espera'}
        </button>
      </div>

      {shop.loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Carregando o mercado...
        </div>
      ) : shop.slots.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center">
          <Sparkles className="h-8 w-8 text-slate-500" aria-hidden="true" />
          <p className="text-sm text-slate-400">
            O mercado ainda não foi aberto hoje. Clique em{' '}
            <span className="font-semibold text-slate-200">Atualizar Mercado</span> para sortear os
            6 slots.
          </p>
          <button
            type="button"
            onClick={() => handleRefreshClick()}
            disabled={shop.busy}
            className="flex min-h-10 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Sortear itens
          </button>
        </div>
      ) : (
        <>
          {showcaseSlot && (
            <section aria-label="Vitrine Especial" className="mt-6">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                Vitrine Especial
              </h2>
              <ShopCard
                slot={showcaseSlot}
                gold={shop.gold}
                busy={shop.busy}
                expired={shop.expired}
                canAfford={canAfford(showcaseSlot.price)}
                onBuy={(slotNumber) => void handleBuy(slotNumber)}
                onDetail={setSelected}
              />
            </section>
          )}

          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Estoque
              </h2>
              {shop.characterLevel !== null && (
                <span className="text-[11px] text-slate-500">
                  Nível {shop.characterLevel} · brackets de item{' '}
                  {(Math.floor(shop.characterLevel / 10) * 10).toString()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {regularSlots.map((slot) => (
                <ShopCard
                  key={slot.slot}
                  slot={slot}
                  gold={shop.gold}
                  busy={shop.busy}
                  expired={shop.expired}
                  canAfford={canAfford(slot.price)}
                  onBuy={(slotNumber) => void handleBuy(slotNumber)}
                  onDetail={setSelected}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {selected && selectedMeta && (
        <ShopItemModal
          slot={selected}
          busy={shop.busy}
          expired={selectedMeta.expired}
          canAfford={selectedMeta.canAfford}
          onBuy={(slotNumber) => void handleBuy(slotNumber)}
          onClose={() => setSelected(null)}
        />
      )}

      {showSkipModal && (
        <SkipWaitModal
          onWatchAd={() => void handleSkipAd()}
          onClose={() => setShowSkipModal(false)}
          busy={shop.busy}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-fit max-w-md items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 shadow-xl">
          {toast}
        </div>
      )}
    </AppShell>
  )
}