import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  Coins,
  Gift,
  ScrollText,
  Sparkles,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useToast } from '../components/Toast'
import { FloatingReward } from '../components/ui/FloatingReward'
import {
  claimQuest,
  fetchQuestProgress,
  type QuestCategoryId,
  type QuestProgressRow,
} from '../features/quests/services/questsService'
import { CHEST_TIER_META } from '../features/quests/lib/chestTiers'
import { REWARD_COLORS } from '../lib/rewardColors'

const CATEGORIES: {
  id: QuestCategoryId
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
}[] = [
  {
    id: 'daily',
    label: 'Quests Diárias',
    shortLabel: 'Diárias',
    description: 'Novos objetivos a cada dia, com reset diário. Foco em engajamento rápido.',
    icon: Sun,
  },
  {
    id: 'weekly',
    label: 'Quests Semanais',
    shortLabel: 'Semanais',
    description: 'Metas da semana, com reset toda segunda-feira. Foco em consistência.',
    icon: CalendarDays,
  },
  {
    id: 'main',
    label: 'Quests Principais',
    shortLabel: 'Principais',
    description: 'Marcos da jornada de longo prazo, com curva suavizada por trilha.',
    icon: ScrollText,
  },
]

const METRIC_UNIT: Record<string, string> = {
  sessions: 'sessões',
  minutes: 'min',
  single_session_minutes: 'min',
  gold_earned: 'Gold',
  daily_quests_claimed: 'quests diárias',
  study_days_30: 'dias',
  level: 'nível',
  gold_total: 'Gold',
  minutes_total: 'min',
  sessions_total: 'sessões',
}

interface QuestGroup {
  trail: string | null
  quests: QuestProgressRow[]
}

export function QuestsPage() {
  const { showToast } = useToast()
  const [selectedId, setSelectedId] = useState<QuestCategoryId>('daily')
  const [quests, setQuests] = useState<QuestProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [floatingReward, setFloatingReward] = useState<{
    id: string
    xp: number
    gold: number
  } | null>(null)
  const floatTimerRef = useRef<number | null>(null)

  const selectedCategory = CATEGORIES.find(({ id }) => id === selectedId) ?? CATEGORIES[2]

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const rows = await fetchQuestProgress()
        if (active) setQuests(rows)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Falha ao carregar quests')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (floatTimerRef.current !== null) {
        window.clearTimeout(floatTimerRef.current)
      }
    }
  }, [])

  const handleClaim = useCallback(
    async (quest: QuestProgressRow) => {
      setClaimingId(quest.id)
      setClaimError(null)
      try {
        await claimQuest(quest.id)
        if (quest.reward_chest_tier) {
          showToast(
            `Você recebeu um Baú ${CHEST_TIER_META[quest.reward_chest_tier].label}! Verifique seu inventário.`,
          )
        }
        setFloatingReward({ id: quest.id, xp: quest.reward_xp, gold: quest.reward_gold })
        if (floatTimerRef.current !== null) {
          window.clearTimeout(floatTimerRef.current)
        }
        floatTimerRef.current = window.setTimeout(() => {
          setFloatingReward(null)
          void fetchQuestProgress()
            .then((rows) => setQuests(rows))
            .catch((err) => {
              setClaimError(err instanceof Error ? err.message : 'Falha ao reivindicar quest')
            })
        }, 1500)
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : 'Falha ao reivindicar quest')
      } finally {
        setClaimingId(null)
      }
    },
    [showToast],
  )

  const selectedQuests = useMemo(
    () => quests.filter((quest) => quest.category === selectedId),
    [quests, selectedId],
  )

  const groups = useMemo<QuestGroup[]>(() => {
    const hasTrails = selectedQuests.some((quest) => quest.trail)
    if (!hasTrails) {
      return [{ trail: null, quests: selectedQuests }]
    }
    const byTrail = new Map<string, QuestProgressRow[]>()
    for (const quest of selectedQuests) {
      const trail = quest.trail ?? 'Outras'
      const trailQuests = byTrail.get(trail) ?? []
      trailQuests.push(quest)
      byTrail.set(trail, trailQuests)
    }
    return Array.from(byTrail, ([trail, quests]) => ({ trail, quests }))
  }, [selectedQuests])

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Quests</h1>
      <p className="mt-1 text-sm text-slate-400">
        Complete objetivos e acumule XP e Gold na sua jornada.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <nav aria-label="Categorias de quests" className="grid w-full grid-cols-3 gap-2">
          {CATEGORIES.map(({ id, shortLabel, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={id === selectedCategory.id}
              onClick={() => setSelectedId(id)}
              className={`flex w-full min-h-[44px] flex-col items-center justify-center gap-1 rounded-full border px-1 text-xs font-medium transition sm:text-sm ${
                id === selectedCategory.id
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {shortLabel}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
              <selectedCategory.icon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-white">{selectedCategory.label}</h2>
              <p className="text-sm text-slate-400">{selectedCategory.description}</p>
            </div>
          </div>

          {claimError ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {claimError}
            </div>
          ) : null}

          <div className="mt-5">
            {loading ? (
              <p className="text-sm text-slate-400">Carregando quests...</p>
            ) : error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            ) : groups.every(({ quests }) => quests.length === 0) ? (
              <p className="text-sm text-slate-400">
                Nenhuma quest disponível nesta categoria.
              </p>
            ) : (
              <div className="space-y-8">
                {groups.map(({ trail, quests }) => (
                  <section key={trail ?? 'outras'} aria-label={trail ?? selectedCategory.label}>
                    {trail ? (
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-300">
                        {trail}
                      </h3>
                    ) : null}
                    <div className="mt-3 space-y-4">
                      {quests.map((quest) => {
                        const unit = METRIC_UNIT[quest.metric]
                        return (
                          <div
                            key={quest.id}
                            className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-slate-100">{quest.title}</p>
                                <p className="mt-1 text-sm text-slate-400">{quest.description}</p>
                                {unit ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {quest.current_value}/{Math.round(quest.target)} {unit}
                                    {quest.completed && (
                                      <span className="ms-2 text-emerald-400">Concluída</span>
                                    )}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                              <span
                                className={`flex items-center gap-1.5 font-medium ${REWARD_COLORS.xp}`}
                              >
                                <Sparkles className="h-4 w-4" aria-hidden="true" />
                                {quest.reward_xp} XP
                              </span>
                              <span
                                className={`flex items-center gap-1.5 font-medium ${REWARD_COLORS.gold}`}
                              >
                                <Coins className="h-4 w-4" aria-hidden="true" />
                                {quest.reward_gold} Gold
                              </span>
                              {quest.reward_chest_tier ? (
                                <span
                                  data-testid={`quest-chest-${quest.id}`}
                                  className={`flex items-center gap-1.5 font-medium ${
                                    CHEST_TIER_META[quest.reward_chest_tier].textColor
                                  }`}
                                >
                                  <Gift className="h-4 w-4" aria-hidden="true" />
                                  Baú {CHEST_TIER_META[quest.reward_chest_tier].label}
                                </span>
                              ) : null}
                              <div className="relative ms-auto">
                                {floatingReward?.id === quest.id && (
                                  <FloatingReward xp={floatingReward.xp} gold={floatingReward.gold} />
                                )}
                                <button
                                  type="button"
                                  disabled={
                                    !quest.completed ||
                                    quest.claimed ||
                                    claimingId === quest.id ||
                                    floatingReward?.id === quest.id
                                  }
                                  onClick={() => void handleClaim(quest)}
                                  className={`flex min-h-[44px] items-center rounded-lg px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${
                                    floatingReward?.id === quest.id
                                      ? 'bg-green-600'
                                      : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40'
                                  }`}
                                >
                                  {floatingReward?.id === quest.id
                                    ? 'Coletado!'
                                    : quest.claimed
                                      ? 'Reivindicado'
                                      : claimingId === quest.id
                                        ? 'Reivindicando...'
                                        : 'Reivindicar'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}