import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ScrollText, Sun, type LucideIcon } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useToast } from '../components/Toast'
import { QuestCard, type FloatingRewardState } from '../features/quests/components/QuestCard'
import { QuestTrailAccordion } from '../features/quests/components/QuestTrailAccordion'
import {
  claimQuest,
  fetchQuestProgress,
  type QuestCategoryId,
  type QuestProgressRow,
} from '../features/quests/services/questsService'
import { CHEST_TIER_META } from '../features/quests/lib/chestTiers'
import { countClaimableQuests, sortQuestsByStatus } from '../features/quests/lib/sortQuests'

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

interface QuestGroup {
  trail: string | null
  quests: QuestProgressRow[]
  claimableCount: number
}

export function QuestsPage() {
  const { showToast } = useToast()
  const [selectedId, setSelectedId] = useState<QuestCategoryId>('daily')
  const [quests, setQuests] = useState<QuestProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [floatingReward, setFloatingReward] = useState<FloatingRewardState | null>(null)
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
        }, 3000)
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : 'Falha ao reivindicar quest')
      } finally {
        setClaimingId(null)
      }
    },
    [showToast],
  )

  const selectedQuests = useMemo(
    () => sortQuestsByStatus(quests.filter((quest) => quest.category === selectedId)),
    [quests, selectedId],
  )

  const groups = useMemo<QuestGroup[]>(() => {
    const hasTrails = selectedQuests.some((quest) => quest.trail)
    if (!hasTrails) {
      return [
        {
          trail: null,
          quests: selectedQuests,
          claimableCount: countClaimableQuests(selectedQuests),
        },
      ]
    }
    const byTrail = new Map<string, QuestProgressRow[]>()
    for (const quest of selectedQuests) {
      const trail = quest.trail ?? 'Outras'
      const trailQuests = byTrail.get(trail) ?? []
      trailQuests.push(quest)
      byTrail.set(trail, trailQuests)
    }
    return Array.from(byTrail, ([trail, quests]) => ({
      trail,
      quests,
      claimableCount: countClaimableQuests(quests),
    }))
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
              <div className="space-y-4">
                {groups.map(({ trail, quests, claimableCount }) =>
                  trail ? (
                    <QuestTrailAccordion
                      key={trail}
                      title={trail}
                      quests={quests}
                      claimableCount={claimableCount}
                      claimingId={claimingId}
                      floatingReward={floatingReward}
                      onClaim={handleClaim}
                    />
                  ) : (
                    <div key="sem-trilha" className="space-y-4">
                      {quests.map((quest) => (
                        <QuestCard
                          key={quest.id}
                          quest={quest}
                          claimingId={claimingId}
                          floatingReward={floatingReward}
                          onClaim={handleClaim}
                        />
                      ))}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}