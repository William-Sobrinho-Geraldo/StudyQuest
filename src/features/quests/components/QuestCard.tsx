import { Coins, Gift, Sparkles } from 'lucide-react'
import { FloatingReward } from '../../../components/ui/FloatingReward'
import { REWARD_COLORS } from '../../../lib/rewardColors'
import { CHEST_TIER_META } from '../lib/chestTiers'
import type { QuestProgressRow } from '../services/questsService'

const METRIC_UNIT: Record<string, string> = {
  sessions: 'sessões',
  minutes: 'min',
  single_session_minutes: 'min',
  gold_earned: 'Gold',
  daily_quests_claimed: 'quests diárias',
  ad_views: 'visões',
  study_days_30: 'dias',
  level: 'nível',
  gold_total: 'Gold',
  minutes_total: 'min',
  sessions_total: 'sessões',
}

export interface FloatingRewardState {
  id: string
  xp: number
  gold: number
}

interface QuestCardProps {
  quest: QuestProgressRow
  claimingId: string | null
  floatingReward: FloatingRewardState | null
  onClaim: (quest: QuestProgressRow) => void
}

export function QuestCard({ quest, claimingId, floatingReward, onClaim }: QuestCardProps) {
  const unit = METRIC_UNIT[quest.metric]
  const isFloating = floatingReward?.id === quest.id

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
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
        <span className={`flex items-center gap-1.5 font-medium ${REWARD_COLORS.xp}`}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {quest.reward_xp} XP
        </span>
        <span className={`flex items-center gap-1.5 font-medium ${REWARD_COLORS.gold}`}>
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
          {isFloating && <FloatingReward xp={floatingReward.xp} gold={floatingReward.gold} />}
          <button
            type="button"
            disabled={
              !quest.completed ||
              quest.claimed ||
              claimingId === quest.id ||
              isFloating
            }
            onClick={() => onClaim(quest)}
            className={`flex min-h-[44px] items-center rounded-lg px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${
              isFloating
                ? 'bg-green-600'
                : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40'
            }`}
          >
            {isFloating
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
}
