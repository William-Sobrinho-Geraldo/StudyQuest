import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { QuestCard, type FloatingRewardState } from './QuestCard'
import type { QuestProgressRow } from '../services/questsService'

interface QuestTrailAccordionProps {
  title: string
  quests: QuestProgressRow[]
  claimableCount: number
  claimingId: string | null
  floatingReward: FloatingRewardState | null
  onClaim: (quest: QuestProgressRow) => void
}

export function QuestTrailAccordion({
  title,
  quests,
  claimableCount,
  claimingId,
  floatingReward,
  onClaim,
}: QuestTrailAccordionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 text-left transition-colors hover:bg-slate-800/80"
      >
        <span className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">{title}</span>
          {claimableCount > 0 ? (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
              {claimableCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      <div className={`mt-3 space-y-3 transition-all duration-300 ${isOpen ? 'block' : 'hidden'}`}>
        {quests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            claimingId={claimingId}
            floatingReward={floatingReward}
            onClaim={onClaim}
          />
        ))}
      </div>
    </section>
  )
}
