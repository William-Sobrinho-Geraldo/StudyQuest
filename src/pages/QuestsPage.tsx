import { useMemo, useState } from 'react'
import { Coins, Sparkles } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { QUEST_CATEGORIES, type Quest } from '../features/quests/data/mockQuests'
import { REWARD_COLORS } from '../lib/rewardColors'

interface QuestGroup {
  trail: string | null
  quests: Quest[]
}

export function QuestsPage() {
  const [selectedId, setSelectedId] = useState<string>('main')
  const category = QUEST_CATEGORIES.find(({ id }) => id === selectedId) ?? QUEST_CATEGORIES[0]
  const CategoryIcon = category.icon

  const groups = useMemo<QuestGroup[]>(() => {
    const hasTrails = category.quests.some((quest) => quest.trail)
    if (!hasTrails) {
      return [{ trail: null, quests: category.quests }]
    }
    const byTrail = new Map<string, Quest[]>()
    for (const quest of category.quests) {
      const trail = quest.trail ?? 'Outras'
      const trailQuests = byTrail.get(trail) ?? []
      trailQuests.push(quest)
      byTrail.set(trail, trailQuests)
    }
    return Array.from(byTrail, ([trail, quests]) => ({ trail, quests }))
  }, [category])

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Quests</h1>
      <p className="mt-1 text-sm text-slate-400">
        Complete objetivos e acumule XP e Gold na sua jornada.
      </p>

      <div className="mt-8 flex flex-col gap-6 md:flex-row">
        <nav
          aria-label="Categorias de quests"
          className="flex shrink-0 flex-col gap-1 md:w-60"
        >
          {QUEST_CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={id === category.id}
              onClick={() => setSelectedId(id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                id === category.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
              <CategoryIcon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-white">{category.label}</h2>
              <p className="text-sm text-slate-400">{category.description}</p>
            </div>
          </div>

          <div className="mt-5 space-y-8">
            {groups.map(({ trail, quests }) => (
              <section key={trail ?? 'outras'} aria-label={trail ?? category.label}>
                {trail ? (
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-300">
                    {trail}
                  </h3>
                ) : null}
                <div className="mt-3 space-y-4">
                  {quests.map((quest) => (
                    <div
                      key={quest.id}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                    >
                      <p className="font-medium text-slate-100">{quest.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{quest.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                        <span className={`flex items-center gap-1.5 font-medium ${REWARD_COLORS.xp}`}>
                          <Sparkles className="h-4 w-4" aria-hidden="true" />
                          {quest.rewardXp} XP
                        </span>
                        <span
                          className={`flex items-center gap-1.5 font-medium ${REWARD_COLORS.gold}`}
                        >
                          <Coins className="h-4 w-4" aria-hidden="true" />
                          {quest.rewardGold} Gold
                        </span>
                        <button
                          type="button"
                          disabled={!quest.completed}
                          className="ms-auto rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Reivindicar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}